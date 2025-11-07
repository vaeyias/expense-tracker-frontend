# debt-styling
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useUserStore } from '../stores/user'

// ---------- STATE ----------
const userStore = useUserStore()
const currentUser = computed(() => userStore.currentUser?._id || '')

interface Debt {
  _id: string
  userA: { _id: string; displayName: string }
  userB: { _id: string; displayName: string }
  balance: number
}

const debts = ref<Debt[]>([])
const errorMsg = ref('')

// For recording payment
const showPaymentModal = ref(false)
const selectedDebt = ref<Debt | null>(null)
const paymentAmount = ref<number | null>(null)

// ---------- LOAD DEBTS ----------
const loadDebts = async () => {
  if (!currentUser.value) return
  try {
    const res = await axios.post('http://localhost:8000/api/Debt/_listDebtsForUser', {
      user: currentUser.value
    })
    const rawDebts = Array.isArray(res.data) ? res.data : []

    const debtsWithUsers = []
    for (const d of rawDebts) {
      const userARes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', { user: d.userA })
      const userBRes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', { user: d.userB })

      const userA = userARes.data?.userInfo || { _id: d.userA, displayName: 'Unknown' }
      const userB = userBRes.data?.userInfo || { _id: d.userB, displayName: 'Unknown' }

      debtsWithUsers.push({ ...d, userA, userB })
    }

    debts.value = debtsWithUsers
  } catch (err) {
    console.error('Error loading debts', err)
  }
}



// ---------- RECORD PAYMENT ----------
const paymentDirection = ref<'youPay' | 'theyPay'>('youPay') // default selection

const openPaymentModal = (debt: Debt) => {
  selectedDebt.value = debt
  paymentAmount.value = null
  paymentDirection.value = 'youPay'
  showPaymentModal.value = true
}
const recordPayment = async () => {
  if (!selectedDebt.value || !paymentAmount.value || paymentAmount.value <= 0) {
    errorMsg.value = 'Please enter a positive amount';
    return
  }

  const debt = selectedDebt.value
  let payer = ''
  let receiver = ''

  if (paymentDirection.value === 'youPay') {
    payer = currentUser.value
    receiver = debt.userA._id === currentUser.value ? debt.userB._id : debt.userA._id
  } else {
    receiver = currentUser.value
    payer = debt.userA._id === currentUser.value ? debt.userB._id : debt.userA._id
  }

  try {
    const res = await axios.post('http://localhost:8000/api/Debt/updateDebt', {
      payer,
      receiver,
      amount: paymentAmount.value
    })
    if (res.data.error) {
      errorMsg.value = res.data.error
      return
    }

    showPaymentModal.value = false
    await loadDebts()
  } catch (err) {
    console.error('Error recording payment', err)
  }
}

onMounted(loadDebts)
</script>

<template>
  <div>
    <h2>Your Debts</h2>
    <p v-if="debts.length === 0">No outstanding debts.</p>

    <ul v-else>
      <li v-for="debt in debts" :key="debt._id" @click="openPaymentModal(debt)" class="debt-row">
        <span v-if="debt.userA === currentUser">
          <span v-if="debt.balance > 0">
            You owe {{ debt.userB.displayName }}: ${{ debt.balance.toFixed(2) }}
          </span>
          <span v-else>
            {{ debt.userB.displayName }} owes you: ${{ (-debt.balance).toFixed(2) }}
          </span>
        </span>
        <span v-else>
          <span v-if="debt.balance > 0">
            {{ debt.userA.displayName }} owes you: ${{ debt.balance.toFixed(2) }}
          </span>
          <span v-else>
            You owe {{ debt.userA.displayName }}: ${{ (-debt.balance).toFixed(2) }}
          </span>
        </span>
      </li>
    </ul>
