<template>
  <div class="folder-icon" @click="$emit('click')">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 24 24"
      width="80"
      height="80"
    >
      <path d="M10 4H2v16h20V6H12l-2-2z"/>
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
  gap: 0.5rem; /* increase spacing for bigger icon */
}

.folder-icon p {
  font-size: 1rem; /* slightly larger text */
  text-align: center;
  margin: 0;
}
</style>
