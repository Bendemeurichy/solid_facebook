import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Query from '../components/Query.vue'
import PostFeed from "@/views/PostFeed.vue";
import AddPost from "@/views/AddPost.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/query',
      name: 'query',
      component: Query
    },
    {
      path: '/feed',
      name: 'feed',
      component: PostFeed
    },
    {
      path: '/addPost',
      name: 'addPost',
      component: AddPost
    }
  ]
})

export default router
