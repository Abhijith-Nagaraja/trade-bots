/**
 * @author Abhijith Nagaraja
 */

const PAIRS = ["BTC-USD","ETH-USD","LTC-USD"];

const TRADE_ITEMS = {
  "BTC-USD" : {
    DECIMAL1: 8,
    DECIMAL2: 2,
  },
  "ETH-USD" : {
    DECIMAL1: 8,
    DECIMAL2: 2,
  },
  "LTC-USD" : {
    DECIMAL1: 8,
    DECIMAL2: 2,
  }
}

module.exports = {
  TRADE_PAIRS:PAIRS,
  TRADE_ITEMS: TRADE_ITEMS
}
