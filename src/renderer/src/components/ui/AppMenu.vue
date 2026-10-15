<script setup lang="ts">
import type { MenuItem } from '@/types'

defineProps<{ open: boolean; items: MenuItem[] }>()
const emit = defineEmits<{ pick: [key: string] }>()
</script>

<template>
  <!-- The row that opens this owns the offsets, so callers pass --dd-top / --dd-right inline. -->
  <div v-if="open" class="dd" data-menu-root role="menu">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      role="menuitem"
      :class="{ 'dd--danger': item.danger }"
      @click="emit('pick', item.key)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
.dd {
  position: absolute;
  top: var(--dd-top, 28px);
  right: var(--dd-right, 6px);
  z-index: 30;
  min-width: 148px;
  padding: 6px;
  border: 1px solid var(--lf-border);
  border-radius: 10px;
  background: var(--lf-surface);
  box-shadow: var(--lf-shadow);
}

.dd button {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--lf-fg);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.dd button:hover {
  background: var(--lf-accent-soft);
  color: var(--lf-accent);
}

.dd .dd--danger {
  color: var(--lf-danger);
}

.dd .dd--danger:hover {
  background: var(--lf-danger);
  color: #fff;
}
</style>
