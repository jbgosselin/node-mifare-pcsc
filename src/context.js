const { once, EventEmitter } = require('events');
const pcsclite = require('pcsclite');
const { log } = require('./common');
const Reader = require('./reader');

class Context extends EventEmitter {
  constructor() {
    super();
    this.pcsc = pcsclite();

    this.pcsc.on('error', (err) => {
      log(`PCSC Error: ${err}`);
      this.emit('error', err);
    });

    const onCard = (card) => {
      this.emit('card', card);
    };

    this.pcsc.on('reader', (rawReader) => {
      const reader = new Reader(rawReader);
      this.emit('reader', reader);
      reader.on('card', onCard);
      reader.once('end', () => {
        reader.removeListener('card', onCard);
      });
    });
  }

  async waitForCard() {
    const [card] = await once(this, 'card');
    return card;
  }
}

module.exports = Context;
