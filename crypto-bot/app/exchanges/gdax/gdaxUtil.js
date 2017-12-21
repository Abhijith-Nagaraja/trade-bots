/**
 * @author Abhijith Nagaraja
 */

// Controll access between shared resource during async calls
var AsyncLock = require('async-lock');

//constants
const GDAX = require('gdax');
const CONFIG = require('../../config');
const TRADING_PAIRS = require('./gdaxTradingPairs');
const ASYNC_LOCK = "lock";
const INC_BUY_PERCENT = CONFIG.TRADE.INC_BUY_PERCENT || 10;
const tradePair = CONFIG.TRADE_PAIR;
const cryptoDecimal = TRADING_PAIRS.TRADE_ITEMS[tradePair].DECIMAL1;
const tradeDecimal = TRADING_PAIRS.TRADE_ITEMS[tradePair].DECIMAL2;
const publicClient = new GDAX.PublicClient(tradePair);

// variables used
var balance = CONFIG.TRADE.BALANCE;
var balanceHold = 0;
var coins = CONFIG.TRADE.COINS;
var coinsHold = 0;
var sellOrders = {};
var pendingBuys = {};
var buyPercent = 0;
var currPrice = 0;
var processed = {};

var lock = new AsyncLock();

var authClient;
var initialBalance = balance;
var orderTicker;

// Should connect to sandbox?
// TODO: Hardcoded to GDAX
if(CONFIG.SANDBOX){
  console.log("Connecting to " + CONFIG.SANDBOXES.GDAX.URL);
  authClient = new GDAX.AuthenticatedClient(CONFIG.SANDBOXES.GDAX.API_KEY, CONFIG.SANDBOXES.GDAX.SECRET, CONFIG.SANDBOXES.GDAX.PASSPHRASE, CONFIG.SANDBOXES.GDAX.URL)
}else{
  authClient = new GDAX.AuthenticatedClient(CONFIG.EXCHANGES.GDAX.API_KEY, CONFIG.EXCHANGES.GDAX.SECRET, CONFIG.EXCHANGES.GDAX.PASSPHRASE, CONFIG.EXCHANGES.GDAX.URL)
  console.log("Connecting to " + CONFIG.EXCHANGES.GDAX.URL);
}
console.log("Connected to gdax");
console.log("Trading Pair: " + tradePair);

function init(){
  // Create interval with time period to check the status of all pending orders
  // TODO: time period need to come from config
  orderTicker = setInterval(function(){
    checkSellOrders();
    checkPendingBuyOrders();
  },500);
}

function setInitialBalance(){
  getNextTick(function(){
    if(coins > 0){
      initialBalance = balance + coins*currPrice;
      console.log("Initial Balance Set");
    }else{
      console.log("Initial Balance Set");
    }
    printDetails();
  });
}
/**
  * Prints statistics in color coded format
  * format :
  * coinsHold(yellow) coins_available(blue) total_coins(black)
  * balanceHold(yellow) balance_available(blue) balance_coins(black)
  * profit/loss (green/red)
  */
function printDetails(msg){
  let coin = tradePair.split("-")[0];
  let accountBalance = balance + balanceHold + coins * currPrice + coinsHold * currPrice;
  let profit =  accountBalance - initialBalance;
  let profitPrecent =  ( ( accountBalance/initialBalance - 1 ) * 100 ).toFixed(2) + "%";
  let profitString = profit < 0 ? " \x1b[31m $" + accountBalance + " $" + profit + " " + profitPrecent + " \x1b[30m " :
                                  " \x1b[32m $" + accountBalance + " $" + profit + " " + profitPrecent + " \x1b[30m ";
  console.log("\x1b[33m " + coinsHold + coin + " \x1b[34m " + coins + coin + " \x1b[30m " + (coins + coinsHold) + coin +
              " \x1b[33m $" + balanceHold + " \x1b[34m $" + balance + " \x1b[30m $" + (balanceHold + balance) + profitString);
  if(msg){
    console.log("\x1b[36m" + msg+ " \x1b[30m ");
  }
}

