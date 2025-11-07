<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import api from '../utils/api'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const currentUser = computed(() => {
  const u = userStore.currentUser as any
  return u?._id || u?.username || ''
})

interface Debt {
  _id: string
  userA: { _id: string; displayName: string; username: string }
  userB: { _id: string; displayName: string; username: string }
  balance: number
}

const debts = ref<Debt[]>([])
const errorMsg = ref('')

const showPaymentModal = ref(false)
const selectedDebt = ref<Debt | null>(null)
const paymentAmount = ref<number | null>(null)

const showConfirmation = ref(false)
const paymentSuccess = ref(false)

const currentUserName = 'You'

const otherUser = computed(() => {
  if (!selectedDebt.value) return ''
  return selectedDebt.value.userA._id === currentUser.value
    ? selectedDebt.value.userB.displayName
    : selectedDebt.value.userA.displayName
})

const otherUsername = computed(() => {
  if (!selectedDebt.value) return ''
  return selectedDebt.value.userA._id === currentUser.value
    ? selectedDebt.value.userB.username
    : selectedDebt.value.userA.username
})

const loadDebts = async () => {
  if (!currentUser.value) return
  try {
    const res = await api.post('/api/Debt/_listDebtsForUser', {
      user: currentUser.value,
    })
    const rawDebts = Array.isArray(res.data) ? res.data : []

    const debtsWithUsers = []
    for (const d of rawDebts) {
      const userARes = await api.post('/api/Authentication/_getUserById', { user: d.userA })
      const userBRes = await api.post('/api/Authentication/_getUserById', { user: d.userB })

      const userA = userARes.data?.userInfo || {
        _id: d.userA,
        displayName: 'Unknown',
        username: 'unknown',
      }
      const userB = userBRes.data?.userInfo || {
        _id: d.userB,
        displayName: 'Unknown',
        username: 'unknown',
      }

      debtsWithUsers.push({ ...d, userA, userB })
    }

    debts.value = debtsWithUsers
  } catch (err) {
    console.error('Error loading debts', err)
  }
}

const paymentDirection = ref<'youPay' | 'theyPay'>('youPay') // default selection

const currentDebtBalance = computed(() => {
  if (!selectedDebt.value) return 0
  const debt = selectedDebt.value
  if (debt.userA._id === currentUser.value) {
    return debt.balance
  } else {
    return -debt.balance
  }
})

const currentDebtMessage = computed(() => {
  if (!selectedDebt.value) return ''

  if (currentDebtBalance.value > 0) {
    return `You owe ${otherUser.value} (@${otherUsername.value}): $${currentDebtBalance.value.toFixed(2)}`
  } else if (currentDebtBalance.value < 0) {
    return `${otherUser.value} (@${otherUsername.value}) owes you: $${Math.abs(currentDebtBalance.value).toFixed(2)}`
  } else {
    return `No balance between you and ${otherUser.value}`
  }
})

const openPaymentModal = (debt: Debt) => {
  selectedDebt.value = debt
  paymentAmount.value = null

  if (currentDebtBalance.value > 0) {
    paymentDirection.value = 'youPay'
  } else if (currentDebtBalance.value < 0) {
    paymentDirection.value = 'theyPay'
  } else {
    paymentDirection.value = 'youPay'
  }

  showPaymentModal.value = true
}

const recordPayment = () => {
  if (!selectedDebt.value || !paymentAmount.value || paymentAmount.value <= 0) {
    errorMsg.value = 'Please enter a positive amount'
    return
  }

  errorMsg.value = ''
  showConfirmation.value = true
}

/* toggle behavior for payment direction */
function toggleDirection() {
  paymentDirection.value = paymentDirection.value === 'youPay' ? 'theyPay' : 'youPay'
}

/* ---------- Confetti engine (unchanged) ---------- */
const confettiCanvas = ref<HTMLCanvasElement | null>(null)
let confettiCtx: CanvasRenderingContext2D | null = null
let confettiAnimationId: number | null = null

