import {
    DependencyGraph,
    DependencyNode,
} from '../src/services/dependencyGraph';

describe('DependencyGraph', () => {
    let depGraph: DependencyGraph;

    beforeEach(() => {
        depGraph = new DependencyGraph();
    });

    test('should add a node to the graph', () => {
        const node = depGraph.addNode('example-package', '1.0.0');
        expect(depGraph.nodes.size).toBe(1);
        expect(depGraph.nodes.get('example-package@1.0.0')).toBe(node);
    });

    test('should add an edge between nodes', () => {
        const parentNode = depGraph.addNode('parent-package', '1.0.0');
        const childNode = depGraph.addNode('child-package', '1.0.0');
        depGraph.addEdge(parentNode, childNode);

        expect(parentNode.dependencies).toContain(childNode);
    });

    test('logGraph should output graph structure', () => {
        const consoleSpy = jest
            .spyOn(console, 'log')
            .mockImplementation(() => {});
        const node = depGraph.addNode('test-package', '1.0.0');
        depGraph.logGraph();

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('test-package@1.0.0')
        );

        consoleSpy.mockRestore();
    });
});
