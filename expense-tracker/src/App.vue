//// filepath: c:\Users\vypha\OneDrive\Documents\fall_2025\6104\expense-tracker-frontend\expense-tracker\src\App.vue
<template>
  <div class="app-root">
    <NavBar />
    <main class="view-container">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import NavBar from './components/NavBar.vue';
</script>

<style>
/* Allow the app to scroll naturally and let views control their own overflow. */
.app-root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background-color: var(--bg, #ffffff);
}

/* The central view area grows and scrolls when content overflows */
.view-container {
  flex: 1;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

/* optional small reset for router-view children */
.view-container > * {
  min-height: 100%;
  box-sizing: border-box;
}
</style>
