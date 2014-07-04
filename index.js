/*
  License: MIT
  Author: Gosselin Jean-Baptiste
  email: gosselinjb@gmail.com
*/
var pcsclite = require("pcsclite");

var KEY_TYPE_A = 0x60;
var KEY_TYPE_B = 0x61;
var DEFAULT_KEY = Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
var DEFAULT_KEYS = [
    Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    Buffer([0xa0, 0xb0, 0xc0, 0xd0, 0xe0, 0xf0]),
    Buffer([0xa1, 0xb1, 0xc1, 0xd1, 0xe1, 0xf1]),
    Buffer([0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5]),
    Buffer([0xb0, 0xb1, 0xb2, 0xb3, 0xb4, 0xb5]),
    Buffer([0x4d, 0x3a, 0x99, 0xc3, 0x51, 0xdd]),
    Buffer([0x1a, 0x98, 0x2c, 0x7e, 0x45, 0x9a]),
    Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    Buffer([0xd3, 0xf7, 0xd3, 0xf7, 0xd3, 0xf7]),
    Buffer([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff])
];
var DEFAULT_C1 = 0x0;
var DEFAULT_C2 = 0x0;
var DEFAULT_C3 = 0x8;
var DEFAULT_END_ACS = 0x69;

function byteFromTwoHex(high, low) {
    return ((high & 0xF) << 4) + (low & 0xF);
}

function standardCallback(cb) {
    return function(err, data) {
	if (err) {
	    cb(err);
	} else {
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
		break;
	    }
	}
    };
}

function readCallback(cb) {
    return function(err, data) {
	if (err) {
	    cb(err);
	} else {
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
		break;
	    }
	}
    };    
}

function Card(reader, protocol) {
    this.reader = reader;
    this.protocol = protocol;
}

Card.packACS = function(c1, c2, c3) {
    if (c1 < 0 || c1 > 0xF)
	throw new Error("C1 is out of range");
    if (c2 < 0 || c2 > 0xF)
	throw new Error("C2 is out of range");
    if (c3 < 0 || c3 > 0xF)
	throw new Error("C3 is out of range");
    return new Buffer([
	byteFromTwoHex(~c2, ~c1),
	byteFromTwoHex(c1, ~c3),
	byteFromTwoHex(c3, c2),
	DEFAULT_END_ACS
    ]);
};

Card.unpackACS = function(data) {
    if (data.length != 4)
	throw new Error("Buffer length is wrong");
    return {
	c1: (data[1] & 0xF0) >> 4,
	c2: data[2] & 0xF,
	c3: (data[2] & 0xF0) >> 4
    };
};

Card.packTrailer = function(keya, keyb, c1, c2, c3) {
    if (keya.length != 6)
	throw new Error("KEY A length is wrong");
    if (keyb.length != 6)
	throw new Error("KEY B length is wrong");
    return Buffer.concat([Buffer(keya), Card.packACS(c1, c2, c3), Buffer(keyb)]);
};

Card.unpackTrailer = function(data) {
    if (data.length != 16)
	throw new Error("Buffer length is wrong");
    return {
	keya: data.slice(0, 6),
	acs: Card.unpackACS(data.slice(6, 10)),
	keyb: data.slice(10, 16)
    };
};

Card.prototype.getUID = function(cb) {
    this.reader.transmit(Buffer([0xFF, 0xCA, 0, 0, 0]), 6, this.protocol, readCallback(cb));
};

Card.prototype.loadAuthKey = function(nb, key, cb) {
    if (nb < 0 || nb > 0x20)
	throw new Error("Key Number is out of range");
    if (key.length != 6)
	throw new Error("Key length should be 6");
    var buff = Buffer.concat([Buffer([0xFF, 0x82, (nb == 0x20) ? 0x20 : 0, nb, 6]), Buffer(key)]);
    this.reader.transmit(buff, 2, this.protocol, standardCallback(cb));
};

