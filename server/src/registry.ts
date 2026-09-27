import { Packument, PackageVersionInfo } from './types';

const REGISTRY_URL = 'https://registry.npmjs.org';

// Same pattern npm's validate-npm-package-name uses, loosened to allow legacy
// uppercase names. Also keeps arbitrary paths out of the registry URL.
const PACKAGE_NAME = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

export function isValidPackageName(name: string): boolean {
    return name.length <= 214 && PACKAGE_NAME.test(name);
}

export class PackageNotFoundError extends Error {}

export interface Registry {
    getPackument(name: string): Promise<Packument>;
}

export class NpmRegistry implements Registry {
    fetchCount = 0;

    async getPackument(name: string): Promise<Packument> {
        if (!isValidPackageName(name)) throw new PackageNotFoundError(`Invalid package name: ${name}`);

        this.fetchCount++;
        // The abbreviated format ("corgi") only has install-relevant fields, so it
        // is much smaller than the full document for packages with long histories.
        const res = await fetch(`${REGISTRY_URL}/${name.replace('/', '%2f')}`, {
            headers: { Accept: 'application/vnd.npm.install-v1+json' },
        });
        if (res.status === 404) throw new PackageNotFoundError(`Package not found: ${name}`);
        if (!res.ok) throw new Error(`Registry returned ${res.status} for ${name}`);

        const body = (await res.json()) as {
            name: string;
            'dist-tags'?: Record<string, string>;
            versions?: Record<string, { dependencies?: Record<string, string>; deprecated?: string }>;
        };

        const versions: Record<string, PackageVersionInfo> = {};
        for (const [version, manifest] of Object.entries(body.versions ?? {})) {
            versions[version] = {
                dependencies: manifest.dependencies ?? {},
                deprecated: Boolean(manifest.deprecated),
            };
        }
        return { name: body.name, distTags: body['dist-tags'] ?? {}, versions };
    }
}
