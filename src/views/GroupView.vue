//// filepath:
c:\Users\vypha\OneDrive\Documents\fall_2025\6104\expense-tracker-frontend\expense-tracker\src\views\GroupView.vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import GroupMembers from '../components/GroupMembers.vue'
import CreateExpense from '../components/CreateExpense.vue'
import EditExpense from '../components/EditExpense.vue'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const currentUser = computed(() => userStore.currentUser?._id || '')

interface Group {
  _id: string
  name: string
  description: string
  creator: string
}

interface Expense {
  _id: string
  title: string
  category: string
  description?: string
  date: string
  totalCost: number
  payer: { _id: string; displayName: string }
  youOwe?: number
}

const props = defineProps<{ groupId: string }>()

const group = ref<Group | null>(null)
const expenses = ref<Expense[]>([])
const showUsersModal = ref(false)
const showCreateExpense = ref(false)

const showEditExpense = ref(false)
const editingExpenseId = ref<string | null>(null)

const showExpenseModal = ref(false)
const selectedExpense = ref<Expense | null>(null)

const userSplits = ref<{ userId: string; displayName: string; amount: number }[]>([])

async function openExpenseModal(expense: Expense) {
  selectedExpense.value = expense

  const splitsRes = await axios.post('/api/Expense/_getSplitsByExpense', {
    expenseId: expense._id,
  })
  const splits = Array.isArray(splitsRes.data.splits) ? splitsRes.data.splits : []

  const enrichedSplits = await Promise.all(
    splits.map(async (s: any) => {
      try {
        const userRes = await axios.post('/api/Authentication/_getUserById', {
          user: s.user?._id || s.user,
        })
        const displayName = userRes.data?.userInfo?.displayName || 'Unknown'
        return {
          userId: s.user?._id || s.user,
          displayName,
          amount: s.amountOwed,
        }
      } catch {
        return {
          userId: s.user?._id || s.user,
          displayName: 'Unknown',
          amount: s.amountOwed,
        }
      }
    }),
  )

  userSplits.value = enrichedSplits

  showExpenseModal.value = true
}

function closeExpenseModal() {
  selectedExpense.value = null
  showExpenseModal.value = false
}

const loadGroup = async () => {
  try {
    const res = await axios.post('/api/Group/_getGroup', { group: props.groupId })
    group.value = res.data
  } catch (err) {
    console.error(err)
  }
}

const loadExpenses = async () => {
  try {
    const res = await axios.post('/api/Expense/_getExpensesByGroup', { group: props.groupId })
    const rawExpenses: any[] = res.data || []

    const expensesWithPayer: Expense[] = []
    for (const e of rawExpenses) {
      let payer = { _id: e.payer, displayName: 'Unknown' }
      try {
        const userRes = await axios.post('/api/Authentication/_getUserById', { user: e.payer })
        if (userRes.data?.userInfo) {
          payer = userRes.data.userInfo
        }
      } catch (err) {
        console.error('Error fetching payer info', err)
      }

      let youOwe = 0
      try {
        const splitRes = await axios.post('/api/Expense/_getSplitForExpense', {
          expenseId: e._id,
          user: currentUser.value,
        })
        youOwe = splitRes.data?.split?.amountOwed || 0
      } catch (err) {
        console.error('Error fetching split info', err)
      }

      expensesWithPayer.push({ ...e, payer, youOwe })
    }

    expenses.value = expensesWithPayer
  } catch (err) {
    console.error(err)
  }
}

const handleEditExpense = (expenseId: string) => {
  editingExpenseId.value = expenseId
  showEditExpense.value = true
}

onMounted(async () => {
  await loadGroup()
  await loadExpenses()
})
</script>

