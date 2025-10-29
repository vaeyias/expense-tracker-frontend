<template>
  <div class="group-card" @click="$emit('click')">
    <div class="colored-icon"></div>
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
  cursor: pointer;
  margin: 1rem;
}

.colored-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(150deg, var(--brand-mid), var(--brand-vivid));
  -webkit-mask-image: url('../assets/groupIcon.png');
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  -webkit-mask-position: center;
  mask-image: url('../assets/groupIcon.png');
  mask-repeat: no-repeat;
  mask-size: contain;
  mask-position: center;
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
