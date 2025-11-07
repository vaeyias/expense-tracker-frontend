<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '../utils/api'
import { useUserStore } from '../stores/user'
const userStore = useUserStore()

interface Member {
  _id: string
  displayName: string
}

interface UserSplit {
  userId: string
  amount: number | null
}

const props = defineProps<{
  groupId: string
  expenseId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'refresh'): void
}>()

/* Form state (pre-populated on mount) */
const title = ref('')
const description = ref('')
const category = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const totalCost = ref<number | null>(null)
const payer = ref('')
const errorMsg = ref('')
const busy = ref(false)

const members = ref<Member[]>([])
const userSplits = ref<UserSplit[]>([])

const showDeleteConfirm = ref(false)

/* Load members */
const loadMembers = async () => {
  try {
    const res = await api.post('/api/Group/_listMembers', { group: props.groupId })
    const allMembers: Member[] = Array.isArray(res.data?.members) ? res.data.members : []

    members.value = allMembers.filter(Boolean)
    console.log('members loaded', members.value)
  } catch (err) {
    console.error('Error loading members', err)
  }
}

/* Load expense + splits */
const loadExpense = async () => {
  try {
    const res = await api.post('/api/Expense/_getExpenseById', {
      expenseId: props.expenseId,
    })
    const data = Array.isArray(res.data) ? res.data[0] : res.data

    title.value = data?.title || ''
    description.value = data?.description || ''
    category.value = data?.category || ''
    date.value = data?.date
      ? new Date(data.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
    totalCost.value = data?.totalCost || null
    payer.value = (data?.payer && (data.payer._id || data.payer)) || ''

    // load splits
    const splitsRes = await api.post('/api/Expense/_getSplitsByExpense', {
      expenseId: props.expenseId,
    })
    const splits = Array.isArray(splitsRes.data.splits) ? splitsRes.data.splits : []
    console.log('splits loaded', splits)
    userSplits.value = splits.map((s: any) => ({
      userId: s.user?._id || s.user,
      amount: s.amountOwed,
    }))

    console.log('userSplits', userSplits.value)
  } catch (err) {
    console.error('Error loading expense', err)
  }
}

onMounted(async () => {
  await loadMembers()
  await loadExpense()
})

/* Helpers/validation */
const sumOfSplits = computed(() =>
  userSplits.value.reduce((acc, s) => acc + (Number(s.amount) || 0), 0),
)
const splitMismatch = computed(() => {
  if (totalCost.value === null || Number.isNaN(totalCost.value)) return false
  return Number(totalCost.value) !== Number(Number(sumOfSplits.value).toFixed(2))
})

/* allow current split's selected user to remain visible */
const availableMembersForSplit = (currentUserId: string) => {
  const selectedIds = userSplits.value.map((s) => s.userId).filter(Boolean)
  console.log('selectedIds', selectedIds)
  return members.value.filter((m) => !selectedIds.includes(m._id) || m._id === currentUserId)
}

const addSplit = () => {
  const avail = members.value.filter((m) => !userSplits.value.map((s) => s.userId).includes(m._id))
  userSplits.value.push({ userId: avail.length && avail[0] ? avail[0]._id : '', amount: null })
}
const removeSplit = (index: number) => userSplits.value.splice(index, 1)

/* split equal helper (mirrors CreateExpense behaviour) */
function splitEqually(useAll = true) {
  const targets = useAll
    ? members.value.map((m) => m._id)
    : members.value.filter((m) => m._id !== payer.value).map((m) => m._id)
  if (!targets.length || !totalCost.value || totalCost.value <= 0) return

  const base = Math.floor((totalCost.value / targets.length) * 100) / 100
  const remainder = Number((totalCost.value - base * targets.length).toFixed(2))

  userSplits.value = targets.map((id, idx) => {
    const add = idx === 0 ? remainder : 0
    return { userId: id, amount: Number((base + add).toFixed(2)) }
  })
}

/* Update expense (preserve previous logic) */
const updateExpense = async () => {
  errorMsg.value = ''
  if (!title.value || !category.value || !totalCost.value || !payer.value) {
    errorMsg.value = 'All fields are required'
    return
  }

  const sumOf = userSplits.value.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)
  if (Number(sumOf.toFixed(2)) !== Number(Number(totalCost.value).toFixed(2))) {
    errorMsg.value = `Total of splits (${sumOf.toFixed(2)}) must equal total cost (${Number(totalCost.value).toFixed(2)})`
    return
  }

  busy.value = true
  try {
    // Get old splits
    const oldSplitsRes = await api.post('/api/Expense/_getSplitsByExpense', {
      expenseId: props.expenseId,
    })
    const oldSplits = Array.isArray(oldSplitsRes.data.splits) ? oldSplitsRes.data.splits : []

    // Reverse debt effect of old splits
    // for (const split of oldSplits) {
    //   try {
    //     const userId = split.user._id || split.user
    //     const amount = split.amountOwed
    //     await api.post('/api/Debt/updateDebt', {
    //       payer: payer.value,
    //       receiver: userId,
    //       amount: -amount,
    //     })
    //   } catch (err) {
    //     console.error(`Error reversing debt for ${split.user?._id || split.user}`, err)
    //   }
    // }

    // Remove old splits
    for (const split of oldSplits) {
      await api.post('/api/Expense/removeUserSplit', {
        expense: props.expenseId,
        userSplit: split._id,
        creator: userStore.currentUser?._id,
        token: userStore.currentUser?.token,
      })
    }

    // Add new splits and update debts
    for (const split of userSplits.value) {
      if (!split.userId || split.amount === null) continue
      await api.post('/api/Expense/addUserSplit', {
        expense: props.expenseId,
        user: split.userId,
        amountOwed: split.amount,
        token: userStore.currentUser?.token,
        creator: userStore.currentUser?._id,
      })
      //   try {
      // await api.post('/api/Debt/updateDebt', {
      //   payer: payer.value,
      //   receiver: split.userId,
      //   amount: split.amount,
      // })
      //   } catch (err) {
      //     console.error(`Error updating debt for ${split.userId}`, err)
      //   }
    }

    // Update expense details
    const res = await api.post('/api/Expense/editExpense', {
      expenseToEdit: props.expenseId,
      title: title.value,
      description: description.value,
      category: category.value,
      totalCost: totalCost.value,
      date: new Date(date.value),
      payer: payer.value,
      token: userStore.currentUser?.token,
      user: userStore.currentUser?._id,
    })

    if (res.data?.error) {
      errorMsg.value = res.data.error
      busy.value = false
      return
    }

    emit('refresh')
    emit('close')
  } catch (err) {
    console.error('Error updating expense', err)
  } finally {
    busy.value = false
  }
}

