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
    const res = await axios.post('http://localhost:8000/api/Authentication/editUser', {
      user: currentUser._id,
      newDisplayName: displayName.value
    });

    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }

    // Update localStorage with user
    currentUser.displayName = displayName.value;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Update userStore
    userStore.setUser(currentUser);

    successMsg.value = 'Display name updated!';
    errorMsg.value = '';
    editing.value = false; // exit edit mode

    // Clear success message after 3 seconds
    setTimeout(() => {
      successMsg.value = '';
    }, 3000);

  } catch (err) {
    errorMsg.value = 'Please enter a different name.';
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
  <div class="profile-container">
    <h1>Profile</h1>
    <p><strong>Username:</strong> {{ username }}</p>

    <div class="edit-section">
      <label for="displayName">Display Name:</label>

      <!-- Show text or input based on edit mode -->
      <span v-if="!editing">{{ displayName }}</span>
      <input v-else id="displayName" v-model="displayName" placeholder="Enter new display name" />

      <!-- Buttons -->
      <button v-if="!editing" @click="startEditing">Edit</button>
      <button v-else @click="saveDisplayName">Save</button>
    </div>

    <p class="success" v-if="successMsg">{{ successMsg }}</p>
    <p class="error" v-if="errorMsg">{{ errorMsg }}</p>

    <button class="logout-btn" @click="logout">Logout</button>
  </div>
</template>

<style scoped>
.profile-container {
  width: 100vw;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content:left;
  padding:2rem;
  color:black;
  font-size:1rem;


}

.edit-section {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

input {
  flex: 1;
  padding: 0.5rem;
  font-size: 1rem;
  max-width: 250px;

}

button {
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius:0.5rem;
  width:5rem;
}

.logout-btn {
  margin-top: 2rem;
  background-color: black;
  color: white;
  border: none;
  border-radius: 0.25rem;
}

.error {
  color: red;
}

.success {
  color: green;
}
</style>
