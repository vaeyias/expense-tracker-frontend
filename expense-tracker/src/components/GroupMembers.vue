<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps<{ groupId: string }>();
const emit = defineEmits<['close']>();

interface User {
  _id: string;
  name: string;
}

const users = ref<User[]>([]);
const newUserEmail = ref('');
const errorMsg = ref('');

const loadUsers = async () => {
  try {
    const res = await axios.post('http://localhost:8000/api/Group/_getUsers', { group: props.groupId });
    users.value = res.data || [];
  } catch (err) {
    console.error(err);
  }
};

const addUser = async () => {
  try {
    const res = await axios.post('http://localhost:8000/api/Group/_addUser', { group: props.groupId, email: newUserEmail.value });
    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }
    newUserEmail.value = '';
    await loadUsers();
  } catch (err) {
    console.error(err);
  }
};

const removeUser = async (userId: string) => {
  try {
    await axios.post('http://localhost:8000/api/Group/_removeUser', { group: props.groupId, userId });
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
      <input v-model="newUserEmail" placeholder="Add user by email" />
      <button @click="addUser">Add</button>
      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>

      <ul>
        <li v-for="user in users" :key="user._id">
          {{ user.name }}
          <button @click="removeUser(user._id)">Remove</button>
        </li>
      </ul>

      <button @click="$emit('close')">Close</button>
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
}

.modal {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  width: 400px;
}
.error { color: red; }
</style>
