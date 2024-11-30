<script setup lang="ts">
import { watch, ref } from 'vue';
// import axios from 'axios';
import { usePackage } from '../stores/selectedPackage';
import { buildDependencyGraph, DependencyGraph, exportAsGraphData } from '../services/dependencyGraph';
import ForceGraph from 'force-graph';

const { packageName, packageVersion } = usePackage();

// @ts-ignore
const depGraph = ref<DependencyGraph | null>(null);

watch(packageVersion, () => {
    console.log(`Package: ${packageName.value}\nVersion: ${packageVersion.value}`);
    buildDependencyGraph(packageName.value, packageVersion.value)
        .then((result) => {
            const rootId = `${packageName.value}@${packageVersion.value}`;
            const d3Data = exportAsGraphData(result.nodes, rootId);

            console.log(d3Data);

            const myGraph = ForceGraph();
            myGraph(document.getElementById('graph')!)
                .graphData(d3Data)
                .linkColor((link) => {
                    // Check if the target node is deprecated
                    const targetNode = d3Data.nodes.find(node => node.id === link.target);
                    return targetNode?.group == 1 ? 'red' : 'white'; // Red for deprecated nodes, white otherwise
                })
                .linkDirectionalArrowLength(4) // Smaller arrows (default is 6)
                .linkDirectionalArrowRelPos(0.9) // Position arrows in the middle of the link
                .linkDirectionalArrowColor(link => {
                    const targetNode = d3Data.nodes.find(node => node.id === link.target);
                    return targetNode?.group == 1 ? 'red' : 'white'; // Red for deprecated, default for others
                })
                .nodeCanvasObject((node, ctx, globalScale) => {
                    const label = node.id;
                    const fontSize = 12 / globalScale; // Scale font size with zoom level
                    ctx.font = `${fontSize}px Sans-Serif`;

                    // Measure text dimensions
                    const textWidth = ctx.measureText(label).width;
                    const padding = 1; // Padding around the text
                    const bckgDimensions = [textWidth + padding * 2, fontSize + padding * 2];

                    // Draw background rectangle
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Light background with transparency
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
                    if (node.isRoot) ctx.fillStyle = 'green'; // green for root node

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
        });
    })
</script>


<template>
    <div id="right-panel">
        <div>{{ packageName }} - {{ packageVersion }}</div>
        <div id="graph-container">
            <div id="graph"></div>
        </div>
    </div>
</template>


<style scoped>
#right-panel {
    padding: 1rem;
}

#graph-container {
  width: 100%; /* Full width of the parent container */
  height: 50vh; /* Half the viewport height */
  position: relative; /* For proper scaling */
}

#graph {
  width: 100%;
  height: 100%;
}
</style>