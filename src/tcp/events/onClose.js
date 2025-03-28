const onClose = (socket, userSockets) => () => {
  for (const [userId, sock] of userSockets.entries()) {
    if (sock === socket) {
      userSockets.delete(userId);
    }
  }
};

module.exports = onClose;
