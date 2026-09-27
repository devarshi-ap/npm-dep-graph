// Shape returned to the frontend. `nodes`/`links` match the frontend's graphType
// so the response can be handed straight to force-graph.
export interface GraphNode {
    id: string;
    group: number; // 1 = deprecated, 0 = normal
    isRoot: boolean;
}

export interface GraphLink {
    source: string;
    target: string;
}

export interface GraphStats {
    durationMs: number;
    nodeCount: number;
    linkCount: number;
    cacheHits: number;
    cacheMisses: number;
    registryFetches: number;
    truncated: boolean;
    unresolved: string[]; // specs we couldn't resolve, e.g. git urls or missing packages
}

export interface GraphResponse {
    root: string;
    nodes: GraphNode[];
    links: GraphLink[];
    stats: GraphStats;
}

// What we know about one published name@version. Published versions are
// immutable on npm, so this is safe to cache for a long time.
export interface PackageVersionInfo {
    dependencies: Record<string, string>; // name -> semver range, as published
    deprecated: boolean;
}

// Abbreviated packument: all versions of a package plus its dist-tags.
export interface Packument {
    name: string;
    distTags: Record<string, string>;
    versions: Record<string, PackageVersionInfo>;
}
