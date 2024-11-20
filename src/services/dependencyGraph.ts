import axios from 'axios';

/**
 * Parameters: packageName, packageVersion
 * Return: that package's logical dependency graph (JSON object)
 * 
 * JSON schema:
 * {
 *      packageName: string,
 *      packageVersion: string,
 *      isDeprecated: boolean
 *      dependencies: [{
 *          depName: string,
 *          depVersion: string,
 *          isDeprecated: boolean,
 *      }, ...]
 * }
 */

const client = axios.create({
    baseURL: 'https://registry.npmjs.org',
});

export interface dependency {
    dependencyName: string;
    dependencyVersion: string;
}

export type npmPackage = {
    packageName: string,
    packageVersion: string,
    isDeprecated: boolean,
    dependencies: dependency[] | null
};

export async function getDependencies(packName: string, packVersion: string): Promise<npmPackage | null> {
    try {
        const response = await client.get(`/${packName}/${packVersion}`);
        
        let deps: dependency[] = []
        Object.entries(response.data.dependencies).forEach(([key, value]) => {
            // @ts-ignore
            let baseVersion = value.replace(/^~/, '')
            deps.push({ dependencyName: key, dependencyVersion: baseVersion })
        })

        let packageObject: npmPackage = {
            packageName: packName,
            packageVersion: packVersion,
            isDeprecated: 'deprecated' in response.data ? true : false,
            dependencies: deps,
        };

        console.log(packageObject)

        return packageObject;
    } catch (err) {
        console.log(err);
        return null
    }
}