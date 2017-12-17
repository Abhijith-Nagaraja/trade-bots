const EXCHANGE = require('./app/exchanges/index');

var exchange;
(async () => {
  let exchangePromise = new Promise((resolve,reject) => {
    exchange = new EXCHANGE(function(){
      resolve();
    })
  });
  await exchangePromise;
  exchange = exchange.getExchange();
  //exchange.getOrder("d00aad06-63de-4d9c-a22d-5f1fa8632c6e");
  exchange.getAccounts((err,resp,data) => {
    console.log(data);
  });
})();
//ex.getOrder("d00aad06-63de-4d9c-a22d-5f1fa8632c6e");