// Check pending sell orders to determine whether it is canceled/partillay filled or fully filled
function checkSellOrders(){
  Object.keys(sellOrders).forEach(function(id){
    authClient.getOrder(id, function(err,resp,data){
      if(err){
        console.log("Error while getting sell order");
        console.log(err);
        return;
      }

      if(data){
        if(data.message){
          if(data.message == "NotFound" || data.message == "order not found"){
            handleCancelOrder("sell", id);
            return;
          }
          console.log("ORDER TICKER (Cancel Sell Order): " + data.message);
          return;
        }

        if(data.status == "done"){
          if(data.done_reason == "filled"){
            handleFilledOrder("sell", id, data);
            return;
          }
          if(data.done_reason == "canceled"){
            handlePartiallyFilledOrder("sell", id, data );
            return;
          }
        }
      }
    });
  });
}

// Check pending sell orders to determine whether it is canceled/partillay filled or fully filled
function checkPendingBuyOrders(callback){
  let keys = Object.keys(pendingBuys);
  if(keys.length == 0){
    if(callback){
      callback();
    }
    return;
  }
  Object.keys(pendingBuys).forEach(function(id){
    authClient.getOrder(id, function(err,resp,data){
      if(err){
        console.log("Error while getting pending buy order");
        console.log(err);
        return;
      }

      if(data){
        if(data.message){
          if(data.message == "NotFound" || data.message == "order not found"){
            handleCancelOrder("buy", id);
            if(pendingBuys.length == 0){
              if(callback){
                callback();
              }
            }
            return;
          }
          console.log("ORDER TICKER (Cancel Buy Order): " + data.message);
          if(pendingBuys.length == 0){
            if(callback){
              callback();
            }
          }
          return;
        }

        if(data.status == "done"){
          if(data.done_reason == "filled"){
            handleFilledOrder("buy", id, data);
            if(pendingBuys.length == 0){
              if(callback){
                callback();
              }
            }
            return;
          }
          if(data.done_reason == "canceled"){
            handlePartiallyFilledOrder("buy", id, data );
            if(pendingBuys.length == 0){
              if(callback){
                callback();
              }
            }
            return;
          }
        }
      }
    });
  });
}

function handleCancelOrder(type, id){
  lock.acquire(ASYNC_LOCK, function(){
    if(isProcessed(id)){
      return;
    }
    var order;
    if(type == "buy"){
      order = pendingBuys[id];

      if(!order){
        return;
      }

      let size = parseFloat(order.size);
      let price = parseFloat(order.price);
      let deltaPrice = size*price;

      buyPercent = buyPercent - order.percentBuy;
      balanceHold = balanceHold - deltaPrice;
      balance = balance + deltaPrice;

      delete pendingBuys[id];
    }else if (type == "sell"){
      order = sellOrders[id];

      if(!order){
        return;
      }

      let size = parseFloat(order.size);

      coinsHold = coinsHold - size;

      coins = coins + size;

      delete sellOrders[id];
    }
    fixDecimals();
    console.log(type + " order canceled :: " + buyPercent + "(Buy Percent)" + " :: Order Id: " + id);
    printDetails("Current Price: " + getCurrPrice() + tradePair.split("-")[1]);
  });
}

// Check whether order with id is already processed. if not add it to the queue
// and remove it from the queue after 5 seconds
// This needs to be done to handle a edge case due to simultaneous async calls
function isProcessed(id){
  if(processed[id]){
    console.log("Id already processed");
    return true;
  }

  processed[id] = true;
  setTimeout(function(){
    delete processed[id];
  }, 5000);

  return false;
}

function handleFilledOrder(type, id, data){
  lock.acquire(ASYNC_LOCK, function(){
    if(isProcessed(id)){
      return;
    }
    if(type == "buy"){
      delete pendingBuys[id];

      let size = parseFloat(data.size);
      let price = parseFloat(data.price);
      let deltaPrice = size*price;

      balanceHold = balanceHold - deltaPrice;
      coins = coins + size;
    }else if (type == "sell"){
      delete sellOrders[id];

      let size = parseFloat(data.size);
      let price = parseFloat(data.price);
      var filledFees = parseFloat(data.fill_fees);
      filledFees = isNaN(filledFees) ? 0 : filledFees;
      var executedValue = parseFloat(data.executed_value);
      executedValue = isNaN(executedValue) ? 0 : executedValue;
      let deltaPrice = executedValue - filledFees;

      if(coinsHold == 0){
        return;
      }

      coinsHold = coinsHold - size;
      balance = balance + deltaPrice;
      buyPercent = 0;
    }
    fixDecimals();
    console.log(type + " order filled :: " + buyPercent + "(Buy Percent)" + " :: Order Id: " + id);
    printDetails("Size: " + data.size + tradePair.split("-")[0] + " :: Price: " + data.price + tradePair.split("-")[1]);
  });
}

