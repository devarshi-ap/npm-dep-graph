<script setup lang="ts">
import { watch, ref } from 'vue';
// import axios from 'axios';
import { usePackage } from '../stores/selectedPackage';
import { buildDependencyGraph, DependencyGraph } from '../services/dependencyGraph';
import { npmPackage } from '../types/dependencyGraphTypes';
import { cleanVersion } from '../utils'

const { packageName, packageVersion } = usePackage();

const packDeps = ref<npmPackage | null>(null);
const depGraph = ref<DependencyGraph | null>(null)

watch(packageVersion, () => {
    console.log(`Package: ${packageName.value}\nVersion: ${packageVersion.value}`);
    // @ts-ignore
    depGraph.value = buildDependencyGraph(packageName.value, cleanVersion(packageVersion.value))
})
</script>


<template>
    <div id="right-panel">
        <div>{{ packageName }} - {{ packageVersion }}</div>
        <div v-if="packDeps">{{ packDeps }}</div>
        <div v-if="depGraph">hi</div>
    </div>
</template>


<style scoped>
#right-panel {
    padding: 1rem;
}
</style>