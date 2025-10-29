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
            <input id="username" class="input" v-model="username" placeholder="username (used to login)"/>
          </div>

          <div class="form-row">
            <label class="h2" for="displayName">Display name</label>
            <input id="displayName" class="input" v-model="displayName" placeholder="How your name displays"/>
          </div>

          <div class="form-row">
            <label class="h2" for="password">Password</label>
            <input id="password" class="input" type="password" v-model="password" placeholder="Choose a secure password"/>
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
    const res = await axios.post('http://localhost:8000/api/Authentication/createUser', {
      username: username.value,
      displayName: displayName.value,
      password: password.value,
    });

    if (res.data?.error) {
      errorMsg.value = res.data.error;
      return;
    }

    const folderRes = await axios.post('http://localhost:8000/api/Folder/createFolder', {
      owner: res.data.user,
      name: ".root",
      parent: ".parent_root",
    });

    if (folderRes.data?.error) {
      errorMsg.value = folderRes.data.error;
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
/* small extra spacing for mobile */
@media (max-width:700px){
  .panel { padding: 18px; margin: 18px 12px; border-radius: 12px; }
}
</style>
