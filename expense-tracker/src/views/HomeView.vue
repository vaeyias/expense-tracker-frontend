<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
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

interface FolderNode extends Folder {
  children?: FolderNode[];
  expanded?: boolean;
  loaded?: boolean;
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

/* Move modal state (folders) */
const showMoveFolderModal = ref(false);
const folderToMoveForModal = ref<Folder | null>(null);
const moveFolderTargetId = ref<string | null>(null); // selected parent id or null = root

/* Move modal state (groups) */
const showMoveGroupModal = ref(false);
const groupToMoveForModal = ref<Group | null>(null);
const moveGroupTargetId = ref<string | null>(null);

/* Tree data for selecting targets */
const folderTree = ref<FolderNode[]>([]);
const descendantsOfFolderToMove = ref<Set<string>>(new Set());

/* Context menu state */
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuTarget = ref<{ type: 'folder' | 'group'; item: Folder | Group } | null>(null);

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

    let groupRes = [];
    if (folderId) {
      groupRes = await axios.post('http://localhost:8000/api/Folder/_listGroupsInFolder', {
        user: currentUser._id,
        folder: folderId,
      });
    } else {
      groupRes = await axios.post('http://localhost:8000/api/Folder/_listGroupsInFolderByName', {
        user: currentUser._id,
        name: '.root',
      });
    }

    const groupIds: string[] = Array.isArray(groupRes.data) ? groupRes.data : [];
    const fullGroups: Group[] = [];

    for (const groupId of groupIds) {
      const groupObjRes = await axios.post('http://localhost:8000/api/Group/_getGroup', {
        group: groupId,
      });
      if (groupObjRes.data) fullGroups.push(groupObjRes.data);
    }

    groups.value = fullGroups || [];
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
    currentFolder.value = null;
    await loadFolders(null);
  } else {
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
    return;
  }

  try {
    const res = await axios.post('http://localhost:8000/api/Group/createGroup', {
      creator: currentUser?._id,
      name: newGroupName.value.trim(),
      description: newGroupDescription.value.trim(),
    });
    if (res.data.error) {
      groupErrorMsg.value = res.data.error;
      return;
    }

    const group: Group = res.data.group;

    if (currentFolder.value) {
      await axios.post('http://localhost:8000/api/Folder/addGroupToFolder', {
        user: currentUser?._id,
        folderName: currentFolder.value.name,
        group,
      });
    } else {
      await axios.post('http://localhost:8000/api/Folder/addGroupToFolder', {
        user: currentUser?._id,
        folderName: ".root",
        group,
      });
    }

    groups.value.push(group);
    await loadFolders(currentFolder.value?._id || null);

    showGroupModal.value = false;
    newGroupName.value = '';
    newGroupDescription.value = '';
    groupErrorMsg.value = '';
  } catch (err) {
    console.error(err);
    groupErrorMsg.value = 'Failed to create group.';
  }
};

/* ---------- Folder tree helpers ---------- */

// --- replace existing loadRootTree function with this ---
const loadRootTree = async () => {
  if (!currentUser) return;
  try {
    const res = await axios.post('http://localhost:8000/api/Folder/_getRootFolder', {
      user: currentUser._id,
    });
    const data: Folder[] = res.data || [];

    // create nodes and mark as loaded (we will populate children recursively)
    folderTree.value = data.map((f) => ({ ...f, children: [], expanded: false, loaded: true }));

    // recursively load all children for each root node (depth-first)
    const fetchChildrenRecursively = async (node: FolderNode) => {
      try {
        const r = await axios.post('http://localhost:8000/api/Folder/_listSubfolders', {
          user: currentUser._id,
          parent: node._id,
        });
        const childData: Folder[] = r.data || [];
        node.children = childData.map((c) => ({ ...c, children: [], expanded: false, loaded: true }));
        // recurse
        for (const childNode of node.children) {
          await fetchChildrenRecursively(childNode);
        }
      } catch (err) {
        console.error('Failed to load subfolders for', node._id, err);
        node.children = node.children || [];
      }
    };

    for (const rootNode of folderTree.value) {
      await fetchChildrenRecursively(rootNode);
    }
  } catch (err) {
    console.error('Failed to load root folders', err);
  }
};const loadChildrenForNode = async (node: FolderNode) => {
  if (!currentUser || !node) return;
  if (node.loaded) {
    node.expanded = !node.expanded;
    return;
  }
  try {
    const res = await axios.post('http://localhost:8000/api/Folder/_listSubfolders', {
      user: currentUser._id,
      parent: node._id,
    });
    const data: Folder[] = res.data || [];
    node.children = data.map((f) => ({ ...f, children: [], expanded: false, loaded: false }));
    node.loaded = true;
    node.expanded = true;
  } catch (err) {
    console.error('Failed to load subfolders', err);
  }
};

