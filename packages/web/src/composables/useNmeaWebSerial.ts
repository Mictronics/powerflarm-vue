import { ref, onUnmounted, watch } from 'vue';
import { FlarmNmeaClient, type FlarmData } from '@flarm/adapters/flarm';
import { encodeExtendedNmeaPacket } from '@flarm/parser';

export enum DeviceStatus {
  DeviceDisconnected = 1,
  DeviceConnecting = 2,
  DeviceReconnecting = 3,
  DeviceConnected = 4,
  DeviceError = 5,
}

export const useNmeaWebSerial = (baudRate?: number) => {
  const status = ref<DeviceStatus>(DeviceStatus.DeviceDisconnected);
  const error = ref<string | null>();
  let client: FlarmNmeaClient | null = null;

  const updateConnectionState = (isConnected: boolean) => {
    if (!client) {
      return;
    }
    const isConnecting = client.isConnecting;
    status.value = isConnecting
      ? DeviceStatus.DeviceConnecting
      : isConnected
        ? DeviceStatus.DeviceConnected
        : DeviceStatus.DeviceDisconnected;
  };

  const updateError = (err: string | null) => {
    if (err) {
      error.value = `Error: ${err}`;
    } else {
      error.value = null;
    }
  };

  const updateFlarmData = (data: FlarmData) => {
    console.log(data);
  };

  client = new FlarmNmeaClient({
    onData: (data: FlarmData) => {
      updateFlarmData(data);
    },
    onStateChange: (isConnected: boolean) => {
      updateConnectionState(isConnected);
    },
    onError: (error: string) => {
      updateError(error);
    },
    baudRate: baudRate ?? 115200,
  });

  const connect = () => {
    client.setLogging(true);
    client.connect();
  };

  const disconnect = () => {
    client.disconnect();
    updateConnectionState(client.isConnected);
  };

  onUnmounted(() => {
    if (client.isConnected) {
      client.disconnect();
    }
    client.dispose();
  });

  watch(status, (s) => {
    if (s === DeviceStatus.DeviceConnected) {
      client.machine.send({
        type: 'SERIAL.WRITE',
        sentence: encodeExtendedNmeaPacket({ queryType: 'R', configItem: 'CAP', sentenceId: 'FLAC' }, 'P'),
      });
    }
  });

  return {
    status,
    connect,
    disconnect,
  };
};
