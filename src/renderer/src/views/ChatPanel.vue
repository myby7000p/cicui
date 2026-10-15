<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import MessageItem from '@/components/chat/MessageItem.vue'
import StartScreen from '@/components/chat/StartScreen.vue'
import { useChatStore } from '@/stores/chat'

const chat = useChatStore()
const route = useRoute()
const scroller = useTemplateRef<HTMLElement>('scroller')

const messages = computed(() => chat.activeConversation.messages)

// The thread id lives in the URL, so reloads and back/forward have to pull it back into the store.
watch(
  () => String(route.params.conversationId ?? ''),
  (id) => chat.syncConversationFromRoute(id),
  { immediate: true }
)

// `flush: post` runs this after the new rows are in the DOM, which is what `scrollHeight` reads.
watch(
  () => [messages.value.length, messages.value.at(-1)?.blocks.length ?? 0],
  () => {
    const element = scroller.value
    if (element) element.scrollTop = element.scrollHeight
  },
  { flush: 'post' }
)
</script>

<template>
  <div ref="scroller" class="chat-area">
    <div class="chat-wrap">
      <StartScreen v-if="messages.length === 0" />
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
        @update-plan="chat.updatePlanAssumptions(message.id, $event)"
      />
    </div>
  </div>
  <ChatComposer />
</template>

<style scoped>
.chat-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.chat-wrap {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
