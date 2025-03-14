const db = require("../../db/database.js");

const disqualifiedUsers = new Set();
const activeUsers = new Set();
const lastClickTime = new Map();

// 세션 확인
const getUserFromSession = (sessionId) => {
  const session = db
    .prepare("SELECT userId FROM sessions WHERE sessionId = ?")
    .get(sessionId);
  return session || null;
};

// 유저 실격 처리
const disqualifyUser = (userId, reason) => {
  // 이미 실격 되어있을경우 리턴
  if (disqualifiedUsers.has(userId)) {
    return;
  }

  console.log(`${userId}실격 처리. 이유: ${reason}`);
  disqualifiedUsers.add(userId);
  activeUsers.delete(userId);
  lastClickTime.delete(userId);

  if (process.send) {
    process.send({ type: "Disqualified", userId });
  }
};

// 10초 실격
const checkInactiveUsers = () => {
  const now = Number(process.hrtime.bigint() / 1000n);
  for (const userId of activeUsers) {
    const lastTime = lastClickTime.get(userId);
    if (lastTime && now - lastTime > 10000000) {
      disqualifyUser(userId, "10초 이내 클릭이 없음.");
    }
  }
};

// 우승자 판별
const determineWinner = () => {
  // 클릭 개수 내림차순-마지막클릭 내림차순 으로 우승자 판별 + 유저 주소
  const winner = db
    .prepare(
      `SELECT A.user_id AS id, COUNT(*) AS click_count, MAX(A.timestamp) AS last_click, B.address
    FROM clicks A JOIN users B ON A.user_id = B.id
    GROUP BY A.user_id
    ORDER BY click_count DESC, last_click ASC
    LIMIT 1;
  `
    )
    .get();

  if (winner) {
    console.log(`우승자: ${winner.id}, 주소: ${winner.address}`);
  } else {
    console.log("데이터가 없습니다.");
  }
};

module.exports = {
  getUserFromSession,
  disqualifyUser,
  checkInactiveUsers,
  determineWinner,
  disqualifiedUsers,
  activeUsers,
  lastClickTime,
};
