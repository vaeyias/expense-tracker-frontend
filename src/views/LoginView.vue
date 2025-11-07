<template>
  <div class="page">
    <div class="content">
      <div class="panel card" style="max-width: 520px; margin: 32px auto">
        <div
          class="row"
          style="justify-content: space-between; align-items: center; margin-bottom: 8px"
        >
          <div>
            <div class="h1">Login</div>
            <div style="color: var(--muted); font-size: 0.95rem">
              Enter your credentials to continue
            </div>
          </div>
        </div>

        <div class="form" style="margin-top: 18px; display: grid; gap: 12px">
          <div class="form-row">
            <label class="h2" for="username">Username</label>
            <input
              autocomplete="off"
              maxlength="20"
              id="username"
              class="input"
              v-model="username"
              placeholder="Username"
            />
          </div>

          <div class="form-row">
            <label class="h2" for="password">Password</label>
            <input
              autocomplete="off"
              id="password"
              type="password"
              class="input"
              v-model="password"
              placeholder="Password"
            />
          </div>

          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

          <div class="form-footer">
            <button class="btn" @click="login">Login</button>
          </div>

          <p style="text-align: center; margin-top: 12px; color: var(--muted)">
            Don't have an account?
            <button class="btn ghost" @click="goToCreateAccount" style="margin-left: 6px">
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const errorMsg = ref('')

const login = async () => {
  if (!username.value || !password.value) {
    errorMsg.value = 'Username and password are required'
    return
  }

  try {
    const res = await api.post('/api/Authentication/authenticate', {
      username: username.value.toLowerCase(),
      password: password.value,
    })

    if (res.data.error) {
      errorMsg.value = `Login failed: ${res.data.error}`
      return
    }

    const { user: userId, token } = res.data

    const userInfo = {
      _id: userId,
      username: username.value.toLowerCase(),
      displayName: username.value, // or pull from DB if needed
      token,
    }

    userStore.setUser(userInfo)

    router.push('/')
  } catch (err) {
    errorMsg.value = 'Login failed. Please try again.'
    console.error(err)
  }
}

const goToCreateAccount = () => router.push('/register')
</script>

<style scoped>
/* small extra spacing for mobile */
@media (max-width: 700px) {
  .panel {
    padding: 18px;
    margin: 18px 12px;
    border-radius: 12px;
  }
}

/* shared form styles */
.input {
  display: block;
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
}

.form-footer {
  display: flex;
  justify-content: center; /* center login button */
  margin-top: 12px;
}

.btn.ghost {
  color: white;
}

.btn.ghost:hover {
  color: white;
}

.error {
  color: rgb(219, 84, 84);
  font-size: 0.9rem;
}
</style>
