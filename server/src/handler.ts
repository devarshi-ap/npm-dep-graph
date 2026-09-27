import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Cache, DynamoCache, MemoryCache } from './cache';
import { buildDependencyGraph } from './graph';
import { isValidPackageName, NpmRegistry, PackageNotFoundError } from './registry';

// Created once per Lambda container and reused across warm invocations.
const cache: Cache = process.env.TABLE_NAME ? new DynamoCache(process.env.TABLE_NAME) : new MemoryCache();

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

// GET /api/graph?name=<package>&version=<version or range>
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    const name = event.queryStringParameters?.name?.trim() ?? '';
    const version = event.queryStringParameters?.version?.trim() || 'latest';

    if (!isValidPackageName(name)) return json(400, { error: 'Query parameter "name" must be a valid npm package name.' });
    if (version.length > 256) return json(400, { error: 'Query parameter "version" is too long.' });

    try {
        const graph = await buildDependencyGraph(name, version, { registry: new NpmRegistry(), cache });
        console.log(JSON.stringify({ msg: 'graph built', root: graph.root, ...graph.stats, unresolved: graph.stats.unresolved.length }));
        return json(200, graph);
    } catch (err) {
        if (err instanceof PackageNotFoundError) return json(404, { error: err.message });
        console.error('Failed to build graph:', err);
        return json(500, { error: 'Failed to build dependency graph.' });
    }
}
