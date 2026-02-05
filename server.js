const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const MAP_W = 2000;
const MAP_H = 1200;

let players = [];
let machines = [];
let started = false;

function resetMachines() {
  machines = [];
  let i = 1;
  const xs = [300, 700, 1100, 1500, 1900];
  xs.forEach(x => {
    machines.push({ id: i++, x, y: 300, broken: false, name: "Makine " + (i - 1) });
    machines.push({ id: i++, x, y: 800, broken: false, name: "Makine " + (i - 1) });
  });
}

resetMachines();

io.on("connection", socket => {
  console.log("🟢 Connected:", socket.id);

  socket.on("join", name => {
    const player = {
      id: socket.id,
      name,
      x: Math.random() * MAP_W,
      y: Math.random() * MAP_H,
      color: `hsl(${Math.random() * 360},70%,50%)`,
      alive: true,
      ready: false,
      admin: players.length === 0
    };

    players.push(player);
    sendLobby();
  });

  socket.on("ready", () => {
    const p = players.find(p => p.id === socket.id);
    if (p) p.ready = true;
    sendLobby();
  });

  socket.on("start", () => {
    if (players.length < 4) return;
    if (players.some(p => !p.ready)) return;

    started = true;
    io.emit("gameStarted");
  });

  socket.on("move", ({ dx, dy }) => {
    if (!started) return;

    const p = players.find(p => p.id === socket.id);
    if (!p || !p.alive) return;

    p.x = Math.max(0, Math.min(MAP_W, p.x + dx * 5));
    p.y = Math.max(0, Math.min(MAP_H, p.y + dy * 5));
  });

  socket.on("disconnect", () => {
    players = players.filter(p => p.id !== socket.id);
    if (players.length > 0) players[0].admin = true;
    sendLobby();
  });
});

function sendLobby() {
  io.emit("lobby", {
    players,
    canStart:
      players.length >= 4 &&
      players.every(p => p.ready) &&
      players.some(p => p.admin)
  });
}

setInterval(() => {
  if (!started) return;
  io.emit("state", { players, machines });
}, 50);

server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});