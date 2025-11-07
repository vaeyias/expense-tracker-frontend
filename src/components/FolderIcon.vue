<template>
  <div class="folder-icon" @click="$emit('click')">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      :width="80"
      :height="80"
    >
      <defs>
        <linearGradient id="folderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--brand-vivid)" />
          <stop offset="100%" stop-color="var(--brand-mid)" />
        </linearGradient>
      </defs>
      <path
        d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5l3 3h9a2 2 0 0 1 2 2z"
        fill="url(#folderGradient)"
      ></path>
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
  margin:0.5rem;
}

.folder-icon p {
  font-size: 1rem;
  text-align: center;
  margin: 0;
}
</style>
