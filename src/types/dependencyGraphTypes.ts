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


export type graphNode = {
    id: string,
    name: string,
    val: 1
}
export interface graphLinks {
    source: string,
    target: string
}

export interface graphType {
    nodes: graphNode[],
    links: graphLinks[],
}