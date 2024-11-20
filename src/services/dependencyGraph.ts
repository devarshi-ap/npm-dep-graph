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

interface dependency {
    dependencyName: string;
    dependencyVersion: string;
}

type npmPackage = {
    packageName: string,
    packageVersion: string,
    isDeprecated: boolean,
    dependencies: dependency[] | null
};

export async function getDependencies(packageName: string, packageVersion: string): Promise<any> {
    try {
        const response = await client.get(`/${packageName}/${packageVersion}`);

        console.log(`${packageName} - ${packageVersion}`);
        console.log('deprecated' in response.data ? "deprecated" : "not deprecated");
        console.log(response.data.dependencies)
    } catch (err) {
        console.log(err);
    }
}