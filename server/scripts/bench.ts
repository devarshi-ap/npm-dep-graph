// Times a cold vs. cached graph build against a deployed (or local) API.
//   npm run bench -- <api-base-url> [package] [version]
//   npm run bench -- https://d123.cloudfront.net/api webpack 5.94.0
const [baseUrl, name = 'webpack', version = 'latest'] = process.argv.slice(2);
if (!baseUrl) {
    console.error('Usage: npm run bench -- <api-base-url> [package] [version]');
    process.exit(1);
}

async function run(label: string) {
    const started = performance.now();
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/graph?name=${encodeURIComponent(name)}&version=${encodeURIComponent(version)}`);
    const body = (await res.json()) as { stats: Record<string, number> };
    const wallMs = Math.round(performance.now() - started);
    if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
    const s = body.stats;
    console.log(
        `${label.padEnd(7)} wall=${wallMs}ms server=${s.durationMs}ms nodes=${s.nodeCount} ` +
            `registryFetches=${s.registryFetches} cacheHits=${s.cacheHits} cacheMisses=${s.cacheMisses}`,
    );
}

(async () => {
    console.log(`${name}@${version} via ${baseUrl}`);
    console.log('(the first run is only "cold" if nothing has cached this graph in the last few hours)');
    await run('first');
    await run('second');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
