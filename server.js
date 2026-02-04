const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

const lobby = {
  players: {},
  gameStarted: false,
  machines: [
    "Fette 1200","Fette 2200","Kilian KTP 720","Korsch XL 400",
    "Bosch GKF 701","Fette 3200","Korsch XT600","Fette Fe55",
    "Sejong","Fette 2100"
  ],
  sabotage: null,
  votes: {}
};

// SOCKET.IO
io.on("connection", socket => {
  console.log("🔌 Bağlandı:", socket.id);

  socket.on("joinLobby", ({ name }) => {
    if(!name) return;
    lobby.players[socket.id] = {
      id: socket.id,
      name,
      x: Math.random()*800+100,
      y: Math.random()*600+100,
      color: `hsl(${Math.random()*360},70%,50%)`,
      role: null,
      taskDone: false
    };
    io.emit("lobbyUpdate", Object.values(lobby.players));
  });

  socket.on("startGame", () => {
    if(lobby.gameStarted) return;
    lobby.gameStarted = true;

    // Rastgele hain seç
    const ids = Object.keys(lobby.players);
    const hainId = ids[Math.floor(Math.random()*ids.length)];
    ids.forEach(id=>{
      if(id===hainId) lobby.players[id].role="HAIN";
      else lobby.players[id].role="CALISAN";
    });

    io.emit("gameStart", lobby.machines);
    io.emit("lobbyUpdate", Object.values(lobby.players));
  });

  socket.on("move", ({ x, y })=>{
    if(lobby.players[socket.id]){
      lobby.players[socket.id].x = x;
      lobby.players[socket.id].y = y;
      io.emit("lobbyUpdate", Object.values(lobby.players));
    }
  });

  socket.on("taskDone", () => {
    if(!lobby.players[socket.id] || lobby.players[socket.id].role==="HAIN") return;
    lobby.players[socket.id].taskDone = true;

    const allDone = Object.values(lobby.players)
      .filter(p=>p.role==="CALISAN")
      .every(p=>p.taskDone);

    if(allDone){
      io.emit("gameEnd","🟢 TÜM GÖREVLER TAMAMLANDI – ÇALIŞANLAR KAZANDI");
      lobby.gameStarted=false;
    }
  });

  socket.on("sabotage", (machine) => {
    if(!lobby.players[socket.id] || lobby.players[socket.id].role!=="HAIN") return;
    lobby.sabotage = machine;
    io.emit("sabotageStart", machine);
  });

  socket.on("fix", () => {
    lobby.sabotage = null;
    io.emit("sabotageEnd");
  });

  socket.on("voteStart", () => {
    lobby.votes = {};
    io.emit("voteStart");
  });

  socket.on("vote", (targetId) => {
    lobby.votes[socket.id] = targetId;

    if(Object.keys(lobby.votes).length === Object.keys(lobby.players).length){
      const counts = {};
      Object.values(lobby.votes).forEach(id => counts[id] = (counts[id]||0)+1);
      const maxVoteId = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
      if(lobby.players[maxVoteId].role==="HAIN"){
        io.emit("gameEnd","🟢 HAİN YAKALANDI – ÇALIŞANLAR KAZANDI");
      } else {
        io.emit("voteFail");
      }
    }
  });

  socket.on("disconnect", () => {
    delete lobby.players[socket.id];
    io.emit("lobbyUpdate", Object.values(lobby.players));
  });
});

server.listen(PORT, ()=>console.log("🚀 Server çalışıyor:",PORT));