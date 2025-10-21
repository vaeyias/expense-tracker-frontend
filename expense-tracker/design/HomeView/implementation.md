[@api-spec](../../apiSpec.md)

[@homeview](HomeViewDetails.md)

# propmt: using the api specification and details of homeview. implement HomeViewDetails in .vue. my server is running at http://localhost:8000. make axios.post calls using that.

# response:

```vue
<template>
  <div class="home-view">
    <div class="sidebar">
      <button @click="openCreateFolderModal">Create Folder</button>
      <button @click="openCreateGroupModal">Create Group</button>
    </div>

    <div class="main-content">
      <div v-if="currentFolder && currentFolder._id !== '.root'" class="folder-navigation-bar">
        <button @click="goBackToParent" class="back-button">Back</button>
        <span class="folder-name">{{ currentFolder.name }}</span>
        <button @click="openRenameFolderModal" class="rename-button">Rename</button>
        <button @click="openDeleteFolderModal" class="delete-button">Delete</button>
      </div>
      <div v-else class="folder-navigation-bar">
        <span class="folder-name">Root</span>
      </div>

      <div class="folders-grid">
        <h3>Folders</h3>
        <div v-for="folder in subfolders" :key="folder._id" class="folder-item">
          <i class="fas fa-folder folder-icon" @click="enterFolder(folder)"></i>
          <div class="folder-details">
            <span class="folder-name">{{ folder.name }}</span>
          </div>
        </div>
      </div>

      <div class="groups-grid">
        <h3>Groups</h3>
        <div v-for="group in groupsInCurrentFolder" :key="group._id" class="group-item">
          <i class="fas fa-users group-icon"></i>
          <div class="group-details">
            <span class="group-name">{{ group.name }}</span>
            <button @click="goToGroupPage(group._id)">View Group</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals for Folder Creation, Renaming, Deletion, and Group Creation -->

    <!-- Create Folder Modal -->
    <div v-if="showCreateFolderModal" class="modal">
      <div class="modal-content">
        <h2>Create New Folder</h2>
        <input type="text" v-model="newFolderName" placeholder="Folder Name">
        <button @click="createFolder">Create</button>
        <button @click="closeCreateFolderModal">Cancel</button>
      </div>
    </div>

    <!-- Rename Folder Modal -->
    <div v-if="showRenameFolderModal" class="modal">
      <div class="modal-content">
        <h2>Rename Folder</h2>
        <input type="text" v-model="renamedFolderName" placeholder="New Folder Name">
        <button @click="renameFolder">Rename</button>
        <button @click="closeRenameFolderModal">Cancel</button>
      </div>
    </div>

    <!-- Delete Folder Modal -->
    <div v-if="showDeleteFolderModal" class="modal">
      <div class="modal-content">
        <h2>Confirm Folder Deletion</h2>
        <p>Are you sure you want to delete this folder? This action cannot be undone.</p>
        <button @click="deleteFolder">Delete</button>
        <button @click="closeDeleteFolderModal">Cancel</button>
      </div>
    </div>

    <!-- Create Group Modal -->
    <div v-if="showCreateGroupModal" class="modal">
      <div class="modal-content">
        <h2>Create New Group</h2>
        <input type="text" v-model="newGroupName" placeholder="Group Name">
        <input type="text" v-model="newGroupDescription" placeholder="Group Description">
        <button @click="createGroup">Create</button>
        <button @click="closeCreateGroupModal">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'HomeView',
  data() {
    return {
      userId: 'some-user-id', // Replace with actual logged-in user ID
      rootFolderId: '.root',
      currentFolderId: '.root',
      currentFolder: null,
      subfolders: [],
      groupsInCurrentFolder: [],
      showCreateFolderModal: false,
      newFolderName: '',
      showRenameFolderModal: false,
      renamedFolderName: '',
      showDeleteFolderModal: false,
      showCreateGroupModal: false,
      newGroupName: '',
      newGroupDescription: '',
    };
  },
  async mounted() {
    // Fetch initial data for the root folder
    await this.fetchFolderContent(this.rootFolderId);
  },
  methods: {
    // --- API Call Helpers ---
    async axiosPost(url, data) {
      try {
        const response = await axios.post(`http://localhost:8000/api/${url}`, data);
        return response.data;
      } catch (error) {
        console.error(`Error calling API ${url}:`, error.response ? error.response.data : error.message);
        throw error; // Rethrow to be handled by calling methods
      }
    },

    // --- Folder Management ---
    async fetchFolderContent(folderId) {
      this.currentFolderId = folderId;

      try {
        // Fetch current folder details
        const folderData = await this.axiosPost('Folder/_getFolderById', {
          user: this.userId,
          folder: folderId,
        });
        if (folderData && folderData.length > 0) {
          this.currentFolder = folderData[0];
        } else {
          // Handle case where folder is not found or doesn't belong to the user
          console.error(`Folder ${folderId} not found or does not belong to user ${this.userId}`);
          this.currentFolder = { _id: '.root', name: 'Root', owner: this.userId, groups: [] }; // Fallback to root
        }
      } catch (error) {
        console.error(`Failed to fetch folder ${folderId}:`, error);
        this.currentFolder = { _id: '.root', name: 'Root', owner: this.userId, groups: [] }; // Fallback to root
      }

      try {
        // Fetch subfolders
        const subfoldersResponse = await this.axiosPost('Folder/_listSubfolders', {
          user: this.userId,
          parent: folderId,
        });
        this.subfolders = subfoldersResponse || [];
      } catch (error) {
        console.error(`Failed to fetch subfolders for folder ${folderId}:`, error);
        this.subfolders = [];
      }

      try {
        // Fetch groups in the current folder
        const groupIds = await this.axiosPost('Folder/_listGroupsInFolder', {
          user: this.userId,
          folder: folderId,
        });

        const groupPromises = groupIds.map(async (groupId) => {
          try {
            const groupData = await this.axiosPost('Group/_getGroupById', { groupId }); // Assuming _getGroupById exists for Group API
            return groupData.length > 0 ? groupData[0] : null;
          } catch (groupError) {
            console.error(`Failed to fetch group ${groupId}:`, groupError);
            return null;
          }
        });
        const resolvedGroups = await Promise.all(groupPromises);
        this.groupsInCurrentFolder = resolvedGroups.filter(group => group !== null);

      } catch (error) {
        console.error(`Failed to fetch groups for folder ${folderId}:`, error);
        this.groupsInCurrentFolder = [];
      }
    },

    enterFolder(folder) {
      this.fetchFolderContent(folder._id);
    },

    goBackToParent() {
      if (this.currentFolder && this.currentFolder.parent) {
        this.fetchFolderContent(this.currentFolder.parent);
      } else {
        // If no parent or it's the root, go to root
        this.fetchFolderContent(this.rootFolderId);
      }
    },

    openCreateFolderModal() {
      this.showCreateFolderModal = true;
      this.newFolderName = '';
    },
    closeCreateFolderModal() {
      this.showCreateFolderModal = false;
    },
    async createFolder() {
      if (!this.newFolderName.trim()) {
        alert('Folder name cannot be empty.');
        return;
      }
      try {
        await this.axiosPost('Folder/createFolder', {
          owner: this.userId,
          name: this.newFolderName,
          parent: this.currentFolderId,
        });
        alert('Folder created successfully!');
        this.closeCreateFolderModal();
        await this.fetchFolderContent(this.currentFolderId); // Refresh content
      } catch (error) {
        alert(`Failed to create folder: ${error.response.data.error}`);
      }
    },

    openRenameFolderModal() {
      if (this.currentFolder && this.currentFolder._id !== this.rootFolderId) {
        this.renamedFolderName = this.currentFolder.name;
        this.showRenameFolderModal = true;
      }
    },
    closeRenameFolderModal() {
      this.showRenameFolderModal = false;
    },
    async renameFolder() {
      if (!this.renamedFolderName.trim()) {
        alert('Folder name cannot be empty.');
        return;
      }
      if (this.currentFolder && this.currentFolder._id !== this.rootFolderId) {
        try {
          await this.axiosPost('Folder/renameFolder', {
            user: this.userId,
            folder: this.currentFolder._id,
            name: this.renamedFolderName,
          });
          alert('Folder renamed successfully!');
          this.closeRenameFolderModal();
          await this.fetchFolderContent(this.currentFolderId); // Refresh content
        } catch (error) {
          alert(`Failed to rename folder: ${error.response.data.error}`);
        }
      }
    },

    openDeleteFolderModal() {
      if (this.currentFolder && this.currentFolder._id !== this.rootFolderId) {
        this.showDeleteFolderModal = true;
      }
    },
    closeDeleteFolderModal() {
      this.showDeleteFolderModal = false;
    },
    async deleteFolder() {
      if (this.currentFolder && this.currentFolder._id !== this.rootFolderId) {
        try {
          await this.axiosPost('Folder/deleteFolder', {
            user: this.userId,
            folder: this.currentFolder._id,
          });
          alert('Folder deleted successfully!');
          this.closeDeleteFolderModal();
          // Navigate back to parent after deletion
          if (this.currentFolder.parent) {
            await this.fetchFolderContent(this.currentFolder.parent);
          } else {
            await this.fetchFolderContent(this.rootFolderId);
          }
        } catch (error) {
          alert(`Failed to delete folder: ${error.response.data.error}`);
        }
      }
    },

    // --- Group Management ---
    openCreateGroupModal() {
      this.showCreateGroupModal = true;
      this.newGroupName = '';
      this.newGroupDescription = '';
    },
    closeCreateGroupModal() {
      this.showCreateGroupModal = false;
    },
    async createGroup() {
      if (!this.newGroupName.trim()) {
        alert('Group name cannot be empty.');
        return;
      }
      try {
        // Assuming Group API has a createGroup endpoint
        const createdGroup = await this.axiosPost('Group/createGroup', {
          creator: this.userId,
          name: this.newGroupName,
          description: this.newGroupDescription,
        });

        // Add the newly created group to the current folder
        await this.axiosPost('Folder/addGroupToFolder', {
          user: this.userId,
          folderName: this.currentFolder.name, // Or folderId if available and preferred
          group: createdGroup.group,
        });

        alert('Group created and added to folder successfully!');
        this.closeCreateGroupModal();
        await this.fetchFolderContent(this.currentFolderId); // Refresh content
      } catch (error) {
        alert(`Failed to create group: ${error.response.data.error}`);
      }
    },

    goToGroupPage(groupId) {
      this.$router.push({ name: 'group', params: { groupId } });
    },
  },
};
</script>

