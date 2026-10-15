import { readonly, ref } from 'vue'

export interface Toast {
  id: number
  text: string
}

const TOAST_LIFETIME_MS = 2600

const toasts = ref<Toast[]>([])
let sequence = 0

/** Read on screen, never written from a component: `notify` is the only way in. */
export function useToasts() {
  return readonly(toasts)
}

export function notify(text: string): void {
  const id = ++sequence
  toasts.value.push({ id, text })
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }, TOAST_LIFETIME_MS)
}
