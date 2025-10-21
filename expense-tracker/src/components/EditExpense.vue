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
const title = ref('')
const description = ref('')
const category = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const totalCost = ref<number | null>(null)
const payer = ref('')
const errorMsg = ref('')

const members = ref<Member[]>([])
const userSplits = ref<UserSplit[]>([])

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
    // Get old splits
    const oldSplitsRes = await axios.post('http://localhost:8000/api/Expense/_getSplitsByExpense', {
      expenseId: props.expenseId
    })
    const oldSplits = Array.isArray(oldSplitsRes.data.splits) ? oldSplitsRes.data.splits : []

    // Reverse debt effect of old splits
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

    // Remove old splits from expense
    for (const split of oldSplits) {
      await axios.post('http://localhost:8000/api/Expense/removeUserSplit', {
        expense: props.expenseId,
        userSplit: split._id
      })
    }

    // Add new splits and update debts
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

    // Update expense details
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
    // Reverse debts from current splits before deleting
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
          amount: -amount,
        })

      await axios.post('http://localhost:8000/api/Expense/removeUserSplit', {
        expense: props.expenseId,
        userSplit: split._id
      })

      } catch (err) {
        console.error(`Error reversing debt for ${split.user._id}`, err)
      }
    }

    // Delete the expense
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
      <h3 class="modal-title">Edit Expense</h3>

      <div class="form-group">
        <input v-model="title" placeholder="Title" />
        <input v-model="description" placeholder="Description" />
        <input v-model="category" placeholder="Category" />
        <input type="date" v-model="date" />
        <input v-model.number="totalCost" type="number" placeholder="Total Cost" />

        <select v-model="payer">
          <option value="">Select Payer</option>
          <option v-for="m in members" :key="m._id" :value="m._id">{{ m.displayName }}</option>
        </select>
      </div>

      <h4>User Splits</h4>
      <div v-for="(split, index) in userSplits" :key="index" class="split-row">
        <select v-model="split.userId">
          <option value="">Select User</option>
          <option v-for="m in availableMembersForSplit(split.userId)" :key="m._id" :value="m._id">{{ m.displayName }}</option>
        </select>
        <input type="number" v-model.number="split.amount" placeholder="Amount owed" />
        <button class="remove-btn" @click="removeSplit(index)">Remove</button>
      </div>

      <button class="add-btn" @click="addSplit">+ Add User Split</button>

      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>

      <div class="modal-buttons">
        <button class="primary-btn" @click="updateExpense">Save</button>
        <button class="delete-btn" @click="deleteExpense">Delete</button>
        <button class="secondary-btn" @click="emit('close')">Cancel</button>
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
  background-color: rgba(0,0,0,0.6);
  z-index: 2000;
}

.modal {
  background: #fff;
  padding: 2rem;
  border-radius: 0.75rem;
  width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-title {
  font-size: 1.6rem;
  font-weight: bold;
  text-align: center;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  margin-top: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid #ccc;
  font-size: 1rem;
}

.split-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.split-row select,
.split-row input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  border: 1px solid #ccc;
}

.remove-btn {
  background-color: black;
  color: white;
  border: none;
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  cursor: pointer;
}

.remove-btn:hover {
  background-color: #c0392b;
}

.add-btn {
  margin-top: 0.5rem;
  background-color: black;
  color: white;
  border: none;
  padding: 0.5rem 0.8rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.add-btn:hover {
  background-color: gray;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.primary-btn {
  background-color: #4a90e2;
  color: white;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.primary-btn:hover {
  background-color: #357ABD;
}

.secondary-btn {
  background-color: black;
  color: white;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.secondary-btn:hover {
  background-color: gray;
}

.delete-btn {
  background-color: red;
  color: white;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.delete-btn:hover {
  background-color: darkred;
}

.error {
  color: #e74c3c;
  font-weight: 500;
  text-align: center;
  margin-top: 0.5rem;
}
</style>