<template>
  <div class="page">
    <div class="content">
      <div
        class="panel card"
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        "
      >
        <div>
          <div class="h1">{{ group?.name }}</div>
          <div style="color: var(--muted); font-size: 0.95rem">
            {{ group?.description || 'Group details' }}
          </div>
        </div>
        <div class="row">
          <button class="btn ghost" @click="router.push('/')">← Back</button>
          <button class="btn ghost" @click="showUsersModal = true">Members</button>
          <button class="btn" @click="showCreateExpense = true">Create Expense</button>
        </div>
      </div>

      <!-- expenses table-like list -->
      <div class="panel">
        <div class="expense-row header">
          <span class="expense-date">Date</span>
          <span class="expense-title">Title</span>
          <span class="expense-category">Category</span>
          <span class="expense-description">Description</span>
          <span class="expense-payer" style="color: var(--brand-vivid)">Payer</span>
          <span class="expense-total">Total</span>
          <span class="expense-youOwe" style="color: var(--brand-highlight)">Your Share</span>
        </div>
        <!-- filepath: c:\Users\vypha\OneDrive\Documents\fall_2025\6104\expense-tracker-frontend\expense-tracker\src\views\GroupView.vue -->
        <!-- replace this block inside the existing <template> where expenses are listed -->
        <div
          class="expense-row"
          v-for="expense in expenses"
          :key="expense._id"
          @click="openExpenseModal(expense)"
        >
          <span class="expense-date">{{ new Date(expense.date).toLocaleDateString() }}</span>
          <span class="expense-title">{{ expense.title }}</span>
          <span class="expense-category">{{ expense.category }}</span>
          <span class="expense-description">{{ expense.description || '-' }}</span>
          <span class="expense-payer">{{ expense.payer.displayName }}</span>
          <span class="expense-total">${{ expense.totalCost.toFixed(2) }}</span>
          <span class="expense-youOwe" :class="{ danger: expense?.youOwe > 0 }"
            >${{ (expense.youOwe || 0).toFixed(2) }}</span
          >
        </div>
      </div>

      <GroupMembers
        v-if="showUsersModal"
        :groupId="props.groupId"
        @close="showUsersModal = false"
      />

      <CreateExpense
        v-if="showCreateExpense"
        :groupId="props.groupId"
        @close="showCreateExpense = false"
        @refresh="loadExpenses"
      />

      <EditExpense
        v-if="showEditExpense && editingExpenseId"
        :groupId="props.groupId"
        :expenseId="editingExpenseId"
        @close="showEditExpense = false"
        @refresh="loadExpenses"
      />
    </div>
  </div>

  <!-- prettier expense details modal -->
  <div v-if="showExpenseModal" class="modal-overlay" @click.self="closeExpenseModal">
    <div
      class="expense-modal panel modal-card"
      role="dialog"
      aria-modal="true"
      aria-label="Expense details"
    >
      <button class="modal-close" @click="closeExpenseModal" aria-label="Close">×</button>

      <header class="modal-header">
        <div class="modal-ident">
          <h3 class="modal-title">{{ selectedExpense?.title }}</h3>
          <div class="modal-sub muted">{{ new Date(selectedExpense?.date).toLocaleString() }}</div>
          <div class="meta-row">
            <span class="meta-pill">{{ selectedExpense?.category }}</span>
            <span class="meta-pill">Payer: {{ selectedExpense?.payer.displayName }}</span>
          </div>
        </div>

        <div class="amount-box" aria-hidden>
          <div class="amount-label">Total</div>
          <div class="amount-value">
            ${{ selectedExpense ? selectedExpense.totalCost.toFixed(2) : '0.00' }}
          </div>
          <div class="you-owe" :class="{ highlight: (selectedExpense?.youOwe || 0) > 0 }">
            Your share:
            <strong
              >${{ selectedExpense ? (selectedExpense.youOwe || 0).toFixed(2) : '0.00' }}</strong
            >
          </div>
        </div>
      </header>

      <main class="modal-body">
        <div class="field">
          <div class="label">Category</div>
          <div class="value">{{ selectedExpense?.category || '-' }}</div>
        </div>

        <div class="field">
          <div class="label">Payer</div>
          <div class="value">{{ selectedExpense?.payer.displayName || '-' }}</div>
        </div>

        <div class="field full">
          <div class="label">Description</div>
          <div class="value muted description">{{ selectedExpense?.description || '-' }}</div>
        </div>

        <div class="field full">
          <div class="label">Splits</div>
          <div class="value muted description">
            <div class="splits-list">
              <div v-for="split in userSplits" :key="split.userId" class="split-row">
                <span class="split-name">{{ split.displayName }}: </span>
                <span class="split-amount">${{ split.amount.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer class="modal-footer">
        <div class="footer-actions">
          <button class="btn cancel" @click="closeExpenseModal">Close</button>
          <button
            class="btn"
            @click="
              () => {
                if (selectedExpense) handleEditExpense(selectedExpense._id)
                closeExpenseModal()
              }
            "
          >
            Edit
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.expenses-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  background-color:;
}

/* grid layout */
.expense-row {
  display: grid;
  grid-template-columns: 110px 1.4fr 120px 1fr 120px 100px 100px 90px;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(1deg, var(--brand-mid), var(--brand-vivid));
  /* background-color: var(--brand-mid); */
  box-shadow: var(--shadow-tight);
  transition:
    transform 0.08s ease,
    box-shadow 0.08s ease;
}

.expense-row.header {
  background: transparent;
  font-weight: 700;
  color: var(--brand-deep);
  border: none;
  box-shadow: none;
  padding: 8px 12px;
}

.expense-row:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-soft);
}

