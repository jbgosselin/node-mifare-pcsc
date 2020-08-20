# node-mifare-pcsc

Simple pcsclite wrapper for mifare 1K card.

Works with promises and provides an easy to use wrapper to communicate with Mifate 1K tags.

## Installation

Under the hood it is using [node-pcsclite](https://github.com/santigimeno/node-pcsclite), you can follow installation instructions from there.

## Example

```javascript
const mifare = require('mifare-pcsc');

(async () => {
  const ctx = mifare();

  while (true) {
      console.log('Waiting for a card...');
    const card = await ctx.waitForCard();
    try {
      const uid = await card.getUID();
      console.log('UID', uid);
    } catch (err) {
      console.log('Error on getUID', err);
    }
    await card.disconnect();
  }
})();
```

## API

### Class: `Context`
This context manage the underlying pcsclite library and provide a card polling mechanism.

#### Event: `'error'`
- *err* `Error`. The error.

#### Event: `'card'`
- *card* `Card`. The connected card.

#### `context.waitForCard()`
Returns a Promise that resolve into a `Card` when it connects.

### Class: `Card`
This class represents a connected card and methods to interact with it.

#### `card.getUID()`
Returns a Promise that resolve into a `Buffer` that contains the UID.

#### `card.loadAuthKey(nb, key)`
- *nb* `Number`. Key number.
- *key* `Buffer`. 6 bytes Key.

Load authentication key into the reader of the card. Returns a Promise.

#### `card.authenticate(block, type, key)`
- *block* `Number`. Block to authenticate.
- *type* `Number`. Key type, provided by `mifare.KEY_TYPE_A` and `mifare.KEY_TYPE_B`.
- *key* `Number`. Key number set when using `card.loadAuthKey`.

Authenticate on block with a key. Returns a Promise.

#### `card.readBlock(block, length)`
- *block* `Number`. Block to read.
- *length* `Number`. Length in bytes to read.

Read a block. Returns a Promise that resolve to a `Buffer` containing the data.

#### `card.updateBlock(block, data)`
- *block* `Number`. Block to update.
- *data* `Buffer`. Value that should be updated in the block.

Update data in a block. Returns a Promise.

#### `card.restoreBlock(src, dest)`
- *src* `Number`. Block to read data from.
- *dest* `Number`. Block to restore from *src*.

Restore destination block with source block. Returns a Promise.

#### `card.disconnect()`

Early disconnect of card when finished to use. Optional. Returns a Promise.

#### `card.transmit(input, resLen = 0)`
- *input* `Buffer`. Command with data to send to the card.
- *resLen* `Number`. Size of expected response from the card.

Low-level method for sending arbitrary command to the card.
Returns a Promise that resolve into a `Buffer`.

#### `Card.unpackTrailer(block)`
- *block* `Buffer`. Raw trailer block to unpack.

Returns a parser trailer block like so 
