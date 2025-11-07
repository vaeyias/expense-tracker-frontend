```vue // filepath:
c:\Users\vypha\OneDrive\Documents\fall_2025\6104\expense-tracker-frontend\expense-tracker\src\views\ProfilePage.vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useUserStore } from '../stores/user'
const userStore = useUserStore()

// Get current user from localStorage
const storedUser = localStorage.getItem('currentUser')
const currentUser = storedUser ? JSON.parse(storedUser) : null

const displayName = ref(currentUser?.displayName || '')
const username = currentUser?.username.toLowerCase() || ''
const errorMsg = ref('')
const successMsg = ref('')
const editing = ref(false) // track if in edit mode

const router = useRouter()

// Edit display name function
const saveDisplayName = async () => {
  if (!displayName.value) {
    errorMsg.value = 'Display name cannot be empty.'
    return
  }

  try {
    const res = await axios.post('/api/Authentication/editUser', {
      user: currentUser._id,
      token: currentUser.token,
      newDisplayName: displayName.value,
    })

    if (res.data.error) {
      errorMsg.value = res.data.error
      return
    }

    // Update localStorage with user
    currentUser.displayName = displayName.value
    localStorage.setItem('currentUser', JSON.stringify(currentUser))

    // Update userStore
    userStore.setUser(currentUser)

    successMsg.value = 'Display name updated!'
    errorMsg.value = ''
    editing.value = false // exit edit mode

    // Clear success message after 3 seconds
    setTimeout(() => {
      successMsg.value = ''
    }, 3000)
  } catch (err) {
    errorMsg.value = 'Please enter a different name.'
    console.error(err)
  }
}

// Logout function
const logout = async () => {
  localStorage.removeItem('currentUser')
  userStore.clearUser()
  await axios.post('/api/Authentication/logout', {
    user: currentUser._id,
    token: currentUser.token,
  })
  router.push('/login')
}

// Toggle edit mode
const startEditing = () => {
  editing.value = true
}

// cancel editing helper (UI-only)
const cancelEditing = () => {
  // reset displayName back to currentUser value to avoid partial edits
  displayName.value = currentUser?.displayName || ''
  errorMsg.value = ''
  editing.value = false
}
</script>

<template>
  <div class="profile-root">
    <div class="profile-inner">
      <h1 class="page-title">Profile</h1>

      <div class="identity">
        <div class="display-large" v-if="displayName && !editing">{{ displayName }}</div>

        <!-- If user hasn't set a display name show a placeholder -->
        <div class="display-large muted" v-else-if="!editing">No display name</div>

        <!-- Large username under the display name -->
        <div class="username">@{{ username }}</div>
      </div>

      <!-- Edit area (centered) -->
      <div class="edit-area">
        <template v-if="editing">
          <input
            class="input edit-input"
            autocomplete="off"
            v-model="displayName"
            placeholder="Enter new display name"
          />
          <div class="edit-actions">
            <button class="btn" @click="saveDisplayName">Save</button>
            <button class="btn ghost" @click="cancelEditing">Cancel</button>
          </div>
        </template>

        <template v-else>
          <button class="btn ghost" @click="startEditing">Edit display name</button>
        </template>
      </div>

      <p class="success" v-if="successMsg">{{ successMsg }}</p>
      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>

      <div class="logout-wrap">
        <button class="btn danger logout-btn" @click="logout">Logout</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Root fills available area and centers content */
.profile-root {
  min-height: calc(80vh - 72px); /* account for top nav height roughly */
  display: flex;
  justify-content: center;
  padding: 2rem;
}

/* Inner centered card */
.profile-inner {
  width: min(680px, 92%);
  display: flex;
  flex-direction: column;
  align-items: center; /* center everything horizontally */
  gap: 16px;
  padding: 28px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(6px);
  box-shadow: 0 10px 30px rgba(2, 6, 23, 0.45);
  color: var(--brand-light, #eef6ff);
  text-align: center; /* ensure headings and text are centered */
}

/* Page title at the top */
.page-title {
  margin: 0;
  font-size: 1.25rem;
  color: var(--brand-highlight, #f8dcab);
  font-weight: 800;
  letter-spacing: -0.01em;
}

/* Identity block: large display name then username */
.identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

/* Large display name */
.display-large {
  font-size: 2.1rem;
  font-weight: 800;
  color: var(--brand-light, #fff);
  line-height: 1;
  letter-spacing: -0.02em;
  padding: 6px 10px;
  border-radius: 8px;
}

/* muted placeholder when no display name */
.display-large.muted {
  color: rgba(255, 255, 255, 0.45);
  font-weight: 600;
  font-size: 1.1rem;
}

/* username under the display name */
.username {
  font-size: 0.95rem;
  color: var(--muted, rgba(255, 255, 255, 0.68));
  font-weight: 600;
}

/* Edit area centered */
.edit-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-top: 6px;
}

/* input styling */
.edit-input {
  width: min(420px, 90%);
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.2);
  color: var(--brand-light, #fff);
  outline: none;
  text-align: center;
}
.edit-input:focus {
  border-color: var(--brand-vivid, #92317e);
  box-shadow: 0 6px 24px rgba(146, 49, 126, 0.12);
}

/* Actions next to input */
.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  width: 100%;
}

/* danger / logout */
.btn.danger {
  background: linear-gradient(90deg, rgba(220, 40, 60, 0.95), rgba(160, 20, 40, 0.95));
  color: white;
}

/* messages */
.success {
  color: var(--brand-highlight, #b8ffcf);
  font-weight: 700;
}
.error {
  color: #ff7b7b;
  font-weight: 700;
}

/* logout wrapper */
.logout-wrap {
  margin-top: 6px;
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .display-large {
    font-size: 1.6rem;
  }
  .page-title {
    font-size: 1.05rem;
  }
  .btn {
    min-width: 72px;
    padding: 8px 10px;
  }
  .profile-inner {
    padding: 18px;
  }
  .edit-input {
    width: 100%;
  }
}
</style>
```
