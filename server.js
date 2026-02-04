const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// LOBİ
let lobby = { players: {}, ready: {} };

const MACHINES = [
  "Fette 1200","Fette 2200","Kilian KTP 720","Korsch XL 400",
  "Bosch GKF 701","Fette 3200","Korsch XT600",
  "Fette Fe55","Sejong","Fette 2100"
];

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", socket => {
  console.log("Bağlanan:", socket.id);

  socket.on("joinLobby", ({ name }) => {
    if(!name) return;
    lobby.players[socket.id] = {
      id: socket.id,
      name,
      x: 300 + Math.random()*200,
      y: 300 + Math.random()*200,
      color: `hsl(${Math.random()*360},70%,50%)`,
      alive: true
    };
    lobby.ready[socket.id] = false;
    io.emit("lobbyUpdate", lobby.players);
  });

  socket.on("setReady", () => {
    if(lobby.ready[socket.id]!==undefined)
      lobby.ready[socket.id]=true;

    // Tüm oyuncular hazırsa oyun başlar
    if(Object.values(lobby.ready).every(r=>r)) {
      const ids = Object.keys(lobby.players);
      const impostor = ids[Math.floor(Math.random()*ids.length)];
      ids.forEach(id=>{
        io.to(id).emit("role", id===impostor ? "HAIN":"CALISAN");
      });
      io.emit("gameStart", { machines: MACHINES });
    }
  });

  socket.on("move", ({ x, y })=>{
    if(lobby.players[socket.id]){
      lobby.players[socket.id].x = x;
      lobby.players[socket.id].y = y;
      io.emit("players", lobby.players);
    }
  });

  socket.on("taskDone", ()=>{ socket.emit("taskOk"); });
  socket.on("sabotage", ()=>{ io.emit("sabotage","⚠️ MAKİNE ARIZASI!"); });
  socket.on("vote", ()=>{ io.emit("voteStart"); });

  socket.on("disconnect", ()=>{
    delete lobby.players[socket.id];
    delete lobby.ready[socket.id];
    io.emit("lobbyUpdate", lobby.players);
  });
});

server.listen(PORT, ()=>console.log("Server çalışıyor:", PORT));