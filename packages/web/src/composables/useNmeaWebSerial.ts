import { ref, onUnmounted } from 'vue';
import { FlarmNmeaClient, type FlarmData } from '../../../nmea-web-serial/packages/nmea-web-serial/src/adapters/flarm';

export enum DeviceStatus {
    DeviceDisconnected = 1,
    DeviceConnecting = 2,
    DeviceReconnecting = 3,
    DeviceConnected = 4,
    DeviceError = 5
}

export const useNmeaWebSerial = (baudRate?: number) => {
    const status = ref<DeviceStatus>(DeviceStatus.DeviceDisconnected);
    const error = ref<string | null>();
    const client = new FlarmNmeaClient({
        onData: (data: FlarmData) => {
            updateFlarmData(data)
        },
        onStateChange: (isConnected: boolean) => {
            updateConnectionState(isConnected)
        },
        onError: (error: string) => {
            updateError(error)
        },
        baudRate: baudRate ?? 115200,
    });

    const updateConnectionState = (isConnected: boolean) => {
        if (!client) {
            return;
        }
        const isConnecting = client.isConnecting;
        status.value = isConnecting ? DeviceStatus.DeviceConnecting : (isConnected ? DeviceStatus.DeviceConnected : DeviceStatus.DeviceDisconnected);
    }

    const updateError = (err: string | null) => {
        if (err) {
            error.value = `Error: ${err}`;
        } else {
            error.value = null;
        }
    }

    const updateFlarmData = (data: FlarmData) => {
        console.log(data);
    }

    const connect = () => {
        client.setLogging(true);
        client.connect();
    }

    const disconnect = () => {
        client.disconnect();
        updateConnectionState(client.isConnected);
    }

    onUnmounted(() => {
        if (client.isConnected) {
            client.disconnect();
        }
        client.dispose();
    });

    return {
        status,
        connect,
        disconnect,
    };
}