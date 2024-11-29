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
const makeGraphFlag = ref<Boolean>(false);

watch(packageVersion, () => {
    console.log(`Package: ${packageName.value}\nVersion: ${packageVersion.value}`);
    buildDependencyGraph(packageName.value, packageVersion.value)
        .then((result) => {
            const d3Data = exportAsGraphData(result.nodes);
            makeGraphFlag.value = true
            console.log(d3Data);

            const myGraph = ForceGraph();
            myGraph(document.getElementById('graph')!)
                .graphData(d3Data)
                .linkDirectionalArrowLength(6);
        });
    })
</script>


<template>
    <div id="right-panel">
        <div>{{ packageName }} - {{ packageVersion }}</div>
        <div v-if="packDeps">{{ packDeps }}</div>
        <hr />
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