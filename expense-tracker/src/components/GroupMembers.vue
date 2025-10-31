<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useUserStore } from '../stores/user';
import { useRouter } from 'vue-router';

const router = useRouter();

const userStore = useUserStore();
const currentUser = computed(() => userStore.currentUser?._id || '');

interface User {
  _id: string;
  username: string;
  displayName: string;
  password: string;
  allowedToLeave?: boolean; // optional property for whether the user can leave
}

const props = defineProps<{ groupId: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const users = ref<User[]>([]);
const newUsername = ref('');
const errorMsg = ref('');

// Check if user can be removed or leave group if they have no expenses in this group
const canRemoveOrLeave = async (userId: string) => {
  try {
    const res = await axios.post('http://localhost:8000/api/Expense/_getExpensesByUser', {
      user: userId,
    });

    const expenses: any[] = res.data || [];

    // Check if any expense belongs to this group
    const involved = expenses.some((expense) => expense.group === props.groupId);

    return !involved; // true if safe to remove/leave
  } catch (err) {
    console.error(err);
    return false; // fail safe: do not allow removal if we cannot verify
  }
};

// Load group members
const loadUsers = async () => {
  try {
    const res = await axios.post('http://localhost:8000/api/Group/_listMembers', { group: props.groupId });
    const memberIds: string[] = Array.isArray(res.data.members) ? res.data.members : [];

    const allMembers: User[] = [];

    for (const userId of memberIds) {
      const userObjRes = await axios.post('http://localhost:8000/api/Authentication/_getUserById', { user: userId });
      if (userObjRes.data?.userInfo) {
        allMembers.push(userObjRes.data.userInfo);
      }
    }

    // Compute allowedToLeave after fetching all user data
    users.value = await Promise.all(
      allMembers.map(async (u) => ({
        ...u,
        allowedToLeave: await canRemoveOrLeave(u._id),
      })),
    );
  } catch (err) {
    console.error(err);
    errorMsg.value = 'Failed to load users.';
  }
};

// Add a new user to the group
const addUser = async () => {
  if (!newUsername.value) {
    errorMsg.value = 'Please enter a username.';
    return;
  }

  try {
    const userRes = await axios.post('http://localhost:8000/api/Authentication/_getUserByUsername', {
      username: newUsername.value.toLowerCase(),
    });
    const newUserId = userRes.data.userInfo?._id;

    if (!newUserId) {
      errorMsg.value = 'User not found.';
      return;
    }

    const res = await axios.post('http://localhost:8000/api/Group/addUser', {
      group: props.groupId,
      inviter: currentUser.value,
      newMember: newUserId,
    });

    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }

    // Create debts and add group to folder
    for (const member of users.value) {
      if (member._id === newUserId) continue;
      try {
        await axios.post('http://localhost:8000/api/Debt/createDebt', { userA: newUserId, userB: member._id });
      } catch {}
      await axios.post('http://localhost:8000/api/Folder/addGroupToFolder', {
        user: newUserId,
        folderName: '.root',
        group: props.groupId,
      });
    }

    newUsername.value = '';
    errorMsg.value = '';
    await loadUsers();
  } catch (err) {
    console.error(err);
    errorMsg.value = 'Failed to add user.';
  }
};

// Leave the group (current user)
const leaveGroup = async () => {
  try {
    const res = await axios.post('http://localhost:8000/api/Group/leaveGroup', {
      group: props.groupId,
      member: currentUser.value,
    });

    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }
    const folderRes = await axios.post('http://localhost:8000/api/Folder/_getFolderByGroupAndUser', {
      user: currentUser.value,
      group: props.groupId,
    });

    if (folderRes.data.error) {
      errorMsg.value = folderRes.data.error;
      return;
    }

    const folderId = folderRes.data._id;

    const res2 = await axios.post('http://localhost:8000/api/Folder/removeGroupFromFolder', {
      user: currentUser.value,
      folder: folderId,
      group: props.groupId,
    });

    if (res2.data.error) {
      errorMsg.value = res2.data.error;
      return;
    }

    router.push('/');

    emit('close');
    await loadUsers();
  } catch (err) {
    console.error(err);
    errorMsg.value = 'Failed to leave group.';
  }
};

// Remove a user from the group (actual server call)
const removeUser = async (userId: string) => {
  try {
    const folderRes = await axios.post('http://localhost:8000/api/Folder/_getFolderByGroupAndUser', {
      user: userId,
      group: props.groupId,
    });

    if (folderRes.data.error) {
      errorMsg.value = folderRes.data.error;
      return;
    }

    const folderId = folderRes.data._id;

    const res2 = await axios.post('http://localhost:8000/api/Folder/removeGroupFromFolder', {
      user: userId,
      folder: folderId,
      group: props.groupId,
    });

    if (res2.data.error) {
      errorMsg.value = res2.data.error;
      return;
    }

    const res = await axios.post('http://localhost:8000/api/Group/removeUser', {
      group: props.groupId,
      remover: currentUser.value,
      member: userId,
    });

    if (res.data.error) {
      errorMsg.value = res.data.error;
      return;
    }

    await loadUsers();
  } catch (err) {
    console.error(err);
    errorMsg.value = 'Failed to remove user.';
  }
};

/* Guarded handlers that show an error if action is blocked */

// Called when clicking Remove button for another user
const attemptRemove = async (user: User) => {
  if (!user.allowedToLeave) {
    errorMsg.value = 'Cannot remove this user — they are involved in expenses for this group.';
    return;
  }
  // clear any previous error then perform removal
  errorMsg.value = '';
  await removeUser(user._id);
};

