<script setup lang="ts">
import { watch, ref } from 'vue';
// import axios from 'axios';
import { usePackage } from '../stores/selectedPackage';
import { buildDependencyGraph, DependencyGraph, exportAsGraphData } from '../services/dependencyGraph';
import ForceGraph from 'force-graph';

const { packageName, packageVersion } = usePackage();

// @ts-ignore
const depGraph = ref<DependencyGraph | null>(null);
const loading = ref(false); // Add a loading state
const noDependenciesMessage = ref(''); // Ref to hold the message

watch(packageVersion, (newVersion) => {

    if (!newVersion) {
        console.warn('Package version is empty. Skipping graph generation.');
        noDependenciesMessage.value = 'Please select a valid version.';
        loading.value = false; // Ensure loading stops
        return;
    }
    
    // Clear the graph and show the loading spinner
    depGraph.value = null; // Clear the existing graph data
    const graphElement = document.getElementById('graph');
    if (graphElement) {
        graphElement.innerHTML = ''; // Clear the graph container
    }
    noDependenciesMessage.value = ''; // Reset the message
    loading.value = true; // Show the spinner

    buildDependencyGraph(packageName.value, packageVersion.value)
        .then((result) => {
            const rootId = `${packageName.value}@${packageVersion.value}`;

            result.nodes.forEach((node) => {
                node.isRoot = node.id === rootId; // Mark the root node
            });
            const d3Data = exportAsGraphData(result.nodes, rootId);
            if (d3Data.nodes.length === 0 || d3Data.links.length === 0) {
                noDependenciesMessage.value = 'No dependencies found for this package.';
                return;
            }

            console.log(d3Data);

            const myGraph = ForceGraph();
            myGraph(document.getElementById('graph')!)
                .width(document.getElementById('graph')!.clientWidth) // Match parent width
                .height(document.getElementById('graph')!.clientHeight) // Match parent height
                .graphData(d3Data)
                .linkColor((link) => {
                    // Check if the target node is deprecated
                    const targetNode = d3Data.nodes.find(node => node.id === link.target);
                    return targetNode?.group === 1 ? 'rgba(255, 0, 0)' : 'white'; // Red for deprecated nodes, white otherwise
                })
                .linkDirectionalArrowLength(4) // Smaller arrows (default is 6)
                .linkDirectionalArrowRelPos(0.9) // Position arrows in the middle of the link
                .nodeCanvasObject((node, ctx, globalScale) => {
                    const label = node.id;
                    const fontSize = 12 / globalScale; // Scale font size with zoom level
                    ctx.font = `${fontSize}px Sans-Serif`;

                    // Measure text dimensions
                    const textWidth = ctx.measureText(label).width;
                    const padding = 1; // Padding around the text
                    const bckgDimensions = [textWidth + padding * 2, fontSize + padding * 2];

                    // Draw background rectangle with distinct color for root node
                    if (node.isRoot) {
                        ctx.fillStyle = 'rgba(153, 255, 204)'; // Green background for root node
                    } else {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Light background for other nodes
                    }
                    ctx.fillRect(
                        node.x - bckgDimensions[0] / 2,
                        node.y - bckgDimensions[1] / 2,
                        bckgDimensions[0],
                        bckgDimensions[1]
                    );

                    // Draw text
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = node.group === 1 ? 'red' : 'black'; // Change text color for deprecated nodes

                    ctx.fillText(label, node.x, node.y);

                    // Save background dimensions for interactivity (optional)
                    node.__bckgDimensions = bckgDimensions;
                })
                .nodePointerAreaPaint((node, color, ctx) => {
                    // Adjust interactivity to account for the padded area
                    const bckgDimensions = node.__bckgDimensions;
                    if (bckgDimensions) {
                        ctx.fillStyle = color;
                        ctx.fillRect(
                            node.x - bckgDimensions[0] / 2,
                            node.y - bckgDimensions[1] / 2,
                            bckgDimensions[0],
                            bckgDimensions[1]
                        );
                    }
                })
                .nodeRelSize(10)  // Increase the relative node size
                .zoom(2) // Initial zoom level
                .maxZoom(5)  // Maximum zoom level
                .minZoom(0.5)  // Minimum zoom level
                .centerAt(0, 0, 500);  // Center the graph with padding

                // Handle resizing dynamically
                window.addEventListener('resize', () => {
                    const graphElement = document.getElementById('graph'); // Dynamically get the element
                    if (graphElement) {
                        myGraph.width(graphElement.clientWidth).height(graphElement.clientHeight);
                    }
                });
            })
            .finally(() => {
                loading.value = false; // Stop loading
            });
    })
</script>


<template>
    <div id="right-panel">
        <div>{{ packageName }} - {{ packageVersion }}</div>
        <div id="graph-container">
            <div v-if="loading" class="loading-indicator">
                <div class="spinner"></div>
                <p>Loading graph, please wait...</p>
            </div>
            <div id="graph"></div>
        </div>
        <p v-if="noDependenciesMessage">{{ noDependenciesMessage }}</p> <!-- Display the message -->
    </div>
</template>


<style scoped>
#right-panel {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    height: 100%; /* Ensure it takes up full height */
}

#graph-container {
    width: 100%;
    height: calc(100vh - 100px);
    position: relative;
    overflow: hidden;
    border: 1px solid whitesmoke;
    border-radius: 3px;
    display: flex;
    justify-content: center;
    align-items: center;
}

#graph {
    width: 100%; /* Match container width */
    height: 100%; /* Match container height */
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
}

.loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: #555;
    position: absolute;
    top: 50%; /* Vertically center it */
    left: 50%; /* Horizontally center it */
    transform: translate(-50%, -50%); /* Adjust position to be perfectly centered */
}

.spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

p {
    font-size: 16px;
    color: whitesmoke;
    text-decoration: underline;
}
</style>