/** Recursively fetch descendants for a folder id (to disable them as targets) */
const fetchDescendants = async (folderId: string | null) => {
  const set = new Set<string>();
  if (!folderId) return set;
  const stack = [folderId];
  while (stack.length) {
    const id = stack.pop()!;
    try {
      const res = await axios.post('http://localhost:8000/api/Folder/_listSubfolders', {
        user: currentUser?._id,
        parent: id,
      });
      const children: Folder[] = res.data || [];
      for (const c of children) {
        if (!set.has(c._id)) {
          set.add(c._id);
          stack.push(c._id);
        }
      }
    } catch (err) {
      console.error('Error fetching descendants for', id, err);
    }
  }
  return set;
};

/* ---------- Move operations (updated to use folder tree) ---------- */

/** Open the move-folder modal for a particular folder */
const openMoveFolderModal = async (folder: Folder) => {
  folderToMoveForModal.value = folder;
  moveFolderTargetId.value = folder.parent || null; // preselect current parent
  // load tree and descendants
  await loadRootTree();
  descendantsOfFolderToMove.value = await fetchDescendants(folder._id);
  // also include the folder itself (can't move into itself)
  descendantsOfFolderToMove.value.add(folder._id);
  showMoveFolderModal.value = true;
};

/** Confirm move folder -> calls POST /api/Folder/moveFolder */
const moveFolderConfirm = async () => {
  if (!folderToMoveForModal.value) return;
  try {
    const payload = {
      user: currentUser?._id,
      folderToMove: folderToMoveForModal.value._id,
      newParent: moveFolderTargetId.value, // can be null for root
    };
    const res = await axios.post('http://localhost:8000/api/Folder/moveFolder', payload);
    if (res.data?.error) {
      alert(res.data.error);
      return;
    }
    showMoveFolderModal.value = false;
    folderToMoveForModal.value = null;
    moveFolderTargetId.value = null;
    descendantsOfFolderToMove.value = new Set();
    await loadFolders(currentFolder.value?._id || null);
  } catch (err) {
    console.error('Failed moving folder', err);
    alert('Failed to move folder');
  }
};

/** Open the move-group modal for a specific group */
const openMoveGroupModal = async (group: Group) => {
  groupToMoveForModal.value = group;
  moveGroupTargetId.value = null;
  await loadRootTree();
  showMoveGroupModal.value = true;
};

/** Confirm move group:
 * - add group to target folder (addGroupToFolder)
 * - remove group from source folder (removeGroupFromFolder)
 */
