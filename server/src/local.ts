// Runs the Lambda handler behind a plain Node HTTP server for local development.
// Without TABLE_NAME set, the handler uses an in-memory cache instead of DynamoDB.
import { createServer } from 'node:http';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from './handler';

const PORT = Number(process.env.PORT ?? 3001);

createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    if (req.method !== 'GET' || url.pathname !== '/api/graph') {
        res.writeHead(404).end();
        return;
    }
    const event = { queryStringParameters: Object.fromEntries(url.searchParams) } as unknown as APIGatewayProxyEventV2;
    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;
    res.writeHead(result.statusCode ?? 200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(result.body);
}).listen(PORT, () => console.log(`API listening on http://localhost:${PORT}/api/graph?name=express&version=4.21.1`));