/* paste into the existing <style scoped> (replace the old expense CSS or append and remove duplicates) */

/* container */
.expenses-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

/* grid layout for rows (keeps same column widths) */
.expense-row {
  display: grid;
  grid-template-columns: 110px 1.4fr 120px 1fr 120px 100px 100px 90px;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(
    190deg,
    var(--brand-deep),
    var(--brand-mid)
  ); /* subtle translucent row background */
  border: none; /* remove border colors */
  box-shadow: none; /* remove heavy shadows */
  transition:
    transform 0.08s ease,
    box-shadow 0.12s ease,
    background 0.12s ease;
  cursor: default;
  margin-bottom: 1%;
}

/* header row: clear headings, no borders */
.expense-row.header {
  background: transparent;
  font-weight: 700;
  color: white; /* header labels use brand-highlight for clarity */
  border: none;
  box-shadow: none;
  padding: 8px 12px;
}

.expense-row.header:hover {
  transform: none;
  box-shadow: none;
}

/* subtle hover lift for rows (non-header) */
/* .expense-row:not(.header):hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 28px rgba(4,10,24,0.22);
  cursor: pointer;
} */

/* typography / colors */
.expense-title {
  font-weight: 600;
  color: var(--brand-light);
}
.expense-category {
  color: var(--muted);
  font-size: 0.95rem;
}
.expense-description {
  color: var(--muted);
  font-size: 0.95rem;
}
.expense-payer {
  font-weight: 600;
  color: var(--brand-mid);
}
.expense-total {
  font-weight: 700;
  color: var(--brand-light);
}

/* you-owe: muted by default, highlighted when positive */
.expense-youOwe {
  color: var(--muted);
  font-weight: 600;
}
.expense-youOwe.highlight {
  color: var(--brand-highlight);
  font-weight: 800;
}

/* keep the action cell aligned to the right */
.expense-action {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

/* responsive tweaks */
@media (max-width: 1000px) {
  .expense-row {
    grid-template-columns: 110px 1fr 120px 100px;
    grid-auto-rows: auto;
    grid-template-areas:
      'date title title action'
      'category description payer action';
  }
  .expense-date {
    grid-area: date;
  }
  .expense-title {
    grid-area: title;
  }
  .expense-category {
    grid-area: category;
  }
  .expense-description {
    grid-area: description;
  }
  .expense-payer {
    grid-area: payer;
  }
  .expense-action {
    grid-area: action;
    display: flex;
    justify-content: flex-end;
  }
}
/* pointer + hover affordance */
.expense-row:not(.header) {
  cursor: pointer;
}

/* prettier modal styling for expense details (paste near other modal rules) */

.modal-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, rgba(6, 12, 18, 0.2), var(--brand-deep));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2600;
  padding: 20px;
}

/* card */
.modal-card.expense-modal {
  width: min(880px, 96%);
  max-width: 880px;
  border-radius: 14px;
  padding: 18px;
  background: var(--card);
  box-shadow: 0 22px 56px rgba(2, 6, 23, 0.6);
  color: var(--brand-light);
  animation: modal-pop 0.14s cubic-bezier(0.2, 0.9, 0.3, 1);
  position: relative;
  overflow: hidden;
  border: none;
}

