<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '../utils/api'
import { useUserStore } from '../stores/user'
const userStore = useUserStore()
interface User {
  _id: string
  username: string
  displayName: string
}
interface Member {
  _id: string
  displayName: string
}

interface UserSplit {
  userId: string
  amount: number | null
}

const props = defineProps<{ groupId: string }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'refresh'): void
}>()

/* Form state */
const title = ref('')
const description = ref('')
const category = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const totalCost = ref<number | null>(null)
const payer = ref('')
const errorMsg = ref('')
const busy = ref(false)

/* Members and splits */
const members = ref<Member[]>([])
const userSplits = ref<UserSplit[]>([])

/* Load members for group */
const loadMembers = async () => {
  try {
    const res = await api.post('/api/Group/_listMembers', { group: props.groupId })
    console.log(res)
    const memberIds: string[] = Array.isArray(res.data) ? res.data : []

    const allMembers: Member[] = []

    for (const userId of memberIds) {
      const userObjRes = await api.post('/api/Authentication/_getUserById', { user: userId })
      if (userObjRes.data?.userInfo) {
        allMembers.push(userObjRes.data.userInfo)
      }
    }
    members.value = allMembers
  } catch (err) {
    console.error('Error loading members', err)
    errorMsg.value = 'Failed to load members.'
  }
}

onMounted(loadMembers)

/* Helpers for splits */
const sumOfSplits = computed(() => {
  return userSplits.value.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)
})
const splitMismatch = computed(() => {
  if (totalCost.value === null || Number.isNaN(totalCost.value)) return false
  return Number(totalCost.value) !== Number(Number(sumOfSplits.value).toFixed(2))
})

/**
 * Populate splits by splitting equally across selected members or all members
 */
function splitEqually(useAll = true) {
  const targets = useAll
    ? members.value.map((m) => m._id)
    : members.value.filter((m) => m._id !== payer.value).map((m) => m._id)
  if (!targets.length || !totalCost.value || totalCost.value <= 0) return

  const base = Math.floor((totalCost.value / targets.length) * 100) / 100 // truncate to cents
  const remainder = Number((totalCost.value - base * targets.length).toFixed(2)) // leftover cents

  userSplits.value = targets.map((id, idx) => {
    const add = idx === 0 ? remainder : 0
    return { userId: id, amount: Number((base + add).toFixed(2)) }
  })
}

/* availableMembersForSplit used by select dropdown when adding a split
   Allows the current split's selected user (currentUserId) to remain visible in that dropdown. */
const availableMembersForSplit = (currentUserId: string) => {
  const selectedIds = userSplits.value.map((s) => s.userId).filter(Boolean)
  return members.value.filter((m) => !selectedIds.includes(m._id) || m._id === currentUserId)
}
/* Add/remove split rows */
const addSplit = () => {
  const avail = members.value.filter((m) => !userSplits.value.map((s) => s.userId).includes(m._id))
  userSplits.value.push({ userId: avail.length && avail[0] ? avail[0]._id : '', amount: null })
}
const removeSplit = (index: number) => userSplits.value.splice(index, 1)

/* Main create logic (keeps API sequence identical) */
const createExpense = async () => {
  errorMsg.value = ''
  if (!title.value.trim()) {
    errorMsg.value = 'Please enter a title.'
    return
  }
  if (!category.value.trim()) {
    errorMsg.value = 'Please enter a category.'
    return
  }
  if (!totalCost.value || Number(totalCost.value) <= 0) {
    errorMsg.value = 'Please enter a positive total cost.'
    return
  }
  if (!payer.value) {
    errorMsg.value = 'Please select the payer.'
    return
  }

  if (userSplits.value.length === 0) {
    errorMsg.value = 'Add at least one user split.'
    return
  }

  const sum = userSplits.value.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)
  if (Number(sum.toFixed(2)) !== Number(Number(totalCost.value).toFixed(2))) {
    errorMsg.value = `Sum of splits ($${sum.toFixed(2)}) must equal total cost ($${Number(totalCost.value).toFixed(2)}).`
    return
  }

  busy.value = true
  let expenseId: string | undefined

  try {
    const res = await api.post('/api/Expense/createExpense', {
      user: userStore.currentUser?._id,
      group: props.groupId,
      token: userStore.currentUser?.token,
    })
    if (res.data?.error) {
      errorMsg.value = res.data.error
      busy.value = false
      return
    }
    expenseId = res.data.expense
  } catch (err) {
    console.error('Error creating expense', err)
    errorMsg.value = 'Failed to create expense.'
    busy.value = false
    return
  }

  for (const split of userSplits.value) {
    if (!split.userId || split.amount === null) continue
    try {
      const r = await api.post('/api/Expense/addUserSplit', {
        expense: expenseId,
        payer: payer.value,
        user: split.userId,
        creator: userStore.currentUser?._id,
        amountOwed: split.amount,
        token: userStore.currentUser?.token,
      })
      if (r.data?.error) console.error('Error adding split', r.data.error)
    } catch (err) {
      console.error('Error adding split', err)
    }
  }

  try {
    const r = await api.post('/api/Expense/editExpense', {
      expenseToEdit: expenseId,
      title: title.value,
      description: description.value,
      category: category.value,
      totalCost: totalCost.value,
      date: new Date(date.value),
      payer: payer.value,
      user: userStore.currentUser?._id,
      token: userStore.currentUser?.token,
    })
    if (r.data?.error) {
      errorMsg.value = r.data.error
      await api
        .post('/api/Expense/deleteExpense', {
          expenseToDelete: expenseId,
          token: userStore.currentUser?.token,
        })
        .catch(() => {})
      busy.value = false
      return
    }
  } catch (err) {
    console.error('Error editing expense', err)
    await api
      .post('/api/Expense/deleteExpense', {
        expenseToDelete: expenseId,
        token: userStore.currentUser?.token,
      })
      .catch(() => {})
    busy.value = false
    return
  }

  busy.value = false
  emit('refresh')
  emit('close')
}

