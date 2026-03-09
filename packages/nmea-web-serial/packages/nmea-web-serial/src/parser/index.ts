/**
 * NMEA sentence parser with support for custom codecs.
 */

import type { Packet } from 'nmea-simple';
import type { PacketStub } from 'nmea-simple/dist/codecs/PacketStub';
import type { UnknownPacket } from 'nmea-simple/dist/codecs/UnknownPacket';
import { DefaultPacketFactory, parseGenericPacket } from 'nmea-simple';
import { decodeSentence as decodeUnknown } from 'nmea-simple/dist/codecs/UnknownPacket';
import { decodeSentence as decodeDBK, type DBKPacket } from './codecs/DBK';
import { decodeSentence as decodeDBS, type DBSPacket } from './codecs/DBS';
import { decodeSentence as decodeDPT, type DPTPacket } from './codecs/DPT';
import { decodeSentence as decodeFLAU, type FLAUPacket } from './codecs/FLAU';
import { decodeSentence as decodeGRMZ, type GRMZPacket } from './codecs/GRMZ';
import {
  decodeSentence as decodeFLAC,
  encodePacket as encodeFLAC,
  type FLACPacket,
  type FLACRequestPacket,
} from './codecs/FLAC';

type CustomPackets = DBSPacket | DBKPacket | DPTPacket | FLAUPacket | GRMZPacket | FLACPacket | FLACRequestPacket;
export type ExtendedNmeaPacket = Packet | CustomPackets;

type Encoder = (packet: ExtendedNmeaPacket, talker: string) => string;

const encoders: { [sentenceId: string]: Encoder } = {
  FLAC: encodeFLAC as Encoder,
};

function assembleExtendedNmeaPacket(stub: PacketStub, fields: string[]): CustomPackets | null {
  switch (stub.talkerId) {
    case 'DBS':
      return decodeDBS(stub, fields);
    case 'DBK':
      return decodeDBK(stub, fields);
    case 'DPT':
      return decodeDPT(stub, fields);
    case 'P':
      switch (stub.sentenceId) {
        case 'FLAU':
          return decodeFLAU(stub, fields);
        case 'GRMZ':
          return decodeGRMZ(stub, fields);
        case 'FLAC':
          return decodeFLAC(stub, fields);
        default:
          return null;
      }
    default:
      return null;
  }
}

class CustomPacketFactory extends DefaultPacketFactory<CustomPackets> {
  assembleCustomPacket(stub: PacketStub, fields: string[]): CustomPackets | null {
    return assembleExtendedNmeaPacket(stub, fields);
  }
}

const SAFE_NMEA_PACKET_FACTORY = new CustomPacketFactory();

export function parseNmeaSentence(sentence: string): ExtendedNmeaPacket {
  return parseGenericPacket(sentence, SAFE_NMEA_PACKET_FACTORY);
}

export type UnsafeAndCustomPackets = CustomPackets | UnknownPacket;

export class UnsafePacketFactory extends DefaultPacketFactory<UnsafeAndCustomPackets> {
  constructor() {
    super(true);
  }

  assembleCustomPacket(stub: PacketStub, fields: string[]): UnsafeAndCustomPackets | null {
    const assembledPacket = assembleExtendedNmeaPacket(stub, fields);
    if (!assembledPacket) {
      return decodeUnknown(stub, fields);
    }
    return assembledPacket;
  }
}

const UNSAFE_NMEA_PACKET_FACTORY = new UnsafePacketFactory();

export function parseUnsafeNmeaSentence(sentence: string): ExtendedNmeaPacket | UnknownPacket {
  return parseGenericPacket(sentence, UNSAFE_NMEA_PACKET_FACTORY);
}

export function encodeExtendedNmeaPacket(packet: ExtendedNmeaPacket, talker: string = 'P'): string {
  if (packet === undefined) {
    throw new Error('Packet must be given.');
  }

  const encoder = encoders[packet.sentenceId];
  if (encoder) {
    return encoder(packet, talker);
  } else {
    throw Error(`No known encoder for sentence ID "${packet.sentenceId}"`);
  }
}