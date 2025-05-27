<template>
  <el-tag :type="tagType" effect="dark" size="small">
    {{ statusText }}
  </el-tag>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    required: true,
    default: 'unknown'
  }
});

const tagType = computed(() => {
  switch (props.status.toLowerCase()) {
    case 'running':
      return 'success';
    case 'stopped':
      return 'danger';
    case 'rebooting':
    case 'starting':
    case 'stopping':
      return 'warning';
    default:
      return 'info';
  }
});

const statusText = computed(() => {
    switch (props.status.toLowerCase()) {
        case 'running': return '运行中';
        case 'stopped': return '已停止';
        case 'unknown': return '未知';
        default: return props.status;
  }
});

</script>

<style scoped>
.el-tag {
  min-width: 60px;
  text-align: center;
}
</style>
