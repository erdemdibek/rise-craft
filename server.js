const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const lobby = {
  players: {},
  started: false,
  hainId: null,
  machines: [
    "Fette 1200",
    "Fette 2200",
    "Kilian KTP 720",
    "Korsch XL 400",
    "Bosch GKF 701",
    "Fette 3200",
    "Korsch XT600",
    "Fette Fe55",
    "Sejong",
    "Fette 2100"
  ],
  tasks: {},
  sabotages: {},
  votes: {}
};

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

io.on("connection", socket => {
  console.log("Bağlanan:", socket.id);

  // Lobbyye gir
  socket.on("joinLobby", ({ name }) => {
    if (!name) return;
    lobby.players[socket.id] = { id: socket.id, name, x: 100, y: 100, color: `hsl(${Math.random()*360},70%,50%)` };
    io.emit("lobbyUpdate", lobby.players);
  });

  // Hazır ve oyun başlat
  socket.on("startGame", () => {
    if (lobby.started) return;
    if (Object.keys(lobby.players).length < 2) return;

    lobby.started = true;
    const ids = Object.keys(lobby.players);
    lobby.hainId = ids[Math.floor(Math.random() * ids.length)];

    ids.forEach(id => {
      if (id === lobby.hainId) io.to(id).emit("role", "HAIN");
      else io.to(id).emit("role", "CALISAN");
      lobby.tasks[id] = { completed: false };
    });

    io.emit("gameStart", lobby.machines);
  });

  // Hareket
  socket.on("move", ({ x, y }) => {
    if (!lobby.players[socket.id]) return;
    lobby.players[socket.id].x = x;
    lobby.players[socket.id].y = y;
    io.emit("updatePlayers", lobby.players);
  });

  // Görev tamamlama
  socket.on("taskDone", () => {
    if (socket.id === lobby.hainId) return;
    lobby.tasks[socket.id].completed = true;

    // Kazanan kontrol
    const remaining = Object.values(lobby.tasks).some(t => !t.completed);
    if (!remaining) io.emit("gameEnd", "🟢 ÇALIŞANLAR KAZANDI!");
  });

  // Sabotaj
  socket.on("sabotage", () => {
    if (socket.id !== lobby.hainId) return;
    const machine = lobby.machines[Math.floor(Math.random()*lobby.machines.length)];
    lobby.sabotages[machine] = true;
    io.emit("sabotage", machine);
  });

  // Sabotaj çöz
  socket.on("fix", () => {
    lobby.sabotages = {};
    io.emit("sabotageResolved");
  });

  // Oylama başlat
  socket.on("voteStart", () => {
    lobby.votes = {};
    io.emit("voteStart");
  });

  socket.on("vote", ({ targetId }) => {
    lobby.votes[socket.id] = targetId;

    if (Object.keys(lobby.votes).length === Object.keys(lobby.players).length) {
      const counts = {};
      Object.values(lobby.votes).forEach(id => counts[id] = (counts[id]||0)+1);
      const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
      if (top === lobby.hainId) io.emit("gameEnd","🟢 HAİN YAKALANDI! ÇALIŞANLAR KAZANDI!");
      else io.emit("voteFail","⚠ Hain yakalanamadı. Oyun devam ediyor!");
    }
  });

  socket.on("disconnect", () => {
    delete lobby.players[socket.id];
    io.emit("lobbyUpdate", lobby.players);
    console.log("Ayrıldı:", socket.id);
  });
});

server.listen(PORT, () => console.log(`Server çalışıyor: ${PORT}`));