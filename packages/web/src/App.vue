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
    <aside class="w-64 bg-mist-50 p-2 border rounded-2xl border-mist-300 flex flex-col gap-2">
      <VirtualScroller
        ref="scroller"
        :items="flarmAircrafts"
        :itemSize="110"
        :scrollHeight="virtualScrollerHeight"
        class="flex flex-col gap-2"
      >
        <template #item="{ item }: { item: FlarmAircraft }">
          <Card pt:body:class="card-body" class="w-full" :class="alarmBorderClass(item.alarmLevel)">
            <template #content>
              <div class="flex items-center justify-between">
                <div class="flex items-center justify-center w-14">
                  <div class="text-sky-500" :style="{ transform: `rotate(${item.track || 0}deg)` }">
                    <Navigation :size="28" />
                  </div>
                </div>
                <div class="flex-1 text-xs leading-8">
                  <p class="font-semibold text-sm">{{ item.idType }}: {{ item.id }}</p>
                  <div class="flex gap-3 text-mist-500">
                    <span v-if="item.groundSpeed">{{ item.groundSpeed }} km/h</span>
                    <span v-if="item.climbRate">{{ item.climbRate.toFixed(1) }} m/s</span>
                  </div>
                </div>
                <div class="text-right font-semibold text-sm" :class="altitudeClass(item.relativeVertical)">
                  <p>
                    {{ formatAltitude(item.relativeVertical) }}
                  </p>

                  <p class="text-xs text-mist-400">
                    {{ item.climbRate ? item.climbRate.toFixed(1) + ' m/s' : '—' }}
                  </p>
                </div>
              </div>
              <div class="flex justify-between text-xs">
                <span class="px-1 rounded bg-sky-100 text-sky-700">
                  {{ sourceTypes[item.source ?? 0] ?? 'Unknown' }}
                </span>
                <span class="text-mist-400">
                  {{ aircraftTypes[item.aircraftType ?? AircraftType.Unknown] }}
                </span>
                <EyeOff v-if="item.noTrack" :size="18" />
                <Eye v-else :size="18" class="text-mist-400" />
              </div>
            </template>
          </Card>
        </template>
      </VirtualScroller>
    </aside>
    <main class="flex-1 bg-mist-50 border rounded-2xl border-mist-300 flex items-center justify-center">
      <canvas ref="radarCanvas" class="w-full h-full"></canvas>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  Router,
  Satellite,
  BatteryFull,
  BatteryWarning,
  MountainSnow,
  MapPin,
  Navigation,
  Eye,
  EyeOff,
} from 'lucide-vue-next';
import { useNmeaWebSerial } from './composables/useNmeaWebSerial';
import { DeviceStatus } from './composables/useNmeaWebSerial';
import { AircraftType, type FlarmAircrafts, type FlarmAircraft, FlarmSource } from '@flarm/adapters/flarm/types';

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
const flarmHeading = computed(() => flarmData.value.heading);

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

const aircraftTypes: Record<AircraftType, string> = {
  0: 'Reserved',
  1: 'Glider',
  2: 'Tow Plane',
  3: 'Rotorcraft',
  4: 'Skydiver',
  5: 'Drop Plane',
  6: 'Hangglider',
  7: 'Paraglider',
  8: 'Propeller Aircraft',
  9: 'Jet Aircraft',
  10: 'Unknown',
  11: 'Balloon',
  12: 'Airship',
  13: 'UAV',
  14: 'Reserved',
  15: 'Static Obstacle',
};

const sourceTypes: Partial<Record<FlarmSource, string>> = {
  0: 'FLARM',
  1: 'ADS-B',
  3: 'ADS-R',
  4: 'TIS-B',
  6: 'Mode-S',
};

const flarmAircrafts = computed(() => {
  //const raw = flarmData.value.aircrafts;
  const raw = {
    aircrafts: [
      {
        alarmLevel: 0,
        relativeNorth: 500,
        relativeEast: 500,
        relativeVertical: 1,
        idType: 1,
        id: 'ABCDEF',
        track: 1,
        turnRate: 1,
        groundSpeed: 1,
        climbRate: 1,
        aircraftType: AircraftType.Rotorcraft,
        noTrack: false,
        rssi: -10,
        source: 0,
      },
    ],
  } as FlarmAircrafts;
  const aircrafts = Array.isArray(raw) ? raw : (raw?.aircrafts ?? []);

  return [...aircrafts].sort((a, b) => {
    const alarmDiff = (b.alarmLevel ?? 0) - (a.alarmLevel ?? 0);
    if (alarmDiff !== 0) return alarmDiff;

    const distA = a.distance ?? Number.POSITIVE_INFINITY;
    const distB = b.distance ?? Number.POSITIVE_INFINITY;

    return distA - distB;
  });
});

const formatAltitude = (alt?: number) => {
  if (alt == null) return '--';
  const sign = alt > 0 ? '+' : '';
  return `${sign}${alt.toFixed(0)} m`;
};

