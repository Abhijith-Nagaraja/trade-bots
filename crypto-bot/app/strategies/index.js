/**
 * @author Abhijith Nagaraja
 *
 */


var EmaStrategy = require('./ema/index');
const CONFIG = require('../config');

//Factory pattern used to resolve strategy to be used
class Strategy{
    getStrategy(){
      if(CONFIG.STRATEGY == "EMA"){
        return new EmaStrategy();
      }
      return null;
    }
}

module.exports = Strategy;
