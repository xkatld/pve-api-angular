import { defineStore } from 'pinia';
import { ref } from 'vue';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  taskId?: string;
  taskNode?: string;
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([]);
  let nextId = 0;

  function addNotification(message: string, type: 'success' | 'error' | 'info', duration: number = 5000, taskId?: string, taskNode?: string) {
    const id = nextId++;
    notifications.value.push({ id, message, type, taskId, taskNode });
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }

  function removeNotification(id: number) {
    notifications.value = notifications.value.filter(n => n.id !== id);
  }

  function addSuccess(message: string, taskId?: string, taskNode?: string) {
    addNotification(message, 'success', 5000, taskId, taskNode);
  }

  function addError(message: string, taskId?: string, taskNode?: string) {
    addNotification(message, 'error', 7000, taskId, taskNode);
  }

  function addInfo(message: string, taskId?: string, taskNode?: string) {
    addNotification(message, 'info', 5000, taskId, taskNode);
  }

  return { notifications, addNotification, removeNotification, addSuccess, addError, addInfo };
});