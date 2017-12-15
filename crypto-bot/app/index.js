/**
 * @author Abhijith Nagaraja
 *
 * crypto-bot starting script
 */

console.log("Starting Cryto-bot - " + new Date());

var config = require('./config');

const Strategy = require('./strategies/index');
var strategy = new Strategy().getStrategy();
strategy.execute();

// const EXCHANGE = require('./exchanges/index');
//
// let ex = new EXCHANGE().getExchange();
// ex.getOrder("d00aad06-63de-4d9c-a22d-5f1fa8632c6e");
