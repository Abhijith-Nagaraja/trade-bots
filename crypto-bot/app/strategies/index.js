/**
 * @author Abhijith Nagaraja
 *
 */
const CONFIG = require('../config');
const EXCHANGE = require('../exchanges/index');

//Strategies
var EmaStrategy = require('./ema/index');

var exchange;


//Factory pattern used to resolve strategy to be used
class Strategy{

    /**
      * async and await are used for synchronus execution
      * Exchange.setExchange() make several async calls and does lot of error
      * handling and hence we need to wait for all the async calls before
      * continuing with our bot. Hence synchronus excecution is required
      */
    useStrategy(callback){
      let that = this;
      (async() => {
        let exchangePromise = new Promise((resolve,reject) => {
          that.exchange = new EXCHANGE(function(){
            resolve();
          })
        });
        await exchangePromise;

        that.exchange = that.exchange.getExchange();
        that.exchange.init();
        that.strategy = that._getStrategy();
        that.strategy.setExchange(that.exchange);
        that._setTradeTicker();

        if(callback){
          callback(that.strategy);
        }
      })();
    }

    _getStrategy(){
      if(CONFIG.STRATEGY == "EMA"){
        return new EmaStrategy();
      }
      return null;
    }

    _setTradeTicker(){
        let that = this;
        this.tradeTicker = setInterval( function(){
          that.exchange.getNextTick(function(price){
            that.strategy.decide(parseFloat(price));
          });
        },CONFIG.TICKER_TIME_IN_MILLISECONDS);
      }

}

module.exports = Strategy;
