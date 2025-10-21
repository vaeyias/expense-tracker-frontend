<template>
  <div class="group-card" @click="$emit('click')">
<img src="../assets/groupIcon.png" alt="groupIcon" width="80" height="80">
    <h3>{{ name }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps<{
  name: string;
  description: string;
}>();
</script>

<style scoped>
.group-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin: 1rem;
}


.group-card h3 {
  margin: 0;
  font-size: 1rem;
}

.group-card p {
  margin: 0;
  font-size: 0.85rem;
  color: #555;
}
</style>
