const db = require("../../db/database.js");
const {
  disqualifyUser,
  disqualifiedUsers,
  activeUsers,
  lastClickTime,
} = require("../manager/userManager.js");

const clicks = new Map();

const clickHandler = (socket, userId) => {
  // 이미 실격된 사용자
  if (disqualifiedUsers.has(userId)) {
    console.log(`이미 실격된 유저: ${userId}`);
    socket.write("Disqualified user");
    return;
  }

  // 마이크로초 단위 시간 측정
  const now = Number(process.hrtime.bigint() / 1000n);

  // 첫 클릭 시 참가
  if (!activeUsers.has(userId)) {
    activeUsers.add(userId);
    lastClickTime.set(userId, now);
    clicks.set(userId, []);
    socket.write("Join!");
    return;
  }

  // 첫 클릭이 아닐경우
  const timestamp = clicks.get(userId);
  timestamp.push(now);
  lastClickTime.set(userId, now);

  // 초당 4회 이상 실격
  if (timestamp.length >= 4) {
    const minTime = timestamp[timestamp.length - 4];
    const maxTime = timestamp[timestamp.length - 1];

    if (maxTime - minTime <= 1000) {
      disqualifyUser(userId, "1초 내 최대 클릭수를 오버.");
      socket.write("Disqualified: Maximum clicks exceeded in 1 second");
      return;
    }
  }

  // 클릭 db 저장
  db.prepare("INSERT INTO clicks (user_id, timestamp) VALUES (?, ?)").run(
    userId,
    now
  );

  socket.write("Click received");
};

module.exports = clickHandler;
