import axios from 'axios';
import { dependency, npmPackage } from '../types/dependencyGraphTypes';
import { cleanVersion } from "../utils";

export async function getDependencies(packageName: string, packageVersion: string): Promise<npmPackage | null> {
    try {
        const response = await axios.get(`https://registry.npmjs.org/${packageName}/${cleanVersion(packageVersion)}`);
        
        const deps: dependency[] = [];
        if (response.data.dependencies) {
            Object.entries(response.data.dependencies).forEach(([key, value]) => {
                // @ts-ignore
                const baseVersion = value.replace(/^~/, '');
                deps.push({ dependencyName: key, dependencyVersion: baseVersion });
            });
        }

        const packageObject: npmPackage = {
            packageName: packageName,
            packageVersion: packageVersion,
            isDeprecated: response.data.deprecated,
            dependencies: deps.length > 0 ? deps : null,
        };

        return packageObject;
    } catch (err) {
        console.error(`Error fetching dependencies for ${packageName}@${packageVersion}:`, err);
        return null;
    }
}
