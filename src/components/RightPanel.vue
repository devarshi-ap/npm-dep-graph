<script setup lang="ts">

import {usePackage} from '../stores/selectedPackage.ts'

const { packageName, packageVersion } = usePackage()

</script>

<template>
    <p style="border: 1px solid blue;">{{ packageName }} {{ packageVersion }}</p>
</template>

<style></style>