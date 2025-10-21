import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import CreateAccount from '../views/CreateAccount.vue'
import ProfilePage from '../views/ProfilePage.vue'
import GroupView from '../views/GroupView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path:'/login',
      name:'login',
      component:LoginView,
    },

    {
      path:'/register',
      name:'register',
      component:CreateAccount,
    },
    {
      path:'/profile',
      name:'profile',
      component:ProfilePage,
    },
    {
    path: '/group/:groupId',
    name: 'GroupView',
    component: GroupView,
    props: true, // allows us to pass groupId as a prop
  },


  ],
})

export default router

// <-- put redirect logic here
router.beforeEach((to, from, next) => {
  const publicPages = ['/login','/register']; // pages that don't require login
  const authRequired = !publicPages.includes(to.path);
  const loggedIn = localStorage.getItem('currentUser');

  if (authRequired && !loggedIn) {
    return next('/login'); // redirect to login if not logged in
  }
  next(); // otherwise continue
});
