class DependencyNode {
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

class DependencyGraph {
    nodes: Map<string, DependencyNode>

    constructor() {
        // empty Graph
        this.nodes = new Map()
    }

    // introduce new package into graph
    addNode(name: string, version: string, deprecated: boolean = false): DependencyNode {
        const key = `${name}@${version}`;
        
        // add new mapping key->DepNode if key not in map already
        if(!this.nodes.has(key)) {
            this.nodes.set(key, new DependencyNode(name, version, deprecated));
        }
        return this.nodes.get(key)!;
    }

    // define dependencies relationship in graph (A depends on B == A is parent of B)
    addEdge(parent: DependencyNode, child: DependencyNode) {
        parent.dependencies.push(child);
    }
}