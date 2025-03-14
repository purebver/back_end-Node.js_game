const { DatabaseSync } = require("node:sqlite");

// SQLite 메모리 데이터베이스 생성
const db = new DatabaseSync("database.sqlite");

db.exec("PRAGMA journal_mode=WAL;");

// 사용자 테이블 생성
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, 
  password TEXT NOT NULL,
  address TEXT NOT NULL
)`);
db.exec(`CREATE TABLE IF NOT EXISTS sessions (
  sessionId TEXT PRIMARY KEY, 
  userId TEXT NOT NULL,
  createdAt REAL NOT NULL
)`);
db.exec(`CREATE TABLE IF NOT EXISTS clicks (
  user_id TEXT,
  timestamp REAL
)`);

module.exports = db;
