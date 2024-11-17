<script setup lang="ts">
// import { watch } from 'vue';
// import axios from 'axios';
import { usePackage } from '../stores/selectedPackage';

const { packageName, packageVersion } = usePackage();

// watch(packageVersion, (latestVersion) => {

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
