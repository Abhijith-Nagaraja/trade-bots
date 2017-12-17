/**
 * @author Abhijith Nagaraja
 *
 */

const CONFIG = require('../../config');
const EMA = require('./ema');

/**
 *  EMA Strategy
 *
 *  1. Construct two EMAs for the given thresholds. EMA_LOW and EMA_HIGH
 *  2. Uptrend: EMA_LOW > EMA_HIGH.
 *  3. Downtrend: EMA_HIGH > EMA_LOW.
 *  4. BUY if
 *     a. Uptrend and
 *     b. Perform 2 tests and buy on 3rd.
 *  5. Sell if
 *     a. Downtrend or
 *     b. Value < EMA_LOW (sell limit)
 *     c. Value < EMA_HIGH (sell market)
 */
class EmaStrategy{
  constructor(){
    this.ema = new EMA(CONFIG.EMA_LOW_THRESHOLD, CONFIG.EMA_HIGH_THRESHOLD);
    console.log("EMA Time Period Used: " + CONFIG.EMA_TP + " seconds");
    this.intervals = {};
    this.test1 = false;
    this.test2 = false;
  }

  setExchange(exchange){
    if(exchange){
      this.exchange = exchange;
    }else{
      console.error("\x1b[31mNo exchange set.\nExiting... \x1b[30m");
      process.exit(0);
    }
  }

  execute(){
      if(this.exchange){
        console.log("Capturing Trend");
        this.setIntervals();
      }else{
        console.error("\x1b[31mNo exchange set.\nExiting... \x1b[30m");
        process.exit(1);
      }
  }

  // Set all the counters
  setIntervals(){
    this.setQueueTicker();
    this.setTradeTicker();
  }

  /**
    *   Create an interval to query the exchange at given time period and
    *   push the data in the queue
    */
  setQueueTicker(){
    let that = this;
    this.intervals["queueTicker"] = setInterval(function(){
      that.exchange.getNextTick(function(error, response, data){
          if (that.handleError(error,data)){
            that.ema.push(parseFloat(data.price));
          }
      });
    }, CONFIG.EMA_TP*1000);
  }

  /**
    *   Create an interval to query the exchange at proper time period and
    *   decide whether to buy or sell
    *
    *   TODO: Time Period need to come from config and it varies per exchange
    */
  setTradeTicker(){
    let that = this;
    this.intervals["tradeTicker"] = setInterval( function(){
      that.exchange.getNextTick(function(error, response, data){
        if (that.handleError(error,data)){
          that.decide(parseFloat(data.price));
        }
      });
    },334);
  }

  //Decide whether to buy or not (Step 2 & Step 3 in the steps described above)
  decide(price){
    let uptrend = this.ema.isUptrend();

    //cold start
    if( uptrend == undefined ){
      return;
    }

    if(uptrend && price >= this.ema.getEmaLow()){
      this.buy(price);
    }else{
      this.sell(price);
      this.test1 = false;
      this.test2 = false;
    }
  }

  // Buy if Step 4 is satisfied
  buy(price){
    if(!this.test1 && price >= this.ema.getEmaLow()){
      this.test1 = true;
      return;
    }

    if(this.test1 && !this.test2){
      if(price >= this.ema.getEmaLow()){
        this.test2 = true;
      }else{
        this.test1 = false;
        this.test2 = false;
      }
      return;
    }

    if(this.test1 && this.test2 && price >= this.ema.getEmaLow()){
      this.exchange.buyIncrement(price);
    }
  }

  // Sell if Step 5 is satisfied
  sell(){
    let that = this;
    this.exchange.cancelAllOrders(function(){
        let price = that.exchange.getCurrPrice();
        let emaHigh = that.ema.getEmaHigh();
        if(price > emaHigh && price < that.ema.getEmaLow()){
            that.exchange.sellLimit(price);
        }else if(price <= emaHigh){
            that.exchange.sellMarket();
        }
    });
  }

  handleError(error,data){
    if (error){
        console.dir(error);
        return false;
    }
    if(!data || !data.price){
      return false;
    }
    return true;
  }
}

module.exports = EmaStrategy;
