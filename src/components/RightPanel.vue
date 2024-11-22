<script setup lang="ts">
import { watch, ref } from 'vue';
// import axios from 'axios';
import { usePackage } from '../stores/selectedPackage';
import { getDependencies } from '../services/dependencyGraph';
import { npmPackage } from '../types/dependencyGraphTypes';

const { packageName, packageVersion } = usePackage();

const packDeps = ref<npmPackage | null>(null);

watch(packageVersion, () => {
    console.log(`Package: ${packageName.value}\nVersion: ${packageVersion.value}`);
    getDependencies(packageName.value, packageVersion.value)
        .then(result => {
            packDeps.value = result;
        })
        .catch(err => {
            console.log(err);
        })
})
</script>


<template>
    <div id="right-panel">
        <div>{{ packageName }} - {{ packageVersion }}</div>
        <div v-if="packDeps">{{ packDeps }}</div>
    </div>
</template>


<style scoped>
#right-panel {
    padding: 1rem;
}
</style>