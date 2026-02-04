const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

const MACHINES = [
  "Fette 1200","Fette 2200","Kilian KTP 720","Korsch XL 400",
  "Bosch GKF 701","Fette 3200","Korsch XT600","Fette Fe55",
  "Sejong","Fette 2100"
];

let players = {};
let gameStarted = false;
let time = 300;

function startGame() {
  gameStarted = true;

  const ids = Object.keys(players);
  const hainId = ids[Math.floor(Math.random() * ids.length)];

  ids.forEach(id => {
    players[id].role = id === hainId ? "HAIN" : "CALISAN";
  });

  io.emit("gameStart", { players, machines: MACHINES });

  const interval = setInterval(() => {
    time--;
    io.emit("timer", time);

    if (time <= 0) {
      clearInterval(interval);
      gameStarted = false;
      time = 300;
      Object.values(players).forEach(p => {
        p.ready = false;
        p.role = null;
      });
      io.emit("gameOver");
    }
  }, 1000);
}

io.on("connection", socket => {
  socket.on("joinLobby", name => {
    if (!name) return;

    players[socket.id] = {
      id: socket.id,
      name,
      x: 600 + Math.random() * 200,
      y: 400 + Math.random() * 200,
      color: `hsl(${Math.random()*360},70%,50%)`,
      ready: false,
      role: null
    };
    io.emit("players", players);
  });

  socket.on("ready", () => {
    if (!players[socket.id] || gameStarted) return;
    players[socket.id].ready = true;
    io.emit("players", players);

    const readyCount = Object.values(players).filter(p => p.ready).length;
    if (readyCount >= 2) startGame();
  });

  socket.on("move", pos => {
    if (!players[socket.id] || !gameStarted) return;
    players[socket.id].x = pos.x;
    players[socket.id].y = pos.y;
    io.emit("players", players);
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("players", players);
  });
});

server.listen(PORT, () =>
  console.log("Server running on", PORT)
);