<template>
  <div class="fixed bottom-4 right-4 z-50 space-y-3 w-96">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      :class="[
        'p-4 rounded-lg shadow-xl text-sm transition-all duration-300 ease-in-out transform',
        notificationTypeClass(notification.type),
        visibleNotifications.has(notification.id) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      ]"
    >
      <div class="flex justify-between items-start">
        <p class="flex-grow">{{ notification.message }}</p>
        <button @click="removeNotification(notification.id)" class="ml-2 text-lg font-bold leading-none hover:opacity-75">&times;</button>
      </div>
       <div v-if="notification.taskId && notification.taskNode" class="mt-2">
        <TaskStatusDisplay :initial-task-id="notification.taskId" :node="notification.taskNode" :auto-start="true" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNotificationStore } from '@/stores/notifications';
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import TaskStatusDisplay from './TaskStatusDisplay.vue';

const notificationStore = useNotificationStore();
const notifications = computed(()_ => notificationStore.notifications);
const visibleNotifications = ref(new Set<number>());

watch(notifications, (newNotifications, oldNotifications) => {
  newNotifications.forEach(n => {
    if (!visibleNotifications.value.has(n.id)) {
      setTimeout(() => visibleNotifications.value.add(n.id), 50);
    }
  });
  oldNotifications.forEach(o => {
     if (!newNotifications.find(n => n.id === o.id)) {
        visibleNotifications.value.delete(o.id);
     }
  });
}, { deep: true });


function removeNotification(id: number) {
  visibleNotifications.value.delete(id);
  setTimeout(() => notificationStore.removeNotification(id), 300);
}

function notificationTypeClass(type: 'success' | 'error' | 'info') {
  switch (type) {
    case 'success':
      return 'bg-green-500 text-white';
    case 'error':
      return 'bg-red-500 text-white';
    case 'info':
      return 'bg-blue-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}
</script>