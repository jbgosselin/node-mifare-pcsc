/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
const mifare = require('../src');

(async () => {
  const ctx = mifare();

  while (true) {
    console.log('before got card');
    const card = await ctx.waitForCard();
    console.log('got card');
    try {
      const uid = await card.getUID();
      console.log('getUID', uid);
    } catch (err) {
      console.log('Error on getUID', err);
    }
    await card.disconnect();
    console.log('after disconnected');
  }
})();
