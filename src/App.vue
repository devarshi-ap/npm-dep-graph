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
    height: 100vh;
}

.left-panel {
    flex: 1;
}

.right-panel {
    flex: 3;
}
</style>
