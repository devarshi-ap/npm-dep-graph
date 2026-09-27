import { BatchGetCommand, BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoCache } from '../src/cache';

describe('DynamoCache', () => {
    function fakeClient(items: Record<string, { value: unknown; expiresAt: number }>) {
        const sent: unknown[] = [];
        const client = {
            send: async (cmd: BatchGetCommand | BatchWriteCommand) => {
                sent.push(cmd);
                if (cmd instanceof BatchGetCommand) {
                    const keys = cmd.input.RequestItems!.tbl.Keys!;
                    return { Responses: { tbl: keys.filter((k) => items[k.pk]).map((k) => ({ pk: k.pk, ...items[k.pk] })) } };
                }
                return {};
            },
        } as unknown as DynamoDBDocumentClient;
        return { client, sent };
    }

    test('splits reads into batches of 100 and skips expired items', async () => {
        const now = Math.floor(Date.now() / 1000);
        const { client, sent } = fakeClient({
            k1: { value: 'fresh', expiresAt: now + 60 },
            k2: { value: 'stale', expiresAt: now - 60 },
        });
        const cache = new DynamoCache('tbl', client);
        const keys = Array.from({ length: 250 }, (_, i) => `k${i}`);

        const result = await cache.getMany(keys);
        expect(sent).toHaveLength(3);
        expect([...result.entries()]).toEqual([['k1', 'fresh']]);
    });

    test('splits writes into batches of 25, dedupes keys and sets expiresAt', async () => {
        const { client, sent } = fakeClient({});
        const cache = new DynamoCache('tbl', client);
        const entries = Array.from({ length: 60 }, (_, i) => ({ key: `k${i % 30}`, value: i, ttlSeconds: 100 }));

        await cache.putMany(entries);
        expect(sent).toHaveLength(2);
        const items = (sent as BatchWriteCommand[]).flatMap((c) => c.input.RequestItems!.tbl.map((r) => r.PutRequest!.Item!));
        expect(items).toHaveLength(30);
        expect(items[0].expiresAt).toBeGreaterThan(Date.now() / 1000);
    });
});