Card.prototype.authenticate = function(block, type, key, cb) {
    if (type != KEY_TYPE_A && type != KEY_TYPE_B)
	throw new Error("Wrong key type");
    if (block < 0 || block > 0x3F)
	throw new Error("Block out of range");
    if (key < 0 || key > 0x20)
	throw new Error("Key Number out of range");
    this.reader.transmit(Buffer([0xFF, 0x86, 0, 0, 5, 1, 0, block, type, key]), 2, this.protocol, standardCallback(cb));
};

Card.prototype.readBlock = function(block, length, cb) {
    if (block < 0 || block > 0x3F)
	throw new Error("Block out of range");
    if (length != 0x10 && length != 0x20 && length != 0x30)
	throw new Error("Bad length");
    this.reader.transmit(Buffer([0xFF, 0xB0, 0, block, length]), length + 2, this.protocol, readCallback(cb));
};

Card.prototype.updateBlock = function(block, data, cb) {
    if (block < 0 || block > 0x3F)
	throw new Error("Block out of range");
    if (data.length != 0x10 && data.length != 0x20 && data.length != 0x30)
	throw new Error("Bad length");
    var buff = Buffer.concat([Buffer([0xFF, 0xD6, 0, block, data.length]), Buffer(data)]);
    this.reader.transmit(buff, 2, this.protocol, standardCallback(cb));
};

Card.prototype.restoreBlock = function(src, dest, cb) {
    if (src < 0 || src > 0x3F)
	throw new Error("Source block out of range");
    if (dest < 0 || dest > 0x3F)
	throw new Error("Destination block out of range");
    if (((src / 4) | 0) != ((dest / 4) | 0))
	throw new Error("Blocks are not in the same sector");
    this.reader.transmit(Buffer([0xFF, 0xD7, 0, src, 2, 3, dest]), 2, this.protocol, standardCallback(cb));
};

var PCSC = undefined;

function getPCSC() {
    PCSC = PCSC || pcsclite();
    return PCSC;
}

function onCard(cb, debug) {
    var pcsc = getPCSC();
    var debug = debug || false;

    function log() {
	if (debug)
	    console.log.apply({}, arguments);
    }

    pcsc.on("reader", function(reader) {
	log("New Reader(%s)", reader.name);

	reader.on("status", function(status) {
            var changes = this.state ^ status.state;
            if (changes) {
		if ((changes & this.SCARD_STATE_EMPTY) && (status.state & this.SCARD_STATE_EMPTY)) {
		    log("Reader(%s) card removed", reader.name);
                    reader.disconnect(function(err) {
			if (err)
                            log("Reader(%s) error on disconnect %s", reader.name, err);
			else
                            log("Reader(%s) card disconnected", reader.name);
                    });
		} else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {
                    log("Reader(%s) card inserted", reader.name);
		    setTimeout(function() {
			reader.connect(function(err, protocol) {
			    if (err)
				log("Reader(%s) error on connect %s", reader.name, err);
			    else
				cb(new Card(reader, protocol));
			});
		    }, 20);
		}
            }
	});

	reader.on('end', function() {
            log('Remove Reader(%s)', this.name);
	});

	reader.on('error', function(err) {
            log('Error Reader(%s): %s', this.name, err.message);
	});
    });

    pcsc.on("error", function(err) {
	log('PCSC error: %s', err.message);
    });
}

module.exports.Card = Card;
module.exports.onCard = onCard;
module.exports.KEY_TYPE_A = KEY_TYPE_A;
module.exports.KEY_TYPE_B = KEY_TYPE_B;
module.exports.DEFAULT_KEY = DEFAULT_KEY;
module.exports.DEFAULT_KEYS = DEFAULT_KEYS;
module.exports.DEFAULT_C1 = DEFAULT_C1;
module.exports.DEFAULT_C2 = DEFAULT_C2;
module.exports.DEFAULT_C3 = DEFAULT_C3;