function handlePartiallyFilledOrder(type, id, data){
  lock.acquire(ASYNC_LOCK, function(){
    if(isProcessed(id)){
      return;
    }
    if(type == "buy"){
      let order = pendingBuys[id];
      delete pendingBuys[id];

      let size = parseFloat(data.size);
      let price = parseFloat(data.price);
      var filledSize = parseFloat(data.filled_size);
      filledSize = isNaN(filledSize) ? 0 : filledSize;
      let deltaHoldPrice = size*price;
      let deltaBuyPrice = filledSize*price;

      balanceHold = balanceHold - deltaHoldPrice;
      balance = balance + (deltaHoldPrice - deltaBuyPrice);
      coins = coins + filledSize;

      let filledPercent = (filledSize * order.percentBuy) / size;
      buyPercent = buyPercent - (order.percentBuy - filledPercent);
    }else if (type == "sell"){
      delete sellOrders[id];

      let size = parseFloat(data.size);
      let price = parseFloat(data.price);
      var filledFees = parseFloat(data.filled_fees);
      filledFees = isNaN(filledFees) ? 0 : filledFees;
      var filledSize = parseFloat(data.filled_size);
      filledSize = isNaN(filledSize) ? 0 : filledSize;
      let deltaPrice = (filledSize*price) - filledFees;

      if(coinsHold == 0){
        return;
      }

      coinsHold = coinsHold - size;
      coins = coins + (size - filledSize);
      balance = balance + deltaPrice;

      buyPercent = filledSize * 100 / size;
    }
    fixDecimals();
    console.log(type + " order partially filled :: " + buyPercent + "(Buy Percent)" + " :: Order Id: " + id);
    printDetails("Filled size: " + data.filled_size + tradePair.split("-")[0] + " :: Price: " + data.price + tradePair.split("-")[1]);
  });
}

function getProducts(callback){
  publicClient.getProducts(callback);
}

function getNextTick(callback) {
  publicClient.getProductTicker(function(err, resp, data){
    if(data && data.price){
      currPrice = parseFloat(data.price);
    }
    if(callback){
      callback(data.price);
    }
  });
}

function sell(price, size, type){
  size = size ? size : coins;
  let inc = 1/Math.pow(10,tradeDecimal);
  if(size  < inc ){
    return;
  }

  type = type || "limit";
  price = price + inc;

  size = size.toFixed(cryptoDecimal)

  var params = {
    'size' : size,
    'product_id': tradePair,
    'type': type
  }

  if(type != "market"){
    price = price.toFixed(tradeDecimal);
    params["price"] = price;
  }

  if(type == "limit"){
    params["post_only"]= true
  }

  authClient.sell(params, function(err, resp, data){
    if(err){
      console.log("Error while placing the sell order");
      console.log(err);
      return;
    }

    if(!data){
      return;
    }

    lock.acquire(ASYNC_LOCK, function(){
      if(data.message){
        if(data.message == "Insufficient funds"){
          coins = parseFloat(coins.toFixed(2)) - (1/Math.pow(10,cryptoDecimal-1));
          console.log(data.message);
          printDetails();
        }else{
          console.log(type + " sell order: " + data.message);
        }
        return;
      }
      if(data.status == "rejected"){
        return;
      }

      sellOrders[data.id] = data;

      coins = coins - size;
      coinsHold = coinsHold + size;

      fixDecimals();
      console.log(type + " sell order placed :: " + buyPercent + "(Buy Percent)" + " :: Order Id: " + data.id);
      printDetails("Size: " + size + tradePair.split("-")[0] + " :: Price: " + price + tradePair.split("-")[1]);
    });
  });
}

function sellLimit(price, size){
  sell(price, size || coins);
}

function sellMarket(){
  sell(null, coins, "market");
}

function getCurrPrice(){
  return currPrice;
}

function cancelOrder(orderId, callback){
  if(orderId){
    authClient.cancelOrder(orderId, function(err, resp, data){
        if(err){
          console.log("Error while canceling the order");
          console.log(err);
          return;
        }

        if(data.message){
          if(data.message == "Order already done"){
            checkSellOrders();
          }else if(data.message != "NotFound" && data.message != "order not found"){
            console.log("Cancel order: " + data.message);
          }
          return;
        }

        if(data.length < 1){
          return;
        }

        console.log("Order canceled :: " + buyPercent + "(Buy Percent)" + " :: Order Id: " + orderId);
        printDetails();

        if(callback){
          callback();
        }
    });
  }
}

