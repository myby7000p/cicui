<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{ source: string; stripFrontMatter?: boolean }>()

/** Server-authored markdown, sanitized before it reaches the DOM. */
const html = computed(() => {
  const body = props.stripFrontMatter
    ? props.source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    : props.source
  return DOMPurify.sanitize(marked.parse(body, { async: false }) as string)
})
</script>

<template>
  <div class="md-preview" v-html="html"></div>
</template>
