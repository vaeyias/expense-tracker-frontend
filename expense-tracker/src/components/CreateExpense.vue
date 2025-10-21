<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';

const props = defineProps<{ groupId: string }>();
const emit = defineEmits<['close','refresh']>();

const title = ref('');
const category = ref('');
const totalCost = ref<number | null>(null);
const payer = ref('');
const errorMsg = ref('');

const createExpense = async () => {
  if (!title.value || !category.value || !totalCost.value || !payer.value) {
    errorMsg.value = "All fields are required";
    return;
  }
  try {
    const res = await axios.post('http://localhost:8000/api/Expense/createExpense', {
      user: payer.value,
      group: props.groupId,
      title: title.value,
      category: category.value,
      totalCost: totalCost.value,
    });
    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }
    emit('refresh');
    emit('close');
  } catch (err) {
    console.error(err);
  }
};
</script>

<template>
  <div class="modal-overlay">
    <div class="modal">
      <h3>Create Expense</h3>
      <input v-model="title" placeholder="Title" />
      <input v-model="category" placeholder="Category" />
      <input v-model.number="totalCost" type="number" placeholder="Total Cost" />
      <input v-model="payer" placeholder="Payer User ID" />
      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>
      <div class="modal-buttons">
        <button @click="createExpense">Create</button>
        <button @click="$emit('close')">Cancel</button>
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
}

.modal {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  width: 400px;
}

.modal-buttons { display: flex; justify-content: flex-end; gap: 1rem; }
.error { color: red; }
</style>
