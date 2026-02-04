const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Sabit makineler
const MACHINES = [
  "Fette 1200", "Fette 2200", "Kilian KTP 720", "Korsch XL 400",
  "Bosch GKF 701", "Fette 3200", "Korsch XT600", "Fette Fe55",
  "Sejong", "Fette 2100"
];

// GLOBAL STATE
let players = {};
let gameStarted = false;
let activeSabotage = null;
let timer = 300;

// STATİK DOSYALAR
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// OYUN FONKSİYONLARI
function startGame() {
  gameStarted = true;
  const activePlayers = Object.values(players);

  // Hain seç
  const h = activePlayers[Math.floor(Math.random() * activePlayers.length)];
  activePlayers.forEach(p => {
    p.role = p.id === h.id ? "HAIN" : "CALISAN";
  });

  io.emit("gameStart", {
    players: activePlayers,
    machines: MACHINES
  });

  // Timer loop
  const interval = setInterval(() => {
    timer--;
    io.emit("timer", timer);

    if (timer <= 0 || activePlayers.every(p => p.role === "HAIN" || p.taskDone)) {
      io.emit("gameOver", "⏱️ OYUN BİTTİ");
      clearInterval(interval);
      gameStarted = false;
      timer = 300;
      activeSabotage = null;
      // Reset oyuncular
      Object.values(players).forEach(p => {
        p.ready = false;
        p.taskDone = false;
        p.role = null;
      });
    }
  }, 1000);
}

// SOCKET.IO
io.on("connection", socket => {
  console.log("Bağlanan:", socket.id);

  // Lobiye giriş
  socket.on("joinLobby", name => {
    players[socket.id] = {
      id: socket.id,
      name,
      ready: false,
      role: null,
      x: 300 + Math.random() * 400,
      y: 300 + Math.random() * 300,
      color: `hsl(${Math.random()*360},70%,50%)`,
      taskDone: false
    };
    io.emit("players", players);
  });

  // Hazırım butonu
  socket.on("ready", () => {
    if (!players[socket.id] || gameStarted) return;
    players[socket.id].ready = true;
    io.emit("players", players);

    const readyPlayers = Object.values(players).filter(p => p.ready);
    if (readyPlayers.length >= 2) startGame();
  });

  // Hareket
  socket.on("move", ({x,y}) => {
    if (!players[socket.id] || !gameStarted) return;
    players[socket.id].x = x;
    players[socket.id].y = y;
    io.emit("players", players);
  });

  // Mini görev tamamlandı
  socket.on("taskDone", () => {
    if (!players[socket.id] || !gameStarted) return;
    players[socket.id].taskDone = true;
    io.emit("players", players);
  });

  // Sabotaj başlat
  socket.on("sabotage", () => {
    if (!players[socket.id] || players[socket.id].role !== "HAIN") return;
    activeSabotage = MACHINES[Math.floor(Math.random() * MACHINES.length)];
    io.emit("sabotage", activeSabotage);
  });

  // Sabotaj çöz
  socket.on("fix", () => {
    activeSabotage = null;
    io.emit("sabotageFix");
  });

  // Oylama başlat
  socket.on("voteStart", () => {
    io.emit("voteStart");
  });

  // Disconnect
  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("players", players);
  });
});

// SERVER START
server.listen(PORT, () => {
  console.log(`Server çalışıyor: ${PORT}`);
});