const moveGroupConfirm = async () => {
  if (!groupToMoveForModal.value) return;
  if (!moveGroupTargetId.value) {
    alert('Please pick a target folder');
    return;
  }
  try {
    // find target folder by id (for folderName)
    // call API to get folder name by id
    const folderRes = await axios.post('http://localhost:8000/api/Folder/_getFolderById', {
      user: currentUser?._id,
      folder: moveGroupTargetId.value,
    });
    if (folderRes.data?.error) {
      alert(folderRes.data.error || 'Invalid target folder');
      return;
    }
    const targetFolder: Folder = folderRes.data;
    const targetFolderName = targetFolder.name;

    // add to target folder
    const addRes = await axios.post('http://localhost:8000/api/Folder/addGroupToFolder', {
      user: currentUser?._id,
      folderName: targetFolderName,
      group: groupToMoveForModal.value,
    });
    if (addRes.data?.error) {
      alert(addRes.data.error);
      return;
    }

    // remove from source folder (if we have a current folder id) else root
    const sourceFolderId = currentFolder.value?._id || ".root";
    const removeRes = await axios.post('http://localhost:8000/api/Folder/removeGroupFromFolder', {
      user: currentUser?._id,
      folder: sourceFolderId,
      group: groupToMoveForModal.value._id,
    });
    if (removeRes.data?.error) {
      console.warn('Warning while removing group from source:', removeRes.data.error);
    }

    // Refresh
    showMoveGroupModal.value = false;
    groupToMoveForModal.value = null;
    moveGroupTargetId.value = null;
    await loadFolders(currentFolder.value?._id || null);
  } catch (err) {
    console.error('Failed moving group', err);
    alert('Failed to move group');
  }
};

/* ---------- Context menu handling ---------- */
const openContextMenu = (event: MouseEvent, type: 'folder' | 'group', item: Folder | Group) => {
  event.preventDefault();
  contextMenuX.value = event.clientX;
  contextMenuY.value = event.clientY;
  contextMenuTarget.value = { type, item };
  contextMenuVisible.value = true;
};

const closeContextMenu = () => {
  contextMenuVisible.value = false;
  contextMenuTarget.value = null;
};

const handleContextAction = (action: 'rename' | 'move' | 'open', type: 'folder' | 'group') => {
  const target = contextMenuTarget.value;
  if (!target) return;
  if (type === 'folder' && target.type === 'folder') {
    const folder = target.item as Folder;
    if (action === 'rename') openRenameModal(folder);
    else if (action === 'move') openMoveFolderModal(folder);
    else if (action === 'open') openFolder(folder);
  } else if (type === 'group' && target.type === 'group') {
    const group = target.item as Group;
    if (action === 'rename') {
      alert('Group rename is not supported by the server API.');
    } else if (action === 'move') openMoveGroupModal(group);
    else if (action === 'open') handleGroupClick(group);
  }
  closeContextMenu();
};

/* close context menu when clicking anywhere else */
const onDocClick = (e: MouseEvent) => {
  if (contextMenuVisible.value) {
    contextMenuVisible.value = false;
  }
};

// --- replace the onMounted block with this ---
onMounted(() => {
  loadFolders();
  loadRootTree(); // populate sidebar folder tree
  document.addEventListener('click', onDocClick);
});onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
});
</script>

