/**
 * @author Abhijith Nagaraja
 */

const GDAX = require('./gdax/gdaxUtil');
const CONFIG = require('../config');

//Factory pattern used to resolve exchange to be used
class Exchange{
  constructor(callback){
    this.setExchange(callback);
  }

  getExchange(){
    return this.exchange;
  }

  async setExchange(callback){
    let exChange = null;
    let currency1 = CONFIG.TRADE.COINS;
    let currency2 = CONFIG.TRADE.BALANCE;

    //Check whether configured balances are correct
    if(currency1 < 0.01 && currency2 < 0.01){
      console.error("\x1b[31mCheck config.js. One/some of the following items is/are configured wrong \x1b[30m");
      console.error("\x1b[33mEXCHANGE");
      console.error("TRADE.BALANCE");
      console.error("TRADE.COINS");
      console.error("\x1b[31mConfigure the above items correctly and restart");
      console.error("Exiting \x1b[30m");
      process.exit(0);
    }

    if(CONFIG.EXCHANGE == "gdax"){
      exChange = GDAX;
    }

    let that = this;

    /**
      * Check whether configured balances are available in the account
      *
      * If we don't find availabe balance. Do the error handling and exit the
      * application. Since we should not proceed without this step, synchronus
      * execution is achieved with the help of async and await.
      */
    let accountPromise = new Promise((resolve, reject) => {
      exChange.getAccounts((err,resp,data)=>{
        if(err){
          console.error("\x1b[31mError while getting account details. " + err);
          console.error("Exiting \x1b[30m");
          process.exit(0);
        }

        if(!data || data.message){
          if(err){
            console.error("\x1b[31mError while getting account details. " + data?data.message : "");
            console.error("Exiting \x1b[30m");
            process.exit(0);
          }
        }

        let tradePair = CONFIG.TRADE_PAIR.split("-");

        data.forEach((account) => {
          if(account.currency == tradePair[0] || account.currency == tradePair[1]){
            let availableBalance = parseFloat(account.available);
            if(account.currency == tradePair[0] && currency1 > availableBalance){
              console.log("if 2");
              console.error("\x1b[31mInsufficient Funds");
              console.error(tradePair[0] + " Details");
              console.error("Configured to use: " + currency1 + tradePair[0]);
              console.error("Available to use: " + availableBalance + tradePair[0]);
              console.error("Deposit more " + (currency1 - availableBalance)+ tradePair[0] +
                            " into your exchange account and restart");
              console.error("\x1b[31mExiting \x1b[30m");
              process.exit(0);
            }
            if(account.currency == tradePair[1] && currency2 > availableBalance){
              console.error("\x1b[31mInsufficient Funds");
              console.error(tradePair[1] + " Details");
              console.error("Configured to use: " + currency2 + tradePair[1]);
              console.error("Available to use: " + availableBalance + tradePair[1]);
              console.error("Deposit more " + (currency2 - availableBalance)+ tradePair[1] +
                            " into your exchange account and restart");
              console.error("\x1b[31mExiting \x1b[30m");
              process.exit(0);
            }
          }
        });

        resolve();

      });
    });
    await accountPromise;

    exChange.setInitialBalance();

    this.exchange = exChange;
    if(callback){
      callback();
    }
  }
}

module.exports = Exchange;
