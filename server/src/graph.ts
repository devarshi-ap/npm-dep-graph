import semver from 'semver';
import { Cache, CacheEntry } from './cache';
import { PackageNotFoundError, Registry } from './registry';
import { GraphLink, GraphNode, GraphResponse, PackageVersionInfo, Packument } from './types';

// A published name@version never changes its dependencies, so node entries can
// live a long time (the TTL mostly exists so `deprecated` eventually refreshes).
// Range resolutions change whenever a new version is published, so keep those short.
export const NODE_TTL_SECONDS = 7 * 24 * 60 * 60;
export const RANGE_TTL_SECONDS = 6 * 60 * 60;

export const nodeKey = (name: string, version: string) => `node#${name}@${version}`;
export const rangeKey = (name: string, range: string) => `range#${name}@${range}`;

export interface BuildOptions {
    registry: Registry;
    cache: Cache;
    maxNodes?: number;
    concurrency?: number;
}

interface Target {
    name: string;
    range: string;
}

/**
 * Turns a dependency spec from package.json into the package name + range to
 * resolve. Returns null for things that aren't on the registry (git urls,
 * tarballs, local paths, workspaces).
 */
export function parseSpec(name: string, spec: string): Target | null {
    if (spec.startsWith('npm:')) {
        // Aliases: "foo": "npm:bar@^1.0.0" installs bar.
        const rest = spec.slice(4);
        const at = rest.lastIndexOf('@');
        return at > 0 ? parseSpec(rest.slice(0, at), rest.slice(at + 1)) : { name: rest, range: 'latest' };
    }
    const range = spec.trim() === '' ? '*' : spec.trim();
    if (semver.validRange(range) !== null) return { name, range };
    if (/^[a-z][\w.-]*$/i.test(range)) return { name, range }; // dist-tag, e.g. "latest" or "next"
    return null;
}

/**
 * Picks the version npm would install for a range: the `latest` dist-tag if it
 * satisfies the range, otherwise the highest satisfying version.
 */
export function resolveVersion(packument: Packument, range: string): string | null {
    if (packument.distTags[range]) return packument.distTags[range];
    if (semver.validRange(range) === null) return null;

    const latest = packument.distTags.latest;
    if (latest && packument.versions[latest] && semver.satisfies(latest, range)) return latest;
    return semver.maxSatisfying(Object.keys(packument.versions), range);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i]);
        }
    });
    await Promise.all(workers);
    return results;
}

interface Pending {
    parent: string | null;
    name: string;
    spec: string;
}

