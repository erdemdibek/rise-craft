const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// GLOBAL LOBİ
let lobby = {
  players: {},
  started: false,
  votes: {}
};

const MACHINES = [
  "Fette 1200","Fette 2200","Kilian KTP 720","Korsch XL 400",
  "Bosch GKF 701","Fette 3200","Korsch XT600",
  "Fette Fe55","Sejong","Fette 2100"
];

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", socket => {
  console.log("Bağlandı:", socket.id);

  socket.on("joinLobby", ({ name }) => {
    if (!name || name.trim() === "") return;

    lobby.players[socket.id] = {
      id: socket.id,
      name,
      x: 300 + Math.random()*200,
      y: 300 + Math.random()*200,
      color: `hsl(${Math.random()*360},70%,50%)`,
      alive: true
    };

    io.emit("lobbyUpdate", lobby.players);
  });

  socket.on("startGame", () => {
    if (Object.keys(lobby.players).length < 2) return;

    lobby.started = true;

    const ids = Object.keys(lobby.players);
    const impostor = ids[Math.floor(Math.random()*ids.length)];

    ids.forEach(id=>{
      io.to(id).emit("role", id === impostor ? "HAIN" : "CALISAN");
    });

    io.emit("gameStart", { machines: MACHINES });
  });

  socket.on("move", ({ x, y }) => {
    if (!lobby.players[socket.id]) return;
    lobby.players[socket.id].x = x;
    lobby.players[socket.id].y = y;
    io.emit("players", lobby.players);
  });

  socket.on("taskDone", () => {
    socket.emit("taskOk");
  });

  socket.on("sabotage", () => {
    io.emit("sabotage", "⚠️ MAKİNE ARIZASI!");
  });

  socket.on("vote", ({ target }) => {
    lobby.votes[socket.id] = target;
    if (Object.keys(lobby.votes).length === Object.keys(lobby.players).length) {
      io.emit("voteEnd");
      lobby.votes = {};
    }
  });

  socket.on("disconnect", () => {
    delete lobby.players[socket.id];
    io.emit("lobbyUpdate", lobby.players);
  });
});

server.listen(PORT, ()=>console.log("SERVER ÇALIŞIYOR", PORT));