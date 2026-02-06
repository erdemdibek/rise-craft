const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

// --- Lobby ve oyun verileri ---
let lobbies = {}; 
// Lobby yapısı:
// lobbies[lobbyId] = {
//    players: { socketId: { name, alive: true } },
//    ready: { socketId: true/false },
//    machines: { machineName: "ok" / "bozuk" },
//    roles: { socketId: "hain"/"operatör" },
//    gameStarted: false
// }

const machineNames = ["Fette 1200","Fette 2200","Fette 3200","Fette Fe55","Korsch XT600",
                      "Korsch XL400","Bosch GKF701","Kilian KTP720","Sejong","Fette 2100"];

io.on("connection", (socket) => {

  // --- Lobby join ---
  socket.on("joinLobby", ({ lobbyId, name }) => {
    if(!lobbies[lobbyId]){
      lobbies[lobbyId] = { players: {}, ready: {}, machines: {}, roles: {}, gameStarted: false };
      machineNames.forEach(m => lobbies[lobbyId].machines[m]="ok");
    }
    lobbies[lobbyId].players[socket.id] = { name, alive: true };
    lobbies[lobbyId].ready[socket.id] = false;
    io.to(socket.id).emit("lobbyUpdate", getLobbyInfo(lobbyId));
    io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
    socket.join(lobbyId);
  });

  // --- Hazır / start ---
  socket.on("setReady", ({ lobbyId }) => {
    if(lobbies[lobbyId]){
      lobbies[lobbyId].ready[socket.id] = true;
      io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
    }
  });

  socket.on("startGame", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby) return;
    if(lobby.gameStarted) return;

    // Rol atama: 1 hain, diğerleri operatör
    const playerIds = Object.keys(lobby.players);
    const hainIndex = Math.floor(Math.random()*playerIds.length);
    playerIds.forEach((id, idx) => {
      lobby.roles[id] = (idx===hainIndex) ? "hain" : "operatör";
    });

    lobby.gameStarted = true;
    io.to(lobbyId).emit("gameStart", { roles: lobby.roles, machines: lobby.machines });
  });

  // --- Hain öldürme ---
  socket.on("killPlayer", ({ lobbyId, targetId }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby) return;
    if(lobby.roles[socket.id]!=="hain") return; // sadece hain öldürebilir
    if(!lobby.players[targetId] || !lobby.players[targetId].alive) return;

    lobby.players[targetId].alive = false;
    io.to(lobbyId).emit("playerKilled", { targetId });
    checkGameEnd(lobbyId);
  });

  // --- Operatör tamir ---
  socket.on("repairMachine", ({ lobbyId, machineName }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby) return;
    if(lobby.roles[socket.id]!=="operatör") return;
    if(!lobby.machines[machineName]) return;

    lobby.machines[machineName] = "ok";
    io.to(lobbyId).emit("machineRepaired", { machineName });
  });

  // --- Makine bozulması (rastgele) ---
  setInterval(()=>{
    Object.keys(lobbies).forEach(lobbyId=>{
      const lobby = lobbies[lobbyId];
      if(!lobby.gameStarted) return;
      const brokenMachines = Object.keys(lobby.machines).filter(m=>lobby.machines[m]==="bozuk");
      const healthyMachines = Object.keys(lobby.machines).filter(m=>lobby.machines[m]==="ok");
      if(healthyMachines.length===0) return;
      const randomMachine = healthyMachines[Math.floor(Math.random()*healthyMachines.length)];
      lobby.machines[randomMachine]="bozuk";
      io.to(lobbyId).emit("machineBroken", { machineName: randomMachine });
    });
  }, 30000); // her 30 saniyede bir makine bozulabilir

  // --- Toplantı başlat / oylama ---
  socket.on("startVote", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby) return;

    const alivePlayers = Object.entries(lobby.players).filter(([id,p])=>p.alive).map(([id,p])=>({id,name:p.name}));
    io.to(lobbyId).emit("voteStart",{ players: alivePlayers });

    // 20 saniye sonra oylama sonucu
    setTimeout(()=>{
      const votes = {}; // { playerId: oySayisi }
      Object.keys(alivePlayers).forEach(p=>votes[alivePlayers[p].id]=0);
      // örnek: rastgele oylama simülasyonu (client gerçek oyları gönderirse bunu güncelle)
      const randomIndex = Math.floor(Math.random()*alivePlayers.length);
      const eliminatedId = alivePlayers[randomIndex].id;
      lobby.players[eliminatedId].alive=false;
      io.to(lobbyId).emit("playerEliminated",{ targetId: eliminatedId });
      checkGameEnd(lobbyId);
    }, 20000);
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    Object.keys(lobbies).forEach(lobbyId=>{
      const lobby = lobbies[lobbyId];
      delete lobby.players[socket.id];
      delete lobby.ready[socket.id];
      delete lobby.roles[socket.id];
      io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
    });
  });
});

// --- Yardımcı fonksiyonlar ---
function getLobbyInfo(lobbyId){
  const lobby = lobbies[lobbyId];
  return {
    players: Object.entries(lobby.players).map(([id,p])=>({id,name:p.name})),
    ready: lobby.ready
  };
}

function checkGameEnd(lobbyId){
  const lobby = lobbies[lobbyId];
  if(!lobby) return;
  const alivePlayers = Object.entries(lobby.players).filter(([id,p])=>p.alive);
  const aliveHains = alivePlayers.filter(([id,p])=>lobby.roles[id]==="hain");
  const aliveOps = alivePlayers.filter(([id,p])=>lobby.roles[id]==="operatör");

  if(aliveHains.length===0){
    io.to(lobbyId).emit("gameOver",{ winner:"Operatörler" });
    lobby.gameStarted=false;
  } else if(aliveHains.length >= aliveOps.length){
    io.to(lobbyId).emit("gameOver",{ winner:"Hain" });
    lobby.gameStarted=false;
  }
}

server.listen(PORT,()=>console.log(`Server running on port ${PORT}`));