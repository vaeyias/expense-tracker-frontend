<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '../stores/user';
const userStore = useUserStore();
const displayName = computed(() => userStore.currentUser?.displayName || '');
</script>

<template>
  <nav class="navbar">
    <span class="username">{{ displayName }}</span>
    <a href="/">Home</a>
    <a href="/debts">Debts</a>
    <a href="/profile">Profile</a>
  </nav>
</template>

<style scoped>
.navbar {
  width: 100%;
  background-color: #333;
  color: white;
  padding: 0.5rem 1.5rem;
  display: flex;
  gap: 2rem;
  align-items: center;
  justify-content: end;
  /* position: absolute; */
  top: 0;
  left: 0;
  z-index: 1000;
}
.username {
  margin-right: auto; /* pushes links to the right */
  font-weight: bold;
}
.navbar a {
  padding: 0.5rem;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  text-align: center;
  font-size: 1rem;
}
</style>
