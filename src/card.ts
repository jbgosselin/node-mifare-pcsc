import {
  byteFromTwoHex,
  KEY_TYPE_A,
  KEY_TYPE_B,
} from './common';
import Reader from './reader';

export default class Card {
  reader: Reader;
  protocol: number;

  constructor(reader: Reader, protocol: number) {
    this.reader = reader;
    this.protocol = protocol;
  }

  static packACS({ c1, c2, c3, user }) {
    if (c1 < 0 || c1 > 0xF) throw new Error('C1 is out of range');
    if (c2 < 0 || c2 > 0xF) throw new Error('C2 is out of range');
    if (c3 < 0 || c3 > 0xF) throw new Error('C3 is out of range');
    return Buffer.from([
      byteFromTwoHex(~c2, ~c1),
      byteFromTwoHex(c1, ~c3),
      byteFromTwoHex(c3, c2),
      user,
    ]);
  }

  static unpackACS(buff: Buffer) {
    if (buff.length !== 4) throw new Error('Buffer length is wrong');
    return {
      c1: (buff[1] & 0xF0) >> 4,
      c2: buff[2] & 0xF,
      c3: (buff[2] & 0xF0) >> 4,
      user: buff[3],
    };
  }

  static packTrailer({ keya, keyb, acs }) {
    if (keya.length !== 6) throw new Error('KEY A length is wrong');
    if (keyb.length !== 6) throw new Error('KEY B length is wrong');
    return Buffer.concat([
      Buffer.from(keya),
      Card.packACS(acs),
      Buffer.from(keyb),
    ]);
  }

  static unpackTrailer(block: Buffer) {
    if (block.length !== 16) throw new Error('Buffer length is wrong');
    return {
      keya: block.slice(0, 6),
      acs: Card.unpackACS(block.slice(6, 10)),
      keyb: block.slice(10, 16),
    };
  }

  async transmit(input: Buffer, resLen: number = 0) {
    const data = await this.reader.transmit(input, resLen + 2, this.protocol);
    if (data.length < 2) throw new Error(`Undefined data: 0x${data.toString('hex')}`);
    switch (data.readUInt16BE(data.length - 2)) {
      case 0x9000:
        return data.slice(0, data.length - 2);
      case 0x6300:
        throw new Error('Failed');
      default:
        throw new Error(`Undefined data: 0x${data.toString('hex')}`);
    }
  }

  getUID() {
    return this.transmit(Buffer.from([0xFF, 0xCA, 0, 0, 0]), 0x8);
  }

  loadAuthKey(nb: number, key: Buffer) {
    if (nb < 0 || nb > 0x20) throw new Error('Key Number is out of range');
    if (key.length !== 6) throw new Error('Key length should be 6');
    return this.transmit(Buffer.concat([
      Buffer.from([0xFF, 0x82, (nb === 0x20) ? 0x20 : 0, nb, 6]),
      Buffer.from(key),
    ]));
  }

  authenticate(block: number, type: number, key: number) {
    if (type !== KEY_TYPE_A && type !== KEY_TYPE_B) throw new Error('Wrong key type');
    if (block < 0 || block > 0x3F) throw new Error('Block out of range');
    if (key < 0 || key > 0x20) throw new Error('Key Number out of range');
    return this.transmit(Buffer.from([0xFF, 0x86, 0, 0, 5, 1, 0, block, type, key]));
  }

  readBlock(block: number, length: number) {
    if (block < 0 || block > 0x3F) throw new Error('Block out of range');
    if (length !== 0x10 && length !== 0x20 && length !== 0x30) throw new Error('Bad length');
    return this.transmit(Buffer.from([0xFF, 0xB0, 0, block, length]), length);
  }

  updateBlock(block: number, data: Buffer) {
    if (block < 0 || block > 0x3F) throw new Error('Block out of range');
    if (data.length !== 0x10 && data.length !== 0x20 && data.length !== 0x30) {
      throw new Error('Bad length');
    }
    return this.transmit(Buffer.concat([
      Buffer.from([0xFF, 0xD6, 0, block, data.length]),
      Buffer.from(data),
    ]));
  }

  restoreBlock(src: number, dest: number) {
    if (src < 0 || src > 0x3F) throw new Error('Source block out of range');
    if (dest < 0 || dest > 0x3F) throw new Error('Destination block out of range');
    if (((src / 4) | 0) !== ((dest / 4) | 0)) throw new Error('Blocks are not in the same sector');
    return this.transmit(Buffer.from([0xFF, 0xD7, 0, src, 2, 3, dest]));
  }

  disconnect() {
    return this.reader.disconnect(this.reader.reader.SCARD_LEAVE_CARD);
  }
}
