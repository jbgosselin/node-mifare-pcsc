const EventEmitter = require('events');

const { log } = require('./common');
const Card = require('./card');

class Reader extends EventEmitter {
  constructor(reader) {
    super();
    this.reader = reader;

    const onStatus = async (status) => {
      const changes = this.reader.state ^ status.state;
      if (!changes) return;

      const isState = (state) => (changes & state) && (status.state & state);

      if (isState(this.reader.SCARD_STATE_EMPTY)) {
        this.log('card removed');
        try {
          await this.disconnect(this.reader.SCARD_LEAVE_CARD);
          this.log('card disconnected');
        } catch (err) {
          this.log(`error on disconnect ${err}`);
        }
        return;
      }

      if (isState(this.reader.SCARD_STATE_PRESENT)) {
        this.log('card inserted');
        try {
          const protocol = await this.connect({ share_mode: this.reader.SCARD_SHARE_SHARED });
          this.log('card connected');
          setImmediate(() => this.emit('card', new Card(this, protocol)));
        } catch (err) {
          this.log(`error on connect ${err}`);
        }
      }
    };

    this.reader.on('status', onStatus);
    this.reader.once('end', () => {
      this.reader.removeListener('status', onStatus);
      this.emit('end');
    });
  }

  log(...args) {
    log(`Reader(${this.reader.name})`, ...args);
  }

  transmit(input, resLen, protocol) {
    return new Promise((resolve, reject) => {
      this.reader.transmit(input, resLen, protocol, (err, data) => {
        setImmediate(() => {
          this.log('this.reader.transmit');
          if (err) return reject(err);
          return resolve(data);
        });
      });
    });
  }

  disconnect(disposition) {
    return new Promise((resolve, reject) => {
      this.reader.disconnect(disposition, (err) => {
        setImmediate(() => {
          if (err) return reject(err);
          return resolve();
        });
      });
    });
  }

  connect(options) {
    return new Promise((resolve, reject) => {
      this.reader.connect(options, (err, protocol) => {
        setImmediate(() => {
          if (err) return reject(err);
          return resolve(protocol);
        });
      });
    });
  }
}

module.exports = Reader;
