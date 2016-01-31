"use strict";
/*
  License: MIT
  Author: Gosselin Jean-Baptiste
  email: gosselinjb@gmail.com
*/
import pcsclite from "pcsclite";

export const KEY_TYPE_A   = 0x60;
export const KEY_TYPE_B   = 0x61;
export const DEFAULT_KEY  = Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
export const DEFAULT_KEYS = [
  Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
  Buffer([0xa0, 0xb0, 0xc0, 0xd0, 0xe0, 0xf0]),
  Buffer([0xa1, 0xb1, 0xc1, 0xd1, 0xe1, 0xf1]),
  Buffer([0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5]),
  Buffer([0xb0, 0xb1, 0xb2, 0xb3, 0xb4, 0xb5]),
  Buffer([0x4d, 0x3a, 0x99, 0xc3, 0x51, 0xdd]),
  Buffer([0x1a, 0x98, 0x2c, 0x7e, 0x45, 0x9a]),
  Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  Buffer([0xd3, 0xf7, 0xd3, 0xf7, 0xd3, 0xf7]),
  Buffer([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]),
];
export const DEFAULT_C1       = 0x0;
export const DEFAULT_C2       = 0x0;
export const DEFAULT_C3       = 0x8;
export const DEFAULT_END_ACS  = 0x69;

const byteFromTwoHex = (high, low) => ((high & 0xF) << 4) + (low & 0xF);

const standardCallback = (cb) => (err, data) => {
  if (err) return cb(err);
  switch (data.toString("hex")) {
    case "9000":
      cb(null);
      break;
    case "6300":
      cb("failed");
      break;
    default:
      cb("undefined");
      throw new Error("Undefined data: " + data.toString("hex"));
  }
};

const readCallback = (cb) => (err, data) => {
  if (err) return cb(err);
  switch (data.slice(data.length - 2).toString("hex")) {
    case "9000":
      cb(null, data.slice(0, data.length - 2));
      break;
    case "6300":
      cb("failed");
      break;
    default:
      cb("undefined");
      throw new Error("Undefined data: " + data.toString("hex"));
  }
};

export class Card {
  constructor (reader, protocol) {
    this.reader = reader;
    this.protocol = protocol;
  }

  static packACS (c1, c2, c3) {
    if (c1 < 0 || c1 > 0xF) throw new Error("C1 is out of range");
    if (c2 < 0 || c2 > 0xF) throw new Error("C2 is out of range");
    if (c3 < 0 || c3 > 0xF) throw new Error("C3 is out of range");
    return new Buffer([
      byteFromTwoHex(~c2, ~c1),
      byteFromTwoHex(c1, ~c3),
      byteFromTwoHex(c3, c2),
      DEFAULT_END_ACS,
    ]);
  }

  static unpackACS (data) {
    if (data.length !== 4) throw new Error("Buffer length is wrong");
    return {
      c1: (data[1] & 0xF0) >> 4,
      c2: data[2] & 0xF,
      c3: (data[2] & 0xF0) >> 4,
    };
  }

  static packTrailer (keya, keyb, c1, c2, c3) {
    if (keya.length !== 6) throw new Error("KEY A length is wrong");
    if (keyb.length !== 6) throw new Error("KEY B length is wrong");
    return Buffer.concat([
      Buffer(keya),
      Card.packACS(c1, c2, c3),
      Buffer(keyb),
    ]);
  }

  static unpackTrailer (data) {
    if (data.length !== 16) throw new Error("Buffer length is wrong");
    return {
      keya: data.slice(0, 6),
      acs: Card.unpackACS(data.slice(6, 10)),
      keyb: data.slice(10, 16),
    };
  }

  getUID (cb) {
    this.reader.transmit(Buffer([0xFF, 0xCA, 0, 0, 0]), 6, this.protocol, readCallback(cb));
  }

  loadAuthKey (nb, key, cb) {
    if (nb < 0 || nb > 0x20) throw new Error("Key Number is out of range");
    if (key.length !== 6) throw new Error("Key length should be 6");
    var buff = Buffer.concat([
      Buffer([0xFF, 0x82, (nb === 0x20) ? 0x20 : 0, nb, 6]),
      Buffer(key),
    ]);
    this.reader.transmit(buff, 2, this.protocol, standardCallback(cb));
  }

  authenticate (block, type, key, cb) {
    if (type !== KEY_TYPE_A && type !== KEY_TYPE_B) throw new Error("Wrong key type");
    if (block < 0 || block > 0x3F) throw new Error("Block out of range");
    if (key < 0 || key > 0x20) throw new Error("Key Number out of range");
    this.reader.transmit(Buffer([0xFF, 0x86, 0, 0, 5, 1, 0, block, type, key]), 2, this.protocol, standardCallback(cb));
  }

  readBlock (block, length, cb) {
    if (block < 0 || block > 0x3F) throw new Error("Block out of range");
    if (length !== 0x10 && length !== 0x20 && length !== 0x30) throw new Error("Bad length");
    this.reader.transmit(Buffer([0xFF, 0xB0, 0, block, length]), length + 2, this.protocol, readCallback(cb));
  }

  updateBlock (block, data, cb) {
    if (block < 0 || block > 0x3F) throw new Error("Block out of range");
    if (data.length !== 0x10 && data.length !== 0x20 && data.length !== 0x30) throw new Error("Bad length");
    var buff = Buffer.concat([
      Buffer([0xFF, 0xD6, 0, block, data.length]),
      Buffer(data),
    ]);
    this.reader.transmit(buff, 2, this.protocol, standardCallback(cb));
  }

  restoreBlock (src, dest, cb) {
    if (src < 0 || src > 0x3F) throw new Error("Source block out of range");
    if (dest < 0 || dest > 0x3F) throw new Error("Destination block out of range");
    if (((src / 4) | 0) !== ((dest / 4) | 0)) throw new Error("Blocks are not in the same sector");
    this.reader.transmit(Buffer([0xFF, 0xD7, 0, src, 2, 3, dest]), 2, this.protocol, standardCallback(cb));
  }
}

var PCSC;

const getPCSC = () => PCSC = PCSC || pcsclite();

export const onCard = (cb, debug = false) => {
  const pcsc = getPCSC();
  const log = (debug) ? console.log : (() => {});

  pcsc.on("reader", (reader) => {
    log(`New Reader(${ reader.name })`);

    reader.on("status", (status) => {
      const changes = reader.state ^ status.state;

      if (changes) {
        if ((changes & reader.SCARD_STATE_EMPTY) && (status.state & reader.SCARD_STATE_EMPTY)) {
          log(`Reader(${ reader.name }) card removed`);
          reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
            if (err) {
              log(`Reader(${ reader.name }) error on disconnect ${ err }`);
            } else {
              log(`Reader(${ reader.name }) card disconnected`);
            }
          });
        } else if ((changes & reader.SCARD_STATE_PRESENT) && (status.state & reader.SCARD_STATE_PRESENT)) {
          log(`Reader(${ reader.name }) card inserted`);
          setTimeout(() => {
            reader.connect((err, protocol) => {
              if (err) {
                log(`Reader(${ reader.name }) error on connect ${ err }`);
              } else {
                cb(new Card(reader, protocol));
              }
            });
          }, 20);
        }
      }
    });

    reader.on('end', () => log(`Remove Reader(${ reader.name })`));

    reader.on('error', (err) => log(`Error Reader(${ reader.name }): ${ err.message }`));
  });

  pcsc.on("error", (err) => log(`PCSC error: ${ err.message }`));
}