<!-- Payment Modal -->
<div v-if="showPaymentModal" class="modal-overlay">
  <div class="modal">
    <h3>Record Payment</h3>

    <!-- Payment direction row -->
    <div class="payment-direction">
      <span class="user-label">You</span>
      <select v-model="paymentDirection" class="direction-select">
        <option value="youPay">→</option>
        <option value="theyPay">←</option>
      </select>
      <span class="user-label">
        {{
          selectedDebt?.userA._id === currentUser
            ? selectedDebt.userB.displayName
            : selectedDebt.userA.displayName
        }}
      </span>
    </div>

    <!-- Payment amount -->
    <input
      v-model.number="paymentAmount"
      type="number"
      min="0"
      placeholder="Payment Amount"
      class="payment-input"
    />

    <!-- Error message -->
    <p class="error" v-if="errorMsg">{{ errorMsg }}</p>

    <!-- Buttons -->
    <div class="modal-buttons">
      <button class="submit-btn" @click="recordPayment">Submit</button>
      <button class="cancel-btn" @click="showPaymentModal = false">Cancel</button>
    </div>
  </div>
</div>


  </div>
</template>

<style scoped>

div {
    color:black;
}
.debt-row {
  cursor: pointer;
  padding: 0.5rem;
  border-bottom: 1px solid #ccc;
}
.debt-row:hover {
  background-color: #f0f0f0;
}
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
  border-radius: 12px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.payment-direction {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  margin-bottom: 1rem;
}

.user-label {
  flex: 1;
  text-align: center;
  font-size: 1rem;
}

.direction-select {
  padding: 0.25rem 0.5rem;
  font-size: 1.2rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  cursor: pointer;
}

