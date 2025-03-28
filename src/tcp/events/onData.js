const { getUserFromSession, disqualifiedUsers } = require("../Utils/user.js");
const cluster = require("cluster");

let currentWorkerIndex = 0;
const userWorkerMap = new Map(); // 유저, 워커 매핑

const onData =
  (socket, eventStartTime, eventEndTime, userSockets) => (data) => {
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
  };

module.exports = onData;
