<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

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

const title = ref('')
const description = ref('')
const category = ref('')
const date = ref(new Date().toISOString().slice(0, 10)) // yyyy-mm-dd
const totalCost = ref<number | null>(null)
const payer = ref('')
const errorMsg = ref('')

const members = ref<Member[]>([])
const userSplits = ref<UserSplit[]>([])

// Fetch members in group to populate dropdown
const loadMembers = async () => {
  try {
    const res = await axios.post('http://localhost:8000/api/Group/_listMembers', {
      group: props.groupId,
    })
    console.log("heya",res);
    const memberIds: string[] = Array.isArray(res.data.members) ? res.data.members : [];
    const allMembers: User[] = [];
    console.log(memberIds);

    for (const userId of memberIds) {
      const userObjRes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', {
        user:userId,
      });
      console.log(userObjRes);
      if (userObjRes.data) allMembers.push(userObjRes.data.userInfo);
    }

    members.value = allMembers;

  } catch (err) {
    console.error('Error loading members', err)
  }
}

const availableMembersForSplit = (currentUserId: string) => {
  const selectedIds = userSplits.value
    .map(s => s.userId)
    .filter(id => id && id !== currentUserId); // exclude the current split’s selection

  return members.value.filter(m => !selectedIds.includes(m._id));
};


onMounted(() => {
  loadMembers()
})

const addSplit = () => {
  userSplits.value.push({ userId: '', amount: null })
}

const removeSplit = (index: number) => {
  userSplits.value.splice(index, 1)
}

const createExpense = async () => {
  if (!title.value || !category.value || !totalCost.value || !payer.value) {
    errorMsg.value = 'All fields are required'
    return
  }

  // 🧮 Validate split amounts
  const sumOfSplits = userSplits.value.reduce((acc, split) => acc + (split.amount || 0), 0)
  if (sumOfSplits !== totalCost.value) {
    errorMsg.value = `Total of splits (${sumOfSplits}) must equal total cost (${totalCost.value})`
    return
  }

  // 1️⃣ Create a blank expense first
  let expenseId: string
  try {
    const res = await axios.post('http://localhost:8000/api/Expense/createExpense', {
      user: payer.value,
      group: props.groupId,
    })
    if (res.data.error) {
      errorMsg.value = res.data.error
      return
    }
    expenseId = res.data.expense
  } catch (err) {
    console.error('Error creating expense', err)
    return
  }

  // 2️⃣ Add new splits
  for (const split of userSplits.value) {
    if (!split.userId || split.amount === null) continue
    try {
      const res = await axios.post('http://localhost:8000/api/Expense/addUserSplit', {
        expense: expenseId,
        user: split.userId,
        amountOwed: split.amount,
      })
      if (res.data.error) console.error('Error adding split', res.data.error)
    } catch (err) {
      console.error('Error adding split', err)
    }
  }

  // 3️⃣ Edit expense details
  try {
    const res = await axios.post('http://localhost:8000/api/Expense/editExpense', {
      expenseToEdit: expenseId,
      title: title.value,
      description: description.value,
      category: category.value,
      totalCost: totalCost.value,
      date: new Date(date.value),
      payer: payer.value,
    })
    if (res.data.error) {
      errorMsg.value = res.data.error
      return
    }
  } catch (err) {
    await axios.post('http://localhost:8000/api/Expense/deleteExpense', { expenseId })
    console.error('Error editing expense', err)
    return
  }

  // 4️⃣ Update debts between payer and each user split
  for (const split of userSplits.value) {
    if (!split.userId || split.amount === null) continue
    try {
      await axios.post('http://localhost:8000/api/Debt/updateDebt', {
        payer: payer.value,
        receiver: split.userId,
        amount: split.amount,
      })
    } catch (err) {
      console.error(`Error updating debt between ${payer.value} and ${split.userId}`, err)
    }
  }

  emit('refresh')
  emit('close')
}

</script>

<template>
  <div class="modal-overlay">
    <div class="modal">
      <h3>Create Expense</h3>

      <input v-model="title" placeholder="Title" />
      <input v-model="description" placeholder="Description" />
      <input v-model="category" placeholder="Category" />
      <input type="date" v-model="date" />
      <input v-model.number="totalCost" type="number" placeholder="Total Cost" />

      <select v-model="payer">
        <option value="">Select Payer</option>
        <option v-for="m in members" :key="m._id" :value="m._id">
          {{ m.displayName }}
        </option>
      </select>

      <h4>User Splits</h4>
      <div v-for="(split, index) in userSplits" :key="index" class="split-row">
<select v-model="split.userId">
  <option value="">Select User</option>
  <option
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
          placeholder="Amount owed"
        />
        <button @click="removeSplit(index)">Remove</button>
      </div>

      <button @click="addSplit">+ Add User Split</button>

      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>

      <div class="modal-buttons">
        <button @click="createExpense">Create</button>
        <button @click="emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0,0,0,0.5);
  z-index: 2000;
  color: black;
}
.modal {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  width: 450px;
  max-height: 80vh;
  overflow-y: auto;
}
.split-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}
.error {
  color: red;
}
</style>
