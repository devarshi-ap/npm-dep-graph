import { getDependencies } from "./apiService";
import { cleanVersion } from "../utils";
import { graphType, graphNode, graphLinks } from "../types/dependencyGraphTypes";


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

        for (const [_, node] of this.nodes) {
            console.log(`${node.name}@${node.version}\nDeprecated: ${node.isDeprecated}\nDependencies:`);
            if (node.dependencies.length === 0) {
                console.log("> 0 Dependencies");
            } else {
                for (const dep of node.dependencies) {
                    console.log(`> ${dep.name}@${dep.version}`);
                }
            }
        }
    }
}

export function exportAsGraphData(depGraph: Map<string, DependencyNode>, rootId: string): graphType {
    const depGraphData: graphType = { nodes: [], links: [] };
    depGraph.forEach((node, key) => {
        depGraphData.nodes.push({
            id: key,
            group: node.isDeprecated ? 1 : 0,
            isRoot: key === rootId // Mark root node
        });
        for (const dep of node.dependencies) {
            depGraphData.links.push({ source: key, target: `${dep.name}@${dep.version}` });
        }
    });
    return depGraphData;
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
