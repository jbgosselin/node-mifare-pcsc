var mifare = require("../lib");

mifare.onCard(function(card) {
  card.getUID(function(err, uid) {
    if (err) {
      console.log("Error on getUID: %s", err);
    } else {
      console.log("getUID:", uid);
    }
  });
}, true);