<template>
  <div class="page">
    <div class="content">

      <div class="row" style="gap:24px; align-items:flex-start;">
        <!-- Main section -->
        <main style="flex:1; min-width:0;">
          <div class="panel card" style="margin-bottom:18px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div class="h1" style="display:inline-flex; align-items:center; gap:8px;">
                {{ currentFolder?.name || 'Home' }}
                <!-- When inside a folder, small action buttons to rename/move that folder -->
                <template v-if="currentFolder">
                  <button class="btn ghost" style="margin-left:8px; color:white" @click="openRenameModal(currentFolder)">Rename</button>
                  <button class="btn ghost" style="color:white;margin-left:4px;" @click="openMoveFolderModal(currentFolder)">Move Folder</button>
                </template>
              </div>
              <div style="color:var(--muted); font-size:0.95rem;">Manage folders and groups</div>
            </div>
            <div class="row">
              <button v-if="currentFolder" class="btn ghost" @click="goToParent">⬅ Back</button>
              <button v-if="currentFolder" class="btn ghost" @click="deleteFolder(currentFolder)">🗑 Delete</button>
            </div>
          </div>

          <!-- Folders grid -->
          <div class="panel" style="margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div>
                <div class="h2" style="margin-bottom:0;">Folders</div>
                <div class="muted" style="font-size:0.92rem;">Browse and organize</div>
              </div>
              <div>
                <!-- Add Folder moved here (inside Folders card header) -->
                <button class="btn" @click="showFolderModal = true">+ Add Folder</button>
              </div>
            </div>

            <div class="folders-grid" style="margin-top:6px;">
              <div
                v-for="folder in folders"
                :key="folder._id"
                class="item-wrap"
                @contextmenu.prevent="openContextMenu($event, 'folder', folder)"
              >
                <FolderIcon :name="folder.name" @click="() => openFolder(folder)" />
              </div>
            </div>
          </div>

          <!-- Groups -->
          <div class="panel">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div>
                <div class="h2" style="margin-bottom:0;">Groups</div>
                <div class="muted" style="font-size:0.92rem;">Groups in this folder</div>
              </div>
              <div>
                <!-- Add Group moved here -->
                <button class="btn" @click="openGroupModal">+ Create Group</button>
              </div>
            </div>

            <div class="folders-grid" style="margin-top:6px; color:var(--brand-light);">
              <div
                v-for="group in groups"
                :key="group._id"
                class="item-wrap"
                @contextmenu.prevent="openContextMenu($event, 'group', group)"
              >
                <GroupIcon :name="group.name" :description="group.description" @click="() => handleGroupClick(group)" />
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Context menu -->
      <div
        v-if="contextMenuVisible"
        class="context-menu"
        :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px', position: 'fixed', zIndex: 3000 }"
      >
        <div v-if="contextMenuTarget?.type === 'folder'">
          <div class="context-item" @click="() => handleContextAction('open', 'folder')">Open</div>
          <div class="context-item" @click="() => handleContextAction('rename', 'folder')">Rename</div>
          <div class="context-item" @click="() => handleContextAction('move', 'folder')">Move</div>
        </div>
        <div v-else-if="contextMenuTarget?.type === 'group'">
          <div class="context-item" @click="() => handleContextAction('open', 'group')">Open</div>
          <div class="context-item" @click="() => handleContextAction('rename', 'group')">Rename</div>
          <div class="context-item" @click="() => handleContextAction('move', 'group')">Move</div>
        </div>
      </div>

      <!-- Rename Folder Modal -->
      <div v-if="showRenameModal" class="modal-overlay">
        <div class="modal panel" style="max-width:420px;">
          <h3 class="h2">Rename Folder</h3>
          <input class="input" v-model="renameFolderName" placeholder="New Folder Name" />
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
            <button class="btn ghost" @click="showRenameModal = false">Cancel</button>
            <button class="btn" @click="renameFolderConfirm">Rename</button>
          </div>
        </div>
      </div>

      <!-- Folder Creation Modal -->
      <div v-if="showFolderModal" class="modal-overlay">
        <div class="modal panel" style="max-width:420px;">
          <h3 class="h2" style="color:white">Create Folder</h3>
          <input class="input" v-model="newFolderName" placeholder="Folder Name" />
          <p v-if="errorMsg" class="error">A folder with this name already exists.</p>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
            <button class="btn ghost" @click="showFolderModal = false">Cancel</button>
            <button class="btn" @click="createFolder">Create</button>
          </div>
        </div>
      </div>

      <!-- Group Creation Modal -->
      <div v-if="showGroupModal" class="modal-overlay">
        <div class="modal panel" style="max-width:520px;">
          <h3 class="h2">Create Group</h3>
          <input class="input" v-model="newGroupName" placeholder="Group Name" />
          <textarea class="input" v-model="newGroupDescription" placeholder="Group Description" rows="4" style="margin-top:5px;resize:vertical"></textarea>
          <p class="error" v-if="groupErrorMsg">{{ groupErrorMsg }}</p>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
            <button class="btn ghost" @click="showGroupModal = false">Cancel</button>
            <button class="btn" @click="createGroupConfirm">Create</button>
          </div>
        </div>
      </div>

      <!-- Move Folder Modal (folder-tree) -->
      <div v-if="showMoveFolderModal" class="modal-overlay">
        <div class="modal panel" style="max-width:520px;">
          <h3 class="h2">Move Folder: {{ folderToMoveForModal?.name }}</h3>

          <div style="background-color:rgba(6,12,18,0.5); display:flex; gap:12px;">
            <div style="background-color:aliceblue; flex:1; min-height:160px; max-height:320px; overflow:auto; border-radius:8px; padding:8px; border:1px solid rgba(255,255,255,0.03); background:transparent;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <input type="radio" id="root-target" :checked="moveFolderTargetId === null" @change="moveFolderTargetId = null"/>
                <label for="root-target">Root</label>
              </div>

              <ul class="folder-tree" style="list-style:none; padding-left:6px; margin:0;">
                <li v-for="node in folderTree" :key="node._id">
                  <div class="folder-node" :class="{ disabled: descendantsOfFolderToMove.has(node._id) }">
                    <button class="node-expander" @click="() => loadChildrenForNode(node)">
                      {{ node.expanded ? '▾' : (node.loaded ? '▸' : '▸') }}
                    </button>
                    <input type="radio" :value="node._id" v-model="moveFolderTargetId" :disabled="descendantsOfFolderToMove.has(node._id)"/>
                    <span class="node-label" @click="() => { if (!descendantsOfFolderToMove.has(node._id)) moveFolderTargetId = node._id }">{{ node.name }}</span>
                  </div>

                  <ul v-if="node.expanded && node.children && node.children.length" style="list-style:none; padding-left:18px; margin:6px 0 0 0;">
                    <li v-for="child in node.children" :key="child._id">
                      <FolderTreeNode :node="child" :disabledSet="descendantsOfFolderToMove" v-model:selected="moveFolderTargetId" />
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
            <button class="btn ghost" @click="showMoveFolderModal = false">Cancel</button>
            <button class="btn" @click="moveFolderConfirm">Move</button>
          </div>
        </div>
      </div>

      <!-- Move Group Modal (folder-tree) -->
      <div v-if="showMoveGroupModal" class="modal-overlay">
        <div class="modal panel" style="max-width:520px;">
          <h3 class="h2">Move Group</h3>
          <div style="margin-bottom:8px;">
            <div style="font-weight:700;">Moving:</div>
            <div style="margin-top:6px;">{{ groupToMoveForModal?.name }}</div>
          </div>

          <label class="muted" style="display:block; margin-bottom:6px;">Select target folder</label>

          <div style="display:flex; gap:12px;">
            <div style="flex:1; min-height:160px; max-height:320px; overflow:auto; border-radius:8px; padding:8px; border:1px solid rgba(255,255,255,0.03); background:transparent;">
              <ul class="folder-tree" style="list-style:none; padding-left:6px; margin:0;">
                <li v-for="node in folderTree" :key="node._id">
                  <div class="folder-node">
                    <button class="node-expander" @click="() => loadChildrenForNode(node)">{{ node.expanded ? '▾' : (node.loaded ? '▸' : '▸') }}</button>
                    <input type="radio" :value="node._id" v-model="moveGroupTargetId"/>
                    <span class="node-label" @click="() => moveGroupTargetId = node._id">{{ node.name }}</span>
                  </div>

                  <ul v-if="node.expanded && node.children && node.children.length" style="list-style:none; padding-left:18px; margin:6px 0 0 0;">
                    <li v-for="child in node.children" :key="child._id">
                      <FolderTreeNode :node="child" :disabledSet="null" v-model:selected="moveGroupTargetId" />
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
            <button class="btn ghost" @click="showMoveGroupModal = false">Cancel</button>
            <button class="btn" @click="moveGroupConfirm">Move</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<!-- small recursive child node component used by the tree -->
