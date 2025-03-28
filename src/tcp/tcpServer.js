const net = require("net");
const cluster = require("cluster");
const os = require("os");
const clickHandler = require("./handler/clickHandler.js");
const { determineWinner, disqualifiedUsers } = require("./Utils/user.js");
const onData = require("./events/onData.js");
const onClose = require("./events/onClose.js");
const onEnd = require("./events/onEnd.js");
const onError = require("./events/onError.js");

const numCPUs = os.cpus().length;
const PORT = 3001;
const userSockets = new Map(); // 소켓 정보 저장

let eventStartTime = 0;
let eventEndTime = 0;

//test용 3초 뒤 이벤트 시작
const scheduleEvent = () => {
  const now = new Date();
  now.setMilliseconds(0); // 밀리초를 0으로 초기화
  now.setSeconds(now.getSeconds() + 3); // 현재 시간에서 2초 후 설정

  eventStartTime = now.getTime(); // 이벤트 시작 시간
  eventEndTime = eventStartTime + 60000; // 1분 후 종료
};

// const scheduleEvent = () => {
//   const now = new Date();
//   now.setMinutes(0, 0, 0);
//   now.setHours(now.getHours() + 1);

//   eventStartTime = now.getTime();
//   eventEndTime = eventStartTime + 60000;
// };

const start = () => {
  if (cluster.isPrimary) {
    console.log(`Main process ${process.pid} is running`);

    scheduleEvent();

    const server = net.createServer((socket) => {
      socket.on(
        "data",
        onData(socket, eventStartTime, eventEndTime, userSockets)
      );
      socket.on("end", onEnd(socket));
      socket.on("error", onError(socket));
      socket.on("close", onClose(socket, userSockets));
    });

    server.listen(PORT, () => console.log(`TCP Server running ${PORT}`));

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on("message", (worker, msg) => {
      if (msg.type === "Click") {
        const socket = userSockets.get(msg.userId);
        if (socket) {
          socket.write("Click received");
          userSockets.delete(msg.userId);
        }
      } else if (msg.type === "Join") {
        const socket = userSockets.get(msg.userId);
        if (socket) {
          socket.write("Join");
          userSockets.delete(msg.userId);
        }
      } else if (msg.type === "Disqualified") {
        const socket = userSockets.get(msg.userId);
        if (socket) {
          disqualifiedUsers.add(msg.userId);
          socket.write("Disqualified");
          userSockets.delete(msg.userId);
        }
      }
    });

    cluster.on("exit", (worker) => {
      console.log(`Worker ${worker.process.pid} end`);
      cluster.fork();
    });

    // 1분 후 우승자 판별
    setTimeout(() => {
      console.log("이벤트 시작");
      setTimeout(determineWinner, 60000);
    }, eventStartTime - Date.now());
  } else {
    process.on("message", (msg) => {
      if (msg.type === "click") {
        clickHandler(msg.userId);
      }
    });

    console.log(`Worker ${process.pid} start`);
  }
};

module.exports = { start, userSockets };
