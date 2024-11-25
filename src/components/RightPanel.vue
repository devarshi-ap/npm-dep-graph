<script setup lang="ts">
import { watch, ref } from 'vue';
// import axios from 'axios';
import { usePackage } from '../stores/selectedPackage';
import { buildDependencyGraph, DependencyGraph, exportAsGraphData } from '../services/dependencyGraph';
import { npmPackage } from '../types/dependencyGraphTypes';
// import * as d3 from 'd3';

const { packageName, packageVersion } = usePackage();

const packDeps = ref<npmPackage | null>(null);
const depGraph = ref<DependencyGraph | null>(null)

watch(packageVersion, () => {
    console.log(`Package: ${packageName.value}\nVersion: ${packageVersion.value}`);
    buildDependencyGraph(packageName.value, packageVersion.value)
        .then((result) => {
            const d3Data = exportAsGraphData(result.nodes);
            console.log(d3Data);
        });
    })
</script>


<template>
    <div id="right-panel">
        <div>{{ packageName }} - {{ packageVersion }}</div>
        <div v-if="packDeps">{{ packDeps }}</div>
        <hr />
        <div v-if="depGraph">
            <svg></svg>
        </div>
    </div>
</template>


<style scoped>
#right-panel {
    padding: 1rem;
}
</style>