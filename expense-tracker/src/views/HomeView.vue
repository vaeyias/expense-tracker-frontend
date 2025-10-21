<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import FolderIcon from '../components/FolderIcon.vue';
import GroupIcon from '../components/GroupIcon.vue';
import { useRouter } from 'vue-router';
const router = useRouter();

interface Folder {
  _id: string;
  name: string;
  parent?: string | null;
}

const folders = ref<Folder[]>([]);
const newFolderName = ref('');
const showFolderModal = ref(false);
const errorMsg = ref('');

const showRenameModal = ref(false);
const renameFolderName = ref('');
const folderToRename = ref<Folder | null>(null);


const currentFolder = ref<Folder | null>(null);

const storedUser = localStorage.getItem('currentUser');
const currentUser = storedUser ? JSON.parse(storedUser) : null;

interface Group {
  _id: string;
  name: string;
  description: string;
  creator: string;
}

const groups = ref<Group[]>([]);
const showGroupModal = ref(false);
const newGroupName = ref('');
const newGroupDescription = ref('');
const groupErrorMsg = ref('');


const loadFolders = async (folderId: string | null = null) => {
  if (!currentUser) return;
  try {
    let res;
    if (!folderId) {
      res = await axios.post('http://localhost:8000/api/Folder/_getRootFolder', {
        user: currentUser._id,
      });
      currentFolder.value = null;
    } else {
      res = await axios.post('http://localhost:8000/api/Folder/_listSubfolders', {
        user: currentUser._id,
        parent: folderId,
      });
    }
    folders.value = res.data || [];

    let groupRes=[];
    // Fetch groups in current folder
    if (folderId) {
      groupRes = await axios.post('http://localhost:8000/api/Folder/_listGroupsInFolder', {
        user: currentUser._id,
        folder: folderId,
      });
    } else {
      groupRes = await axios.post('http://localhost:8000/api/Folder/_listGroupsInFolderByName', {
        user: currentUser._id,
        name: '.root',
      });;

    }

    const groupIds: string[] = Array.isArray(groupRes.data) ? groupRes.data : [];
    const fullGroups: Group[] = [];

    for (const groupId of groupIds) {
      const groupObjRes = await axios.post('http://localhost:8000/api/Group/_getGroup', {
        group:groupId,
      });
      if (groupObjRes.data) fullGroups.push(groupObjRes.data);
    }


    groups.value=fullGroups || [];



  } catch (err) {
    console.error(err);
  }
};


const openFolder = async (folder: Folder) => {
  currentFolder.value = folder;
  await loadFolders(folder._id);
};

const goToParent = async () => {
  if (!currentFolder.value || !currentFolder.value.parent) {
    // Already at root
    currentFolder.value = null;
    await loadFolders(null);
  } else {
    // Fetch parent folder
    const res = await axios.post('http://localhost:8000/api/Folder/_getFolderById', {
      user: currentUser._id,
      folder: currentFolder.value.parent,
    });
    currentFolder.value = res.data;
    await loadFolders(currentFolder.value._id);
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
      parent: currentFolder.value?._id || null,
      name: newFolderName.value,
    });
    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }
    await loadFolders(currentFolder.value?._id || null);
    newFolderName.value = '';
    showFolderModal.value = false;
    errorMsg.value = '';
  } catch (err) {
    console.error(err);
    errorMsg.value = 'Failed to create folder.';
  }
};

const openRenameModal = (folder: Folder) => {
  folderToRename.value = folder;
  renameFolderName.value = folder.name;
  showRenameModal.value = true;
};

const renameFolderConfirm = async () => {
  if (!folderToRename.value || !renameFolderName.value.trim()) return;

  try {
    const res = await axios.post('http://localhost:8000/api/Folder/renameFolder', {
      user: currentUser?._id,
      folder: folderToRename.value._id,
      name: renameFolderName.value.trim(),
    });
    if (res.data.error) {
      alert(res.data.error);
      return;
    }

    // Update header if current folder is renamed
    if (currentFolder.value?._id === folderToRename.value._id) {
      currentFolder.value.name = renameFolderName.value.trim();
    }

    await loadFolders(currentFolder.value?._id || null);
    showRenameModal.value = false;
    folderToRename.value = null;
    renameFolderName.value = '';
  } catch (err) {
    console.error(err);
    alert('Failed to rename folder.');
  }
};

const deleteFolder = async (folder: Folder) => {
  if (!confirm(`Are you sure you want to delete "${folder.name}"?`)) return;

  try {
    const res = await axios.post('http://localhost:8000/api/Folder/deleteFolder', {
      user: currentUser?._id,
      folder: folder._id,
    });
    if (res.data.error) {
      alert(res.data.error);
      return;
    }
    await loadFolders(currentFolder.value?.parent || null);
    currentFolder.value = currentFolder.value?.parent ? { _id: currentFolder.value.parent, name: 'Parent', parent: null } : null;
  } catch (err) {
    console.error(err);
    alert('Failed to delete folder.');
  }
};

const handleGroupClick = (group: Group) => {
  try {
    if (!group?._id) throw new Error("Group ID is missing");
    router.push({ name: 'GroupView', params: { groupId: group._id } });
  } catch (err) {
    console.error("Error navigating to group:", err);
  }
};

