const cluster = require("cluster");
const httpServer = require("./http/httpServer.js"); // HTTP 서버
const tcpServer = require("./tcp/tcpServer.js"); // TCP 서버

const startServers = () => {
  if (cluster.isPrimary) {
    console.log("HTTP & TCP 서버 실행.");

    httpServer.start(); // HTTP 서버 실행
    tcpServer.start(); // TCP 서버 실행
  } else {
    tcpServer.start();
  }
};

startServers();