/* close button */
.modal-close {
  position: absolute;
  right: 12px;
  top: 10px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 20px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
}
.modal-close:hover {
  background: rgba(255, 255, 255, 0.03);
  transform: translateY(-2px);
}

/* header layout */
.modal-header {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

/* left identity */
.modal-ident {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.modal-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--brand-highlight);
  font-weight: 800;
}
.modal-sub {
  font-size: rem;
  color: var(--muted);
}

/* small meta pills */
.meta-row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.meta-pill {
  background: rgba(0, 0, 0, 0.1);
  color: var(--brand-light);
  padding: 10px;
  border-radius: 999px;
  font-size: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.02);
}

/* amount box on the right */
.amount-box {
  min-width: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.04);
  text-align: center;
}
.amount-label {
  font-size: 0.85rem;
  color: var(--muted);
}
.amount-value {
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--brand-light);
  letter-spacing: -0.01em;
}
.you-owe {
  font-size: 0.95rem;
  color: var(--muted);
  margin-top: 6px;
}
.you-owe.highlight {
  color: var(--brand-highlight);
  font-weight: 800;
}

/* body */
.modal-body {
  display: grid;
  grid-template-columns: 1fr 320px;
  background-color: rgba(0, 0, 0, 0.2);
  gap: 14px;
  padding: 14px;
  border-radius: 10px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.02);
}
.field.full {
  grid-column: 1 / -1;
}
.label {
  font-size: 0.85rem;
  color: var(--muted);
  font-weight: 700;
}
.value {
  font-size: 1rem;
  color: var(--brand-light);
}

/* description larger readable block */
.description {
  white-space: pre-wrap;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.9);
}

/* footer */
.modal-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  padding-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.footer-actions {
  display: flex;
  gap: 8px;
}

/* subtle entrance */
@keyframes modal-pop {
  from {
    transform: translateY(8px) scale(0.995);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

/* responsive */
@media (max-width: 880px) {
  .modal-body {
    grid-template-columns: 1fr;
  }
  .amount-box {
    width: 100%;
    align-self: flex-start;
  }
  .modal-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .amount-box {
    min-width: unset;
    align-items: flex-start;
    padding-left: 12px;
  }
}

/* small screens reduce padding */
@media (max-width: 420px) {
  .modal-card.expense-modal {
    padding: 12px;
    border-radius: 10px;
  }
  .modal-title {
    font-size: 1.05rem;
  }
  .amount-value {
    font-size: 1.25rem;
  }
}
/* small screens */
@media (max-width: 600px) {
  .panel {
    padding: 14px;
  }
  .expense-row {
    padding: 10px;
    border-radius: 10px;
  }
  .expense-row:not(.header):hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 18px rgba(4, 10, 24, 0.14);
  }
}

.expense-title {
  font-weight: 600;
  color: var(--brand-highlight);
  font-size: 0.95rem;
  font-weight: 700;
}
.expense-category {
  color: var(--muted);
  font-size: 0.95rem;
}
.expense-description {
  color: var(--muted);
  font-size: 0.95rem;
}
.expense-payer {
  font-weight: 600;
  color: white;
  font-weight: 700; /* adds an outline */
}
.expense-total {
  font-weight: 700;
  color: var(--brand);
}

.expense-youOwe.danger {
  color: var(--brand-highlight);
  font-weight: 700;
}

.back-btn {
  display: none;
} /* using header controls now */

/* responsive tweaks */
@media (max-width: 1000px) {
  .expense-row {
    grid-template-columns: 110px 1fr 120px 100px;
    grid-auto-rows: auto;
    grid-template-areas:
      'date title title action'
      'category description payer action';
  }
  .expense-date {
    grid-area: date;
  }
  .expense-title {
    grid-area: title;
  }
  .expense-category {
    grid-area: category;
  }
  .expense-description {
    grid-area: description;
  }
  .expense-payer {
    grid-area: payer;
  }
}

/* small screens */
@media (max-width: 600px) {
  .panel {
    padding: 14px;
  }
}
</style>
