const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = 3000;

const PLAYER_SPEED = 150;

const machineNames = [
  "Fette 1200","Fette 2200","Fette 3200","Fette Fe55",
  "Korsch XT600","Korsch XL400","Bosch GKF701",
  "Kilian KTP720","Sejong","Fette 2100"
];

let lobbies = {};

io.on("connection", socket => {

  socket.on("joinLobby", ({ lobbyId, name }) => {
    if (!lobbies[lobbyId]) {
      lobbies[lobbyId] = {
        hostId: socket.id,
        players: {},
        ready: {},
        machines: {},
        roles: {},
        inputs: {},
        votes: {},
        gameStarted: false
      };
      machineNames.forEach(m => lobbies[lobbyId].machines[m] = "ok");
    }

    lobbies[lobbyId].players[socket.id] = {
      name,
      alive: true,
      x: 400,
      y: 500
    };

    lobbies[lobbyId].ready[socket.id] = false;
    lobbies[lobbyId].inputs[socket.id] = { dirX: 0, dirY: 0 };

    socket.join(lobbyId);
    io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
  });

  socket.on("setReady", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    lobby.ready[socket.id] = true;
    io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
  });

  socket.on("startGame", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby || lobby.gameStarted) return;

    const allReady = Object.values(lobby.ready).every(r => r);
    if (!allReady) return;

    const ids = Object.keys(lobby.players);
    const hainId = ids[Math.floor(Math.random() * ids.length)];

    ids.forEach(id => {
      lobby.roles[id] = id === hainId ? "hain" : "operatör";
    });

    lobby.gameStarted = true;

    io.to(lobbyId).emit("gameStart", {
      roles: lobby.roles,
      machines: lobby.machines,
      players: lobby.players
    });
  });

  socket.on("playerInput", ({ lobbyId, dirX, dirY }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.players[socket.id]) return;
    lobby.inputs[socket.id] = { dirX, dirY };
  });

  socket.on("killPlayer", ({ lobbyId, targetId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    if (lobby.roles[socket.id] !== "hain") return;

    const killer = lobby.players[socket.id];
    const target = lobby.players[targetId];

    if (!killer || !target || !target.alive) return;

    const dx = killer.x - target.x;
    const dy = killer.y - target.y;
    if (Math.sqrt(dx*dx + dy*dy) > 80) return;

    target.alive = false;

    io.to(lobbyId).emit("playerKilled", {
      targetId,
      x: target.x,
      y: target.y
    });

    checkGameEnd(lobbyId);
  });

  socket.on("startVote", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    lobby.votes = {};

    const alive = Object.entries(lobby.players)
      .filter(([_, p]) => p.alive)
      .map(([id, p]) => ({ id, name: p.name }));

    io.to(lobbyId).emit("voteStart", { players: alive });

    setTimeout(() => {
      const counts = {};
      Object.values(lobby.votes).forEach(id => counts[id] = (counts[id] || 0) + 1);

      let max = 0, eliminated = null;
      Object.entries(counts).forEach(([id, c]) => {
        if (c > max) { max = c; eliminated = id; }
      });

      if (!eliminated) return;

      lobby.players[eliminated].alive = false;

      io.to(lobbyId).emit("playerEliminated", {
        targetId: eliminated,
        x: lobby.players[eliminated].x,
        y: lobby.players[eliminated].y
      });

      checkGameEnd(lobbyId);
    }, 15000);
  });

  socket.on("castVote", ({ lobbyId, targetId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.players[socket.id]?.alive) return;
    lobby.votes[socket.id] = targetId;
  });

  socket.on("disconnect", () => {
    Object.keys(lobbies).forEach(lobbyId => {
      const lobby = lobbies[lobbyId];
      delete lobby.players[socket.id];
      delete lobby.ready[socket.id];
      delete lobby.roles[socket.id];
      delete lobby.inputs[socket.id];
      io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
    });
  });
});

function getLobbyInfo(lobbyId) {
  const lobby = lobbies[lobbyId];
  return {
    hostId: lobby.hostId,
    players: Object.entries(lobby.players).map(([id, p]) => ({
      id, name: p.name, alive: p.alive
    })),
    ready: lobby.ready
  };
}

function checkGameEnd(lobbyId) {
  const lobby = lobbies[lobbyId];
  const alive = Object.entries(lobby.players).filter(([_, p]) => p.alive);
  const hains = alive.filter(([id]) => lobby.roles[id] === "hain");
  const ops = alive.filter(([id]) => lobby.roles[id] === "operatör");

  if (hains.length === 0)
    io.to(lobbyId).emit("gameOver", { winner: "Operatörler" });
  else if (hains.length >= ops.length)
    io.to(lobbyId).emit("gameOver", { winner: "Hain" });
}

setInterval(() => {
  Object.values(lobbies).forEach(lobby => {
    if (!lobby.gameStarted) return;

    Object.entries(lobby.players).forEach(([id, p]) => {
      if (!p.alive) return;
      const i = lobby.inputs[id];
      if (!i) return;

      p.x += i.dirX * PLAYER_SPEED / 60;
      p.y += i.dirY * PLAYER_SPEED / 60;

      io.emit("updatePlayerPosition", { id, x: p.x, y: p.y });
    });
  });
}, 1000 / 60);

server.listen(PORT, () => console.log("Server running", PORT));