const altitudeClass = (alt?: number) => {
  if (alt == null) return 'text-mist-400';
  if (Math.abs(alt) < 150) return 'text-rose-500 font-bold'; // danger close
  if (Math.abs(alt) < 500) return 'text-amber-500';
  return 'text-lime-600';
};

const virtualScrollerHeight = ref('0px');
const onResize = () => {
  virtualScrollerHeight.value = `${window.innerHeight - 80}px`;
};

const alarmBorderClass = (level?: number) => {
  switch (level) {
    case 1:
      return 'border-amber-400 border-2';
    case 2:
      return 'border-orange-500 border-2';
    case 3:
      return 'border-red-600 bg-red-50 animate-pulse border-2';
    default:
      return 'border-mist-300 border-1';
  }
};

const radarCanvas = ref<HTMLCanvasElement | null>(null);
const lastPositions = ref<Record<string, { x: number; y: number }>>({});
function drawRadar(aircrafts: FlarmAircraft[]) {
  const canvas = radarCanvas.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Determine zoom automatically based on nearest aircraft
  let nearest = Math.min(
    ...aircrafts.map((a) => Math.sqrt((a.relativeEast ?? 0) ** 2 + (a.relativeNorth ?? 0) ** 2) || 5000),
  );
  let maxRange = nearest < 1000 ? 1000 : nearest < 3000 ? 3000 : 5000;
  const scale = Math.min(w, h) / 2 / maxRange;

  // Heading up
  const heading = flarmHeading.value?.degreesTrue ?? 0;
  const headingRad = (-heading * Math.PI) / 180;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(headingRad);

  drawRings(ctx, scale, maxRange);
  drawOwnship(ctx);

  // Draw aircraft with interpolation
  aircrafts.filter((a) => !a.noTrack).forEach((a) => drawAircraft(ctx, a, scale));
  aircrafts.forEach((a) => {
    if (a.noTrack && a.id) {
      delete lastPositions.value[a.id];
    }
  });
  ctx.restore();
}

function drawRings(ctx: CanvasRenderingContext2D, scale: number, maxRange: number) {
  const rings = [100, 500, 1000, 3000, 5000].filter((r) => r <= maxRange);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#64748b';

  rings.forEach((r) => {
    const radius = r * scale;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(`${r / 1000} km`, radius + 4, -4);
  });
}

function drawOwnship(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(6, 8);
  ctx.lineTo(-6, 8);
  ctx.closePath();
  ctx.fill();
}

function drawAircraft(ctx: CanvasRenderingContext2D, a: FlarmAircraft, scale: number) {
  if (a.relativeNorth == null || a.relativeEast == null) return;

  const id = a.id ?? a.idType?.toString() ?? Math.random().toString();

  // convert meters -> pixels FIRST
  const targetX = a.relativeEast * scale;
  const targetY = -a.relativeNorth * scale;

  const prev = lastPositions.value[id] || { x: targetX, y: targetY };

  // interpolate in pixel space
  const x = prev.x + (targetX - prev.x) * 0.2;
  const y = prev.y + (targetY - prev.y) * 0.2;

  if (!lastPositions.value[id]) {
    lastPositions.value[id] = { x: targetX, y: targetY };
  }

  // Color by alarm level
  const alarm = a.alarmLevel ?? 0;
  let color = '#334155';
  if (alarm === 1) color = '#f59e0b';
  if (alarm === 2) color = '#f97316';
  if (alarm === 3) color = '#dc2626';

  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  // Aircraft icon
  let icon = '🔷';
  switch (a.aircraftType) {
    case AircraftType.JetAircraft:
      icon = '✈️';
      break;
    case AircraftType.Balloon:
    case AircraftType.Airship:
      icon = '🎈';
      break;
    case AircraftType.Glider:
    case AircraftType.DropPlane:
    case AircraftType.TowPlane:
    case AircraftType.PropellerAircraft:
      icon = '🛩️';
      break;
    case AircraftType.Rotorcraft:
      icon = '🚁';
      break;
    case AircraftType.Skydiver:
    case AircraftType.Paraglider:
    case AircraftType.HangGlider:
      icon = '🪂';
      break;
    case AircraftType.Reserved0:
    case AircraftType.Reserved14:
    case AircraftType.UAV:
      icon = '🛸';
      break;
    case AircraftType.Unknown:
      icon = '🐝';
      break;
    case AircraftType.StaticObstacle:
      icon = '🗼';
      break;
  }
  ctx.font = '14px sans-serif';
  ctx.fillText(icon, x - 7, y + 5);

  // Track arrow
  if (a.track != null) {
    const angle = (a.track * Math.PI) / 180;
    const len = 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(angle) * len, y - Math.cos(angle) * len);
    ctx.stroke();
  }

  // Callsign label
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(a.id ?? '', x + 10, y - 5);
}

watch(
  flarmAircrafts,
  (list) => {
    drawRadar(list);
  },
  { deep: true },
);

onMounted(() => {
  virtualScrollerHeight.value = `${window.innerHeight - 80}px`;
  window.addEventListener('resize', onResize);
  drawRadar(flarmAircrafts.value);
});

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