/* Delete expense (preserve existing) */
const deleteExpense = async () => {
  try {
    const splitsRes = await api.post('/api/Expense/_getSplitsByExpense', {
      expenseId: props.expenseId,
    })
    const splits = Array.isArray(splitsRes.data.splits) ? splitsRes.data.splits : []

    for (const split of splits) {
      try {
        const userId = split.user._id || split.user
        const amount = split.amountOwed

        await api.post('/api/Expense/removeUserSplit', {
          expense: props.expenseId,
          userSplit: split._id,
          token: userStore.currentUser?.token,
          creator: userStore.currentUser?._id,
        })
      } catch (err) {
        console.error(`Error reversing debt for ${split.user?._id || split.user}`, err)
      }
    }

    const res = await api.post('/api/Expense/deleteExpense', {
      expenseToDelete: props.expenseId,
      token: userStore.currentUser?.token,
      user: userStore.currentUser?._id,
    })
    if (res.data?.error) {
      errorMsg.value = res.data.error
      return
    }

    emit('refresh')
    emit('close')
  } catch (err) {
    console.error('Error deleting expense', err)
  }
}

const confirmDelete = async () => {
  showDeleteConfirm.value = false
  await deleteExpense() // call your existing deleteExpense function
}
</script>

<template>
  <div class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-card">
      <header class="modal-head">
        <div>
          <h3 class="modal-title">Edit Expense</h3>
          <div class="muted small">Edit details and participant splits</div>
        </div>
        <button class="btn danger" @click="showDeleteConfirm = true">Delete</button>
      </header>
      <div class="modal-body">
        <section class="form-grid">
          <div class="field">
            <label class="label">Title</label>
            <input class="title-input" v-model="title" placeholder="Dinner, utilities, gift..." />
          </div>

          <div class="field">
            <label class="label">Category</label>
            <input
              class="category-input"
              v-model="category"
              placeholder="Category (e.g. Food, Travel)"
            />
          </div>

          <div class="field">
            <label class="label">Date</label>
            <input type="date" v-model="date" />
          </div>

          <div class="field">
            <label class="label">Total Cost</label>
            <input
              type="number"
              v-model.number="totalCost"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div class="field wide">
            <label class="label">Payer</label>
            <select v-model="payer">
              <option value="">Select payer</option>
              <option v-for="m in members" :key="m._id" :value="m._id">
                {{ m.displayName }}
              </option>
            </select>
          </div>

          <div class="field full">
            <label class="label">Description (optional)</label>
            <textarea
              class="desc"
              v-model="description"
              rows="3"
              placeholder="Add notes about this expense"
            ></textarea>
          </div>
        </section>

        <section class="splits">
          <div class="splits-head">
            <h4 class="h4">User Splits</h4>
            <div class="splits-tools">
              <div class="">
                Sum: <strong :class="{ warn: splitMismatch }">${{ sumOfSplits.toFixed(2) }}</strong>
              </div>

              <div class="split-buttons">
                <button
                  class="btn cancel"
                  @click="splitEqually(true)"
                  title="Split equally among all members"
                >
                  Split equally (all)
                </button>
                <button
                  class="btn cancel"
                  @click="splitEqually(false)"
                  title="Split equally among everyone except payer"
                >
                  Split (except payer)
                </button>
              </div>

              <button class="btn" @click="addSplit">+ Add split</button>
            </div>
          </div>

          <div class="splits-list">
            <div v-if="!userSplits.length" class="muted">
              No splits yet — click "Split equally" or add a user split.
            </div>

            <div v-for="(split, i) in userSplits" :key="i" class="split-row">
              <select v-model="split.userId">
                <option value="">Select user</option>
                <option
                  style="background-color: var(--brand-deep)"
                  v-for="m in availableMembersForSplit(split.userId)"
                  :key="m._id"
                  :value="m._id"
                >
                  {{ m.displayName }}
                </option>
              </select>

              <input
                type="number"
                v-model.number="split.amount"
                min="0"
                step="0.01"
                placeholder="Amount"
              />

              <button class="btn remove" @click="removeSplit(i)">Remove</button>
            </div>
          </div>
        </section>

        <p class="error" v-if="errorMsg">{{ errorMsg }}</p>
      </div>

      <footer class="modal-foot">
        <div class="foot-actions">
          <button class="btn cancel" @click="emit('close')">Cancel</button>
          <button class="btn" :disabled="busy" @click="updateExpense">
            {{ busy ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </footer>
      <div v-if="showDeleteConfirm" class="modal-overlay" role="dialog" aria-modal="true">
        <div class="modal-card-confirm">
          <header class="modal-head">
            <h3 class="modal-title">Confirm Delete</h3>
          </header>
          <div class="modal-body" style="text-align: center">
            <p>Are you sure you want to delete this expense?</p>
          </div>
          <footer class="modal-foot">
            <div class="foot-actions">
              <button class="btn cancel" @click="showDeleteConfirm = false">Cancel</button>
              <button class="btn danger" @click="confirmDelete">Delete</button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modal overlay and card (match CreateExpense styling) */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, rgba(6, 12, 18, 0.4), rgba(2, 6, 20, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2400;
  padding: 20px;
}

.modal-card {
  width: min(920px, 98%);
  max-width: 920px;
  background: var(--card);
  border: 1px solid rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(6px);
  border-radius: 12px;
  padding: 18px;
  color: var(--brand-light, #eef6ff);
  box-shadow: 0 18px 40px rgba(4, 10, 24, 0.56);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modal-body {
  background: rgba(0, 0, 0, 0.25); /* translucent black */
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-card-confirm {
  width: min(400px, 98%);
  max-width: 400px;
  background: var(--card);
  backdrop-filter: blur(6px);
  border-radius: 12px;
  padding: 18px;
  color: var(--brand-light, #eef6ff);
  box-shadow: 0 18px 40px rgba(4, 10, 24, 0.56);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* header */
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.modal-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--brand-highlight);
  font-weight: 800;
}

/* form grid */
.form-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 90%;
}
.field.wide {
  grid-column: span 2;
}
.field.full {
  grid-column: 1 / -1;
}
.label {
  font-size: 0.85rem;
  color: var(--muted);
  font-weight: 700;
}

/* prominent Title & Category inputs */
.title-input,
.category-input {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.14);
  color: var(--brand-light);
  font-size: 1.05rem;
  font-weight: 700;
  outline: none;
  transition:
    box-shadow 0.12s ease,
    border-color 0.12s ease,
    transform 0.08s ease;
}
.title-input:focus,
.category-input:focus {
  border-color: var(--brand-vivid);
  box-shadow: 0 10px 30px rgba(146, 49, 126, 0.12);
  transform: translateY(-2px);
}

.btn.remove {
  background: linear-gradient(120deg, #b04444, var(--brand-vivid));
  color: var(--brand-light);
  box-shadow: none;
}

.desc {
  padding: 10px 12px;
  width: 95%;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.12);
  color: var(--brand-light);
  outline: none;
  transition:
    box-shadow 0.12s ease,
    border-color 0.12s ease;
}

/* inputs */
input[type='number'],
input[type='date'],
textarea,
select {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.12);
  color: var(--brand-light);
  outline: none;
  transition:
    box-shadow 0.12s ease,
    border-color 0.12s ease;
}
input:focus,
textarea:focus,
select:focus {
  border-color: var(--brand-vivid);
  box-shadow: 0 8px 24px rgba(146, 49, 126, 0.08);
}

/* splits section */
.splits {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.02);
}
.splits-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.splits-tools {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* split buttons */
.split-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* list rows */
.splits-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}
.split-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.split-row select,
.split-row input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(255, 255, 255, 0.01);
  color: var(--brand-light);
}
.split-row select {
  min-width: 220px;
}
.split-row input {
  width: 120px;
}

/* select visibility: make selected username clearly visible */
select,
.split-row select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  color: var(--brand-light) !important;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--brand-light) 50%),
    linear-gradient(135deg, var(--brand-light) 50%, transparent 50%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
  background-position:
    calc(100% - 18px) calc(50% - 3px),
    calc(100% - 13px) calc(50% - 3px),
    right 12px center;
  background-size:
    6px 6px,
    6px 6px,
    14px;
  background-repeat: no-repeat;
  padding-right: 40px;
}

/* footer */
.modal-foot {
  display: flex;
  justify-content: right;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.02);
}
.foot-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* misc */
.h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--brand-light);
}
.muted {
  color: var(--muted);
}
.small {
  font-size: 0.85rem;
}

/* validation */
.warn {
  color: rgb(219, 84, 84);
  font-weight: 800;
}
.error {
  color: #ff7b7b;
  font-weight: 700;
}

/* responsive */
@media (max-width: 920px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .field.wide {
    grid-column: span 2;
  }
}
@media (max-width: 520px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .field.wide {
    grid-column: auto;
  }
  .split-row {
    flex-direction: column;
    align-items: stretch;
  }
  .split-row input {
    width: 100%;
  }
}
</style>