const openGroupModal = () => {
  newGroupName.value = '';
  newGroupDescription.value = '';
  groupErrorMsg.value = '';
  showGroupModal.value = true;
};

const createGroupConfirm = async () => {

  if (!newGroupName.value.trim()) {
    groupErrorMsg.value = 'Group name cannot be empty.';
    console.log("group name empty",res.data.error);

    return;
  }

  try {

    // Create the group
    const res = await axios.post('http://localhost:8000/api/Group/createGroup', {
      creator: currentUser?._id,
      name: newGroupName.value.trim(),
      description: newGroupDescription.value.trim(),
    });
    if (res.data.error) {
      console.log("error",res.data.error);
      groupErrorMsg.value = res.data.error;
      return;
    }

    const group: Group = res.data.group;

    // Add the group to the current folder
    if (currentFolder.value){
      console.log('folder',currentFolder.value);
      await axios.post('http://localhost:8000/api/Folder/addGroupToFolder', {
        user: currentUser?._id,
        folderName: currentFolder.value.name,
        group,
      });
    }
    else{
      await axios.post('http://localhost:8000/api/Folder/addGroupToFolder', {
        user: currentUser?._id,
        folderName: ".root",
        group,
      });
      console.log("1111",)


    }

    // Update local list
    groups.value.push(group);
    await loadFolders(currentFolder.value?._id || null);


    // Close modal
    showGroupModal.value = false;
    newGroupName.value = '';
    newGroupDescription.value = '';
    groupErrorMsg.value = '';

  } catch (err) {
    console.error(err);
    groupErrorMsg.value = 'Failed to create group.';
  }
};

onMounted(() => loadFolders());
</script>

<template>
  <div class="home-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <h2>Your Folders</h2>
      <button @click="showFolderModal = true">Create Folder</button>
      <button @click="openGroupModal">Create Group</button>
    </aside>

    <!-- Main content -->
    <main class="folder-section">
      <div class="folder-header">
        <div class="folder-actions">
          <button v-if="currentFolder" @click="goToParent">⬅ Back</button>

          <!-- Only show rename/delete if user is not at root -->
        </div>
        <h2>{{ currentFolder?.name || 'Home' }}</h2>

        <template v-if="currentFolder">
            <button @click="openRenameModal(currentFolder)">✏️ Rename</button>
            <button @click="deleteFolder(currentFolder)">🗑️ Delete</button>
          </template>

      </div>


      <div class="folders-grid">
        <FolderIcon
          v-for="folder in folders"
          :key="folder._id"
          :name="folder.name"
          @click="() => openFolder(folder)"
        />
      </div>

    <!-- Display groups after folders -->
    <div class="folders-grid"    >
     <GroupIcon
  v-for="group in groups"
  :key="group._id"
  :name="group.name"
  :description="group.description"
  @click="() => handleGroupClick(group)"
/>

    </div>

    </main>
    <!-- Rename Folder Modal -->
  <div v-if="showRenameModal" class="modal-overlay">
    <div class="modal">
      <h3>Rename Folder</h3>
      <input v-model="renameFolderName" placeholder="New Folder Name" />
      <div class="modal-buttons">
        <button @click="renameFolderConfirm">Rename</button>
        <button @click="showRenameModal = false">Cancel</button>
      </div>
    </div>
  </div>


    <!-- Folder Creation Modal -->
    <div v-if="showFolderModal" class="modal-overlay">
      <div class="modal">
        <h3>Create Folder</h3>
        <input v-model="newFolderName" placeholder="Folder Name" />
        <p class="error" v-if="errorMsg">{{ errorMsg }}</p>
        <div class="modal-buttons">
          <button @click="createFolder">Create</button>
          <button @click="showFolderModal = false">Cancel</button>
        </div>
      </div>
    </div>

<!-- Group Creation Modal -->
<div v-if="showGroupModal" class="modal-overlay">
  <div class="modal">
    <h3>Create Group</h3>
    <input v-model="newGroupName" placeholder="Group Name" />
    <textarea v-model="newGroupDescription" placeholder="Group Description"></textarea>
    <p class="error" v-if="groupErrorMsg">{{ groupErrorMsg }}</p>
    <div class="modal-buttons">
      <button @click="createGroupConfirm">Create</button>
      <button @click="showGroupModal = false">Cancel</button>
    </div>
  </div>
</div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  width: 100vw;
  min-height: 100vh;
  padding: 2rem;
  gap: 2rem;
  background-color: white;
  color: black;
}

.sidebar {
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
}

.sidebar button {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  border: none;
  background-color: black;
  color: white;
  cursor: pointer;
}

.sidebar button:hover {
  background-color: #115293;
}

/* Main content */
.folder-section {
  flex: 1;
}

.folder-header {
  display: flex;
  justify-content: left;
  align-items: top;
  margin-bottom: 1rem;
}
.folder-header button{
  margin:1rem;

}

.folder-header h2{
  margin:1rem;
}


.folders-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal {
  background-color: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  width: 300px;
  max-width: 90%;
}

.modal input {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.error {
  color: red;
  font-size: 0.9rem;
}


</style>
