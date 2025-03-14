const {
  checkInactiveUsers,
  lastClickTime,
  activeUsers,
  disqualifiedUsers,
  getUserFromSession,
  determineWinner,
} = require("../src/tcp/Utils/user.js");
const clickHandler = require("../src/tcp/handler/clickHandler.js");
const db = require("../src/db/database.js");

// ====== 유닛 테스트 시작 ======
console.log("====== 유닛 테스트 시작 ======");

// 테스트용 유저 ID
const testUserId = "testuser1";

// 10초 실격 테스트
console.log("===checkInactiveUsers() 테스트===");
activeUsers.add(testUserId);
lastClickTime.set(testUserId, performance.now() - 11000);
checkInactiveUsers();
if (disqualifiedUsers.has(testUserId)) {
  console.log("유저가 10초 동안 클릭하지 않아 실격 처리됨");
} else {
  console.error("10초가 지나도 실격되지 않음");
}
console.log("===checkInactiveUsers() 테스트 끝===");
// 테스트용 유저 ID2
const testUserId2 = "testuser2";
console.log("===clickHandler() 테스트===");

// 첫 클릭 시 activeUsers에 추가되는지 확인
clickHandler(testUserId2);

if (activeUsers.has(testUserId2)) {
  console.log("첫 클릭 시 activeUsers에 정상 추가됨");
} else {
  console.error("첫 클릭 시 activeUsers에 추가되지 않음");
}

// 초당 4회 클릭 초과 시 실격 확인
clickHandler(testUserId2);
clickHandler(testUserId2);
clickHandler(testUserId2);
clickHandler(testUserId2); // 4회 연속 클릭

if (disqualifiedUsers.has(testUserId2)) {
  console.log("초당 4회 이상 클릭하여 실격됨");
} else {
  console.error("초당 4회 클릭했지만 실격되지 않음");
}
console.log("===clickHandler() 테스트 끝===");
// 테스트용 데이터 삽입
console.log("===determineWinner() 테스트===");

// 테스트용 유저 추가
db.prepare("INSERT INTO users (id, password, address) VALUES (?, ?, ?)").run(
  "winnerUser",
  "testpass",
  "test address"
);

db.prepare("INSERT INTO users (id, password, address) VALUES (?, ?, ?)").run(
  "loserUser",
  "testpass",
  "test address"
);

// 클릭 데이터 삽입 (우승자는 `winnerUser`)
db.prepare("INSERT INTO clicks (user_id, timestamp) VALUES (?, ?)").run(
  "winnerUser",
  100000
);
db.prepare("INSERT INTO clicks (user_id, timestamp) VALUES (?, ?)").run(
  "winnerUser",
  200000
);
db.prepare("INSERT INTO clicks (user_id, timestamp) VALUES (?, ?)").run(
  "winnerUser",
  300000
);
db.prepare("INSERT INTO clicks (user_id, timestamp) VALUES (?, ?)").run(
  "loserUser",
  400000
);

// determineWinner() 실행
console.log("우승자 판별 실행...");
determineWinner();
console.log("===determineWinner() 테스트 끝===");
// 테스트용 데이터 삽입
console.log("===getUserFromSession() 테스트===");

// 테스트용 유저 및 세션 추가
const testSessionId = "test-session-id";
db.prepare("INSERT INTO users (id, password, address) VALUES (?, ?, ?)").run(
  "testuser",
  "testpass",
  "test address"
);

db.prepare(
  "INSERT INTO sessions (sessionId, userId, createdAt) VALUES (?, ?, ?)"
).run(testSessionId, "testuser", Date.now());

// 세션 ID 조회 테스트
const session = getUserFromSession(testSessionId);
if (session && session.userId === "testuser") {
  console.log("세션 ID 조회 성공: ", session.userId);
} else {
  console.error("세션 ID 조회 실패");
}

// 존재하지 않는 세션 ID 조회 테스트
const invalidSession = getUserFromSession("invalid-session-id");
if (invalidSession === undefined) {
  console.log("존재하지 않는 세션 ID -> undefined 반환 성공");
} else {
  console.error("존재하지 않는 세션 ID 조회 실패");
}
console.log("===getUserFromSession() 테스트 끝===");

console.log("====== 유닛 테스트 완료 ======");
// ====== 유닛 테스트 완료 ======
