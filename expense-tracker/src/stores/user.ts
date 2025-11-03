import { defineStore } from 'pinia';
import { ref } from 'vue';

interface User {
  _id: string;
  username: string;
  displayName: string;
  token: string;
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null);

  const setUser = (user: User) => {
    currentUser.value = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const clearUser = () => {
    currentUser.value = null;
    localStorage.removeItem('currentUser');
  };

  // Load user from localStorage on page reload
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    currentUser.value = JSON.parse(stored);
  }

  return { currentUser, setUser, clearUser };
});
