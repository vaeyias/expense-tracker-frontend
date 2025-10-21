<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useUserStore } from '../stores/user';

// Get current user ID from Pinia store
const userStore = useUserStore();
const currentUser = computed(() => userStore.currentUser?._id || '');

interface User {
  _id: string;
  username: string;
  displayName:string;
  password:string;
}

const props = defineProps<{ groupId: string }>();
const emit = defineEmits<{
  (e: 'close'): void
}>();

const users = ref<User[]>([]);
const newUsername = ref(''); // let user type username
const errorMsg = ref('');

// Load members of the group
const loadUsers = async () => {
  try {
    const res = await axios.post('http://localhost:8000/api/Group/_listMembers', { group: props.groupId });

    const memberIds: string[] = Array.isArray(res.data.members) ? res.data.members : [];
    const allMembers: User[] = [];
    console.log(memberIds);

    for (const userId of memberIds) {
      const userObjRes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', {
        user:userId,
      });
      console.log(userObjRes);
      if (userObjRes.data) allMembers.push(userObjRes.data.userInfo);
    }

    users.value = allMembers;
  } catch (err) {
    console.error(err);
  }
};

// Add user by username
const addUser = async () => {
  if (!newUsername.value) return;

  try {
    // Lookup user ID by username
    const userRes = await axios.post('http://localhost:8000/api/Authentication/_getUserByUsername', {
      username: newUsername.value
    });
    const newUserId = userRes.data.userInfo._id;
    if (!newUserId) {
      errorMsg.value = 'User not found';
      return;
    }

    // Add the user to the group
    const res = await axios.post('http://localhost:8000/api/Group/addUser', {
      group: props.groupId,
      inviter: currentUser.value,
      newMember: newUserId,
    });

    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }

    // ✅ Create debts between new member and all existing members
    for (const member of users.value) {
      if (member._id === newUserId) continue; // skip self

      try {
        await axios.post('http://localhost:8000/api/Debt/createDebt', {
          userA: newUserId,
          userB: member._id,
        });
      } catch (err: any) {
        console.log(`Debt between ${newUserId} and ${member._id} already exists or failed:`, err.response?.data?.error || err);
      }
    }

    newUsername.value = '';
    await loadUsers();
  } catch (err) {
    console.error(err);
  }
};

// Remove a user from the group
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
    await loadUsers();
  } catch (err) {
    console.error(err);
  }
};

onMounted(loadUsers);
</script>


<template>
  <div class="modal-overlay">
    <div class="modal">
      <h3>Group Users</h3>

      <input v-model="newUsername" placeholder="Add user by username" />
      <button @click="addUser">Add</button>
      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>

<ul>
  <li v-for="user in users" :key="user._id">
    {{ user.displayName }}
    <button
      v-if="user._id !== currentUser"
      @click="removeUser(user._id)"
    >
      Remove
    </button>
  </li>
</ul>

      <button @click="emit('close')">Close</button>
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
  background-color: rgba(0,0,0,0.5);
  z-index: 2000;
  color: black;
}
.modal {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  width: 400px;
}
.error { color: red; }
</style>
