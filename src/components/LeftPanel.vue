<script>
import debounce from 'lodash.debounce';
import axios from 'axios';

export default {
    data() {
        return {
            packageName: '',        // Bind to the text input
            changedPackageName: ''     // Stores the submitted text
        };
    },
    methods: {
        handleChange() {
            this.changedPackageName = this.packageName;
            console.log("Changed Value:", this.changedPackageName);
        },
        debouncedHandleChange: debounce(function() {
            this.handleChange();
        }, 500)
    }
};

</script>

<template>
    <div id="left-container">
        <div id="title">NPM Dependency Graph</div>

        <div>
            <input type="text" v-model="packageName" @input="debouncedHandleChange" placeholder="npm package (ie. express)"/>
            <!-- <button @click="handleSubmit">Submit</button> -->
        </div>

        <div v-if="changedPackageName">{{ changedPackageName }}</div>
    </div>
</template>


<style scoped>
#left-container > * {
    margin: 1rem;
}
</style>