<script lang="ts">
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  name: 'FolderTreeNode',
  props: {
    node: { type: Object as PropType<FolderNode>, required: true },
    disabledSet: { type: Object as PropType<Set<string> | null>, default: null },
    modelValue: { type: String as PropType<string | null>, default: null }
  },
  emits: ['update:selected'],
  setup(props, { emit }) {
    const toggle = async () => {
      // call parent's loadChildrenForNode via global event? simpler: use a custom event via DOM is not ideal.
      // But we can't access the parent's function here. To keep things simple and avoid major refactor,
      // this component will rely on the parent having already loaded children when expanding top nodes.
      props.node.expanded = !props.node.expanded;
    };
    return { toggle, emit };
  },
  template: `
    <div>
      <div class="folder-node" :class="{ disabled: disabledSet && disabledSet.has(node._id) }">
        <button class="node-expander" @click="toggle">{{ node.expanded ? '▾' : (node.loaded ? '▸' : '▸') }}</button>
        <input type="radio" :value="node._id" :checked="modelValue === node._id" @change="$emit('update:selected', node._id)" :disabled="disabledSet && disabledSet.has(node._id)"/>
        <span class="node-label" @click="$emit('update:selected', node._id)">{{ node.name }}</span>
      </div>
      <ul v-if="node.expanded && node.children && node.children.length" style="list-style:none; padding-left:18px; margin:6px 0 0 0;">
        <li v-for="child in node.children" :key="child._id">
          <FolderTreeNode :node="child" :disabledSet="disabledSet" v-model:selected="modelValue" @update:selected="$emit('update:selected', $event)"/>
        </li>
      </ul>
    </div>
  `
});
</script>

