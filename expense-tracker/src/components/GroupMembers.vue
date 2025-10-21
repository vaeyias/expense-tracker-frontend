<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const currentUser = computed(() => userStore.currentUser?._id || '');

interface User {
  _id: string;
  username: string;
  displayName: string;
  password: string;
}

const props = defineProps<{ groupId: string }>();
const emit = defineEmits<{
  (e: 'close'): void
}>();

const users = ref<User[]>([]);
const newUsername = ref('');
const errorMsg = ref('');

// Load members
const loadUsers = async () => {
  try {
    const res = await axios.post('http://localhost:8000/api/Group/_listMembers', { group: props.groupId });
    const memberIds: string[] = Array.isArray(res.data.members) ? res.data.members : [];
    const allMembers: User[] = [];

    for (const userId of memberIds) {
      const userObjRes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', { user: userId });
      if (userObjRes.data) allMembers.push(userObjRes.data.userInfo);
    }

    users.value = allMembers;
  } catch (err) {
    console.error(err);
    errorMsg.value = 'Failed to load users.';
  }
};

// Add user
const addUser = async () => {
  if (!newUsername.value) {
    errorMsg.value = 'Please enter a username.';
    return;
  }

  try {
    const userRes = await axios.post('http://localhost:8000/api/Authentication/_getUserByUsername', { username: newUsername.value });
    const newUserId = userRes.data.userInfo?._id;

    if (!newUserId) {
      errorMsg.value = 'User not found.';
      return;
    }

    const res = await axios.post('http://localhost:8000/api/Group/addUser', {
      group: props.groupId,
      inviter: currentUser.value,
      newMember: newUserId,
    });

    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }

    // Create debts
    for (const member of users.value) {
      if (member._id === newUserId) continue;
      try {
        await axios.post('http://localhost:8000/api/Debt/createDebt', { userA: newUserId, userB: member._id });
      } catch {}
      await axios.post('http://localhost:8000/api/Folder/addGroupToFolder', {
        user: newUserId,
        folderName: '.root',
        group: props.groupId,
      });
    }

    newUsername.value = '';
    errorMsg.value = '';
    await loadUsers();
  } catch (err) {
    console.error(err);
    errorMsg.value = 'Failed to add user.';
  }
};

// Remove user
const removeUser = async (userId: string) => {
  try {
    const res = await axios.post('http://localhost:8000/api/Group/removeUser', {
      group: props.groupId,
      remover: currentUser.value,
      member: userId,
    });
    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }
    errorMsg.value = '';
    await loadUsers();
  } catch (err) {
    console.error(err);
    errorMsg.value = 'Failed to remove user.';
  }
};

onMounted(loadUsers);
</script>

<template>
  <div class="modal-overlay">
    <div class="modal">
      <h3 class="modal-title">Group Users</h3>

      <div class="input-group">
        <input v-model="newUsername" placeholder="Add user by username" />
        <button @click="addUser">Add</button>
      </div>

      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>

      <ul class="user-list">
        <li v-for="user in users" :key="user._id">
          {{ user.displayName }}
          <button v-if="user._id !== currentUser" @click="removeUser(user._id)" class="remove-btn">
            Remove
          </button>
        </li>
      </ul>

      <button class="close-btn" @click="emit('close')">Close</button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0,0,0,0.6);
  z-index: 2000;
}

.modal {
  background: #fff;
  padding: 2rem;
  border-radius: 0.75rem;
  width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #ccc;
  font-size: 1rem;
}

button {
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius: 0.5rem;
  border: none;
  background-color: black;
  color: white;
  font-weight: 500;
}

button:hover {
  background-color: #357ABD;
}

.user-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  background-color: #f5f5f5;
}

.remove-btn {
  background-color: black;
}

.remove-btn:hover {
  background-color: #357ABD;
}

.error {
  color: #e74c3c;
  font-weight: 500;
  margin-top: -0.5rem;
  margin-bottom: 0.5rem;
  text-align: center;
}

.close-btn {
  margin-top: 1rem;
  background-color: black;
}

.close-btn:hover {
  background-color: #357ABD;
}
</style>
