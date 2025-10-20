<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import FolderIcon from '../components/FolderIcon.vue';
import { useRouter } from 'vue-router';

const folders = ref<Array<{ _id: string; name: string }>>([]);
const newFolderName = ref('');
const showCreateFolder = ref(false);
const errorMsg = ref('');

const router = useRouter();
const currentFolderId = ref<string | null>(null);
const currentFolderName = ref('Root');

const storedUser = localStorage.getItem('currentUser');
const currentUser = storedUser ? JSON.parse(storedUser) : null;

const loadFolders = async () => {
  if (!currentUser) return;
  try {
    let res;
    if (currentFolderId.value === null) {
      res = await axios.post('http://localhost:8000/api/Folder/_getRootFolder', {
        user: currentUser._id,
      });
      currentFolderName.value = 'Root';
    } else {
      res = await axios.post('http://localhost:8000/api/Folder/_listSubfolders', {
        user: currentUser._id,
        parent: currentFolderId.value,
      });
    }
    folders.value = res.data || [];
  } catch (err) {
    console.error(err);
  }
};

const createFolder = async () => {
  if (!newFolderName.value) {
    errorMsg.value = 'Folder name cannot be empty.';
    return;
  }
  try {
    const res = await axios.post('http://localhost:8000/api/Folder/createFolder', {
      owner: currentUser._id,
      parent: currentFolderId.value,
      name: newFolderName.value,
    });
    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }
    folders.value.push({ _id: res.data.folderId, name: newFolderName.value });
    newFolderName.value = '';
    showCreateFolder.value = false;
    errorMsg.value = '';
  } catch (err) {
    console.error(err);
    errorMsg.value = 'Failed to create folder.';
  }
};

const openFolder = async (folderId: string, folderName: string) => {
  currentFolderId.value = folderId;
  currentFolderName.value = folderName;
  await loadFolders();
};

const goToRoot = async () => {
  currentFolderId.value = null;
  await loadFolders();
};

const createGroup = () => {
  alert('Create group clicked!');
};

onMounted(loadFolders);
</script>

<template>
  <div class="home-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <h2>Your Folders</h2>
      <button @click="showCreateFolder = !showCreateFolder">
        {{ showCreateFolder ? 'Cancel' : 'Create Folder' }}
      </button>
      <button @click="createGroup">Create Group</button>

      <div v-if="showCreateFolder" class="create-folder-box">
        <input v-model="newFolderName" placeholder="New folder name" />
        <button @click="createFolder">Save</button>
        <p class="error" v-if="errorMsg">{{ errorMsg }}</p>
      </div>
    </aside>

    <!-- Main content -->
    <main class="folder-section">
      <div class="folder-header">
        <h2>Current Folder: {{ currentFolderName }}</h2>
        <div v-if="currentFolderId">
          <button @click="goToRoot">⬅ Back to Root</button>
        </div>
      </div>

      <div class="folders-grid">
        <FolderIcon
          v-for="folder in folders"
          :key="folder._id"
          :name="folder.name"
          @click="() => openFolder(folder._id, folder.name)"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  width:100vw;
  padding:2rem;

  gap: 2rem;
  justify-content:left;
  background-color:white;
  color:black;

}

/* Sidebar */
.sidebar {
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content:left;
  align-items:flex-start;
}

.sidebar button {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  border: none;
  background-color: black;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sidebar button:hover {
  background-color: #115293;
}

.create-folder-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.create-folder-box input {
  padding: 0.5rem;
  font-size: 0.9rem;
}

.create-folder-box button {
  align-self: flex-start;
}

/* Main content */
.folder-section {
  flex: 1;
}

.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.folders-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.error {
  color: red;
}
</style>
