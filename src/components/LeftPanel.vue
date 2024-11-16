<script>
import debounce from 'lodash.debounce';
import axios from 'axios';

export default {
    data() {
        return {
            inputValue: '',        // Bind to the text input
            changedValue: ''     // Stores the submitted text
        };
    },
    methods: {
        handleChange() {
            this.changedValue = this.inputValue;
            console.log("Changed Value:", this.changedValue);
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
            <input type="text" v-model="inputValue" @input="debouncedHandleChange" placeholder="npm package (ie. express)"/>
            <!-- <button @click="handleSubmit">Submit</button> -->
        </div>

        <div v-if="changedValue">{{ changedValue }}</div>
    </div>
</template>


<style scoped>
#left-container > * {
    margin: 1rem;
}
</style>