/* Small UX helpers */
function clearForm() {
  title.value = ''
  description.value = ''
  category.value = ''
  date.value = new Date().toISOString().slice(0, 10)
  totalCost.value = null
  payer.value = ''
  userSplits.value = []
  errorMsg.value = ''
}
</script>

<template>
  <div class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-card">
      <header class="modal-head">
        <div>
          <h3 class="modal-title">Create Expense</h3>
          <div class="muted small">Add a new expense to this group and set participant splits</div>
        </div>
      </header>
      <div class="modal-body">
        <section class="form-grid">
          <div class="field">
            <label class="label">Title</label>
            <input class="title-input" v-model="title" placeholder="..." />
          </div>

          <div class="field">
            <label class="label">Category</label>
            <input class="category-input" v-model="category" placeholder="..." />
          </div>

          <div class="field">
            <label class="label">Date</label>
            <input type="date" v-model="date" />
          </div>

          <div class="field">
            <label class="label">Total Cost</label>
            <input
              style="font-size: 1rem; width: 90%"
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
              <option
                style="background-color: var(--brand-deep); font-size: 1rem"
                v-for="m in members"
                :key="m._id"
                :value="m._id"
              >
                {{ m.displayName }}
              </option>
            </select>
          </div>

          <div class="field full">
            <label class="label">Description (optional)</label>
            <textarea
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
              <div style="">
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

              <button class="btn ghost remove" @click="removeSplit(i)">Remove</button>
            </div>
          </div>
        </section>

        <p class="error" v-if="errorMsg">{{ errorMsg }}</p>
      </div>
      <footer class="modal-foot">
        <div class="foot-actions">
          <button class="btn cancel" @click="emit('close')">Cancel</button>
          <button class="btn create" :disabled="busy" @click="createExpense">
            {{ busy ? 'Creating...' : 'Create' }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* buttons */

/* Overlay & card */
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

/* Updated background gradient using brand-mid -> brand-vivid */
.modal-card {
  width: min(920px, 98%);
  max-width: 920px;
  background: var(--card);
  border: 1px solid rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(6px);
  border-radius: 12px;
  border: none;
  padding: 18px;
  color: var(--brand-light, #eef6ff);
  box-shadow: 0 18px 40px rgba(4, 10, 24, 0.56);
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 1rem;
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
.modal-actions {
  display: flex;
  gap: 8px;
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
  font-size: 1rem;
}
.field.wide {
  grid-column: span 2;
}
.field.full {
  grid-column: 1 / -1;
}
.label {
  font-size: 1rem;
  color: var(--muted);
  font-weight: 700;
}

.btn.ghost.remove.btn {
  background: linear-gradient(120deg, #b04444, var(--brand-vivid));
  color: var(--brand-light);
  box-shadow: none;
}

.btn.cancel:hover {
  background: linear-gradient(120deg, #b04444, var(--brand-vivid));
  color: var(--brand-light);
}

/* enhance Title and Category inputs */
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

.modal-body {
  background: rgba(0, 0, 0, 0.25); /* translucent black */
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* inputs (others) */
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

/* split buttons group */
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
  font-size: 0.9rem;
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
  border: 1px solid rgba(163, 50, 198, 0.04);
  background: rgba(155, 11, 11, 0.01);
  color: white;
  font-size: 1rem;
}
.split-row select {
  min-width: 220px;
}
.split-row input {
  width: 120px;
}

/* remove button */
.remove {
  border: 1px solid rgba(255, 255, 255, 0.04);
  background-color: #ff7b7b;
  color: var(--brand-light);
}
.btn.ghost.remove:hover {
  background-color: #ff4c4c;
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

/* buttons (local variants) */

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
