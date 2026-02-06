const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.static("public"));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

let lobbies = {};
const machineNames = [
  "Fette 1200","Fette 2200","Fette 3200","Fette Fe55","Korsch XT600",
  "Korsch XL400","Bosch GKF701","Kilian KTP720","Sejong","Fette 2100"
];

const PLAYER_SPEED = 150; // px/s

io.on("connection", socket => {

  socket.on("joinLobby", ({ lobbyId, name }) => {
    if(!lobbies[lobbyId]){
      lobbies[lobbyId] = { players: {}, ready: {}, machines: {}, roles: {}, gameStarted: false, inputs: {} };
      machineNames.forEach(m => lobbies[lobbyId].machines[m]="ok");
    }

    lobbies[lobbyId].players[socket.id] = { name, alive: true, x: 100, y: 100 };
    lobbies[lobbyId].ready[socket.id] = false;
    lobbies[lobbyId].inputs[socket.id] = { dirX:0, dirY:0 };
    socket.join(lobbyId);

    io.to(socket.id).emit("lobbyUpdate", getLobbyInfo(lobbyId));
    io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
  });

  socket.on("setReady", ({ lobbyId }) => {
    if(lobbies[lobbyId]){
      lobbies[lobbyId].ready[socket.id] = true;
      io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
    }
  });

  socket.on("startGame", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby || lobby.gameStarted) return;

    const allReady = Object.values(lobby.ready).every(r=>r===true);
    if(!allReady){
      socket.emit("errorMessage",{msg:"Herkes hazır değil!"});
      return;
    }

    const playerIds = Object.keys(lobby.players);
    const hainIndex = Math.floor(Math.random()*playerIds.length);
    playerIds.forEach((id, idx) => {
      lobby.roles[id] = (idx===hainIndex)?"hain":"operatör";
    });

    lobby.gameStarted = true;
    io.to(lobbyId).emit("gameStart",{ roles:lobby.roles, machines:lobby.machines, players:lobby.players });
  });

  socket.on("playerInput", ({ lobbyId, dirX, dirY }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby || !lobby.players[socket.id]) return;
    lobby.inputs[socket.id] = { dirX, dirY };
  });

  // --- KILL (DEĞİŞMEDİ, ZATEN DOĞRUYDU) ---
  socket.on("killPlayer", ({ lobbyId, targetId }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby) return;

    if(lobby.roles[socket.id] !== "hain"){
      socket.emit("killFailed",{ reason:"Hain değilsin" });
      return;
    }

    const killer = lobby.players[socket.id];
    const target = lobby.players[targetId];

    if(!killer || !target){
      socket.emit("killFailed",{ reason:"Oyuncu bulunamadı" });
      return;
    }

    if(!target.alive){
      socket.emit("killFailed",{ reason:"Oyuncu zaten ölü" });
      return;
    }

    const dx = killer.x - target.x;
    const dy = killer.y - target.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if(dist > 80){
      socket.emit("killFailed",{ reason:"Çok uzaktasın" });
      return;
    }

    target.alive = false;

io.to(lobbyId).emit("playerKilled",{
  targetId,
  x: target.x,
  y: target.y
});
    io.to(lobbyId).emit("log",{ text: `${target.name} öldürüldü!` });

    checkGameEnd(lobbyId);
  });

  socket.on("repairMachine", ({ lobbyId, machineName }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby || lobby.roles[socket.id]!=="operatör") return;
    if(!lobby.machines[machineName]) return;
    lobby.machines[machineName]="ok";
    io.to(lobbyId).emit("machineRepaired",{ machineName });
  });

  socket.on("startVote", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby) return;

    const alivePlayers = Object.entries(lobby.players)
      .filter(([id,p])=>p.alive)
      .map(([id,p])=>({id,name:p.name}));

    io.to(lobbyId).emit("voteStart",{ players: alivePlayers });

    setTimeout(()=>{
      if(alivePlayers.length===0) return;
      const randomIndex = Math.floor(Math.random()*alivePlayers.length);
      const eliminatedId = alivePlayers[randomIndex].id;
      lobby.players[eliminatedId].alive=false;
      io.to(lobbyId).emit("playerEliminated",{ targetId: eliminatedId });
      checkGameEnd(lobbyId);
    },20000);
  });

  socket.on("disconnect", ()=>{
    Object.keys(lobbies).forEach(lobbyId=>{
      const lobby = lobbies[lobbyId];
      delete lobby.players[socket.id];
      delete lobby.ready[socket.id];
      delete lobby.roles[socket.id];
      delete lobby.inputs[socket.id];
      io.to(lobbyId).emit("lobbyUpdate",getLobbyInfo(lobbyId));
    });
  });

});

// --- Lobby Info ---
function getLobbyInfo(lobbyId){
  const lobby = lobbies[lobbyId];
  if(!lobby) return { players: [], ready:{} };
  return {
    players: Object.entries(lobby.players)
      .map(([id,p])=>({ id, name:p.name, alive:p.alive, x:p.x, y:p.y })),
    ready: lobby.ready
  };
}

// --- Game End ---
function checkGameEnd(lobbyId){
  const lobby = lobbies[lobbyId];
  if(!lobby) return;

  const alivePlayers = Object.entries(lobby.players).filter(([id,p])=>p.alive);
  const aliveHains = alivePlayers.filter(([id])=>lobby.roles[id]==="hain");
  const aliveOps = alivePlayers.filter(([id])=>lobby.roles[id]==="operatör");

  if(aliveHains.length===0){
    io.to(lobbyId).emit("gameOver",{winner:"Operatörler"});
    lobby.gameStarted=false;
  }
  else if(aliveHains.length>=aliveOps.length){
    io.to(lobbyId).emit("gameOver",{winner:"Hain"});
    lobby.gameStarted=false;
  }
}

// --- Random Machine Break ---
setInterval(()=>{
  Object.keys(lobbies).forEach(lobbyId=>{
    const lobby = lobbies[lobbyId];
    if(!lobby.gameStarted) return;

    const healthyMachines = Object.keys(lobby.machines)
      .filter(m=>lobby.machines[m]==="ok");

    if(healthyMachines.length===0) return;

    const randomMachine = healthyMachines[Math.floor(Math.random()*healthyMachines.length)];
    lobby.machines[randomMachine]="bozuk";
    io.to(lobbyId).emit("machineBroken",{ machineName: randomMachine });
  });
},30000);

// --- Player Movement Tick (FIXLİ HAL) ---
setInterval(()=>{
  const delta = 1/60;

  Object.entries(lobbies).forEach(([lobbyId, lobby])=>{
    if(!lobby.gameStarted) return;

    Object.entries(lobby.players).forEach(([id, player])=>{
      if(!player.alive) return;

      const input = lobby.inputs[id] || { dirX:0, dirY:0 };

      player.x += input.dirX * PLAYER_SPEED * delta;
      player.y += input.dirY * PLAYER_SPEED * delta;

      // ✅ ÖNCE SINIRLA
      player.x = Math.max(20, Math.min(1180, player.x));
      player.y = Math.max(20, Math.min(980, player.y));

      // ✅ SONRA SERVER STATE'E YAZ
      lobby.players[id].x = player.x;
      lobby.players[id].y = player.y;

      io.to(lobbyId).emit("updatePlayerPosition",{ id, x:player.x, y:player.y });
    });
  });
},1000/60);

server.listen(PORT,()=>console.log(`Server running on port ${PORT}`));