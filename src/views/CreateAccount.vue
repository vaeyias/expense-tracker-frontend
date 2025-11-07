<template>
  <div class="page">
    <div class="content">
      <div class="panel card" style="max-width:520px;margin:32px auto;">
        <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div>
            <div class="h1">Create Account</div>
            <div style="color:var(--muted);font-size:0.95rem">Join and start tracking your expenses</div>
          </div>
        </div>

        <div class="form" style="margin-top:18px; display:grid; gap:12px;">
          <div class="form-row">
            <label class="h2" for="username">Username</label>
            <input maxlength="20" autocomplete="off"id="username" class="input" v-model="username" placeholder="Unique username"/>
          </div>

          <div class="form-row">
            <label class="h2" for="displayName">Display name</label>
            <input autocomplete="off"maxlength="20" id="displayName" class="input" v-model="displayName" placeholder="Display name"/>
          </div>

          <div class="form-row">
            <label class="h2" for="password">Password</label>
            <input autocomplete="off" id="password" class="input" type="password" v-model="password" placeholder="Choose a secure password"/>
          </div>

          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

          <div class="form-footer">
            <button class="btn ghost" @click="$router.push('/login')">Back to login</button>
            <button class="btn" @click="createAccount">Create account</button>
          </div>
        </div>
      </div>
    </div>
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
    // Step 1: create user
    const createRes = await axios.post('http://localhost:8000/api/Authentication/createUser', {
      username: username.value.toLowerCase(),
      displayName: displayName.value,
      password: password.value,
    });

    if (createRes.data?.error) {
      errorMsg.value = createRes.data.error;
      return;
    }

    // Step 2: authenticate to get token
    const authRes = await axios.post('http://localhost:8000/api/Authentication/authenticate', {
      username: username.value.toLowerCase(),
      password: password.value,
    });

    if (authRes.data?.error) {
      errorMsg.value = authRes.data.error;
      return;
    }

    const { user: userId, token } = authRes.data;

    const userInfo = {
      _id: userId,
      username: username.value.toLowerCase(),
      displayName: displayName.value,
      token,
    };

    userStore.setUser(userInfo); // stores in Pinia + localStorage
    router.push('/');
  } catch (err) {
    errorMsg.value = 'Account creation failed. Please try again.';
    console.error(err);
  }
};
</script>

<style scoped>
/* small extra spacing for mobile */
@media (max-width:700px){
  .panel { padding: 18px; margin: 18px 12px; border-radius: 12px; }
}
</style>
