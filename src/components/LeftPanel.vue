<script setup lang="ts">
// @ts-ignore
import debounce from 'lodash.debounce';
import axios from 'axios';
import { ref } from 'vue';
import { usePackage } from '../stores/selectedPackage.ts';

// type interface for the response JSON
interface PackageItem {
    package: {
        name: string;
        version: string;
    };
}

// Reactive state
const packageName = ref('');
const changedPackageName = ref('');
const packageData = ref<PackageItem[] | null>(null);
const totalResults = ref(0);
const error = ref('');
const loading = ref(false);

// Access shared store
const { updatePackage } = usePackage();


// Methods
const fetchPackageData = async () => {
    if (!packageName.value.trim()) {
        packageData.value = null;
        error.value = '';
        return;
    }

    loading.value = true;
    error.value = '';

    try {
        const response = await axios.get(`https://api.npms.io/v2/search?q=${packageName.value}`);
        totalResults.value = response.data.total;
        packageData.value = response.data.results.slice(0, 5);
    } catch (err) {
        error.value = "Failed to fetch package data from registry.";
        packageData.value = null;
    } finally {
        loading.value = false;
    }
};

const debouncedHandleChange = debounce(() => {
    changedPackageName.value = packageName.value;
    fetchPackageData();
    console.log("Changed Value:", changedPackageName.value);
    console.log(packageData.value);
}, 500);

const handleClick = (pname: string, pversion: string) => {
    updatePackage(pname, pversion);
};
</script>

<template>
    <div id="left-container">
        <div id="title">NPM Dependency Graph</div>

        <div>
        <input
            type="text"
            v-model="packageName"
            @input="debouncedHandleChange"
            placeholder="npm package (ie. express)"
        />
        </div>

        <div v-if="loading">Loading...</div>
        <div id="total-results" v-if="packageData">{{ totalResults }} Total Results</div>

        <div id="results">
        <a
            v-if="packageData"
            v-for="item in packageData"
            :key="item.package.name"
            @click="handleClick(item.package.name, item.package.version)"
        >
            {{ item.package.name }} - {{ item.package.version }}
        </a>
        </div>

        <div v-if="error">{{ error }}</div>
    </div>
</template>

<style scoped>
#left-container > * {
    margin: 1rem;
}

#total-results {
    font-size: 85%;
}

#results {
    display: flex;
    flex-direction: column;
}

#results * {
    font-size: 85%;
    margin: 0.25rem 0;
    font-weight: 200;
}

#results *:hover {
    text-shadow: rgba(221, 224, 172, 0.9) 0px 0px 12px;
}
</style>
