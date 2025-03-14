const net = require("net");
const cluster = require("cluster");
const os = require("os");
const clickHandler = require("./handler/clickHandler.js");
const {
  determineWinner,
  getUserFromSession,
  disqualifiedUsers,
} = require("./manager/userManager.js");

const numCPUs = os.cpus().length;
const PORT = 3001;
let currentWorkerIndex = 0; // 워커 인덱스
const userWorkerMap = new Map(); // 유저, 워커 매핑
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
      socket.on("data", (data) => {
        const message = data.toString().trim();
        const [command, sessionId] = message.split(" ");

        // 클릭 이벤트를 워커에게 분배
        if (command === "CLICK") {
          const now = Date.now();
          if (now < eventStartTime) {
            console.log("event not started");
            socket.write("event not started");
            return;
          }
          if (now >= eventEndTime) {
            console.log("event end");
            socket.write("event end");
            return;
          }

          const session = getUserFromSession(sessionId);

          console.log("sessionId:", sessionId);
          console.log("session:", session);

          // 로그인 안한 사용자 처리
          if (!session) {
            socket.write("Invalid sessionId");
            return;
          }

          const userId = session.userId;

          // 소켓 저장
          userSockets.set(userId, socket);

          // 이미 실격된 유저일 경우
          if (disqualifiedUsers.has(userId)) {
            socket.write("Disqualified");
            return;
          }

          let workerId = userWorkerMap.get(userId);

          if (!workerId) {
            const workerIds = Object.keys(cluster.workers);
            if (workerIds.length > 0) {
              workerId = workerIds[currentWorkerIndex];
              currentWorkerIndex = (currentWorkerIndex + 1) % workerIds.length;
              userWorkerMap.set(userId, workerId);
            }
          }

          const selectedWorker = cluster.workers[workerId];

          if (selectedWorker) {
            selectedWorker.send({
              type: "click",
              userId,
              socketId: socket.remoteAddress,
            });
          } else {
            console.error(`Error: Worker ${workerId} not found`);
          }
        }
      });

      socket.on("close", () => {
        for (const [userId, sock] of userSockets.entries()) {
          if (sock === socket) {
            userSockets.delete(userId);
          }
        }
      });
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
