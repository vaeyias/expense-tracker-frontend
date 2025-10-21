<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useUserStore } from '../stores/user'

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

const showPaymentModal = ref(false)
const selectedDebt = ref<Debt | null>(null)
const paymentAmount = ref<number | null>(null)

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

    //   check for who is paying
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
  color: #c0392b;
}

.debt-they-owe {
  color: #27ae60;
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
  box-sizing: border-box;
}

.payment-input::placeholder {
  color: #aaa;
}

.error-message {
  color: #e74c3c;
  margin-top: 5px;
  margin-bottom: 15px;
  font-size: 0.9rem;
  height: 1.2em;
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
