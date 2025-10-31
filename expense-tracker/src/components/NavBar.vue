

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';

const router = useRouter();
const userStore = useUserStore();

const displayName = computed(() => userStore.currentUser?.displayName || '');
const username = computed(() => userStore.currentUser?.username || '');

const route = useRoute();
function isActive(path: string) {
  return route.path === path;
}

// 🧭 navigation helpers
function goHome() {
  router.push('/');
}
function goProfile() {
  router.push('/profile');
}
</script>

<template>
  <header class="app-header">
    <div class="container" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <!-- Left: logo + title + user names -->
      <div class="left row" style="align-items:center; gap:10px;">
  <div class="logo center" aria-hidden @click="goHome" style="cursor:pointer;">
    <img
      src="../assets/fish6_purple.png"
      alt="Moni logo"
      style="width:80px; object-fit:contain; margin:0;"
    />
  </div>

  <div class="title-block">
    <div class="app-title">Moni</div>
  </div>

  <div
    v-if="displayName || username"
    class="user-names"
    @click="goProfile"
    style="cursor:pointer;"
  >
    <div class="display-name" v-if="displayName">{{ displayName }}</div>
    <div class="username" v-if="username">@{{ username }}</div>
  </div>
</div>


      <!-- Right: nav links -->
      <nav class="right-nav" aria-label="Main navigation">
        <a class="nav-link" :class="{ active: isActive('/') }" href="/">Home</a>
        <a class="nav-link" :class="{ active: isActive('/debts') }" href="/debts">Debts</a>
        <a class="nav-link" :class="{ active: isActive('/profile') }" href="/profile">Profile</a>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: linear-gradient(20deg, var(--brand-deep), var(--card));
  padding: 10px 0; /* thinner top/bottom padding */
}

.container {
  max-width: 100%;
  padding: 5px 15px; /* adds a bit of horizontal breathing room */
  min-height: 52px; /* controls total height */
}

.title-block .app-title {
  font-weight: 800;
  color: var(--brand-highlight);
  line-height: 1;
  font-size: 1.5rem; /* slightly smaller title */
  margin-left: 0;
  text-align: left; /* 👈 aligns text to the left */
}


.title-block .app-sub {
  font-size: 1rem;
  color: var(--brand-light);
  margin-top: 2px;
}

/* user names styling */
.user-names {
  margin-left: 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  align-items: flex-start;
  color: var(--brand-light);

}
.user-names .display-name {
  font-weight: 600;
  font-size: 1.2rem;
}
.user-names .username {
  font-size: 1rem;
  color: var(--muted);
  font-weight: 500;
}

/* nav links aligned to the far right */
.right-nav {
  display: flex;
  gap: 10px;
  align-items: center;
}

.nav-link {
  position: relative;
  padding: 6px 10px;
  border-radius: 8px;
  color: var(--brand-light);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.2rem;
}

/* underline animation */
.nav-link::after {
  content: "";
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 4px;
  height: 2px;
  background: var(--brand-vivid);
  border-radius: 2px;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.18s cubic-bezier(.2, .8, .2, 1), opacity 0.12s ease;
  opacity: 0;
  pointer-events: none;
}

.nav-link:hover::after,
.nav-link:focus::after,
.nav-link.active::after {
  transform: scaleX(1);
  opacity: 1;
}

.nav-link:hover {
  transform: translateY(-1px);
}

/* responsive */
@media (max-width: 700px) {
  .right-nav { display: none; }
  .user-names { display: none; }
}
</style>
