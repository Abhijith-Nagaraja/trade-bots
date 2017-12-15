/**
 * @author Abhijith Nagaraja
 */

const GDAX = require('./gdax/gdaxUtil');
const CONFIG = require('../config');

//Factory pattern used to resolve exchange to be used
class Exchange{
  getExchange(){
    if(CONFIG.EXCHANGE == "gdax"){
      return GDAX;
    }
    return null;
  }
}

module.exports = Exchange;
