<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const displayName = computed(() => userStore.currentUser?.displayName || '');
const username = computed(() => userStore.currentUser?.username || '');

// helper to check active route for underline persistence
const route = useRoute();
function isActive(path: string) {
  // exact match; adapt if you want prefix matching (startsWith)
  return route.path === path;
}
</script>

<template>
  <header class="app-header">
    <div class="container" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <!-- Left: logo + title + user names -->
      <div class="left row" style="align-items:center; gap:12px;">
        <div class="logo center" aria-hidden>
          <div class="logo-badge">ET</div>
        </div>

        <div class="title-block">
          <div class="app-title">Moni</div>
        </div>

        <!-- user names shown after title (keeps everything left grouped) -->
        <div v-if="displayName || username" class="user-names">
          <div class="display-name" v-if="displayName">{{ displayName }}</div>
          <div class="username" v-if="username">@{{ username }}</div>
        </div>
      </div>

      <!-- Right: nav links (kept at the right end) -->
<nav class="right-nav" aria-label="Main navigation">
  <a class="nav-link" :class="{ active: isActive('/') }" href="/">Home</a>
  <a class="nav-link" :class="{ active: isActive('/debts') }" href="/debts">Debts</a>
  <a class="nav-link" :class="{ active: isActive('/profile') }" href="/profile">Profile</a>
</nav>    </div>
  </header>
</template>

// ...existing code...
<style scoped>
.app-header {
  padding: 5px 0;
  background: linear-gradient(20deg, var(--brand-deep), var(--card));
}
.container {
  max-width: 100%;
}
.logo-badge {
  width:44px;
  height:44px;
  border-radius:10px;
  background: linear-gradient(135deg, var(--brand-mid), var(--brand-deep));
  display:flex;
  align-items:center;
  justify-content:center;
  color:var(--brand-light);
  font-weight:700;
  font-size:1rem;
  box-shadow: var(--shadow-tight);
}
.title-block .app-title {
  font-weight:800;
  color:var(--brand-highlight);
  stroke-width: 1%;
  line-height:1;
  font-size:1.5rem;
}
.title-block .app-sub {
  font-size:0.82rem;
  color:var(--brand-light);
  margin-top:2px;
}
/* user names styling */
.user-names {
  margin-left: 12px;
  display:flex;
  flex-direction:column;
  gap:2px;
  align-items:flex-start;
  color:var(--brand-light)
;
}
.user-names .display-name {
  font-weight:600;
  font-size:0.97rem;
}
.user-names .username {
  font-size:0.97rem;
  color:var(--muted);
  font-weight:500;
}
/* nav links aligned to the far right */
.right-nav {
  display:flex;
  gap:12px;
  align-items:flex-end;
}
.nav-link {
  position: relative; /* needed for pseudo-element */
  padding: 8px 12px;
  border-radius: 10px;
  color: var(--brand-light);
  text-decoration: none;
  font-weight: 600;
  transition: transform .12s ease, background .12s ease, color .12s ease;
  font-size: 1.2rem;
  overflow: visible;
}

/* animated underline using --brand-vivid */
.nav-link::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 6px;
  height: 3px;
  background: linear-gradient(90deg, var(--brand-vivid), var(--brand-vivid));
  border-radius: 2px;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform .18s cubic-bezier(.2,.8,.2,1), opacity .12s ease;
  opacity: 0;
  pointer-events: none;
}

/* show underline on hover / focus */
.nav-link:hover::after,
.nav-link:focus::after {
  transform: scaleX(1);
  opacity: 1;
}

/* if you mark a nav item as active (add .active), keep underline visible */
.nav-link.active::after {
  transform: scaleX(1);
  opacity: 1;
}

.nav-link:hover {
  transform: translateY(-2px);
  /* background: linear-gradient(20deg, var(--brand-vivid), var(--brand-deep)); */
  width: 100%; /* preserves existing behavior */
}

/* responsive: collapse nav links on small screens */
@media (max-width: 700px) {
  .right-nav { display: none; }
  .user-names { display: none; } /* optional: hide user names on very small screens */
}
</style>