function cancelAllOrders(callback){
  authClient.cancelAllOrders({ product_id: tradePair }, function(err, resp, data){
    if(err){
      console.log("Error while canceling the order");
      console.log(err);
      return;
    }

    if(!data){
      return;
    }

    if(data.message){
      console.log(data.message);
      return;
    }

    if(data.length > 0){
      console.log("Canceled all orders");
    }

    checkPendingBuyOrders(callback);
  });
}

function buyIncrement(price, callback){
  if(balance > 0 && buyPercent < 100){
    let remainingPercent = 100 - buyPercent;
    let percentBuy = remainingPercent < INC_BUY_PERCENT ? remainingPercent : INC_BUY_PERCENT;
    let incrementBalance = parseFloat((percentBuy * balance / remainingPercent).toFixed(tradeDecimal));
    lock.acquire(ASYNC_LOCK, function(){
      buyPercent = buyPercent + percentBuy;
      let dec = 1/Math.pow(10,cryptoDecimal);
      price = price - dec;
    }, function(err){
      if(!err){
        buyLimit(price, (incrementBalance/price).toFixed(6), percentBuy, callback);
      }
    });
  }
}

function buyLimit(price, size, percentBuy, callback){
  size = parseFloat(size);
  price = parseFloat(price);
  if(isNaN(size) || size < 1/Math.pow(10,cryptoDecimal)){
    lock.acquire(ASYNC_LOCK, function(){
      buyPercent = buyPercent - percentBuy;
    });
    return;
  }

  price = price.toFixed(tradeDecimal);
  size = size.toFixed(cryptoDecimal)
  var buyParams = {
    'price': price,
    'size': size,
    'product_id': tradePair,
    'post_only': true
  };

  authClient.buy(buyParams, function(err, resp, data){
    lock.acquire(ASYNC_LOCK, function(){
      if(err){
        console.log("Error while placing buy order");
        console.log(err);
        buyPercent = buyPercent - percentBuy;
        return;
      }

      if(!data){
        return;
      }

      if(data.message){
        console.log("buy limit: " + data.message);
        console.log("Trying to buy " + size + tradePair.split("-")[0] + " @ $" + price);
        printDetails();
        buyPercent = buyPercent - percentBuy;
        return;
      }

      if(data.status != "rejected"){
        let remainingPercent = 100 - (buyPercent - percentBuy);
        let incrementBalance = parseFloat((percentBuy * balance / remainingPercent).toFixed(tradeDecimal));
        balance = balance - incrementBalance;
        balanceHold = balanceHold + incrementBalance;

        let id = data.id;
        delete data["id"];
        pendingBuys[id] = data;
        data["percentBuy"] = buyPercent;

        fixDecimals();

        console.log(data.side + "Order placed :: " + buyPercent + "(Buy Percent)" + " :: Order Id: " + id);
        printDetails("Size: " + size + tradePair.split("-")[0] + " :: Price: " + price + tradePair.split("-")[1]);

        //Put a 15 second timer on the order
        setTimeout(function(){
          cancelOrder(id);
        }, 15000)

        if(callback){
          callback();
        }
        return;
      }

      buyPercent = buyPercent - percentBuy;

      if(callback){
        callback();
      }
    });
  });
}

function fixDecimals(){
  coins = coins < 0.01 ? 0 : coins;
  coinsHold = coinsHold < 0.01 ? 0 : coinsHold;
  balance = balance < 0.01 ? 0 : balance;
  balanceHold = balanceHold < 0.01 ? 0 : balanceHold;
}

function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function getOrder(id){
  authClient.getOrder(id, function(err, resp, data){
    console.log(err || data);
  });
}

function getAccounts(callback){
  authClient.getAccounts(function(err,resp,data){
    callback(err,resp,data);
  });
}

module.exports = {
  getProducts: getProducts,
  getNextTick: getNextTick,
  sellLimit: sellLimit,
  sellMarket: sellMarket,
  cancelOrder: cancelOrder,
  cancelAllOrders: cancelAllOrders,
  buyIncrement: buyIncrement,
  getOrder: getOrder,
  getCurrPrice: getCurrPrice,
  setInitialBalance: setInitialBalance,
  getAccounts: getAccounts,
  printDetails: printDetails,
  init: init
}
