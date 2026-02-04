const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Lobi ve oyun durumu
const lobby = {
  players: {},       // socket.id -> { id, name, x, y, color }
  ready: {},         // socket.id -> hazır mı
  started: false,
  sabotage: null,
  time: 300,         // oyun süresi
};

// Harita ve makineler
const machines = [
  { name: "Fette 1200", x: 300, y: 300 },
  { name: "Fette 2200", x: 650, y: 300 },
  { name: "Kilian KTP 720", x: 1000, y: 300 },
  { name: "Korsch XL 400", x: 1350, y: 300 },
  { name: "Bosch GKF 701", x: 1700, y: 300 },
  { name: "Fette 3200", x: 300, y: 700 },
  { name: "Korsch XT600", x: 650, y: 700 },
  { name: "Fette Fe55", x: 1000, y: 700 },
  { name: "Sejong", x: 1350, y: 700 },
  { name: "Fette 2100", x: 1700, y: 700 },
];

// Statik dosyalar
app.use(express.static(path.join(__dirname, "public")));

// Ana sayfa
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.io
io.on("connection", (socket) => {
  console.log("Bağlanan:", socket.id);

  socket.on("joinLobby", ({ name }, callback) => {
    if (!name) return callback({ error: "İsim girin!" });
    if (lobby.started) return callback({ error: "Oyun başladı, bekleyin!" });

    const color = `hsl(${Math.random()*360},70%,50%)`;
    lobby.players[socket.id] = { id: socket.id, name, x: 100, y: 100, color };
    lobby.ready[socket.id] = false;

    io.emit("lobbyUpdate", { players: Object.values(lobby.players), ready: lobby.ready });
    callback({ success: true, machines });
  });

  socket.on("playerReady", () => {
    if (!lobby.players[socket.id]) return;
    lobby.ready[socket.id] = true;

    io.emit("lobbyUpdate", { players: Object.values(lobby.players), ready: lobby.ready });

    // Tüm oyuncular hazırsa oyun başlasın
    const allReady = Object.keys(lobby.players).length > 0 && Object.values(lobby.ready).every(v => v);
    if (allReady && !lobby.started) startGame();
  });

  socket.on("move", ({ x, y }) => {
    if (!lobby.started) return;
    if (lobby.players[socket.id]) {
      lobby.players[socket.id].x = x;
      lobby.players[socket.id].y = y;
      io.emit("state", { players: lobby.players, sabotage: lobby.sabotage, time: lobby.time });
    }
  });

  socket.on("taskDone", () => {
    // basit görev tamamlandı
    socket.emit("taskDoneAck", "Görev tamamlandı!");
  });

  socket.on("sabotage", () => {
    if (!lobby.started) return;
    lobby.sabotage = "Makinede sabotaj!";
    io.emit("sabotage", lobby.sabotage);

    setTimeout(() => {
      lobby.sabotage = null;
      io.emit("sabotage", null);
    }, 5000); // animasyon 5 saniye
  });

  socket.on("disconnect", () => {
    delete lobby.players[socket.id];
    delete lobby.ready[socket.id];
    io.emit("lobbyUpdate", { players: Object.values(lobby.players), ready: lobby.ready });
  });
});

// Oyun başlatma
function startGame() {
  lobby.started = true;
  lobby.time = 300;
  io.emit("gameStart", { players: lobby.players, machines });

  // Oyun süresi sayaç
  const timer = setInterval(() => {
    if (lobby.time <= 0) {
      clearInterval(timer);
      io.emit("gameEnd", "⏱ Süre doldu, oyun bitti!");
      lobby.started = false;
      for (let id in lobby.ready) lobby.ready[id] = false;
      io.emit("lobbyUpdate", { players: Object.values(lobby.players), ready: lobby.ready });
    } else {
      lobby.time--;
      io.emit("time", lobby.time);
    }
  }, 1000);
}

// Server
server.listen(PORT, () => console.log(`Server çalışıyor: ${PORT}`));