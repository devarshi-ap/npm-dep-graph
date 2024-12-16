<script setup lang="ts">
import LeftPanel from './components/LeftPanel.vue'
import RightPanel from './components/RightPanel.vue'
</script>

<template>
    <div class="container">
        <LeftPanel class="left-panel"/>
        <RightPanel class="right-panel"/>
    </div>
</template>

<style scoped>
.container {
    display: flex;
    height: 100vh; /* Full viewport height */
    width: 100vw;  /* Full viewport width */
    box-sizing: border-box; /* Include padding/borders in width & height */
}

.left-panel {
    flex: 1; /* Take 1 part of the flex space */
    overflow: auto; /* Allow content to scroll if overflowing */
}

.right-panel {
    flex: 3; /* Take 3 parts of the flex space */
    background-color: rgb(100, 132, 136); /* Optional: For visual debugging */
    overflow: hidden; /* Prevent content overflow */
}

</style>
