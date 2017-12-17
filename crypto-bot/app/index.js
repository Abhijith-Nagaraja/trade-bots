/**
 * @author Abhijith Nagaraja
 *
 * crypto-bot starting script
 */

console.log("Starting Cryto-bot - " + new Date());

var config = require('./config');

const Strategy = require('./strategies/index');
var strategy = new Strategy();
strategy.useStrategy((strategyToBeUsed)=>strategyToBeUsed.execute());
