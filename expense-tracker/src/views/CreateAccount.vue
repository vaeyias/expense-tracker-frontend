<template>
  <div class="create-account-container">
    <h1>Create Account</h1>
    <input v-model="username" placeholder="Username" />
    <input v-model="displayName" placeholder="Display Name" />
    <input v-model="password" type="password" placeholder="Password" />
    <p class="error" v-if="errorMsg">{{ errorMsg }}</p>
    <button @click="createAccount">Create</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const router = useRouter();

const username = ref('');
const displayName = ref('');
const password = ref('');
const errorMsg = ref('');

const createAccount = async () => {
  if (!username.value || !displayName.value || !password.value) {
    errorMsg.value = 'All fields are required';
    return;
  }

  try {
    const res = await axios.post('http://localhost:8000/api/Authentication/createUser', {
      username: username.value,
      displayName: displayName.value,
      password: password.value,
    });

    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }

    const userInfo = {
      _id: res.data.user,
      username: username.value,
      displayName: displayName.value,
    };
    userStore.setUser(userInfo);
    localStorage.setItem('currentUser', JSON.stringify(userInfo));

    router.push('/');
  } catch (err) {
    errorMsg.value = 'Account creation failed. Please try again.';
    console.error(err);
  }
};
</script>

<style scoped>
.create-account-container {
  max-width: 400px;
  margin: 100px auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
}

input {
  display: block;
  margin: 5px auto;
  padding: 8px;
  width: 80%;
}

button {
  padding: 8px 12px;
}

.error {
  color: red;
}
</style>

<!--
<style scoped>
.create-account-container {
  max-width: 400px;
  margin: 100px auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
}

input {
  padding: 8px;
  width: 80%;
  margin: 0 auto;
}

button {
  padding: 8px 12px;
  margin: 5px;
}

.error {
  color: red;
}
</style> -->
