<template>
  <div class="flex w-full min-h-screen bg-white p-1 gap-1">
    <aside class="w-56 bg-mist-50 p-4 border rounded-2xl border-mist-300 flex flex-col gap-2">
      <Button size="small" :severity="buttonSeverity" :variant="buttonVariant" @click="toggleConnection">
        <Router :size="24" class="mr-1" />
        {{ buttonLabel }}
      </Button>
    </aside>
    <aside class="w-56 bg-mist-50 p-4 border rounded-2xl border-mist-300 flex flex-col gap-2"></aside>
    <main class="flex-1 overflow-auto bg-mist-50 border rounded-2xl border-mist-300"></main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Router } from 'lucide-vue-next';
import { useNmeaWebSerial } from './composables/useNmeaWebSerial';
import { DeviceStatus } from './composables/useNmeaWebSerial';
const { status, connect, disconnect } = useNmeaWebSerial();

const buttonLabel = computed(() => {
  switch (status.value) {
    case DeviceStatus.DeviceDisconnected:
      return 'Connect';
    case DeviceStatus.DeviceConnecting:
      return 'Connecting...';
    case DeviceStatus.DeviceConnected:
      return 'Disconnect';
    default:
      return 'Connect';
  }
});
const buttonSeverity = computed(() => {
  switch (status.value) {
    case DeviceStatus.DeviceDisconnected:
      return 'secondary';
    case DeviceStatus.DeviceConnecting:
      return 'warning';
    case DeviceStatus.DeviceConnected:
      return 'success';
    default:
      return 'secondary';
  }
});
const buttonVariant = computed(() => (status.value === DeviceStatus.DeviceConnecting ? 'outlined' : 'filled'));

const toggleConnection = async () => {
  if (status.value === DeviceStatus.DeviceDisconnected) {
    await connect();
  } else if (status.value === DeviceStatus.DeviceConnected) {
    await disconnect();
  }
};
</script>
