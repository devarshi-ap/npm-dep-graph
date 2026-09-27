import { MemoryCache } from '../src/cache';
import { buildDependencyGraph, parseSpec, resolveVersion } from '../src/graph';
import { PackageNotFoundError, Registry } from '../src/registry';
import { Packument } from '../src/types';

// Builds a fake registry from { name: { version: { dep: range } } }.
function fakeRegistry(
    packages: Record<string, Record<string, Record<string, string>>>,
    opts: { latest?: Record<string, string>; deprecated?: string[] } = {},
) {
    const calls: string[] = [];
    const registry: Registry = {
        async getPackument(name) {
            calls.push(name);
            const versions = packages[name];
            if (!versions) throw new PackageNotFoundError(name);
            const all = Object.keys(versions);
            return {
                name,
                distTags: { latest: opts.latest?.[name] ?? all[all.length - 1] },
                versions: Object.fromEntries(
                    all.map((v) => [v, { dependencies: versions[v], deprecated: opts.deprecated?.includes(`${name}@${v}`) ?? false }]),
                ),
            };
        },
    };
    return { registry, calls };
}

const packument = (versions: string[], latest: string): Packument => ({
    name: 'x',
    distTags: { latest, next: '3.0.0-beta.1' },
    versions: Object.fromEntries(versions.map((v) => [v, { dependencies: {}, deprecated: false }])),
});

describe('resolveVersion', () => {
    const p = packument(['1.0.0', '1.2.0', '1.5.0', '2.0.0', '3.0.0-beta.1'], '1.2.0');

    test('prefers the latest dist-tag when it satisfies the range', () => {
        expect(resolveVersion(p, '^1.0.0')).toBe('1.2.0');
    });

    test('otherwise picks the highest satisfying version, not the lowest', () => {
        expect(resolveVersion(p, '>=1.3.0 <3')).toBe('2.0.0');
        expect(resolveVersion(p, '~1.5.0')).toBe('1.5.0');
    });

    test('resolves dist-tags and ignores prereleases for plain ranges', () => {
        expect(resolveVersion(p, 'next')).toBe('3.0.0-beta.1');
        expect(resolveVersion(p, '>=2')).toBe('2.0.0');
    });

    test('returns null when nothing matches', () => {
        expect(resolveVersion(p, '^9.0.0')).toBeNull();
        expect(resolveVersion(p, 'nonexistent-tag')).toBeNull();
    });
});

describe('parseSpec', () => {
    test('handles ranges, tags, aliases and non-registry specs', () => {
        expect(parseSpec('a', '^1.0.0')).toEqual({ name: 'a', range: '^1.0.0' });
        expect(parseSpec('a', '')).toEqual({ name: 'a', range: '*' });
        expect(parseSpec('a', 'latest')).toEqual({ name: 'a', range: 'latest' });
        expect(parseSpec('a', 'npm:@scope/b@^2.0.0')).toEqual({ name: '@scope/b', range: '^2.0.0' });
        expect(parseSpec('a', 'github:user/repo')).toBeNull();
        expect(parseSpec('a', 'user/repo')).toBeNull();
        expect(parseSpec('a', 'file:../a')).toBeNull();
    });
});

