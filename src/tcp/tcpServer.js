const net = require("net");
const cluster = require("cluster");
const os = require("os");
const clickHandler = require("./handler/clickHandler.js");
const {
  checkInactiveUsers,
  determineWinner,
  getUserFromSession,
  disqualifiedUsers,
} = require("./manager/userManager.js");

const numCPUs = os.cpus().length;
const PORT = 3001;
let currentWorkerIndex = 0;

const userSockets = new Map();

let eventStartTime = 0;
let eventEndTime = 0;

//test용
const scheduleEvent = () => {
  const now = new Date();
  now.setMilliseconds(0); // 밀리초를 0으로 초기화
  now.setSeconds(now.getSeconds() + 2); // 현재 시간에서 2초 후 설정

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
          socket.write("event not started");
          return;
        }
        if (now >= eventEndTime) {
          socket.write("event end");
          return;
        }

        const session = getUserFromSession(sessionId);

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

        const workerIds = Object.keys(cluster.workers);
        if (workerIds.length > 0) {
          const selectedWorker = cluster.workers[workerIds[currentWorkerIndex]];

          // 워커 인덱스 업데이트
          currentWorkerIndex = (currentWorkerIndex + 1) % workerIds.length;

          // 선택된 워커에게 메시지 전송
          selectedWorker.send({
            type: "click",
            userId,
            socketId: socket.remoteAddress,
          });

          // 응답
          socket.write("Click receive");
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
    if (msg.type === "Disqualified") {
      const socket = userSockets.get(msg.userId);
      if (socket) {
        socket.write("Disqualified");
        userSockets.delete(msg.userId);
      }
    }
  });

  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} end`);
    cluster.fork();
  });

  // 10초 미입력 시 자동 실격
  setTimeout(() => {
    setInterval(checkInactiveUsers, 1000);
  }, eventStartTime - Date.now());

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
