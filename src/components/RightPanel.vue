<script setup lang="ts">
import { watch, ref } from 'vue';
// import axios from 'axios';
import { usePackage } from '../stores/selectedPackage';
import { buildDependencyGraph, DependencyGraph, exportAsGraphData } from '../services/dependencyGraph';
import { npmPackage } from '../types/dependencyGraphTypes';
import { VNetworkGraph } from "v-network-graph";
import "v-network-graph/lib/style.css";

const nodes = {
    node1: { name: "Node 1" },
    node2: { name: "Node 2" },
    node3: { name: "Node 3" },
    node4: { name: "Node 4" },
}

const edges = {
    edge1: { source: "node1", target: "node2" },
    edge2: { source: "node2", target: "node3" },
    edge3: { source: "node3", target: "node4" },
}

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
        });
    })
</script>


<template>
    <div id="right-panel">
        <div>{{ packageName }} - {{ packageVersion }}</div>
        <div v-if="packDeps">{{ packDeps }}</div>
        <hr />
        <div v-if="makeGraphFlag">
            <VNetworkGraph
                class="graph"
                :nodes="nodes"
                :edges="edges"
            />
        </div>
    </div>
</template>


<style scoped>
#right-panel {
    padding: 1rem;
}

.graph {
    width: 800px;
    height: 600px;
    border: 1px solid #000;
}
</style>