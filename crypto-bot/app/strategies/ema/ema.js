/**
 * @author Abhijith Nagaraja
 */

//Default Thresholds
const DEFAULT_LOW = 12;
const DEFAULT_HIGH = 28;

//EMA Arrays
const emaLowArr = [];
const emaHighArr = [];

//EMA's
var emaLow = 0;
var emaHigh = 0;

//Crossover flag. If true lowThreshold > highThreshold else highThreshold > lowThreshold
var crossover = undefined;

/**
  *   Calculates EMA for two given thresholds and
  *   decides whether it is an uptrend or DownTrend
  */
class EMA{
  constructor(lowThreshold, highThreshold){
    this.lowThreshold = lowThreshold ? lowThreshold : DEFAULT_LOW;
    this.highThreshold = highThreshold ? highThreshold : DEFAULT_HIGH;
    console.log("EMAs used: EMA" + this.lowThreshold + " & EMA" + this.highThreshold);
    this.timePeriodCount = 1;
  }

  /**
    * Push the value to the queues
    * Maintain the size of the queues according to thresholds given
    * find the trend
    */
  push(value){
    if(emaLowArr.length == this.lowThreshold){
      emaLowArr.pop();
    }
    emaLowArr.unshift(value);
    emaLow = this.calculateEma(emaLowArr, emaLow);

    if(emaHighArr.length == this.highThreshold){
      emaHighArr.pop();
    }
    emaHighArr.unshift(value);
    emaHigh = this.calculateEma(emaHighArr, emaHigh);
    this.findTrend();
    console.log();
    console.log("Time Period " + this.timePeriodCount + " - " + new Date());
    console.log("Value: " + value);
    console.log("EMA" + this.lowThreshold + " = " + emaLow);
    console.log("EMA" + this.highThreshold + " = " + emaHigh);
    console.log();
    this.timePeriodCount++;
  }

  // Calculate EMA
  calculateEma(arr,lastEma){
    function sum(total, num){
      return total + num;
    }

    let initialSMA = arr.reduce(sum) / arr.length;
    let multiplier = 2/(arr.length+1);
    return ((arr[0] - lastEma)*multiplier) + lastEma;
  }

  /**
    * Find whether it is an uptrend or down
    * Uptrend: EMA_LOW > EMA_HIGH.
    * Downtrend: EMA_HIGH > EMA_LOW.
    */
  findTrend(){
    if(this.getEmaLow() && this.getEmaHigh()){
      if(emaLow && emaHigh){
        if(crossover == undefined){
          if(emaHigh > emaLow){
            crossover = false;
            console.log("DownTrend");
          }else{
            crossover = true;
            console.log("Uptrend");
          }
        }else if(!crossover){
          if(emaLow > emaHigh){
            crossover = true;
            console.log("Uptrend");
          }
        }else{
          if(emaHigh > emaLow){
            crossover = false;
            console.log("DownTrend");
          }
        }
      }
    }
  }

  // Return lowThreshold value
  getEmaLow(){
    return emaLowArr.length == this.lowThreshold ? emaLow: 0;
  }

  // Return highThreshold value
  getEmaHigh(){
    return emaHighArr.length == this.highThreshold ? emaHigh: 0;
  }

  // Return current trend
  isUptrend(){
    return crossover;
  }
}

module.exports = EMA
