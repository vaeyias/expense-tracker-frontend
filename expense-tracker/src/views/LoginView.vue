<template>
  <div class="login-container">
    <h1>Login</h1>
    <input v-model="username" placeholder="Username" />
    <input v-model="password" type="password" placeholder="Password" />
    <p class="error" v-if="errorMsg">{{ errorMsg }}</p>
    <button @click="login">Login</button>
    <p>
      Don't have an account?
      <button @click="goToCreateAccount">Create Account</button>
    </p>
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
const password = ref('');
const errorMsg = ref('');

const login = async () => {
  if (!username.value || !password.value) {
    errorMsg.value = 'Username and password are required';
    return;
  }

  try {
    const res = await axios.post('http://localhost:8000/api/Authentication/authenticate', {
      username: username.value,
      password: password.value,
    });

    if (res.data.error) {
      errorMsg.value = `Login failed: ${res.data.error}`;
      return;
    }

    const userInfoRes = await axios.post('http://localhost:8000/api/Authentication/_getUserByUsername',{
        username:username.value,
    })

    if (userInfoRes.data.error) {
      errorMsg.value = `Login failed: ${userInfoRes.data.error}`;
      return;
    }


    // Store user info globally and locally
    const userInfo = { _id: res.data.user, username: username.value, displayName:userInfoRes.data.userInfo.displayName };
    console.log(userInfoRes.data.userInfo.displayName);
    userStore.setUser(userInfo);
    localStorage.setItem('currentUser', JSON.stringify(userInfo));


    router.push('/');
  } catch (err) {
    errorMsg.value = 'Login failed. Please try again.';
    console.error(err);
  }
};

const goToCreateAccount = () => router.push('/register');
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 100px auto;
  text-align: center;
  color:black;
}

input {
  display: block;
  margin: 10px auto;
  padding: 8px;
  width: 80%;
}

button {
  margin: 5px;
  padding: 8px 12px;
}

.error {
  color: red;
}
</style>

<!--
<style scoped>
.login-container {
  max-width: 400px;
  margin: 100px auto;
  text-align: center;
}

input {
  display: block;
  margin: 10px auto;
  padding: 8px;
  width: 80%;
}

button {
  margin: 5px;
  padding: 8px 12px;
}

/* simple modal styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 300px;
}
</style> -->
