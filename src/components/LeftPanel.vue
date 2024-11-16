<script>
export default {
    data() {
        return {
            inputValue: '',        // Bind to the text input
            submittedValue: ''     // Stores the submitted text
        };
    },
    methods: {
        handleSubmit() {
        if (this.inputValue.trim()) {
            this.submittedValue = this.inputValue; // Save the input value
            console.log("Submitted Value:", this.inputValue); // Log the value
            this.inputValue = ''; // Clear the input field
        } else {
            alert("Please enter some text!"); // Alert if input is empty
        }
        }
    }
};

</script>

<template>
    <div>
        <div>NPM Dependency Graph</div>
        <hr/>
        <input 
            type="text"
            v-model="inputValue"
            placeholder="Npm Package Name"
        />
        <button @click="handleSubmit">Submit</button>

        <div v-if="submittedValue">{{ submittedValue }}</div>
    </div>
</template>


<style></style>