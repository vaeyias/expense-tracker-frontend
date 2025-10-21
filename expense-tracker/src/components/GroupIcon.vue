<template>
  <div class="folder-icon" @click="$emit('click')">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 24 24"
      width="80"
      height="80"
    >
      <!-- group icon -->
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
    <p>{{ name }}</p>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps<{
  name: string;
}>();
</script>

<style scoped>
.folder-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  gap: 0.5rem; /* same spacing as FolderIcon */
}

.folder-icon p {
  font-size: 1rem; /* same text size as FolderIcon */
  text-align: center;
  margin: 0;
}
</style>
