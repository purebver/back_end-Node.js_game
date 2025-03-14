const db = require("../../db/database.js");
const {
  disqualifyUser,
  checkInactiveUsers,
  disqualifiedUsers,
  activeUsers,
  lastClickTime,
} = require("../manager/userManager.js");

const clicks = new Map();

const clickHandler = (userId) => {
  // 이미 실격된 사용자
  if (disqualifiedUsers.has(userId)) {
    console.log(`이미 실격된 유저: ${userId}`);
    process.send({ type: "Disqualified", userId });
    return;
  }

  // 마이크로초 단위 시간 측정
  const now = Number(process.hrtime.bigint() / 1000n);

  // 첫 클릭 시 참가
  if (!activeUsers.has(userId)) {
    activeUsers.add(userId);
    lastClickTime.set(userId, now);
    clicks.set(userId, []);
    process.send({ type: "Join", userId });
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

    if (maxTime - minTime <= 1000000) {
      disqualifyUser(userId, "1초 내 최대 클릭수를 오버.");
      process.send({ type: "Disqualified", userId });
      return;
    }
  }

  // 클릭 db 저장
  db.prepare("INSERT INTO clicks (user_id, timestamp) VALUES (?, ?)").run(
    userId,
    now
  );

  console.log("clicks----------", clicks);

  process.send({ type: "Click", userId });
};

setInterval(checkInactiveUsers, 1000);

module.exports = clickHandler;