describe('buildDependencyGraph', () => {
    const packages = {
        root: { '1.0.0': { a: '^1.0.0', b: '~2.0.0' } },
        a: { '1.0.0': {}, '1.1.0': { c: '*' } },
        b: { '2.0.0': {}, '2.0.3': { c: '^1.0.0' } },
        c: { '1.0.0': {} },
    };

    test('builds nodes and links using the correct resolved versions', async () => {
        const { registry } = fakeRegistry(packages, { deprecated: ['c@1.0.0'] });
        const graph = await buildDependencyGraph('root', '1.0.0', { registry, cache: new MemoryCache() });

        expect(graph.root).toBe('root@1.0.0');
        expect(graph.nodes.map((n) => n.id).sort()).toEqual(['a@1.1.0', 'b@2.0.3', 'c@1.0.0', 'root@1.0.0']);
        expect(graph.nodes.find((n) => n.id === 'root@1.0.0')?.isRoot).toBe(true);
        expect(graph.nodes.find((n) => n.id === 'c@1.0.0')?.group).toBe(1);
        expect(graph.links).toEqual(
            expect.arrayContaining([
                { source: 'root@1.0.0', target: 'a@1.1.0' },
                { source: 'root@1.0.0', target: 'b@2.0.3' },
                { source: 'a@1.1.0', target: 'c@1.0.0' },
                { source: 'b@2.0.3', target: 'c@1.0.0' },
            ]),
        );
        expect(graph.links).toHaveLength(4);
    });

    test('fetches each packument once, and a second build is served entirely from cache', async () => {
        const { registry, calls } = fakeRegistry(packages);
        const cache = new MemoryCache();

        const cold = await buildDependencyGraph('root', '1.0.0', { registry, cache });
        expect(calls.sort()).toEqual(['a', 'b', 'c', 'root']);
        expect(cold.stats.registryFetches).toBe(4);

        calls.length = 0;
        const warm = await buildDependencyGraph('root', '1.0.0', { registry, cache });
        expect(calls).toEqual([]);
        expect(warm.stats.registryFetches).toBe(0);
        expect(warm.stats.cacheMisses).toBe(0);
        expect(warm.nodes).toEqual(cold.nodes);
        expect(warm.links).toEqual(cold.links);
    });

    test('handles cycles', async () => {
        const { registry } = fakeRegistry({ x: { '1.0.0': { y: '1' } }, y: { '1.0.0': { x: '1' } } });
        const graph = await buildDependencyGraph('x', '1.0.0', { registry, cache: new MemoryCache() });
        expect(graph.links).toEqual([
            { source: 'x@1.0.0', target: 'y@1.0.0' },
            { source: 'y@1.0.0', target: 'x@1.0.0' },
        ]);
    });

    test('records unresolvable dependencies instead of failing', async () => {
        const { registry } = fakeRegistry({ x: { '1.0.0': { missing: '^1.0.0', gitdep: 'github:u/r', a: '^5.0.0' } }, a: { '1.0.0': {} } });
        const graph = await buildDependencyGraph('x', '1.0.0', { registry, cache: new MemoryCache() });
        expect(graph.nodes).toHaveLength(1);
        expect(graph.stats.unresolved.sort()).toEqual(['a@^5.0.0', 'gitdep@github:u/r', 'missing@^1.0.0']);
    });

    test('throws PackageNotFoundError for an unknown root', async () => {
        const { registry } = fakeRegistry({});
        await expect(buildDependencyGraph('nope', '1.0.0', { registry, cache: new MemoryCache() })).rejects.toBeInstanceOf(PackageNotFoundError);
    });

    test('stops at maxNodes without emitting dangling links', async () => {
        const { registry } = fakeRegistry(packages);
        const graph = await buildDependencyGraph('root', '1.0.0', { registry, cache: new MemoryCache(), maxNodes: 2 });
        expect(graph.stats.truncated).toBe(true);
        expect(graph.nodes).toHaveLength(2);
        const ids = new Set(graph.nodes.map((n) => n.id));
        for (const link of graph.links) {
            expect(ids.has(link.source)).toBe(true);
            expect(ids.has(link.target)).toBe(true);
        }
    });

    test('falls back to the registry when the cache is down', async () => {
        const { registry } = fakeRegistry(packages);
        const broken = { getMany: () => Promise.reject(new Error('down')), putMany: () => Promise.reject(new Error('down')) };
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const graph = await buildDependencyGraph('root', '1.0.0', { registry, cache: broken });
        expect(graph.nodes).toHaveLength(4);
        jest.restoreAllMocks();
    });
});
