const http = require("http");
const { signup, login } = require("./handler/auth.js");

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/signup") {
    signup(req, res);
  } else if (req.method === "POST" && req.url === "/login") {
    login(req, res);
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

const PORT = 3000;

server.listen(PORT, () => console.log(`HTTP 서버 ${PORT}포트에 실행`));
