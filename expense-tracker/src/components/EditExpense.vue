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

const props = defineProps<{
  groupId: string
  expenseId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'refresh'): void
}>()

// -------------------- STATE --------------------
const title = ref('')
const description = ref('')
const category = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const totalCost = ref<number | null>(null)
const payer = ref('')
const errorMsg = ref('')

const members = ref<Member[]>([])
const userSplits = ref<UserSplit[]>([])



// -------------------- LOAD MEMBERS --------------------
const loadMembers = async () => {
  try {
    const res = await axios.post('http://localhost:8000/api/Group/_listMembers', {
      group: props.groupId,
    })

    console.log(res,props.groupId);

    const memberIds: string[] = Array.isArray(res.data.members) ? res.data.members : []
    const allMembers: Member[] = []

    // fetch user info for each member ID
    for (const userId of memberIds) {
      try {
        const userObjRes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', {
          user: userId,
        })
        if (userObjRes.data?.userInfo) {
          allMembers.push(userObjRes.data.userInfo)
        }
      } catch (err) {
        console.error(`Failed to load user ${userId}`, err)
      }
    }

    members.value = allMembers
    console.log('Loaded members:', allMembers)
  } catch (err) {
    console.error('Error loading members', err)
  }
}

// -------------------- LOAD EXPENSE --------------------
const loadExpense = async () => {
  try {
    const res = await axios.post('http://localhost:8000/api/Expense/_getExpenseById', {
      expenseId: props.expenseId
    })
    const data = res.data

    title.value = data.title
    description.value = data.description
    category.value = data.category
    date.value = new Date(data.date).toISOString().slice(0, 10)
    totalCost.value = data.totalCost
    payer.value = data.payer._id || data.payer

    // load splits
    const splitsRes = await axios.post('http://localhost:8000/api/Expense/_getSplitsByExpense', {
      expenseId: props.expenseId
    })
    userSplits.value = Array.isArray(splitsRes.data.splits)
      ? splitsRes.data.splits.map((s: any) => ({
          userId: s.user._id || s.user,
          amount: s.amountOwed
        }))
      : []
  } catch (err) {
    console.error('Error loading expense', err)
  }
}

// -------------------- ACTIONS --------------------
onMounted(async () => {
  await loadMembers()
  await loadExpense()
})

const availableMembersForSplit = (currentUserId: string) => {
  const selectedIds = userSplits.value
    .map(s => s.userId)
    .filter(id => id && id !== currentUserId); // exclude the current split’s selection

  return members.value.filter(m => !selectedIds.includes(m._id));
};


const addSplit = () => userSplits.value.push({ userId: '', amount: null })
const removeSplit = (index: number) => userSplits.value.splice(index, 1)

const updateExpense = async () => {
  if (!title.value || !category.value || !totalCost.value || !payer.value) {
    errorMsg.value = 'All fields are required'
    return
  }

  const sumOfSplits = userSplits.value.reduce((acc, s) => acc + (s.amount || 0), 0)
  if (sumOfSplits !== totalCost.value) {
    errorMsg.value = `Total of splits (${sumOfSplits}) must equal total cost (${totalCost.value})`
    return
  }

  try {
    // 1️⃣ Get old splits
    const oldSplitsRes = await axios.post('http://localhost:8000/api/Expense/_getSplitsByExpense', {
      expenseId: props.expenseId
    })
    const oldSplits = Array.isArray(oldSplitsRes.data.splits) ? oldSplitsRes.data.splits : []

    // 2️⃣ Reverse debt effect of old splits
    for (const split of oldSplits) {
      try {
        const userId = split.user._id || split.user
        const amount = split.amountOwed
        // Subtract old split from debt: reverse the effect
        await axios.post('http://localhost:8000/api/Debt/updateDebt', {
          payer: payer.value,
          receiver: userId,
          amount: -amount, // reverse effect
        })
      } catch (err) {
        console.error(`Error reversing debt for ${split.user._id}`, err)
      }
    }

    // 3️⃣ Remove old splits from expense
    for (const split of oldSplits) {
      await axios.post('http://localhost:8000/api/Expense/removeUserSplit', {
        expense: props.expenseId,
        userSplit: split._id
      })
    }

    // 4️⃣ Add new splits and update debts
    for (const split of userSplits.value) {
      if (!split.userId || split.amount === null) continue

      // Add user split to expense
      await axios.post('http://localhost:8000/api/Expense/addUserSplit', {
        expense: props.expenseId,
        user: split.userId,
        amountOwed: split.amount,
      })

      // Apply new debt effect
      try {
        await axios.post('http://localhost:8000/api/Debt/updateDebt', {
          payer: payer.value,
          receiver: split.userId,
          amount: split.amount,
        })
      } catch (err) {
        console.error(`Error updating debt for ${split.userId}`, err)
      }
    }

    // 5️⃣ Update expense details
    const res = await axios.post('http://localhost:8000/api/Expense/editExpense', {
      expenseToEdit: props.expenseId,
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

    emit('refresh')
    emit('close')
  } catch (err) {
    console.error('Error updating expense', err)
  }
}


const deleteExpense = async () => {
  if (!confirm('Are you sure you want to delete this expense?')) return

  try {
    // 1️⃣ Reverse debts from current splits before deleting
    const splitsRes = await axios.post('http://localhost:8000/api/Expense/_getSplitsByExpense', {
      expenseId: props.expenseId
    })
    const splits = Array.isArray(splitsRes.data.splits) ? splitsRes.data.splits : []

    for (const split of splits) {
      try {
        const userId = split.user._id || split.user
        const amount = split.amountOwed
        await axios.post('http://localhost:8000/api/Debt/updateDebt', {
          payer: payer.value,
          receiver: userId,
          amount: -amount, // reverse effect
        })

      await axios.post('http://localhost:8000/api/Expense/removeUserSplit', {
        expense: props.expenseId,
        userSplit: split._id
      })

      } catch (err) {
        console.error(`Error reversing debt for ${split.user._id}`, err)
      }
    }

    // 2️⃣ Delete the expense
    const res = await axios.post('http://localhost:8000/api/Expense/deleteExpense', {
      expenseToDelete: props.expenseId
    })
    if (res.data.error) {
      errorMsg.value = res.data.error
      return
    }

    emit('refresh')
    emit('close')
  } catch (err) {
    console.error('Error deleting expense', err)
  }
}

</script>

<template>
  <div class="modal-overlay">
    <div class="modal">
      <h3>Edit Expense</h3>

      <input v-model="title" placeholder="Title" />
      <input v-model="description" placeholder="Description" />
      <input v-model="category" placeholder="Category" />
      <input type="date" v-model="date" />
      <input v-model.number="totalCost" type="number" placeholder="Total Cost" />

      <!-- Payer Dropdown -->
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

        <input type="number" v-model.number="split.amount" placeholder="Amount owed" />
        <button @click="removeSplit(index)">Remove</button>
      </div>

      <button @click="addSplit">+ Add User Split</button>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <div class="modal-buttons">
  <button @click="updateExpense">Save</button>
  <button @click="deleteExpense" class="delete-btn">Delete</button>
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
.delete-btn {
  background-color: red;
  color: white;
}

.error {
  color: red;
}
</style>