// Called when clicking Leave Group for current user
const attemptLeave = async () => {
  const me = users.value.find((u) => u._id === currentUser.value);
  if (me && !me.allowedToLeave) {
    errorMsg.value = 'You cannot leave this group because you are involved in expenses here.';
    return;
  }
  errorMsg.value = '';
  await leaveGroup();
};

onMounted(loadUsers);
</script>

<template>
  <div class="gm-overlay" role="dialog" aria-modal="true" aria-label="Group members">
    <div class="gm-panel">
      <header class="gm-header">
        <div>
          <h3 class="gm-title">Group Members</h3>
          <p class="gm-sub">Manage members for this group</p>
        </div>
        <button class="icon-btn close" @click="emit('close')" aria-label="Close">✕</button>
      </header>

      <section class="gm-body">
        <div class="add-row">
          <input
            v-model="newUsername"
            class="gm-input"
            placeholder="Add member by username"
            @keyup.enter="addUser"
            aria-label="Add member by username"
          />
          <button class="btn" @click="addUser">Add</button>
        </div>

        <p v-if="errorMsg" class="gm-error">{{ errorMsg }}</p>

        <ul class="member-list" v-if="users.length">
          <li v-for="user in users" :key="user._id" class="member-row">
            <div class="member-left">
              <div class="avatar" :title="user.displayName">
                {{ user.displayName ? user.displayName.charAt(0).toUpperCase() : '?' }}
              </div>
              <div class="member-info">
                <div class="member-name">{{ user.displayName }}</div>
                <div class="member-username">@{{ user.username }}</div>
              </div>
            </div>

            <div class="member-actions">
              <button
                v-if="user._id !== currentUser"
                class="btn danger"
                :class="{ disabled: !user.allowedToLeave }"
                :aria-disabled="!user.allowedToLeave"
                @click="() => attemptRemove(user)"
              >
                Remove
              </button>

              <button
                v-else
                class="btn ghost"
                :class="{ disabled: !user.allowedToLeave }"
                :aria-disabled="!user.allowedToLeave"
                @click="attemptLeave"
              >
                Leave Group
              </button>
            </div>
          </li>
        </ul>

        <div v-else class="empty-note">No members yet.</div>
      </section>

      <footer class="gm-footer">
        <button class="btn cancel" @click="emit('close')">Close</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Overlay + panel */
.gm-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(6,12,18,0.2), var(--brand-deep));
  z-index: 2600;
  padding: 20px;
}

/* glass panel */
.gm-panel {
  width: 100%;
  max-width: 520px;
  border-radius: 14px;
  background: var(--card);
  box-shadow: 0 20px 48px rgba(2,6,20,0.6);
  color: var(--brand-light, #f4f7ff);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 5px;
}

/* header */
.gm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.02);
}

.gm-title {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 0.2px;
  color: var(--brand-highlight, #f6f8ff);
  font-weight: 700;
}

.gm-sub {
  margin: 2px 0 0 0;
  font-size: 0.82rem;
  color: var(--muted, rgba(255,255,255,0.55));
}

/* close icon */
.icon-btn {
  background: transparent;
  border: none;
  color: var(--brand-light, #f6f8ff);
  font-size: 1rem;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
}
.icon-btn.close:hover {
  background: rgba(255,255,255,0.02);
}

/* body */
.gm-body {
  padding: 12px 12px 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: rgba(2,6,20,0.3);
  margin:0.5rem;
  margin-bottom: 0;
  margin-top: 0;
  border-radius: 10px;
}

/* add row */
.add-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.gm-input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--brand-light, #f3f7ff);
  border: 1px solid rgba(255,255,255,0.04);
  outline: none;
  font-size: 0.96rem;
  background-color: rgba(2,6,20,0.3);
}

.gm-input::placeholder {
  color: rgba(255,255,255,0.45);
}

/* primary button */
.btn-primary {
  background: linear-gradient(90deg, var(--brand-highlight, #ff6bcb), var(--brand-vivid, #7b2ff7));
  color: white;
  border: none;
  padding: 10px 12px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 26px rgba(123,47,247,0.14);
}
.btn-primary:hover { transform: translateY(-2px); }

/* error */
.gm-error {
  color: #ff7b9c;
  font-size: 0.9rem;
  margin: 0;
  padding: 0 2px;
}

/* members list */
.member-list {
  list-style: none;
  padding: 2px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 36vh;
  overflow-y: auto;
  padding-right: 6px;
}

/* each member */
.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px;
  border-radius: 10px;
  background-color: rgba(2,6,20,0.2);
  border: 1px solid rgba(255,255,255,0.02);
}

.member-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

/* avatar */
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--brand-light, #f3f7ff);
  border: 1px solid rgba(255,255,255,0.04);
  flex-shrink: 0;
}

/* name block */
.member-info {
  min-width: 0;
  text-align: left;
}

.member-name {
  font-weight: 700;
  color: var(--brand-light, #f3f7ff);
  font-size: 0.98rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-username {
  font-size: 0.82rem;
  color: rgba(255,255,255,0.55);
}

/* action area */
.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}




/* visually disabled state when allowedToLeave is false */
.btn.disabled,
.btn[aria-disabled="true"] {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.25);
  transform: none !important;
  pointer-events: auto; /* keep pointer events to allow clicking for error message */
}

/* you badge for current user */
.you-badge {
  font-size: 0.8rem;
  color: white;
  background: rgba(255,255,255,0.1);
  padding: 6px 13px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.02);
}

/* footer */
.gm-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255,255,255,0.02);
  display: flex;
  justify-content: flex-end;
}

/* empty note */
.empty-note {
  color: rgba(255,255,255,0.45);
  text-align: center;
  padding: 12px 0;
}

/* responsive */
@media (max-width: 480px) {
  .gm-panel { max-width: 94%; border-radius: 12px; }
  .avatar { width: 36px; height: 36px; }
}
</style>
