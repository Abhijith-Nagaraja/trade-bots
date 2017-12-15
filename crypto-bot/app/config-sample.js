/**
 * @author Abhijith Nagaraja
 *
 */

module.exports = {
  EMA_TP: 30, //EMA Time Period in seconds
  EMA_LOW_THRESHOLD: 12, //Number of time periods for EMA lower Threshold
  EMA_HIGH_THRESHOLD: 26, //Number of time periods for EMA higher Threshold

  SANDBOX: false, //To use sandbox environment or not
  SANDBOX_GDAX: {
    PASSPHRASE: "" //Your PASSPHRASE,
    API_KEY: "", //Your API key
    SECRET: "", //Your API key secret
    URL: "https://api-public.sandbox.gdax.com"
  },
  GDAX: {
    PASSPHRASE: "" //Your PASSPHRASE,
    API_KEY: "", //Your API key
    SECRET: "", //Your API key secret
    URL: "https://api.gdax.com"
  },

  TRADE_PAIR: "LTC-USD", //Trade pair you wish to use.  values = ["BTC-USD", "ETH-USD", "LTC-USD"]. Only LTC-USD pair is tested

  STRATEGY: "EMA", //Trading strategy you wish to use. values = ["EMA"]

  EXCHANGE: "gdax", //Exchange you wish to use. values = ["gdax"]

  TRADE: {
    BALANCE: 400, //Amount you wish to start with
    COINS: 0, //Number of coins you wish to start with
    INC_BUY_PERCENT: 100 //How much percent you wish to buy at a time per buy. Currently increment buys is not supported. Use 100
  }
}