<style scoped>
.home-view {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 200px;
  background-color: #f0f0f0;
  padding: 20px;
  border-right: 1px solid #ccc;
}

.sidebar button {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.sidebar button:hover {
  background-color: #45a049;
}

.main-content {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
}

.folder-navigation-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.back-button,
.rename-button,
.delete-button {
  margin-right: 10px;
  padding: 5px 10px;
  background-color: #ddd;
  border: 1px solid #bbb;
  cursor: pointer;
  border-radius: 3px;
}

.back-button:hover,
.rename-button:hover,
.delete-button:hover {
  background-color: #ccc;
}

.folder-name {
  font-size: 1.2em;
  font-weight: bold;
  margin-right: 10px;
}

.folders-grid,
.groups-grid {
  margin-top: 20px;
}

.folders-grid h3,
.groups-grid h3 {
  margin-bottom: 15px;
  color: #333;
}

.folder-item,
.group-item {
  display: inline-block;
  margin: 10px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
  min-width: 150px; /* Ensure consistent width */
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.folder-item:hover,
.group-item:hover {
  transform: translateY(-5px);
}

.folder-icon,
.group-icon {
  font-size: 2em;
  color: #007bff;
  margin-bottom: 10px;
}

.folder-details,
.group-details {
  font-size: 0.9em;
  color: #555;
}

.group-details button {
  margin-top: 5px;
  padding: 5px 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.group-details button:hover {
  background-color: #0056b3;
}

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.modal-content h2 {
  margin-bottom: 20px;
}

.modal-content input[type="text"] {
  width: calc(100% - 20px);
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.modal-content button {
  margin: 0 10px;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.modal-content button:first-of-type {
  background-color: #4CAF50;
  color: white;
}

.modal-content button:last-of-type {
  background-color: #f44336;
  color: white;
}

.modal-content button:first-of-type:hover {
  background-color: #45a049;
}

.modal-content button:last-of-type:hover {
  background-color: #da190b;
}
</style>
```