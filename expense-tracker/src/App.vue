<template>
  <div id="app">
    <NavBar />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import NavBar from './components/NavBar.vue';
</script>

<style>
#app {
  display: flex;
  flex-direction: column; /* stack children vertically */
  height: 100vh; /* optional, to cover full viewport */
}
router-view {
  flex: 1; /* take remaining space */
}
</style>
