<script setup lang="ts">
import { watch } from 'vue';
// import axios from 'axios';
import { usePackage } from '../stores/selectedPackage';
import { getDependencies } from '../services/dependencyGraph';

const { packageName, packageVersion } = usePackage();

watch(packageVersion, () => {
    console.log(`Package: ${packageName.value}\nVersion: ${packageVersion.value}`);
    getDependencies(packageName.value, packageVersion.value)
})

// });
</script>

<template>
    <div id="right-panel">
        <div>{{ packageName }} - {{ packageVersion }}</div>
    </div>
</template>

<style scoped>
#right-panel {
    padding: 1rem;
}
</style>
