<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import GroupMembers from '../components/GroupMembers.vue';
import CreateExpense from '../components/CreateExpense.vue';
import EditExpense from '../components/EditExpense.vue';
import { useUserStore } from '../stores/user';

const router = useRouter();
const userStore = useUserStore();
const currentUser = computed(() => userStore.currentUser?._id || '');

interface Group {
  _id: string;
  name: string;
  description: string;
  creator: string;
}

interface Expense {
  _id: string;
  title: string;
  category: string;
  description?: string;
  date: string;
  totalCost: number;
  payer: { _id: string; displayName: string };
  youOwe?: number;
}

const props = defineProps<{ groupId: string }>();

const group = ref<Group | null>(null);
const expenses = ref<Expense[]>([]);
const showUsersModal = ref(false);
const showCreateExpense = ref(false);

const showEditExpense = ref(false)
const editingExpenseId = ref<string | null>(null)

const loadGroup = async () => {
  try {
    const res = await axios.post('http://localhost:8000/api/Group/_getGroup', { group: props.groupId });
    group.value = res.data;
  } catch (err) {
    console.error(err);
  }
};

const loadExpenses = async () => {
  try {
    const res = await axios.post('http://localhost:8000/api/Expense/_getExpensesByGroup', { group: props.groupId });
    const rawExpenses: any[] = res.data || [];

    const expensesWithPayer: Expense[] = [];
    for (const e of rawExpenses) {
      // fetch payer info
      let payer = { _id: e.payer, displayName: 'Unknown' };
      try {
        const userRes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', { user: e.payer });
        if (userRes.data?.userInfo) {
          payer = userRes.data.userInfo;
        }
      } catch (err) {
        console.error('Error fetching payer info', err);
      }

      // fetch current user's split
      let youOwe = 0;
      try {
        const splitRes = await axios.post('http://localhost:8000/api/Expense/_getSplitForExpense', {
          expenseId: e._id,
          user: currentUser.value
        });
        youOwe = splitRes.data?.split?.amountOwed || 0;
        console.log("split",splitRes,e._id,currentUser.value);
      } catch (err) {
        console.error('Error fetching split info', err);
      }

      expensesWithPayer.push({ ...e, payer, youOwe });
    }

    expenses.value = expensesWithPayer;
  } catch (err) {
    console.error(err);
  }
};

const handleEditExpense = (expenseId: string) => {
  editingExpenseId.value = expenseId
  showEditExpense.value = true
}

onMounted(async () => {
  await loadGroup();
  await loadExpenses();
});
</script>

<template>
  <div class="group-view">
    <h2>{{ group?.name }}</h2>
    <div class="buttons-row">
      <button @click="showUsersModal = true">View / Manage Users</button>
      <button @click="showCreateExpense = true">Create Expense</button>
    </div>

    <!-- Expense List Header -->
    <div class="expense-row header">
      <span class="expense-date">Date</span>
      <span class="expense-title">Title</span>
      <span class="expense-category">Category</span>
      <span class="expense-description">Description</span>
      <span class="expense-payer">Payer</span>
      <span class="expense-total">Total Cost</span>
      <span class="expense-youOwe">You Owe</span>
      <span class="expense-action">Action</span>
    </div>

    <!-- Expenses -->
    <div class="expenses-list">
      <div class="expense-row" v-for="expense in expenses" :key="expense._id">
        <span class="expense-date">{{ new Date(expense.date).toLocaleDateString() }}</span>
        <span class="expense-title">{{ expense.title }}</span>
        <span class="expense-category">{{ expense.category }}</span>
        <span class="expense-description">{{ expense.description || '-' }}</span>
        <span class="expense-payer">{{ expense.payer.displayName }}</span>
        <span class="expense-total">${{ expense.totalCost.toFixed(2) }}</span>
        <span class="expense-youOwe">${{ expense.youOwe?.toFixed(2) }}</span>
        <button class="edit-btn" @click="handleEditExpense(expense._id)">Edit</button>
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
</template>

<style scoped>
.group-view {
  padding: 2rem;
  color: black;
  background-color: white;
  width: 100vw;
  box-sizing: border-box;
}

.buttons-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.buttons-row button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  background-color: black;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.buttons-row button:hover {
  background-color: #1565c0;
  transform: translateY(-1px);
}

.buttons-row button:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Expense List Styling */
.expenses-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expense-row {
  display: grid;
  grid-template-columns: 120px 150px 120px 1fr 120px 100px 100px 80px;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  gap: 0.5rem;
  font-size: 0.95rem;
}

.expense-row.header {
  background: #e0e0e0;
  font-weight: bold;
  box-shadow: none;
}

.expense-row:nth-child(even):not(.header) {
  background: #f0f0f0;
}

.edit-btn {
  padding: 0.3rem 0.6rem;
  border: none;
  border-radius: 5px;
  background-color: black;
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
}

.edit-btn:hover {
  background-color: #45a049;
}
</style>
