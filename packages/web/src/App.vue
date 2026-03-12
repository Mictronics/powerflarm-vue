<template>
  <div class="flex w-full min-h-screen bg-white p-1 gap-1">
    <aside class="w-56 bg-mist-50 p-2 border rounded-2xl border-mist-300 flex flex-col gap-2">
      <Button
        size="small"
        :severity="buttonConfig.severity"
        :variant="buttonConfig.variant"
        @click="toggleConnection"
        :disabled="status === DeviceStatus.DeviceConnecting || status === DeviceStatus.DeviceReconnecting"
      >
        <Router :size="24" class="mr-1" />
        {{ buttonConfig.label }}
      </Button>
      <Card v-if="flarmDevice">
        <template #content>
          <div class="text-xs">
            <p>{{ flarmDevice.deviceType }}</p>
            <p>{{ flarmDevice.deviceId }}</p>
            <p>v{{ flarmDevice.swVersion }} {{ flarmDevice.region }}</p>
            <p>
              {{ flarmDevice.radioIdType }}:
              <span class="font-semibold">{{ flarmDevice.radioId }}</span>
            </p>
          </div>
          <ul class="list-inside list-disc text-xs mt-2">
            <li v-for="feature in availableFeatures" :key="feature.key">
              {{ feature.label }}
            </li>
          </ul>
          <div class="flex justify-end gap-3">
            <Satellite :size="20" :class="gpsOk ? 'text-lime-500' : 'text-mist-200'" />
            <BatteryFull v-if="powerOk" :size="20" class="text-lime-500" />
            <BatteryWarning v-else :size="20" class="text-rose-500" />
          </div>
        </template>
      </Card>
      <Card v-if="hasFix">
        <template #content>
          <div class="text-xs">
            <p class="flex gap-2">
              <MapPin :size="15" class="text-mist-400" />
              {{ latitude }} {{ longitude }}
            </p>
            <p class="flex gap-2">
              <MountainSnow :size="15" class="text-mist-400" />
              {{ altitudeGps }}m / {{ altitudeBaro }}
            </p>
            <p class="flex gap-2">
              <Satellite :size="15" class="text-mist-400" />
              {{ satellitesInView }}
            </p>
          </div>
        </template>
      </Card>
      <div class="mt-auto text-center text-xs text-mist-500/40 dark:text-mist-400/40">
        <a href="https://github.com/Mictronics/powerflarm-vue" target="_blank" class="hover:underline text-link">
          {{ appName }}
        </a>
        <p>Michael Wolf</p>
        <a class="hover:underline text-link" href="https://www.mictronics.de" target="_blank">Mictronics</a>
        <p>{{ version }} #{{ commitHash }}</p>
      </div>
    </aside>
    <aside class="w-56 bg-mist-50 p-4 border rounded-2xl border-mist-300 flex flex-col gap-2"></aside>
    <main class="flex-1 overflow-auto bg-mist-50 border rounded-2xl border-mist-300"></main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Router, Satellite, BatteryFull, BatteryWarning, MountainSnow, MapPin } from 'lucide-vue-next';
import { useNmeaWebSerial } from './composables/useNmeaWebSerial';
import { DeviceStatus } from './composables/useNmeaWebSerial';

const { status, connect, disconnect, flarmData } = useNmeaWebSerial();

type StatusConfig = {
  label: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
  variant: 'filled' | 'outlined';
};
const statusConfig: Record<DeviceStatus, StatusConfig> = {
  [DeviceStatus.DeviceDisconnected]: {
    label: 'Connect',
    severity: 'info',
    variant: 'filled',
  },
  [DeviceStatus.DeviceConnecting]: {
    label: 'Connecting...',
    severity: 'warning',
    variant: 'outlined',
  },
  [DeviceStatus.DeviceConnected]: {
    label: 'Disconnect',
    severity: 'success',
    variant: 'filled',
  },
  [DeviceStatus.DeviceError]: {
    label: 'Error',
    severity: 'danger',
    variant: 'filled',
  },
  [DeviceStatus.DeviceReconnecting]: {
    label: 'Reconnecting',
    severity: 'warning',
    variant: 'outlined',
  },
};
const buttonConfig = computed<StatusConfig>(() => statusConfig[status.value]);

const toggleConnection = async (): Promise<void> => {
  if (status.value === DeviceStatus.DeviceDisconnected) {
    await connect();
  } else if (status.value === DeviceStatus.DeviceConnected) {
    await disconnect();
  }
};

const flarmDevice = computed(() => flarmData.value.device);
const flarmPosition = computed(() => flarmData.value.position);
const flarmAltitude = computed(() => flarmData.value.altitude);

const featureList = [
  { key: 'audio', label: 'Audio' },
  { key: 'alertZoneGenerator', label: 'Alert Zone Generator' },
  { key: 'pressureSensor', label: 'Pressure Sensor' },
  { key: 'batteryCompartment', label: 'Battery' },
  { key: 'secondDataPort', label: 'Second Dataport' },
  { key: 'engineNoiseLevelSensor', label: 'Engine Noise Sensor' },
  { key: 'groundStationDevice', label: 'Ground Station' },
  { key: 'igcApprovedRecorder', label: 'IGC Recorder' },
  { key: 'obstacleDatabase', label: 'Obstacle Database' },
  { key: 'antennaDiversity', label: 'Antenna Diversity' },
  { key: 'sdCard', label: 'SD Card' },
  { key: 'garminTIS', label: 'Garmin TIS' },
  { key: 'userInterface', label: 'User Interface' },
  { key: 'usbSlot', label: 'USB' },
  { key: 'adsbModule', label: 'ADSB Module' },
] as const;

type FeatureListItem = (typeof featureList)[number];
const availableFeatures = computed(() => {
  const feats = flarmData.value.device?.features;
  if (!feats) return [] as FeatureListItem[];
  return featureList.filter((f) => feats?.[f.key]);
});

const gpsOk = computed(() => !!flarmData.value.status?.gps);
const powerOk = computed(() => !!flarmData.value.status?.power);

const latitude = computed(() => flarmPosition.value?.latitude?.toFixed(6));
const longitude = computed(() => flarmPosition.value?.longitude?.toFixed(6));
const altitudeGps = computed(() => flarmPosition.value?.altitudeMeters?.toFixed(0));
const altitudeBaro = computed(() => {
  const altitude = flarmAltitude.value?.altitude;
  if (altitude == null) return undefined;
  const alt = altitude.toFixed(0);
  return flarmAltitude.value?.unit === 'F' ? `${alt}ft` : `${alt}m`;
});
const hasFix = computed(() => {
  const fix = flarmPosition.value?.fixType;
  return fix !== undefined && fix !== 'none';
});
const satellitesInView = computed(() => flarmPosition.value?.satellitesInView);

const appName = computed(() => {
  return String(import.meta.env.VITE_APP_NAME)?.toWellFormed() || '';
});
const version = computed(() => {
  return String(import.meta.env.VITE_VERSION)?.toUpperCase() || '';
});
const commitHash = computed(() => {
  return (
    String(import.meta.env.VITE_COMMIT_HASH)
      ?.toUpperCase()
      .slice(0, 7) || 'Unknown'
  );
});
</script>