export async function buildDependencyGraph(rootName: string, rootSpec: string, options: BuildOptions): Promise<GraphResponse> {
    const { registry, cache, maxNodes = 1500, concurrency = 16 } = options;
    const started = Date.now();

    const nodes = new Map<string, GraphNode>();
    const nodeInfo = new Map<string, PackageVersionInfo>();
    const links: GraphLink[] = [];
    const linkIds = new Set<string>();
    const resolvedRanges = new Map<string, string | null>(); // rangeKey -> version, per request
    const unresolved = new Set<string>();
    let cacheHits = 0;
    let cacheMisses = 0;
    let registryFetches = 0;
    let truncated = false;

    // Each packument is fetched at most once per request, even if many parents
    // depend on the same package with different ranges.
    const packuments = new Map<string, Promise<Packument | null>>();
    const getPackument = (name: string) => {
        if (!packuments.has(name)) {
            registryFetches++;
            packuments.set(
                name,
                registry.getPackument(name).catch((err) => {
                    if (!(err instanceof PackageNotFoundError)) console.error(`Registry fetch failed for ${name}:`, err);
                    return null;
                }),
            );
        }
        return packuments.get(name)!;
    };

    // The cache is an optimisation: if DynamoDB is unavailable, fall back to the registry.
    const cacheGet = async (keys: string[]) => {
        if (keys.length === 0) return new Map<string, unknown>();
        try {
            const hits = await cache.getMany(keys);
            cacheHits += hits.size;
            cacheMisses += keys.length - hits.size;
            return hits;
        } catch (err) {
            console.error('Cache read failed:', err);
            cacheMisses += keys.length;
            return new Map<string, unknown>();
        }
    };
    const cachePut = async (entries: CacheEntry[]) => {
        if (entries.length === 0) return;
        try {
            await cache.putMany(entries);
        } catch (err) {
            console.error('Cache write failed:', err);
        }
    };

    let rootId: string | null = null;
    let frontier: Pending[] = [{ parent: null, name: rootName, spec: rootSpec }];

    while (frontier.length > 0) {
        const writes: CacheEntry[] = [];

        // 1. Resolve each spec to an exact version.
        const targets = frontier.map((p) => ({ pending: p, target: parseSpec(p.name, p.spec) }));
        const needRange = new Map<string, Target>();
        for (const { pending, target } of targets) {
            if (!target) {
                unresolved.add(`${pending.name}@${pending.spec}`);
                continue;
            }
            const key = rangeKey(target.name, target.range);
            if (semver.valid(target.range)) resolvedRanges.set(key, semver.valid(target.range));
            else if (!resolvedRanges.has(key)) needRange.set(key, target);
        }

        const rangeHits = await cacheGet([...needRange.keys()]);
        for (const [key, version] of rangeHits) {
            resolvedRanges.set(key, version as string);
            needRange.delete(key);
        }
        await mapLimit([...needRange.entries()], concurrency, async ([key, target]) => {
            const packument = await getPackument(target.name);
            const version = packument ? resolveVersion(packument, target.range) : null;
            resolvedRanges.set(key, version);
            if (version) writes.push({ key, value: version, ttlSeconds: RANGE_TTL_SECONDS });
        });

        // 2. Load dependency info for versions we haven't seen yet.
        const edges: { parent: string | null; id: string; name: string; version: string }[] = [];
        const needNode = new Map<string, { id: string; name: string; version: string }>();
        for (const { pending, target } of targets) {
            if (!target) continue;
            const version = resolvedRanges.get(rangeKey(target.name, target.range));
            if (!version) {
                unresolved.add(`${pending.name}@${pending.spec}`);
                continue;
            }
            const id = `${target.name}@${version}`;
            edges.push({ parent: pending.parent, id, name: target.name, version });
            if (!nodeInfo.has(id)) needNode.set(nodeKey(target.name, version), { id, name: target.name, version });
        }

        const nodeHits = await cacheGet([...needNode.keys()]);
        for (const [key, info] of nodeHits) {
            nodeInfo.set(needNode.get(key)!.id, info as PackageVersionInfo);
            needNode.delete(key);
        }
        await mapLimit([...needNode.entries()], concurrency, async ([key, { id, name, version }]) => {
            const info = (await getPackument(name))?.versions[version];
            if (!info) return;
            nodeInfo.set(id, info);
            writes.push({ key, value: info, ttlSeconds: NODE_TTL_SECONDS });
        });

        await cachePut(writes);

        // 3. Add nodes and edges, and queue the dependencies of newly added nodes.
        const next: Pending[] = [];
        for (const edge of edges) {
            const info = nodeInfo.get(edge.id);
            if (!info) {
                unresolved.add(edge.id);
                continue;
            }
            if (!nodes.has(edge.id)) {
                if (nodes.size >= maxNodes) {
                    truncated = true;
                    continue; // skip the link too: force-graph can't draw links to missing nodes
                }
                nodes.set(edge.id, { id: edge.id, group: info.deprecated ? 1 : 0, isRoot: edge.parent === null });
                for (const [depName, depSpec] of Object.entries(info.dependencies)) {
                    next.push({ parent: edge.id, name: depName, spec: depSpec });
                }
            }
            if (edge.parent === null) {
                rootId = edge.id;
            } else if (edge.parent !== edge.id) {
                const linkId = `${edge.parent}->${edge.id}`;
                if (!linkIds.has(linkId)) {
                    linkIds.add(linkId);
                    links.push({ source: edge.parent, target: edge.id });
                }
            }
        }
        frontier = next;
    }

    if (!rootId) throw new PackageNotFoundError(`Could not resolve ${rootName}@${rootSpec}`);

    return {
        root: rootId,
        nodes: [...nodes.values()],
        links,
        stats: {
            durationMs: Date.now() - started,
            nodeCount: nodes.size,
            linkCount: links.length,
            cacheHits,
            cacheMisses,
            registryFetches,
            truncated,
            unresolved: [...unresolved],
        },
    };
}