function createParticles(amount: number, w: number, h: number) {
  const colors = [
    getComputedStyle(document.documentElement).getPropertyValue('--brand-highlight') || '#ff6bcb',
    getComputedStyle(document.documentElement).getPropertyValue('--brand-vivid') || '#7b2ff7',
    'rgb(90, 200, 255)',
    'rgb(120,255,180)',
    'rgb(255,210,110)',
  ].map((s) => s.trim() || '#ff6bcb')

  const particles = []
  for (let i = 0; i < amount; i++) {
    particles.push({
      x: w * 0.5 + (Math.random() - 0.5) * 120,
      y: h * 0.3 + (Math.random() - 0.5) * 40,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 6,
      vy: -6 - Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      ttl: 100 + Math.random() * 100,
    })
  }
  return particles
}

function fireConfetti(duration = 1200) {
  const canvas = confettiCanvas.value
  if (!canvas) return
  confettiCtx = canvas.getContext('2d')
  if (!confettiCtx) return

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const particles = createParticles(80, canvas.width, canvas.height)
  const start = performance.now()

  const tick = (t: number) => {
    const elapsed = t - start

    confettiCtx!.clearRect(0, 0, canvas.width, canvas.height)

    for (const p of particles) {
      p.vy += 0.18
      p.vx *= 0.995
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      p.ttl--

      confettiCtx!.save()
      confettiCtx!.translate(p.x, p.y)
      confettiCtx!.rotate(p.rot)
      confettiCtx!.fillStyle = p.color || '#000000'
      confettiCtx!.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size * 0.6)
      confettiCtx!.restore()
    }

    if (elapsed < duration) {
      confettiAnimationId = requestAnimationFrame(tick)
    } else {
      confettiCtx!.clearRect(0, 0, canvas.width, canvas.height)
      if (confettiAnimationId) {
        cancelAnimationFrame(confettiAnimationId)
        confettiAnimationId = null
      }
    }
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId)
  confettiAnimationId = requestAnimationFrame(tick)
}

/* ---------- Confirm payment: call confetti ---------- */
const confirmPayment = async () => {
  if (!selectedDebt.value || !paymentAmount.value) return

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
    const res = await api.post('/api/Debt/updateDebt', {
      payer,
      receiver,
      amount: paymentAmount.value,
      token: userStore.currentUser?.token,
      creator: userStore.currentUser?._id,
    })
    if (res.data.error) {
      errorMsg.value = res.data.error
      return
    }

    showConfirmation.value = false
    paymentSuccess.value = true

    setTimeout(() => fireConfetti(1800), 20)

    setTimeout(async () => {
      showPaymentModal.value = false
      paymentSuccess.value = false
      await loadDebts()
    }, 1200)
  } catch (err) {
    console.error('Error recording payment', err)
  }
}

/* cleanup */
onMounted(loadDebts)
onBeforeUnmount(() => {
  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId)
})
</script>

