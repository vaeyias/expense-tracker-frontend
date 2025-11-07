---
timestamp: 'Mon Oct 20 2025 23:57:07 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_235707.ea44d4df.md]]'
content_id: de29a996a34dbbebe3810fbf2969de778b12f2248ee8bcc074c99586763f4a84
---

# response:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useUserStore } from '../stores/user';
const userStore = useUserStore();

// Get current user from localStorage
const storedUser = localStorage.getItem('currentUser');
const currentUser = storedUser ? JSON.parse(storedUser) : null;

const displayName = ref(currentUser?.displayName || '');
const username = currentUser?.username || '';
const errorMsg = ref('');
const successMsg = ref('');
const editing = ref(false); // track if in edit mode

const router = useRouter();

// Edit display name function
const saveDisplayName = async () => {
  if (!displayName.value) {
    errorMsg.value = 'Display name cannot be empty.';
    return;
  }

  try {
    const res = await axios.post('http://localhost:8000/api/Authenticate/editUser', {
      user: currentUser._id,
      newDisplayName: displayName.value
    });

    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }

    // Update localStorage
    currentUser.displayName = displayName.value;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    successMsg.value = 'Display name updated!';
    errorMsg.value = '';
    editing.value = false; // exit edit mode
  } catch (err) {
    errorMsg.value = 'Failed to update display name.';
    console.error(err);
  }
};

// Logout function
const logout = () => {
  localStorage.removeItem('currentUser');
  userStore.clearUser();
  router.push('/login');
};

// Toggle edit mode
const startEditing = () => {
  editing.value = true;
};
</script>

<template>
  <div class="profile-page">
    <div class="profile-card">
      <h1>Profile</h1>

      <div class="profile-info">
        <p class="info-label">Username:</p>
        <p class="info-value">{{ username }}</p>
      </div>

      <div class="edit-section">
        <p class="info-label">Display Name:</p>
        <div class="display-name-wrapper">
          <span v-if="!editing" class="info-value">{{ displayName }}</span>
          <input v-else id="displayName" v-model="displayName" placeholder="Enter new display name" />
        </div>

        <button v-if="!editing" @click="startEditing" class="edit-button">Edit</button>
        <button v-else @click="saveDisplayName" class="save-button">Save</button>
      </div>

      <p v-if="successMsg" class="message success">{{ successMsg }}</p>
      <p v-if="errorMsg" class="message error">{{ errorMsg }}</p>

      <button @click="logout" class="logout-button">Logout</button>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f8f9fa; /* Light background for contrast */
  color: #333; /* Dark text for readability */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.profile-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 3rem 2.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  text-align: center;
}

h1 {
  font-size: 2.2rem;
  margin-bottom: 1rem;
  color: #212529;
  font-weight: 600;
}

.profile-info,
.edit-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 1rem;
}

.profile-info:last-child,
.edit-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-label {
  font-weight: 500;
  color: #555;
  text-align: left;
  flex-shrink: 0; /* Prevent label from shrinking */
  margin-right: 1rem;
}

.info-value {
  font-weight: 400;
  color: #333;
  text-align: right;
  word-break: break-word; /* Prevent long words from overflowing */
}

.edit-section {
  flex-wrap: wrap; /* Allow items to wrap on smaller screens */
}

.edit-section .info-label {
  flex-basis: 120px; /* Fixed width for the label */
}

.display-name-wrapper {
  flex-grow: 1; /* Allow this wrapper to take available space */
  text-align: right;
}

input[type="text"],
input[placeholder] {
  width: 100%;
  padding: 0.6rem 0.8rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-sizing: border-box;
  transition: border-color 0.2s ease-in-out;
}

input[type="text"]:focus,
input[placeholder]:focus {
  outline: none;
  border-color: #007bff; /* Highlight color on focus */
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.edit-button,
.save-button,
.logout-button {
  padding: 0.7rem 1.2rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease;
  white-space: nowrap; /* Prevent button text from wrapping */
}

.edit-button {
  background-color: #007bff;
  color: white;
  margin-left: 1rem; /* Space between display name and edit button */
}

.edit-button:hover {
  background-color: #0056b3;
}

.save-button {
  background-color: #28a745;
  color: white;
  margin-left: 1rem;
}

.save-button:hover {
  background-color: #218838;
}

.logout-button {
  background-color: #dc3545;
  color: white;
  margin-top: 1.5rem; /* Space above the logout button */
}

.logout-button:hover {
  background-color: #c82333;
}

.edit-button:active,
.save-button:active,
.logout-button:active {
  transform: translateY(1px);
}

.message {
  font-size: 0.9rem;
  margin-top: 0.5rem;
  padding: 0.5rem 0;
  width: 100%;
  border-radius: 4px;
  text-align: center;
}

.success {
  color: #155724;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.error {
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}
</style>
```
