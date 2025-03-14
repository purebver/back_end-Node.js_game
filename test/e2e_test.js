const net = require("net");
const http = require("http");
const assert = require("assert");

const PORT = 3001;
const HTTP_PORT = 3000;
let client;
let testSessionId = null;
let testSessionId2 = null;
let testSessionId3 = null;

// 세션을 받아온 후 테스트 실행
function setupTestUser(callback) {
  createUser("testuser1", (sessionId1) => {
    testSessionId = sessionId1;
    createUser("testuser2", (sessionId2) => {
      testSessionId2 = sessionId2;
      createUser("testuser3", (sessionId3) => {
        testSessionId3 = sessionId3;
        console.log(`testSessionId: ${testSessionId}`);
        console.log(`testSessionId2: ${testSessionId2}`);
        console.log(`testSessionId3: ${testSessionId3}`);
        console.log("테스트 유저 로그인 완료, db저장 시간 0.5초 대기");
        setTimeout(callback, 500);
      });
    });
  });
}

// 유저 회원가입
function createUser(username, callback) {
  const userData = JSON.stringify({
    id: username,
    password: "testpassword",
    address: "test address",
  });

  const requestOptions = {
    hostname: "127.0.0.1",
    port: HTTP_PORT,
    path: "/signup",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": userData.length,
    },
  };

  const req = http.request(requestOptions, (res) => {
    if (res.statusCode === 201) {
      console.log("회원가입 성공");
      loginUser(username, callback);
    } else {
      console.error("회원가입 실패");
    }
  });

  req.on("error", (err) => {
    console.error("회원가입 요청 실패:", err.message);
  });

  req.write(userData);
  req.end();
}

// 로그인 후 세션 ID 가져오기
function loginUser(username, callback) {
  const loginData = JSON.stringify({
    id: username,
    password: "testpassword",
  });

  const requestOptions = {
    hostname: "127.0.0.1",
    port: HTTP_PORT,
    path: "/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": loginData.length,
    },
  };

  const req = http.request(requestOptions, (res) => {
    let body = "";
    res.on("data", (chunk) => {
      body += chunk;
    });

    res.on("end", () => {
      const response = JSON.parse(body);
      if (response.sessionId) {
        console.log("로그인 성공, 세션 ID:", testSessionId);
        callback(response.sessionId);
      } else {
        console.error("로그인 실패");
      }
    });
  });

  req.on("error", (err) => {
    console.error("로그인 요청 실패:", err.message);
  });

  req.write(loginData);
  req.end();
}

// TCP서버 연결
function connectTCP() {
  client = new net.Socket();
  client.connect(PORT, "127.0.0.1", () => {
    console.log("TCP 서버 연결");

    runTests();
  });

  client.on("error", (err) => {
    console.error("TCP 서버 연결 실패:", err.message);
  });
}

// 테스트 시작
function runTests() {
  testEventNotStarted();
}

function testEventNotStarted() {
  console.log("1. 이벤트 시작 전에 클릭하면 'event not started' 응답");
  console.log(testSessionId);

  client.write(`CLICK ${testSessionId}`);

  client.once("data", (data) => {
    console.log("서버 응답:", data.toString().trim());
    try {
      assert.ok(data.toString().includes("event not started"));
      console.log("테스트 성공");
    } catch (err) {
      console.error("테스트 실패", err.message);
    }
    testInvalidSession();
  });
}

function testInvalidSession() {
  console.log("2. 잘못된 세션 ID로 클릭 시 'Invalid sessionId' 응답");

  setTimeout(() => {
    client.write("CLICK invalid_session_id");

    client.once("data", (data) => {
      console.log("서버 응답:", data.toString().trim());
      try {
        assert.strictEqual(data.toString().trim(), "Invalid sessionId");
        console.log("테스트 성공");
      } catch (err) {
        console.error("테스트 실패", err.message);
      }
      testClickDuringEvent();
    });
  }, 3000);
}

function testClickDuringEvent() {
  console.log("3. 이벤트 진행 중 첫 번째 클릭하면 'Join' 응답");

  client.write(`CLICK ${testSessionId}`);

  client.once("data", (data) => {
    console.log("서버 응답:", data.toString().trim());
    try {
      assert.strictEqual(data.toString().trim(), "Join");
      console.log("테스트 성공");
    } catch (err) {
      console.error("테스트 실패", err.message);
    }
    testDisqualification();
  });
}

function testDisqualification() {
  console.log("1초 내 4회 이상 클릭하면 'Disqualified' 응답");

  const receivedResponses = [];
  let count = 0;

  const interval = setInterval(() => {
    if (count >= 5) {
      clearInterval(interval); // 5번 실행 후 인터벌 정리
      return;
    }
    client.write(`CLICK ${testSessionId}`);
    count++;
  }, 200);

  client.on("data", (data) => {
    receivedResponses.push(data.toString().trim());
    console.log("서버 응답:", data.toString().trim());
    if (receivedResponses.length === 5) {
      try {
        assert.ok(data.toString().includes("Disqualified"));
        console.log("테스트 성공");
      } catch (err) {
        console.error("테스트 실패", err.message);
      }
      testNoClickDisqualification();
    }
  });
}

function testNoClickDisqualification() {
  console.log("5. 10초 동안 클릭이 없으면 'Disqualified' 응답");

  setTimeout(() => {
    client.write(`CLICK ${testSessionId2}`);

    setTimeout(() => {
      client.write(`CLICK ${testSessionId2}`);

      client.once("data", (data) => {
        console.log("서버 응답:", data.toString().trim());
        try {
          assert.ok(data.toString().includes("Disqualified"));
          console.log("테스트 성공");
        } catch (err) {
          console.error("테스트 실패", err.message);
        }
        testEventEnd();
      });
    }, 11000);
  }, 3000);
}

function testEventEnd() {
  console.log("6. 이벤트 종료 후 클릭하면 'event end' 응답");

  setTimeout(() => {
    client.write(`CLICK ${testSessionId3}`);

    client.once("data", (data) => {
      console.log("서버 응답:", data.toString().trim());
      try {
        assert.ok(data.toString().includes("event end"));
        console.log("모든 테스트 완료!");
      } catch (err) {
        console.error("테스트 실패", err.message);
      }
      client.destroy(); // 테스트 종료 후 TCP 연결 닫기
    });
  }, 53000);
}

setupTestUser(connectTCP);
