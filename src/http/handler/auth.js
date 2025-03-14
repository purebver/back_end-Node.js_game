const db = require("../../db/database.js");
const crypto = require("crypto");
const { performance } = require("perf_hooks");

// 비밀번호 해싱
const hashPassword = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

// 회원가입
const signup = (req, res) => {
  let body = "";

  // 데이터 수신
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    const { id, password, address } = JSON.parse(body);

    // 유효성 검사
    if (!id || !password || !address) {
      res.writeHead(400);
      return res.end("유효하지않은 입력입니다.");
    }

    const existingUser = db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(id);
    if (existingUser) {
      res.writeHead(409);
      return res.end("이미 가입된 유저입니다.");
    }

    // 가입 처리
    const hashedPassword = hashPassword(password);
    db.prepare(
      "INSERT INTO users (id, password, address) VALUES (?, ?, ?)"
    ).run(id, hashedPassword, address);
    res.writeHead(201);
    res.end("가입되었습니다.");
  });
};

// 로그인
const login = (req, res) => {
  let body = "";

  // 데이터 수신
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    const { id, password } = JSON.parse(body);

    // 유효성 검사
    if (!id || !password) {
      res.writeHead(400);
      return res.end("유효하지않은 입력입니다.");
    }
    const user = db
      .prepare("SELECT id, password FROM users WHERE id = ?")
      .get(id);
    if (!user) {
      res.writeHead(401);
      return res.end("아이디 또는 비밀번호가 다릅니다.");
    }

    const hashedPassword = hashPassword(password);
    if (hashedPassword !== user.password) {
      res.writeHead(401);
      return res.end("아이디 또는 비밀번호가 다릅니다.");
    }

    // 세션 생성
    const sessionId = crypto.randomUUID();
    const createdAt = performance.now();

    // 세션 저장
    db.prepare(
      "INSERT INTO sessions (sessionId, userId, createdAt) VALUES (?, ?, ?)"
    ).run(sessionId, id, createdAt);

    // 세션 확인
    const checkSession = db
      .prepare("SELECT * FROM sessions WHERE userId = ?")
      .get(id);
    console.log("DB에서 가져온 세션:", checkSession);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ sessionId }));
  });
};

module.exports = { signup, login };
