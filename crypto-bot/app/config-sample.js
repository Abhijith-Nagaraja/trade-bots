/**
 * @author Abhijith Nagaraja
 *
 */

 module.exports = {
   TRADE_PAIR: "LTC-USD", //Trade pair you wish to use.  values = ["BTC-USD", "ETH-USD", "LTC-USD"]. Only LTC-USD pair is tested
   TICKER_TIME_IN_MILLISECONDS: 334, //EXCHANGE API LIMIT

   SANDBOX: false, //To use sandbox environment or not
   SANDBOXES: {
       GDAX: {
         PASSPHRASE: "" //Your PASSPHRASE,
         API_KEY: "", //Your API key
         SECRET: "", //Your API key secret
         URL: "https://api-public.sandbox.gdax.com"
      }
   },

   STRATEGY: "EMA", //Trading strategy you wish to use. values = ["EMA"]

   STRATEGIES: {
     EMA: {
       EMA_TP: 30, //EMA Time Period in seconds
       EMA_LOW_THRESHOLD: 12, //Number of time periods for EMA lower Threshold
       EMA_HIGH_THRESHOLD: 26, //Number of time periods for EMA higher Threshold
     }
   },

   EXCHANGE: "gdax",

   EXCHANGES:{
     GDAX: {
       PASSPHRASE: "" //Your PASSPHRASE,
       API_KEY: "", //Your API key
       SECRET: "", //Your API key secret
       URL: "https://api.gdax.com"
     }
   },

   TRADE: {
     BALANCE: 400, //Amount you wish to start with
     COINS: 0, //Number of coins you wish to start with
     INC_BUY_PERCENT: 100 //How much percent you wish to buy at a time per buy. Currently increment buys is not supported. Use 100
   }
 }
