node-mifare-pcsc
================

Simple pcsclite wrapper for mifare 1K card.

Works with promises and provides an easy to use wrapper to communicate with Mifate 1K tags.

Installation
------------

Under the hood it is using [node-pcsclite](https://github.com/santigimeno/node-pcsclite), you can follow installation instructions from there.

Example
-------

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
