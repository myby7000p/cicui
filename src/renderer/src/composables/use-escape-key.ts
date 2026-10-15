import { useEventListener } from '@/composables/use-event-listener'

/**
 * Escape closes a layer. Every overlay needs the same thing, and a dialog that ignores it reads as
 * broken on a desktop app where the key has no other use.
 */
export function useEscapeKey(onEscape: () => void, active: () => boolean = () => true): void {
  useEventListener(document, 'keydown', (event) => {
    if (event.key === 'Escape' && active()) onEscape()
  })
}
