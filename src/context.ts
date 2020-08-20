import { once, EventEmitter } from 'events';
import pcsclite from 'pcsclite';
import { log } from './common';
import Reader from './reader';
import Card from './card';

class Context extends EventEmitter {
  pcsc: PCSCLite;

  constructor() {
    super();
    this.pcsc = pcsclite();

    this.pcsc.on('error', (err: Error) => {
      log(`PCSC Error: ${err}`);
      this.emit('error', err);
    });

    const onCard = (card: Card) => {
      this.emit('card', card);
    };

    this.pcsc.on('reader', (rawReader: CardReader) => {
      const reader = new Reader(rawReader);
      this.emit('reader', reader);
      reader.on('card', onCard);
      reader.once('end', () => {
        reader.removeListener('card', onCard);
      });
    });
  }

  async waitForCard(): Promise<Card> {
    const [card] = await once(this, 'card');
    return card;
  }
}

export default Context;
