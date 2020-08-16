const Card = require('./card');
const Context = require('./context');

const {
  KEY_TYPE_A,
  KEY_TYPE_B,
  DEFAULT_KEY,
  DEFAULT_KEYS,
  DEFAULT_C1,
  DEFAULT_C2,
  DEFAULT_C3,
  DEFAULT_END_ACS,
} = require('./common');

let globContext = null;

const getContext = () => {
  if (globContext === null) {
    globContext = new Context();
  }
  return globContext;
};

module.exports = Object.assign(getContext, {
  Card,
  KEY_TYPE_A,
  KEY_TYPE_B,
  DEFAULT_KEY,
  DEFAULT_KEYS,
  DEFAULT_C1,
  DEFAULT_C2,
  DEFAULT_C3,
  DEFAULT_END_ACS,
});
