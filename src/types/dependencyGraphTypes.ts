export interface dependency {
    dependencyName: string;
    dependencyVersion: string;
}

export type npmPackage = {
    packageName: string;
    packageVersion: string;
    isDeprecated: boolean;
    dependencies: dependency[] | null;
};
