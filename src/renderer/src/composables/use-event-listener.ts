import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Attaches a listener for exactly as long as the calling component is alive. The composer shortcut
 * and the modal dismissal each hand-rolled this pair, and the second one skipped the removal.
 */
export function useEventListener<K extends keyof WindowEventMap>(
  target: Window | Document,
  event: K,
  handler: (payload: WindowEventMap[K]) => void
): void {
  onMounted(() => target.addEventListener(event, handler as EventListener))
  onBeforeUnmount(() => target.removeEventListener(event, handler as EventListener))
}
