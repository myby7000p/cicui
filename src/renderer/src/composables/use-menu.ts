import { onBeforeUnmount, onMounted, shallowRef, type Ref } from 'vue'

/** Only one anchored menu is open at a time across the app. */
const openMenus = new Set<() => void>()

export interface MenuState {
  open: Ref<boolean>
  toggle: () => void
  close: () => void
}

/**
 * Anchored menus close on outside click or Escape. The trigger and panel must sit inside an
 * element marked with `data-menu-root`.
 */
export function useMenu(): MenuState {
  const open = shallowRef(false)

  function close(): void {
    open.value = false
  }

  function onPointerDown(event: MouseEvent): void {
    if (open.value && !(event.target as HTMLElement).closest('[data-menu-root]')) close()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close()
  }

  function toggle(): void {
    if (!open.value) openMenus.forEach((other) => other !== close && other())
    open.value = !open.value
  }

  onMounted(() => {
    openMenus.add(close)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    openMenus.delete(close)
    document.removeEventListener('mousedown', onPointerDown)
    document.removeEventListener('keydown', onKeydown)
  })

  return { open, toggle, close }
}
