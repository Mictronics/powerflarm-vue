import type { GGAPacket, RMCPacket, GSAPacket } from 'nmea-simple';
import type { FlarmData, StoredPackets } from './types';
import type { FLAUPacket } from '../../parser/codecs';

const computePosition = (gga?: GGAPacket, rmc?: RMCPacket): FlarmData['position'] => {
    if (gga && gga.fixType !== 'none') {
        return {
            latitude: gga.latitude,
            longitude: gga.longitude,
            source: 'GGA',
            fixType: gga.fixType,
            altitudeMeters: gga.altitudeMeters,
            satellitesInView: gga.satellitesInView,
            horizontalDilution: gga.horizontalDilution,
        };
    }

    if (rmc && rmc.status === 'valid') {
        return {
            latitude: rmc.latitude,
            longitude: rmc.longitude,
            source: 'RMC',
            status: rmc.status,
        };
    }
    return null;
};

const computeTime = (gga?: GGAPacket, rmc?: RMCPacket): FlarmData['time'] => {
    if (gga && gga.fixType !== 'none') {
        return {
            utc: gga.time,
            local: null,
            source: 'GGA',
        };
    }

    if (rmc && rmc.status === 'valid') {
        return {
            utc: rmc.datetime,
            local: null,
            source: 'RMC',
        };
    }
    return null;
};

const computeSpeed = (rmc?: RMCPacket): FlarmData['speed'] => {
    if (rmc && rmc.status === 'valid') {
        return { knots: rmc.speedKnots, source: 'RMC' };
    }
    return null;
};

const computeHeading = (rmc?: RMCPacket): FlarmData['heading'] => {
    // Fallback to COG (Course Over Ground) from RMC
    const cog = rmc?.trackTrue ?? 0;
    if (cog !== undefined) {
        return { degreesTrue: cog, source: 'COG', isDerived: true };
    }
    return null;
};

const computeDilution = (gsa?: GSAPacket): FlarmData['dilution'] => {
    if (gsa) {
        return {
            selectionMode: gsa.selectionMode,
            fixMode: gsa.fixMode,
            satellites: gsa.satellites,
            pdop: gsa.PDOP,
            hdop: gsa.HDOP,
            vdop: gsa.VDOP,
            source: 'GSA',
        };
    }
    return null;
};

const computeStatus = (status?: FLAUPacket): FlarmData['status'] => {
    if (status) {
        return {
            txDevices: status.txDevices,
            rxDevices: status.rxDevices,
            gps: status.gpsStatus,
            power: status.powerStatus,
            source: 'FLAU',
        };
    }
    return null;
};

const computeAlarm = (alarm?: FLAUPacket): FlarmData['alarm'] => {
    if (alarm) {
        return {
            level: alarm.alarmLevel,
            type: alarm.alarmType,
            relativeBearing: alarm.relativeBearing,
            relativeDistance: alarm.relativeDistance,
            relativeVertical: alarm.relativeVertical,
            source: 'FLAU',
        };
    }
    return null;
};

export function computeFlarmData(packets: StoredPackets): FlarmData {
    const time = computeTime(packets.GGA, packets.RMC);
    const position = computePosition(packets.GGA, packets.RMC);
    const speed = computeSpeed(packets.RMC);
    const heading = computeHeading(packets.RMC);
    const dilution = computeDilution(packets.GSA);
    const status = computeStatus(packets.FLAU);
    const alarm = computeAlarm(packets.FLAU);

    return { time, position, speed, heading, status, alarm, dilution };
}
