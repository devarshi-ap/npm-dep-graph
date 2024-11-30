<script setup lang="ts">
import { watch, ref } from 'vue';
// import axios from 'axios';
import { usePackage } from '../stores/selectedPackage';
import { buildDependencyGraph, DependencyGraph, exportAsGraphData } from '../services/dependencyGraph';
import { npmPackage } from '../types/dependencyGraphTypes';
import ForceGraph from 'force-graph';

const { packageName, packageVersion } = usePackage();

const packDeps = ref<npmPackage | null>(null);
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
                .linkDirectionalArrowLength(4) // Smaller arrows (default is 6)
                .linkDirectionalArrowRelPos(0.5) // Position arrows in the middle of the link
                .linkDirectionalArrowColor(link => {
                    // Optional: Customize arrow color
                    const targetNode = d3Data.nodes.find(node => node.id === link.target);
                    return targetNode?.group === 1 ? 'red' : '#999'; // Red for deprecated, default for others
                })
                .nodeCanvasObject((node, ctx, globalScale) => {
                    const label = node.id;
                    const fontSize = 12 / globalScale; // Scale font size with zoom level
                    ctx.font = `${fontSize}px Sans-Serif`;

                    // Measure text dimensions
                    const textWidth = ctx.measureText(label).width;
                    const padding = 4; // Padding around the text
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
        });
    })
</script>


<template>
    <div id="right-panel">
        <div>{{ packageName }} - {{ packageVersion }}</div>
        <div id="graph"></div>
    </div>
</template>


<style scoped>
#right-panel {
    padding: 1rem;
}

#graph {
    background-color: aliceblue;
}
</style>