<style scoped>
/* preserve existing CSS and add only minimal tree styles */
.folders-grid {
  display:flex;
  flex-wrap:wrap;
  gap:12px;
}

/* folder tree UI */
.folder-tree { font-size: 0.95rem; color: var(--text); }
.folder-node { display:flex; align-items:center; gap:8px; padding:4px 6px; border-radius:6px; }
.folder-node.disabled { opacity: 0.45; pointer-events: none; }
.node-expander { background:transparent; border:none; color:var(--muted); cursor:pointer; width:22px; }
.node-label { cursor:pointer; user-select:none; }
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(6,12,18,0.5);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:2200;
  color:white;
}
.modal {
  padding:18px;
  border-radius:12px;
  color:white;
  width: 94%;
  max-width: 520px;
  border-width: 0;
  background: linear-gradient(120deg, var(--brand-deep),var(--brand-vivid));
}

.panel.card {
  color:white;
  padding:18px;
}

/* context menu */
.context-menu {
  background: linear-gradient(180deg, rgba(8,12,20,0.98), rgba(16,10,26,0.98));
  color: var(--text);
  border-radius:8px;
  padding:6px;
  min-width:140px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.04);
}
.context-item {
  padding:8px 10px;
  cursor:pointer;
  font-weight:600;
}
.context-item:hover {
  background: rgba(255,255,255,0.03);
}

/* visual lift on hover for folder/group items */
.item-wrap {
  display: flex;              /* preserves previous layout */
  flex-direction: column;
  align-items: stretch;
  transition: transform .16s cubic-bezier(.2,.9,.3,1), box-shadow .16s ease;
  will-change: transform;
}

.item-wrap:hover {
  transform: translateY(-8px);
  /* box-shadow: 0 18px 32px rgba(4,10,24,0.35); */
  z-index: 2; /* lift above siblings slightly */
}

/* slightly smaller lift on touch/smaller screens */
@media (max-width: 700px) {
  .item-wrap:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 18px rgba(4,10,24,0.24);
  }
}

/* keep responsiveness */
@media (max-width: 900px) {
  .home-container { padding: 12px; }
  .left { display:none; }
  aside.panel { display:none; }
}
</style>
