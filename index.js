import Binance from "binance-api-node";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { formatMoney } from "./utils/money.js";
import { WebSocket } from "ws";
// required to running in cloud
import http from "http";
http.createServer().listen(process.env.PORT);

dotenv.config();
// API keys can be generated here https://www.binance.com/en/my/settings/api-management
const binanceClient = Binance.default({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
});
let array = [];

let streams = ["ethbusd@kline_1m", "btcbusd@kline_1m"];
// let ws = new WebSocket(
//   "wss://stream.binance.com:9443/ws/" + streams.join("/")
// );;
// ws.onmessage = (event) => {
//   setInterval(() => {
//     console.log(event.data)
//   }, 1000)
// };
const bot = new TelegramBot(process.env.TELEGRAMM_BOT_TOKEN, { polling: true });

// Matches "/price [symbol]"
bot.onText(/\/price (.+)/, async (msg, data) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(chatId, "Wait...");

  // data[1] can be single token (i.e. "BTC") or pair ("ETH BTC")
  const [cryptoToken1, cryptoToken2 = "USDT"] = data[1].split(" ");
 
  await binanceClient
    .avgPrice({ symbol: `${cryptoToken1}${cryptoToken2}`.toUpperCase() }) // example, { symbol: "BTCUSTD" }
    .then((avgPrice) => {
      bot.sendMessage(chatId, formatMoney(avgPrice["price"]));
    })
    .catch((error) =>
      bot.sendMessage(
        chatId,
        `Error retrieving the price for ${cryptoToken1}${cryptoToken2}: ${error}`
      )
    );
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  let ws = null;
  switch (msg.text) {
    case "/start":
      ws = new WebSocket(
        "wss://stream.binance.com:9443/ws/" + streams.join("/")
      );;
      let stockObject = null;
      ws.onmessage = (event) => {
        stockObject = JSON.parse(event.data);
      if (array.length < streams.length) {
        array.push(stockObject);
    } else {
        array = [];
    }
  };

    setInterval(function message() {
        if (array.length == streams.length ) {
            array.sort((a, b) => { return b.k.o - a.k.o; });
            let message = "List Coin";
            array.forEach((item, index) => {
              if(!array.includes()){
                message += 
                `
                <b>${index + 1}. ${item.s}</b>
                Binance: ${item.k.o}
                Trades: ${item.k.n}
                `
              }
            });
            bot.sendMessage(chatId, `
            ${message}
          `, {
            parse_mode: "HTML",
          });
        } 
        return message;
    }(), 3000);

      // setInterval(() => {
      //   if (stockObject === null) {
      //     return;
      //   }
      //   if (stockObject.s === "ETHBUSD") {
      //     bot.sendMessage(chatId, `
      //       ETHBUSD:
      //       Binance: ${stockObject.c}
      //       Price change: ${stockObject.p}
      //     `, {
      //       parse_mode: "Markdown",
      //     });
      //   }
      //   else{
      //     bot.sendMessage(chatId, `   
      //     BTCBUSD:
      //     Binance: ${stockObject.c}
      //     Price change: ${stockObject.p}
      //  `, {
      //       parse_mode: "Markdown",
      //     });
      //   }
      // }, delay);
      break;
      case '/stop':
        ws?.close();
  }
});

