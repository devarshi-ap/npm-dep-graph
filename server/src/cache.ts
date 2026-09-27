import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchGetCommand, BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export interface CacheEntry {
    key: string;
    value: unknown;
    ttlSeconds: number;
}

// Key/value cache. Failures are the caller's problem only in the sense that a
// missing key is treated as a miss; the cache is never the source of truth.
export interface Cache {
    getMany(keys: string[]): Promise<Map<string, unknown>>;
    putMany(entries: CacheEntry[]): Promise<void>;
}

// DynamoDB limits: BatchGetItem takes up to 100 keys, BatchWriteItem up to 25 items.
const GET_BATCH = 100;
const WRITE_BATCH = 25;

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

// Table layout: { pk: string, value: any, expiresAt: number (epoch seconds, TTL attribute) }
export class DynamoCache implements Cache {
    private readonly doc: DynamoDBDocumentClient;

    constructor(private readonly tableName: string, client?: DynamoDBDocumentClient) {
        this.doc = client ?? DynamoDBDocumentClient.from(new DynamoDBClient({}));
    }

    async getMany(keys: string[]): Promise<Map<string, unknown>> {
        const result = new Map<string, unknown>();
        const now = Math.floor(Date.now() / 1000);

        await Promise.all(
            chunk([...new Set(keys)], GET_BATCH).map(async (batch) => {
                const res = await this.doc.send(
                    new BatchGetCommand({
                        RequestItems: { [this.tableName]: { Keys: batch.map((pk) => ({ pk })) } },
                    }),
                );
                // DynamoDB deletes expired items lazily (up to a few days late), so
                // check expiry ourselves. UnprocessedKeys are simply treated as misses.
                for (const item of res.Responses?.[this.tableName] ?? []) {
                    if (typeof item.expiresAt === 'number' && item.expiresAt < now) continue;
                    result.set(item.pk as string, item.value);
                }
            }),
        );
        return result;
    }

    async putMany(entries: CacheEntry[]): Promise<void> {
        const now = Math.floor(Date.now() / 1000);
        // BatchWrite rejects duplicate keys within one request.
        const unique = [...new Map(entries.map((e) => [e.key, e])).values()];

        await Promise.all(
            chunk(unique, WRITE_BATCH).map((batch) =>
                this.doc.send(
                    new BatchWriteCommand({
                        RequestItems: {
                            [this.tableName]: batch.map((e) => ({
                                PutRequest: { Item: { pk: e.key, value: e.value, expiresAt: now + e.ttlSeconds } },
                            })),
                        },
                    }),
                ),
            ),
        );
    }
}

// Used for local development and tests.
export class MemoryCache implements Cache {
    private readonly store = new Map<string, { value: unknown; expiresAt: number }>();

    async getMany(keys: string[]): Promise<Map<string, unknown>> {
        const result = new Map<string, unknown>();
        const now = Date.now();
        for (const key of keys) {
            const entry = this.store.get(key);
            if (entry && entry.expiresAt > now) result.set(key, entry.value);
        }
        return result;
    }

    async putMany(entries: CacheEntry[]): Promise<void> {
        for (const e of entries) {
            // Round-trip through JSON so callers can't mutate cached values, like DynamoDB.
            this.store.set(e.key, { value: JSON.parse(JSON.stringify(e.value)), expiresAt: Date.now() + e.ttlSeconds * 1000 });
        }
    }
}
