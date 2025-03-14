const { DatabaseSync } = require("node:sqlite");

// SQLite 메모리 데이터베이스 생성
const db = new DatabaseSync(":memory:");

// 사용자 테이블 생성
db.exec(`CREATE TABLE users (
  id TEXT PRIMARY KEY, 
  password TEXT NOT NULL,
  address TEXT NOT NULL
)`);
db.exec(`CREATE TABLE sessions (
  sessionId TEXT PRIMARY KEY, 
  userId TEXT NOT NULL,
  createdAt REAL NOT NULL
)`);
db.exec(`CREATE TABLE clicks (
  user_id TEXT,
  timestamp REAL
)`);

module.exports = db;
