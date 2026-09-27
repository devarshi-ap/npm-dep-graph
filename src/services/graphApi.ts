import { buildDependencyGraph, exportAsGraphData } from './dependencyGraph';
import { graphType } from '../types/dependencyGraphTypes';

export type GraphStats = {
    durationMs: number;
    nodeCount: number;
    cacheHits: number;
    cacheMisses: number;
    registryFetches: number;
    truncated: boolean;
};

export type GraphResult = {
    data: graphType;
    source: 'api' | 'browser';
    stats: GraphStats | null;
};

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

// Builds the graph on the backend (Lambda + DynamoDB cache) when an API is
// configured, otherwise falls back to building it in the browser.
export async function loadDependencyGraph(packageName: string, packageVersion: string): Promise<GraphResult> {
    if (API_URL) {
        const params = new URLSearchParams({ name: packageName, version: packageVersion });
        const res = await fetch(`${API_URL}/graph?${params}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `API returned ${res.status}`);
        return { data: { nodes: body.nodes, links: body.links }, source: 'api', stats: body.stats };
    }

    const graph = await buildDependencyGraph(packageName, packageVersion);
    const rootId = `${packageName}@${packageVersion}`;
    return { data: exportAsGraphData(graph.nodes, rootId), source: 'browser', stats: null };
}
