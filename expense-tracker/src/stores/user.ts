import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<{ username: string; displayName: string } | null>(null);

  const setUser = (user: { username: string; displayName: string }) => {
    currentUser.value = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const clearUser = () => {
    currentUser.value = null;
    localStorage.removeItem('currentUser');
  };

  // Load user from localStorage on page reload
  if (localStorage.getItem('currentUser')) {
    currentUser.value = JSON.parse(localStorage.getItem('currentUser')!);
  }

  return { currentUser, setUser, clearUser };
});
