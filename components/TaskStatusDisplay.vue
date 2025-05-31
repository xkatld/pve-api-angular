<template>
  <div v-if="taskId" class="text-xs p-2 rounded bg-opacity-20" :class="statusClass">
    <p>
      <strong>任务 ({{ displayTaskId }}) 状态:</strong> {{ taskStatusInfo?.status || (error ? '错误' : '加载中...') }}
      <span v-if="taskStatusInfo?.exitstatus"> ({{ taskStatusInfo.exitstatus }})</span>
    </p>
    <p v-if="error" class="text-red-400">错误: {{ error }}</p>
    <p v-if="taskStatusInfo?.type">类型: {{ taskStatusInfo.type }}</p>
    <button
      v-if="!isPolling && (taskStatusInfo?.status !== 'stopped' || error)"
      @click="checkStatus"
      class="ml-2 text-blue-300 hover:underline text-xs"
      :disabled="isLoading"
    >
      {{ isLoading ? '检查中...' : '刷新状态' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import apiClient from '@/services/apiClient';
import type { TaskStatusInfo, OperationResponse } from '@/types/proxmox'; // OperationResponse might contain TaskStatusInfo in its data field

const props = defineProps<{
  initialTaskId: string;
  node: string;
  autoStart?: boolean;
}>();

const taskId = ref(props.initialTaskId);
const taskStatusInfo = ref<TaskStatusInfo | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const pollInterval = ref<number | undefined>(undefined);
const isPolling = ref(false);

const displayTaskId = computed(() => {
  const parts = taskId.value.split(':');
  return parts.length > 1 ? `...${parts[parts.length-1]}` : taskId.value;
});

const statusClass = computed(() => {
  if (error.value) return 'bg-red-500 text-red-100';
  if (!taskStatusInfo.value || isLoading.value) return 'bg-gray-500 text-gray-100';
  switch (taskStatusInfo.value.status) {
    case 'running': return 'bg-blue-500 text-blue-100';
    case 'stopped':
      return taskStatusInfo.value.exitstatus === 'OK' ? 'bg-green-500 text-green-100' : 'bg-red-500 text-red-100';
    default: return 'bg-yellow-500 text-yellow-100';
  }
});

async function checkStatus() {
  if (!taskId.value || !props.node) {
    error.value = "任务ID或节点未提供";
    return;
  }
  isLoading.value = true;
  error.value = null;
  try {
    const response: OperationResponse = await apiClient.getTaskStatus(props.node, taskId.value);
    if (response.success && response.data) {
      taskStatusInfo.value = response.data as TaskStatusInfo; // Assuming data is TaskStatusInfo
      if (taskStatusInfo.value?.status === 'stopped' || taskStatusInfo.value?.status === 'error') {
        stopPolling();
      }
    } else {
       error.value = response.message || "获取任务状态失败";
       taskStatusInfo.value = { status: 'error', message: error.value }; // Mimic structure for display
       stopPolling();
    }
  } catch (e: any) {
    error.value = e.message || "检查任务状态时发生未知错误";
    taskStatusInfo.value = { status: 'error', message: error.value };
    stopPolling();
  } finally {
    isLoading.value = false;
  }
}

function startPolling() {
  if (isPolling.value) return;
  isPolling.value = true;
  checkStatus(); // Initial check
  pollInterval.value = setInterval(() => {
    if (taskStatusInfo.value?.status !== 'stopped' && taskStatusInfo.value?.status !== 'error') {
      checkStatus();
    } else {
      stopPolling();
    }
  }, 3000); // Poll every 3 seconds
}

function stopPolling() {
  if (pollInterval.value) {
    clearInterval(pollInterval.value);
    pollInterval.value = undefined;
  }
  isPolling.value = false;
}

watch(() => props.initialTaskId, (newVal) => {
  stopPolling();
  taskId.value = newVal;
  taskStatusInfo.value = null;
  error.value = null;
  if (newVal && props.autoStart) {
    startPolling();
  } else if (newVal) {
    checkStatus(); // Perform one check if not auto-starting
  }
});

onMounted(() => {
  if (props.initialTaskId && props.autoStart) {
    startPolling();
  } else if (props.initialTaskId) {
     checkStatus(); // Perform one check if not auto-starting
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>