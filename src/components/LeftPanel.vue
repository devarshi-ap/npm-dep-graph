<script setup lang="ts">
// @ts-ignore
import debounce from 'lodash.debounce';
import axios from 'axios';
import { ref } from 'vue';
import { usePackage } from '../stores/selectedPackage.ts';


// Reactive state
const packageName = ref('');
const changedPackageName = ref('');

const packageData = ref<{ package: { name: string } }[] | null>(null);
const totalResults = ref(0);

const error = ref('');
const loading = ref(false);

const hasSelectedPackage = ref(false);

const packageVersions = ref<string[]>([]); // Holds the list of versions
const selectedVersion = ref<string | null>(null); // Tracks the selected version

// Access shared store
const { updatePackage } = usePackage();


// Methods
const fetchPackageData = async () => {
    if (!packageName.value.trim()) {
        packageData.value = null;
        hasSelectedPackage.value = false;
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
        hasSelectedPackage.value = false;
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

// Function to fetch package details
const fetchPackageVersions = async () => {
    try {
        const response = await axios.get(`https://registry.npmjs.org/${packageName.value}`);
        packageVersions.value = Object.keys(response.data.versions);
    } catch (err) {
        error.value = `Failed to fetch versions for ${packageName.value}.`;
        packageVersions.value = [];
    } finally {
        loading.value = false;
    }
};

// Handle version selection
const handleVersionSelect = () => {
    if (packageName.value && selectedVersion.value) {
        updatePackage(packageName.value, selectedVersion.value)
    }
}

const handleClick = () => {
    hasSelectedPackage.value = true;
    fetchPackageVersions();
    selectedVersion.value = null; // Reset selected version when package changes
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
        <div class="subheading" v-if="packageData">[{{ totalResults }} Total Results]</div>

        <div id="results">
        <a
            v-if="packageData"
            v-for="item in packageData"
            :key="item.package.name"
            @click="handleClick"
        >
            {{ item.package.name }}
        </a>
        </div>

        <div v-if="hasSelectedPackage">
            <div v-if="packageVersions.length > 0">
                <label class="subheading" for="version-select">Select a Version:</label>
                <select id="version-select" v-model="selectedVersion" @change="handleVersionSelect">
                    <option value="" disabled>Select a version</option>
                    <option v-for="version in packageVersions" :key="version" :value="version">{{ version }}</option>
                </select>
            </div>
        </div>

        <div v-if="error">{{ error }}</div>
    </div>
</template>

<style scoped>
#left-container > * {
    margin: 1.5rem;
}

.subheading {
    font-size: 0.8rem;
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

label {
    display: block;
    margin-bottom: 0.5rem;
}

select {
    padding: 0.5rem;
    font-size: 1rem;
}

p {
    margin-bottom: 1rem;
}

a {
    cursor: pointer;
    transition: transform 0.5s ease;
}

a:hover {
    transform: scale(1.1); /* Scale up to 1.5x */
}

#version-select {
    width: 30%;
    font-size: 85%;
    font-weight: 200;
}
</style>
