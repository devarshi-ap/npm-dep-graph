import { getDependencies } from "./apiService";
import { cleanVersion } from "../utils";

export class DependencyNode {
    name: string;
    version: string;
    isDeprecated: boolean;
    dependencies: DependencyNode[];

    constructor(name: string, version: string, deprecated: boolean = false) {
        this.name = name;
        this.version = version;
        this.isDeprecated = deprecated;
        this.dependencies = [];
    }
}

export class DependencyGraph {
    nodes: Map<string, DependencyNode>;

    constructor() {
        this.nodes = new Map();
    }

    addNode(name: string, version: string, deprecated: boolean = false): DependencyNode {
        const key = `${name}@${version}`;
        if (!this.nodes.has(key)) {
            const newNode = new DependencyNode(name, version, deprecated);
            this.nodes.set(key, newNode);
        }
        return this.nodes.get(key)!;
    }

    addEdge(parent: DependencyNode, child: DependencyNode) {
        parent.dependencies.push(child);
    }

    logGraph(): void {
        console.log("Dependency Graph:");

        for (const [key, node] of this.nodes) {
            console.log(`\nNode: ${node.name}@${node.version}`);
            console.log(`  Deprecated: ${node.isDeprecated}`);
            console.log("  Dependencies:");
            if (node.dependencies.length === 0) {
                console.log("    None");
            } else {
                for (const dep of node.dependencies) {
                    console.log(`    - ${dep.name}@${dep.version}`);
                }
            }
        }
    }
}

export async function buildDependencyGraph(packageName: string, packageVersion: string) {
    const depGraph = new DependencyGraph();
    const processedPackages = new Set<string>();

    async function addDependenciesRecursively(name: string, version: string): Promise<DependencyNode | null> {
        // pokemon@1.1.0
        const key = `${name}@${cleanVersion(version)}`;

        // check if pokemon@1.1.0 already in the graph
        if(processedPackages.has(key)){
            return depGraph.nodes.get(key) || null;
        }

        // otherwise, fetch package deps and add to processed set
        const focusPackage = await getDependencies(name, version);
        if (!focusPackage) {
            console.warn(`Failed to fetch dependencies for ${key}`);
            return null;
        }
        processedPackages.add(key);

        // add received package as node into graph
        const focusNode = depGraph.addNode(focusPackage.packageName, focusPackage.packageVersion, focusPackage.isDeprecated);

        // now recursively process current node's dependencies (if there are any)
        if (focusPackage.dependencies) {
            for(const dep of focusPackage.dependencies) {
                const childNode = await addDependenciesRecursively(dep.dependencyName, dep.dependencyVersion);
                // add edge on graph (focusNode depends on childNode -- focusNode is parent of childNode)
                if (childNode) depGraph.addEdge(focusNode, childNode);
            }
        }
        return focusNode;
    }

    await addDependenciesRecursively(packageName, packageVersion);
    depGraph.logGraph();
    return depGraph;
}