.payment-input {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 1rem;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.submit-btn {
  background-color: #4CAF50;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.submit-btn:hover {
  background-color: #45a049;
}

.cancel-btn {
  background-color: #f44336;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.cancel-btn:hover {
  background-color: #d32f2f;
}

.error {
  color: #d32f2f;
  margin-top: 0.25rem;
  font-size: 0.9rem;
}
</style>


prompt: make the styling cleaner

# response:

```vue
# debt-styling

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useUserStore } from '../stores/user'

// ---------- STATE ----------
const userStore = useUserStore()
const currentUser = computed(() => userStore.currentUser?._id || '')

interface Debt {
  _id: string
  userA: { _id: string; displayName: string }
  userB: { _id: string; displayName: string }
  balance: number
}

const debts = ref<Debt[]>([])
const errorMsg = ref('')

// For recording payment
const showPaymentModal = ref(false)
const selectedDebt = ref<Debt | null>(null)
const paymentAmount = ref<number | null>(null)

// ---------- LOAD DEBTS ----------
const loadDebts = async () => {
  if (!currentUser.value) return
  try {
    const res = await axios.post('http://localhost:8000/api/Debt/_listDebtsForUser', {
      user: currentUser.value
    })
    const rawDebts = Array.isArray(res.data) ? res.data : []

    const debtsWithUsers = []
    for (const d of rawDebts) {
      const userARes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', { user: d.userA })
      const userBRes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', { user: d.userB })

      const userA = userARes.data?.userInfo || { _id: d.userA, displayName: 'Unknown' }
      const userB = userBRes.data?.userInfo || { _id: d.userB, displayName: 'Unknown' }

      debtsWithUsers.push({ ...d, userA, userB })
    }

    debts.value = debtsWithUsers
  } catch (err) {
    console.error('Error loading debts', err)
  }
}

// ---------- RECORD PAYMENT ----------
const paymentDirection = ref<'youPay' | 'theyPay'>('youPay') // default selection

const openPaymentModal = (debt: Debt) => {
  selectedDebt.value = debt
  paymentAmount.value = null
  paymentDirection.value = 'youPay'
  showPaymentModal.value = true
}

const recordPayment = async () => {
  if (!selectedDebt.value || !paymentAmount.value || paymentAmount.value <= 0) {
    errorMsg.value = 'Please enter a positive amount';
    return
  }

  const debt = selectedDebt.value
  let payer = ''
  let receiver = ''

  if (paymentDirection.value === 'youPay') {
    payer = currentUser.value
    receiver = debt.userA._id === currentUser.value ? debt.userB._id : debt.userA._id
  } else {
    receiver = currentUser.value
    payer = debt.userA._id === currentUser.value ? debt.userB._id : debt.userA._id
  }

  try {
    const res = await axios.post('http://localhost:8000/api/Debt/updateDebt', {
      payer,
      receiver,
      amount: paymentAmount.value
    })
    if (res.data.error) {
      errorMsg.value = res.data.error
      return
    }

    showPaymentModal.value = false
    await loadDebts()
  } catch (err) {
    console.error('Error recording payment', err)
  }
}

onMounted(loadDebts)
</script>

<template>
  <div class="debt-container">
    <h2>Your Debts</h2>
    <p v-if="debts.length === 0" class="no-debts-message">No outstanding debts.</p>

    <ul v-else class="debt-list">
      <li v-for="debt in debts" :key="debt._id" @click="openPaymentModal(debt)" class="debt-item">
        <span v-if="debt.userA._id === currentUser" class="debt-details">
          <span v-if="debt.balance > 0" class="debt-you-owe">
            You owe {{ debt.userB.displayName }}: <span class="amount">${{ debt.balance.toFixed(2) }}</span>
          </span>
          <span v-else class="debt-they-owe">
            {{ debt.userB.displayName }} owes you: <span class="amount">${{ (-debt.balance).toFixed(2) }}</span>
          </span>
        </span>
        <span v-else class="debt-details">
          <span v-if="debt.balance > 0" class="debt-they-owe">
            {{ debt.userA.displayName }} owes you: <span class="amount">${{ debt.balance.toFixed(2) }}</span>
          </span>
          <span v-else class="debt-you-owe">
            You owe {{ debt.userA.displayName }}: <span class="amount">${{ (-debt.balance).toFixed(2) }}</span>
          </span>
        </span>
      </li>
    </ul>

    <!-- Payment Modal -->
    <div v-if="showPaymentModal" class="modal-overlay">
      <div class="modal">
        <h3 class="modal-title">Record Payment</h3>

        <!-- Payment direction row -->
        <div class="payment-direction-row">
          <span class="user-label">You</span>
          <select v-model="paymentDirection" class="direction-select">
            <option value="youPay">→</option>
            <option value="theyPay">←</option>
          </select>
          <span class="user-label">
            {{
              selectedDebt?.userA._id === currentUser
                ? selectedDebt.userB.displayName
                : selectedDebt.userA.displayName
            }}
          </span>
        </div>

        <!-- Payment amount -->
        <input
          v-model.number="paymentAmount"
          type="number"
          min="0"
          placeholder="Payment Amount"
          class="payment-input"
        />

        <!-- Error message -->
        <p class="error-message" v-if="errorMsg">{{ errorMsg }}</p>

        <!-- Buttons -->
        <div class="modal-actions">
          <button class="submit-button" @click="recordPayment">Submit</button>
          <button class="cancel-button" @click="showPaymentModal = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debt-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 20px;
  color: #333;
}

h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 10px;
}

.no-debts-message {
  color: #7f8c8d;
  font-style: italic;
}

.debt-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.debt-item {
  background-color: #fdfdfd;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 10px;
  padding: 15px 20px;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.debt-item:hover {
  background-color: #f0f8ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.debt-details {
  font-size: 1rem;
  line-height: 1.5;
}

.debt-you-owe {
  color: #c0392b; /* Red for amounts you owe */
}

.debt-they-owe {
  color: #27ae60; /* Green for amounts others owe you */
}

.amount {
  font-weight: 600;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal {
  background-color: #fff;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.modal-title {
  color: #2c3e50;
  margin-top: 0;
  margin-bottom: 25px;
  font-size: 1.5rem;
}

.payment-direction-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
  font-weight: 500;
  color: #555;
}

.user-label {
  flex-shrink: 0;
  font-size: 1.1rem;
}

.direction-select {
  appearance: none;
  padding: 8px 12px;
  font-size: 1.3rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  background-color: #f9f9f9;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.direction-select:hover {
  border-color: #95a5a6;
}

.payment-input {
  width: 100%;
  padding: 12px 15px;
  margin-bottom: 15px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 1.1rem;
  box-sizing: border-box; /* Include padding and border in the element's total width and height */
}

.payment-input::placeholder {
  color: #aaa;
}

.error-message {
  color: #e74c3c;
  margin-top: 5px;
  margin-bottom: 15px;
  font-size: 0.9rem;
  height: 1.2em; /* Reserve space for the error message */
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 25px;
}

.submit-button,
.cancel-button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.submit-button {
  background-color: #3498db;
  color: white;
}

.submit-button:hover {
  background-color: #2980b9;
  transform: translateY(-1px);
}

.cancel-button {
  background-color: #e74c3c;
  color: white;
}

.cancel-button:hover {
  background-color: #c0392b;
  transform: translateY(-1px);
}
</style>
```
# response:

```vue
# debt-styling

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useUserStore } from '../stores/user'

// ---------- STATE ----------
const userStore = useUserStore()
const currentUser = computed(() => userStore.currentUser?._id || '')

interface Debt {
  _id: string
  userA: { _id: string; displayName: string }
  userB: { _id: string; displayName: string }
  balance: number
}

const debts = ref<Debt[]>([])
const errorMsg = ref('')

// For recording payment
const showPaymentModal = ref(false)
const selectedDebt = ref<Debt | null>(null)
const paymentAmount = ref<number | null>(null)

// ---------- LOAD DEBTS ----------
const loadDebts = async () => {
  if (!currentUser.value) return
  try {
    const res = await axios.post('http://localhost:8000/api/Debt/_listDebtsForUser', {
      user: currentUser.value
    })
    const rawDebts = Array.isArray(res.data) ? res.data : []

    const debtsWithUsers = []
    for (const d of rawDebts) {
      const userARes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', { user: d.userA })
      const userBRes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', { user: d.userB })

      const userA = userARes.data?.userInfo || { _id: d.userA, displayName: 'Unknown' }
      const userB = userBRes.data?.userInfo || { _id: d.userB, displayName: 'Unknown' }

      debtsWithUsers.push({ ...d, userA, userB })
    }

    debts.value = debtsWithUsers
  } catch (err) {
    console.error('Error loading debts', err)
  }
}

// ---------- RECORD PAYMENT ----------
const paymentDirection = ref<'youPay' | 'theyPay'>('youPay') // default selection

const openPaymentModal = (debt: Debt) => {
  selectedDebt.value = debt
  paymentAmount.value = null
  paymentDirection.value = 'youPay'
  showPaymentModal.value = true
}

const recordPayment = async () => {
  if (!selectedDebt.value || !paymentAmount.value || paymentAmount.value <= 0) {
    errorMsg.value = 'Please enter a positive amount';
    return
  }

  const debt = selectedDebt.value
  let payer = ''
  let receiver = ''

  if (paymentDirection.value === 'youPay') {
    payer = currentUser.value
    receiver = debt.userA._id === currentUser.value ? debt.userB._id : debt.userA._id
  } else {
    receiver = currentUser.value
    payer = debt.userA._id === currentUser.value ? debt.userB._id : debt.userA._id
  }

  try {
    const res = await axios.post('http://localhost:8000/api/Debt/updateDebt', {
      payer,
      receiver,
      amount: paymentAmount.value
    })
    if (res.data.error) {
      errorMsg.value = res.data.error
      return
    }

    showPaymentModal.value = false
    await loadDebts()
  } catch (err) {
    console.error('Error recording payment', err)
  }
}

onMounted(loadDebts)
</script>

<template>
  <div class="debt-container">
    <h2>Your Debts</h2>
    <p v-if="debts.length === 0" class="no-debts-message">No outstanding debts.</p>

    <ul v-else class="debt-list">
      <li v-for="debt in debts" :key="debt._id" @click="openPaymentModal(debt)" class="debt-item">
        <span v-if="debt.userA._id === currentUser" class="debt-details">
          <span v-if="debt.balance > 0" class="debt-you-owe">
            You owe {{ debt.userB.displayName }}: <span class="amount">${{ debt.balance.toFixed(2) }}</span>
          </span>
          <span v-else class="debt-they-owe">
            {{ debt.userB.displayName }} owes you: <span class="amount">${{ (-debt.balance).toFixed(2) }}</span>
          </span>
        </span>
        <span v-else class="debt-details">
          <span v-if="debt.balance > 0" class="debt-they-owe">
            {{ debt.userA.displayName }} owes you: <span class="amount">${{ debt.balance.toFixed(2) }}</span>
          </span>
          <span v-else class="debt-you-owe">
            You owe {{ debt.userA.displayName }}: <span class="amount">${{ (-debt.balance).toFixed(2) }}</span>
          </span>
        </span>
      </li>
    </ul>

    <!-- Payment Modal -->
    <div v-if="showPaymentModal" class="modal-overlay">
      <div class="modal">
        <h3 class="modal-title">Record Payment</h3>

        <!-- Payment direction row -->
        <div class="payment-direction-row">
          <span class="user-label">You</span>
          <select v-model="paymentDirection" class="direction-select">
            <option value="youPay">→</option>
            <option value="theyPay">←</option>
          </select>
          <span class="user-label">
            {{
              selectedDebt?.userA._id === currentUser
                ? selectedDebt.userB.displayName
                : selectedDebt.userA.displayName
            }}
          </span>
        </div>

        <!-- Payment amount -->
        <input
          v-model.number="paymentAmount"
          type="number"
          min="0"
          placeholder="Payment Amount"
          class="payment-input"
        />

        <!-- Error message -->
        <p class="error-message" v-if="errorMsg">{{ errorMsg }}</p>

        <!-- Buttons -->
        <div class="modal-actions">
          <button class="submit-button" @click="recordPayment">Submit</button>
          <button class="cancel-button" @click="showPaymentModal = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debt-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 20px;
  color: #333;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

h2 {
  color: #2c3e50;
  margin-bottom: 25px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 12px;
  font-weight: 600;
}

.no-debts-message {
  color: #7f8c8d;
  font-style: italic;
  text-align: center;
  padding: 20px 0;
}

.debt-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.debt-item {
  background-color: #fdfdfd;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 15px 20px;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.debt-item:hover {
  background-color: #f0f8ff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.debt-details {
  font-size: 1rem;
  line-height: 1.6;
  color: #555;
}

.debt-you-owe {
  color: #c0392b; /* Slightly desaturated red for amounts you owe */
}

.debt-they-owe {
  color: #27ae60; /* Slightly desaturated green for amounts others owe you */
}

.amount {
  font-weight: 600;
  color: inherit; /* Inherit color from parent span */
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  backdrop-filter: blur(5px); /* Add a subtle blur effect */
}

.modal {
  background-color: #ffffff;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  text-align: center;
  border: 1px solid #eee;
}

.modal-title {
  color: #2c3e50;
  margin-top: 0;
  margin-bottom: 25px;
  font-size: 1.7rem;
  font-weight: 700;
}

.payment-direction-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
  font-weight: 500;
  color: #555;
}

.user-label {
  flex-shrink: 0;
  font-size: 1.1rem;
  color: #333;
}

.direction-select {
  appearance: none;
  padding: 8px 12px;
  font-size: 1.3rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  background-color: #f9f9f9;
  cursor: pointer;
  transition: border-color 0.2s ease;
  background-image: url('data:image/svg+xml;utf8,<svg fill="%23333" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 8px top 50%;
  padding-right: 30px; /* Space for the arrow icon */
}

.direction-select:hover {
  border-color: #95a5a6;
}

.payment-input {
  width: 100%;
  padding: 12px 15px;
  margin-bottom: 15px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 1.1rem;
  box-sizing: border-box; /* Include padding and border in the element's total width and height */
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.payment-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.payment-input::placeholder {
  color: #aaa;
}

.error-message {
  color: #e74c3c;
  margin-top: 5px;
  margin-bottom: 15px;
  font-size: 0.9rem;
  height: 1.2em; /* Reserve space for the error message */
  font-weight: 500;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 25px;
}

.submit-button,
.cancel-button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.submit-button {
  background-color: #3498db;
  color: white;
  box-shadow: 0 2px 5px rgba(52, 152, 219, 0.3);
}

.submit-button:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(52, 152, 219, 0.4);
}

.cancel-button {
  background-color: #e74c3c;
  color: white;
  box-shadow: 0 2px 5px rgba(231, 76, 60, 0.3);
}

.cancel-button:hover {
  background-color: #c0392b;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(192, 57, 43, 0.4);
}
</style>
```