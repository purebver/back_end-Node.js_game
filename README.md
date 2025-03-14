# back_end(Node.js_game)

## 프로젝트 설명

### 본 프로젝트는 바로인턴 Node.js 게임서버 과제 프로젝트입니다.

---

---

## 프로젝트 목표(과제 체크리스트)

### 이벤트 개요

- 1분 동안 특정 마스코트를 가장 많이 클릭한 사용자가 우승 - V

### 이벤트 규칙(7항목)

- 1분 내의 클릭만 인정 - V
- 1초 내에 4회이상 클릭시 실격 => 클릭 시간 [0.7, 0.9, 1.1, 1.4] 일경우 0.7 ~ 1.7초 내에 4회 클릭한 것으로 실격 - V
- 회원가입 필수 - V
- 첫 클릭은 참여를 나타냄 - V
- 10초안에 클릭이 없으면 실격 - V
- 실격 시 재참여 불가능 - V
- 클릭수가 같을 경우 1마이크로초라도 더 빨리 클릭수에 도달한 유저가 우승 - V

### 개발 요구사항(6항목)

- 클릭요청은 TCP - V
- 회원가입은 HTTP - V
- 버그 방지를 위해 e2e 및 유닛 테스트 작성(e2e테스트 외 네트워크 요청 불가) - V
- 클러스터 모드로 멀티 프로세스 실행 - V
- 우승자 정보 조회 기능 - V
- Node.js 내장 모듈만 사용 - V

---

---

## 프로젝트 구조

📂 src/db

- database.js:
  - SQLite 설정 및 초기 테이블 생성
  - users, sessions, clicks 테이블 관리
  - 메모리 DB 사용 (서버 종료 시 초기화됨)

📂 src/http

- handler/auth.js:
  - HTTP 회원가입 및 로그인 처리
  - POST /signup
    - 요청: { id, password, address }
    - 응답: { message: "가입되었습니다." }
  - POST /login
    - 요청: { id, password }
    - 응답: { sessionId: "abcd-efgh-ijkl-mnop" }
    - 발급된 sessionId를 TCP 클릭 이벤트에서 사용
- httpServer.js:
  - HTTP 서버 실행 (포트: 3000)
  - 회원가입 및 로그인 API 제공

📂 src/tcp

- handler/clickHandler.js:
  - 클릭 이벤트 처리
  - 유효한 세션인지 확인
  - 초당 4회 클릭 초과 → 실격
  - 10초 미입력 → 실격
  - 클릭 성공 시 DB 저장
  - 워크 프로세스와 통신
- Utils/user.js:
  - 유저 상태 관리
  - getUserFromSession(): 세션에서 유저 정보 가져오기
  - disqualifyUser(): 유저 실격 처리
  - checkInactiveUsers(): 10초 동안 클릭 없는 유저 실격 처리
  - determineWinner(): 우승자 판별
- tcpServer.js:
  - TCP 서버 실행 (포트: 3001)
  - cluster를 사용해 멀티 프로세스 처리
  - CLICK {sessionId} 요청 처리
  - 이벤트 시작 전/종료 후 요청 차단
  - 워크 프로세스에 이벤트 분배 및 응답
  - 1분 후 우승자 판별

📂 src

- app.js:
  - HTTP & TCP 서버 통합 실행
  - cluster를 이용한 멀티 프로세스 관리
  - node app.js 실행 시 자동으로 시작됨

📂 test

- e2e_test.js:
  - 회원가입 → 로그인 → 클릭 → 실격 → 우승자 판별
  - 네트워크를 포함한 통합 테스트
- unit_test.js:
  - 개별 함수에 대한 유닛 테스트
  - 통신 없이 checkInactiveUsers(), clickHandler(), determineWinner(), getUserFromSession() 테스트

---

---

## e2e 테스트 실행 방법(현재 상태 1, 2 되어있음)

1. tcpServer.js의 21~28줄 주석 해제
2. tcpServer.js의 30~37줄 주석 처리
3. src/app.js 실행
4. src/app.js 실행 후 3초 안에 test/e2e_test.js 실행
