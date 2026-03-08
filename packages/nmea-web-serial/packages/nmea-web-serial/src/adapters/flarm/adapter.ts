import type { NmeaMachineConfig } from '../../core'
import type { FlarmData, StoredPackets } from './types'
import { createNmeaMachine } from '../../core'
import { computeFlarmData } from './computation'

export const FLARM_SENTENCE_IDS = [
    'RMC',
    'GGA',
    'GSA',
    'FLAU',
    /*
        'LAA',
        'LAE',
        'LAV',
        'LAR',
        'RMZ',
        'LAS',
        'LAQ',
        'LAO',
        'ALP',
        'LAI',
        'LAC',
        'LAJ',
        'LAN',
        'LAF',
        'LAM',
        'LAL',
    */
] as const

export const createFlarmAdapter = () => {
    return (packets: StoredPackets): FlarmData => {
        return computeFlarmData(packets)
    }
}

export const initialFlarmData: FlarmData = {
    time: null,
    speed: null,
    heading: null,
    position: null,
    alarm: null,
    status: null,
    dilution: null,
}

export const initialFlarmPackets: StoredPackets = {};

export const createFlarmNmeaConfig = (): NmeaMachineConfig<FlarmData, StoredPackets> => {
    return {
        adapter: createFlarmAdapter(),
        allowedSentenceIds: FLARM_SENTENCE_IDS,
        initialData: initialFlarmData,
        initialPackets: initialFlarmPackets,
    }
}

export const createFlarmNmeaMachine = () => {
    return createNmeaMachine(createFlarmNmeaConfig())
}