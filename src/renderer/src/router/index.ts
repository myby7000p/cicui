import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

export type NavKey = 'chat' | 'library' | 'projects' | 'settings'

declare module 'vue-router' {
  interface RouteMeta {
    /** Which sidebar entry lights up for this route. */
    nav?: NavKey
  }
}

/**
 * Hash history: the packaged renderer loads from `file://`, where a real path would be resolved
 * against the filesystem and 404. `#/projects` keeps deep links working in both dev and prod.
 *
 * Every view is a dynamic import so each one lands in its own chunk; `main.ts` awaits
 * `router.isReady()` before mounting, so the first view's chunk is fetched pre-paint.
 */
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: 'chat' } },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('@/views/ChatPanel.vue'),
    meta: { nav: 'chat' }
  },
  {
    // A thread gets its own address so a reload or a deep link lands on the same conversation.
    path: '/chat/:conversationId',
    name: 'chat-conversation',
    component: () => import('@/views/ChatPanel.vue'),
    meta: { nav: 'chat' }
  },
  {
    path: '/library',
    name: 'library',
    component: () => import('@/views/LibraryView.vue'),
    meta: { nav: 'library' }
  },
  {
    path: '/projects',
    name: 'projects',
    component: () => import('@/views/ProjectsView.vue'),
    meta: { nav: 'projects' }
  },
  {
    path: '/projects/:projectId/skills',
    name: 'project-skills',
    component: () => import('@/views/ProjectsView.vue'),
    meta: { nav: 'projects' }
  },
  {
    path: '/projects/:projectId/skills/:skillId',
    name: 'skill-editor',
    component: () => import('@/views/SkillEditor.vue'),
    meta: { nav: 'projects' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { nav: 'settings' }
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'chat' } }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
