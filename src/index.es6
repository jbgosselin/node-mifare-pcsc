"use strict";

const pcsclite = require("pcsclite");
const Card = require('./Card');

let PCSC = null;

const getPCSC = () => PCSC = PCSC || pcsclite();

const onCard = (cb, debug = false) => {
  const pcsc = getPCSC();
  const log = (debug) ? console.log : () => {};

  pcsc.on("reader", (reader) => {
    log(`New Reader(${ reader.name })`);

    reader.on("status", (status) => {
      const changes = reader.state ^ status.state;

      if (changes) {
        if (changes & status.state & reader.SCARD_STATE_EMPTY) {
          log(`Reader(${ reader.name }) card removed`);
          reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
            if (err) {
              log(`Reader(${ reader.name }) error on disconnect ${ err }`);
            } else {
              log(`Reader(${ reader.name }) card disconnected`);
            }
          });
        } else if (changes & status.state & reader.SCARD_STATE_PRESENT) {
          log(`Reader(${ reader.name }) card inserted`);
          setTimeout(() => {
            reader.connect({ share_mode: reader.SCARD_SHARE_SHARED }, (err, protocol) => {
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
};

const {
  KEY_TYPE_A,
  KEY_TYPE_B,
  DEFAULT_KEY,
  DEFAULT_KEYS,
  DEFAULT_C1,
  DEFAULT_C2,
  DEFAULT_C3,
  DEFAULT_END_ACS,
} = require("./common");

module.exports = {
  onCard,
  Card,
  KEY_TYPE_A,
  KEY_TYPE_B,
  DEFAULT_KEY,
  DEFAULT_KEYS,
  DEFAULT_C1,
  DEFAULT_C2,
  DEFAULT_C3,
  DEFAULT_END_ACS,
};
