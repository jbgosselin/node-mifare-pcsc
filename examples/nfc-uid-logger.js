var mifare = require("../index");

mifare.onCard(function(card) {
    card.getUID(function(err, uid) {
	if (err)
	    console.log("Error on getUID: %s", err);
	else
	    console.log("getUID:", uid);
    });
}, true);
