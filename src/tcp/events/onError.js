const onError = (socket) => (err) => {
  console.log("소켓 에러", err.message);
};

module.exports = onError;