<template>
  <div class="debt-container">
    <div class="debt-inner">
      <h2 class="page-title">Your Debts</h2>
      <p v-if="debts.length === 0" class="no-debts-message">No outstanding debts.</p>

      <ul v-else class="debt-list">
        <li v-for="debt in debts" :key="debt._id" @click="openPaymentModal(debt)" class="debt-item">
          <div class="debt-left">
            <div class="debt-title">
              <svg
                class="user-icon"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="8" r="3" stroke="currentColor" stroke-width="1.4" />
                <path
                  d="M4 20c0-4 4-6 8-6s8 2 8 6"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div class="debt-meta">
                <div class="debt-person">
                  <template v-if="debt.userA._id === currentUser">
                    <template v-if="debt.balance > 0">
                      You owe {{ debt.userB.displayName }}
                    </template>
                    <template v-else> {{ debt.userB.displayName }} owes you </template>
                  </template>
                  <template v-else>
                    <template v-if="debt.balance > 0">
                      {{ debt.userA.displayName }} owes you
                    </template>
                    <template v-else> You owe {{ debt.userA.displayName }} </template>
                  </template>
                </div>
                <div class="debt-sub muted">Click to record a payment</div>
              </div>
            </div>
          </div>

          <div class="debt-right">
            <div :class="['amount-box', debt.balance > 0 ? 'amount-negative' : 'amount-positive']">
              <span class="amount"> ${{ Math.abs(debt.balance).toFixed(2) }} </span>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Payment Modal -->
    <div v-if="showPaymentModal" class="modal-overlay">
      <canvas ref="confettiCanvas" class="confetti-canvas" v-show="paymentSuccess"></canvas>

      <div class="modal">
        <div v-if="!paymentSuccess">
          <h3 class="modal-title">Record Payment</h3>
          <p class="current-balance">{{ currentDebtMessage }}</p>
        </div>

        <!-- Step 1: Enter amount -->
        <template v-if="!showConfirmation && !paymentSuccess">
          <div class="payment-direction-row" role="group" aria-label="Payment direction">
            <div class="direction-label left" :class="{ active: paymentDirection === 'youPay' }">
              {{ currentUserName }}
            </div>

            <button
              class="direction-toggle"
              @click="toggleDirection"
              :aria-pressed="paymentDirection === 'theyPay'"
              :aria-label="
                paymentDirection === 'youPay'
                  ? 'Switch to they pay (flip arrow)'
                  : 'Switch to you pay (flip arrow)'
              "
              title="Toggle payer"
            >
              <svg
                class="arrow"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                focusable="false"
                aria-hidden="true"
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  fill="none"
                />
              </svg>
            </button>

            <div class="direction-label right" :class="{ active: paymentDirection === 'theyPay' }">
              {{ otherUser }}
            </div>
          </div>

          <input
            v-model.number="paymentAmount"
            autocomplete="off"
            type="number"
            min="0"
            placeholder="Payment Amount"
            class="payment-input"
          />

          <p class="error-message" v-if="errorMsg">{{ errorMsg }}</p>

          <div class="modal-actions">
            <button class="btn cancel" @click="showPaymentModal = false">Cancel</button>
            <button class="btn" @click="recordPayment">Submit</button>
          </div>
        </template>

        <!-- Step 2: Confirm payment -->
        <template v-else-if="showConfirmation && !paymentSuccess">
          <p>
            Confirm payment of
            <strong>${{ paymentAmount?.toFixed(2) }}</strong>
            from
            <strong>{{ paymentDirection === 'youPay' ? currentUserName : otherUser }}</strong>
            to
            <strong>{{ paymentDirection === 'youPay' ? otherUser : currentUserName }}</strong
            >?
          </p>

          <div class="modal-actions">
            <button class="btn cancel" @click="showConfirmation = false">Edit</button>
            <button class="btn" @click="confirmPayment">Confirm</button>
          </div>
        </template>

        <!-- Step 3: Success message -->
        <template v-else-if="paymentSuccess">
          <p style="color: var(--brand-success); font-weight: bold; text-align: center">
            Payment of ${{ paymentAmount?.toFixed(2) }} from
            {{ paymentDirection === 'youPay' ? currentUserName : otherUser }} to
            {{ paymentDirection === 'youPay' ? otherUser : currentUserName }} recorded successfully!
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Container + layout (unchanged) */
.debt-container {
  min-height: 100%;
  padding: 36px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, rgba(8, 12, 20, 0.75), rgba(15, 10, 30, 0.85));
  color: var(--text, #e8eef8);
  box-sizing: border-box;
}
.debt-inner {
  width: 100%;
  max-width: 640px;
  text-align: center;
}
.page-title {
  margin: 0 0 18px 0;
  font-size: 1.6rem;
  letter-spacing: 0.6px;
  color: var(--brand-light, #f6f6ff);
  font-weight: 700;
  display: inline-block;
  padding: 6px 12px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
}
.no-debts-message {
  color: var(--muted, #99a0b0);
  margin-bottom: 10px;
}

/* list + cards */
.debt-list {
  list-style: none;
  padding: 0;
  margin: 8px auto 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}
.debt-item {
  width: 100%;
  max-width: 480px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(6px);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition:
    transform 0.16s cubic-bezier(0.2, 0.9, 0.3, 1),
    box-shadow 0.16s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--brand-light, #f3f7ff);
}
.debt-item:hover {
  transform: translateY(-6px);
  box-shadow: 0 14px 30px rgba(3, 8, 20, 0.45);
}

/* meta */
.debt-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
  text-align: left;
}
.debt-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-icon {
  color: var(--brand-vivid, #9b6bff);
  opacity: 0.95;
  flex-shrink: 0;
}
.debt-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.debt-person {
  font-weight: 700;
  color: var(--brand-light, #f3f7ff);
  font-size: 0.98rem;
}
.debt-sub.muted {
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.82rem;
}

/* amount */
.debt-right {
  flex-shrink: 0;
}
.amount-box {
  min-width: 110px;
  padding: 8px 12px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: var(--text-on-accent, #071028);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}
.amount-negative {
  background: linear-gradient(90deg, var(--brand-red), var(--brand-dark-red));
  color: white;
}
.amount-positive {
  background: linear-gradient(90deg, #106938, #06612f);
  color: var(--brand-light);
}
.amount {
  font-size: 1rem;
  letter-spacing: 0.2px;
}

/* modal + confetti */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(6, 12, 18, 0.2), var(--brand-deep));
  z-index: 2200;
}
.confetti-canvas {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2280;
}

/* modal */
.modal {
  background: var(--card);
  padding: 22px;
  border-radius: 12px;
  width: 92%;
  max-width: 420px;
  box-shadow: 0 18px 48px rgba(2, 6, 14, 0.6);
  color: var(--brand-light, #f3f7ff);
  text-align: left;
  animation: modal-pop 0.14s cubic-bezier(0.2, 0.9, 0.3, 1);
}
.modal-title {
  margin: 0 0 14px 0;
  color: var(--brand-highlight, #f3f7ff);
  font-size: 1.2rem;
}
.current-balance {
  font-size: 1rem;
  margin-bottom: 9px;
  color: white;
}

/* NEW: toggle control */
.payment-direction-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  color: rgba(255, 255, 255, 0.85);
}

/* left/right labels */
.direction-label {
  padding: 6px 10px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.75);
  transition:
    background 0.18s,
    color 0.18s;
  user-select: none;
  min-width: 80px;
  text-align: center;
}
.direction-label.active {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
  color: var(--brand-light);
}

/* center toggle button */
.direction-toggle {
  appearance: none;
  border: none;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  border-radius: 999px;
  padding: 10px 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.18s,
    background 0.18s;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}
.direction-toggle:hover {
  transform: translateY(-2px);
}

/* arrow flip */
.arrow {
  color: var(--brand-highlight, #ffd0ea);
  transition: transform 360ms cubic-bezier(0.2, 0.9, 0.3, 1);
  transform-origin: center;
  width: 20px;
  height: 20px;
}
.direction-toggle[aria-pressed='true'] .arrow {
  transform: rotateY(180deg);
}

/* inputs + actions (unchanged) */
.payment-input {
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 1rem;
  background: rgba(0, 0, 0, 0.2);
  color: var(--brand-light, #f3f7ff);
  box-sizing: border-box;
}
.payment-input::placeholder {
  color: rgba(255, 255, 255, 0.45);
}
.error-message {
  color: #ff7b9c;
  margin-top: 4px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  min-height: 1.2em;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

/* Responsive tweaks */
@media (max-width: 520px) {
  .debt-inner {
    padding: 0 6px;
  }
  .debt-item {
    max-width: 92%;
    padding: 10px;
  }
  .amount-box {
    min-width: 90px;
    padding: 6px 10px;
  }
  .direction-label {
    min-width: 60px;
    font-size: 0.88rem;
  }
}
</style>
