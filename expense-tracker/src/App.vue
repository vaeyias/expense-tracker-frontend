<template>
  <body>
    <NavBar />
    <router-view />
  </body>
</template>

<script setup lang="ts">
import NavBar from './components/NavBar.vue';
</script>

<style>
body {
  position:fixed;
  display: flex;
  flex-direction: column; /* stack children vertically */
  height: 100vh; /* optional, to cover full viewport */
  width:100vw;
  top:0;
  left:0;
  background-color:white;
  z-index: 888;

}
router-view {
  flex: 1; /* take remaining space */
}
</style>
