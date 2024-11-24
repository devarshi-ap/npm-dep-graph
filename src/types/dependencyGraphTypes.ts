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

// interface graphNode {
//     packageName: string;
//     packageVersion: string;
//     isDeprecated: boolean;
//     dependencies: {
//         packageName: string;
//         packageVersion: string;
//         isDeprecated: boolean;
//     }[];
// }
