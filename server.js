const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const lobbies = {}; // lobbyId: { players: [], ready: [], roles: {}, machines: {} }

const MACHINE_NAMES = [
  "Fette 1200","Fette 2200","Fette 3200","Fette Fe55",
  "Korsch XT600","Korsch XL400","Bosch GKF701","Kilian KTP720",
  "Sejong","Fette 2100"
];

io.on("connection", socket => {
  console.log("Player connected:", socket.id);

  socket.on("joinLobby", ({ lobbyId, name }) => {
    if (!lobbies[lobbyId]) {
      lobbies[lobbyId] = {
        players: [],
        ready: {},
        roles: {},
        machines: MACHINE_NAMES.reduce((acc, m) => (acc[m] = "ok", acc), {})
      };
    }
    const lobby = lobbies[lobbyId];
    lobby.players.push({ id: socket.id, name, alive: true });
    lobby.ready[socket.id] = false;
    socket.join(lobbyId);

    io.to(lobbyId).emit("lobbyUpdate", lobby);
  });

  socket.on("setReady", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    lobby.ready[socket.id] = true;
    io.to(lobbyId).emit("lobbyUpdate", lobby);
  });

  socket.on("startGame", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    // roller
    const players = [...lobby.players];
    const hainIndex = Math.floor(Math.random() * players.length);
    players.forEach((p, i) => {
      lobby.roles[p.id] = (i === hainIndex) ? "hain" : "operator";
    });

    io.to(lobbyId).emit("gameStart", { roles: lobby.roles, machines: lobby.machines });
  });

  socket.on("killPlayer", ({ lobbyId, targetId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    if (lobby.roles[socket.id] !== "hain") return;

    const target = lobby.players.find(p => p.id === targetId);
    if (target) {
      target.alive = false;
      io.to(lobbyId).emit("playerKilled", { targetId });
    }
  });

  socket.on("repairMachine", ({ lobbyId, machineName }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;
    lobby.machines[machineName] = "ok";
    io.to(lobbyId).emit("machineRepaired", { machineName });
  });

  socket.on("disconnect", () => {
    for (const lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];
      lobby.players = lobby.players.filter(p => p.id !== socket.id);
      delete lobby.ready[socket.id];
      delete lobby.roles[socket.id];
      io.to(lobbyId).emit("lobbyUpdate", lobby);
    }
  });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));