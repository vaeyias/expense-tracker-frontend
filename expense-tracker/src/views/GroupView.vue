<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import GroupUsersModal from './GroupUsersModal.vue';
import CreateExpenseModal from './CreateExpenseModal.vue';
import { useRouter } from 'vue-router';
const router = useRouter();


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
  date: string;
  totalCost: number;
  payer: { _id: string; name: string };
}

const props = defineProps<{ groupId: string }>();

const group = ref<Group | null>(null);
const expenses = ref<Expense[]>([]);
const showUsersModal = ref(false);
const showCreateExpenseModal = ref(false);

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
    expenses.value = res.data || [];
  } catch (err) {
    console.error(err);
  }
};

const handleEditExpense = (expenseId: string) => {
  // open edit expense modal (can reuse CreateExpenseModal with prefilled data)
};

onMounted(async () => {
  await loadGroup();
  await loadExpenses();
});
</script>

<template>
  <div class="group-view">
    <h2>{{ group?.name }}</h2>
    <button @click="showUsersModal = true">View / Manage Users</button>
    <button @click="showCreateExpenseModal = true">Create Expense</button>

    <div class="expenses-list">
      <div class="expense-card" v-for="expense in expenses" :key="expense._id">
        <p><strong>{{ expense.title }}</strong> - {{ expense.category }}</p>
        <p>Date: {{ new Date(expense.date).toLocaleDateString() }}</p>
        <p>Amount: ${{ expense.totalCost }}</p>
        <p>Payer: {{ expense.payer.name }}</p>
        <button @click="handleEditExpense(expense._id)">Edit</button>
      </div>
    </div>

    <GroupUsersModal
      v-if="showUsersModal"
      :groupId="props.groupId"
      @close="showUsersModal = false"
    />

    <CreateExpenseModal
      v-if="showCreateExpenseModal"
      :groupId="props.groupId"
      @close="showCreateExpenseModal = false"
      @refresh="loadExpenses"
    />
  </div>
</template>

<style scoped>
.group-view {
  padding: 2rem;
}

.expenses-list {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.expense-card {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 0.5rem;
}
</style>
