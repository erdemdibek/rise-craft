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
  "Fette 1200","Fette 2200","Fette 3200","Fette Fe55",
  "Korsch XT600","Korsch XL400","Bosch GKF701",
  "Kilian KTP720","Sejong","Fette 2100"
];

const PLAYER_SPEED = 150; // px/s

// -------------------------------------------------

io.on("connection", socket => {

  socket.on("joinLobby", ({ lobbyId, name }) => {

    if(!lobbies[lobbyId]){
      lobbies[lobbyId] = {
        players: {},
        ready: {},
        machines: {},
        roles: {},
        inputs: {},
        votes: {},        // ✅ OYLAR
        gameStarted: false
      };

      machineNames.forEach(m => lobbies[lobbyId].machines[m] = "ok");
    }

    lobbies[lobbyId].players[socket.id] = {
      name,
      alive: true,
      x: 100,
      y: 100
    };

    lobbies[lobbyId].ready[socket.id] = false;
    lobbies[lobbyId].inputs[socket.id] = { dirX:0, dirY:0 };

    socket.join(lobbyId);

    io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
  });

  // -------------------------------------------------

  socket.on("setReady", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby) return;

    lobby.ready[socket.id] = true;
    io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
  });

  // -------------------------------------------------

  socket.on("startGame", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby || lobby.gameStarted) return;

    const allReady = Object.values(lobby.ready).every(r=>r);
    if(!allReady){
      socket.emit("errorMessage",{msg:"Herkes hazır değil!"});
      return;
    }

    const ids = Object.keys(lobby.players);
    const hainIndex = Math.floor(Math.random()*ids.length);

    ids.forEach((id,i)=>{
      lobby.roles[id] = (i===hainIndex) ? "hain" : "operatör";
    });

    lobby.gameStarted = true;

    io.to(lobbyId).emit("gameStart",{
      roles: lobby.roles,
      machines: lobby.machines,
      players: lobby.players
    });
  });

  // -------------------------------------------------

  socket.on("playerInput", ({ lobbyId, dirX, dirY }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby || !lobby.players[socket.id]) return;
    lobby.inputs[socket.id] = { dirX, dirY };
  });

  // -------------------------------------------------
  // KILL
  socket.on("killPlayer", ({ lobbyId, targetId }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby) return;

    if(lobby.roles[socket.id] !== "hain"){
      socket.emit("killFailed",{ reason:"Hain değilsin" });
      return;
    }

    const killer = lobby.players[socket.id];
    const target = lobby.players[targetId];

    if(!killer || !target || !target.alive){
      socket.emit("killFailed",{ reason:"Geçersiz hedef" });
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

    checkGameEnd(lobbyId);
  });

  // -------------------------------------------------
  // OYLAMA BAŞLAT
  socket.on("startVote", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby) return;

    lobby.votes = {}; // reset

    const alivePlayers = Object.entries(lobby.players)
      .filter(([id,p])=>p.alive)
      .map(([id,p])=>({id,name:p.name}));

    io.to(lobbyId).emit("voteStart",{ players: alivePlayers });

    setTimeout(()=>{
      const counts = {};

      Object.values(lobby.votes).forEach(id=>{
        counts[id] = (counts[id]||0)+1;
      });

      let max = 0;
      let eliminatedId = null;

      Object.entries(counts).forEach(([id,c])=>{
        if(c > max){
          max = c;
          eliminatedId = id;
        }
      });

      if(!eliminatedId) return;

      const p = lobby.players[eliminatedId];
      p.alive = false;

      io.to(lobbyId).emit("playerEliminated",{
        targetId: eliminatedId,
        x: p.x,
        y: p.y
      });

      checkGameEnd(lobbyId);
    },20000);
  });

  // -------------------------------------------------
  // OY KULLAN
  socket.on("castVote", ({ lobbyId, targetId }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby || !lobby.players[socket.id]?.alive) return;
    lobby.votes[socket.id] = targetId;
  });

  // -------------------------------------------------

  socket.on("repairMachine", ({ lobbyId, machineName }) => {
    const lobby = lobbies[lobbyId];
    if(!lobby || lobby.roles[socket.id]!=="operatör") return;
    lobby.machines[machineName] = "ok";
    io.to(lobbyId).emit("machineRepaired",{ machineName });
  });

  // -------------------------------------------------

  socket.on("disconnect", ()=>{
    Object.keys(lobbies).forEach(lobbyId=>{
      const lobby = lobbies[lobbyId];
      delete lobby.players[socket.id];
      delete lobby.ready[socket.id];
      delete lobby.roles[socket.id];
      delete lobby.inputs[socket.id];
      delete lobby.votes[socket.id];
      io.to(lobbyId).emit("lobbyUpdate",getLobbyInfo(lobbyId));
    });
  });

});

// -------------------------------------------------
// LOBBY INFO
function getLobbyInfo(lobbyId){
  const lobby = lobbies[lobbyId];
  if(!lobby) return { players: [], ready:{} };

  return {
    players: Object.entries(lobby.players)
      .map(([id,p])=>({
        id,
        name:p.name,
        alive:p.alive,
        x:p.x,
        y:p.y
      })),
    ready: lobby.ready
  };
}

// -------------------------------------------------
// GAME END
function checkGameEnd(lobbyId){
  const lobby = lobbies[lobbyId];
  if(!lobby) return;

  const alive = Object.entries(lobby.players).filter(([i,p])=>p.alive);
  const hains = alive.filter(([i])=>lobby.roles[i]==="hain");
  const ops = alive.filter(([i])=>lobby.roles[i]==="operatör");

  if(hains.length===0){
    io.to(lobbyId).emit("gameOver",{winner:"Operatörler"});
    lobby.gameStarted=false;
  }
  else if(hains.length>=ops.length){
    io.to(lobbyId).emit("gameOver",{winner:"Hain"});
    lobby.gameStarted=false;
  }
}

// -------------------------------------------------
// RANDOM MACHINE BREAK
setInterval(()=>{
  Object.values(lobbies).forEach(lobby=>{
    if(!lobby.gameStarted) return;

    const ok = Object.keys(lobby.machines).filter(m=>lobby.machines[m]==="ok");
    if(ok.length===0) return;

    const m = ok[Math.floor(Math.random()*ok.length)];
    lobby.machines[m] = "bozuk";

    io.emit("machineBroken",{ machineName:m });
  });
},30000);

// -------------------------------------------------
// MOVEMENT TICK
setInterval(()=>{
  const delta = 1/60;

  Object.values(lobbies).forEach(lobby=>{
    if(!lobby.gameStarted) return;

    Object.entries(lobby.players).forEach(([id,p])=>{
      if(!p.alive) return; // 👻 hayalet hareket yok

      const input = lobby.inputs[id];
      if(!input) return;

      p.x += input.dirX * PLAYER_SPEED * delta;
      p.y += input.dirY * PLAYER_SPEED * delta;

      p.x = Math.max(20, Math.min(1180, p.x));
      p.y = Math.max(20, Math.min(980, p.y));

      io.emit("updatePlayerPosition",{ id, x:p.x, y:p.y });
    });
  });
},1000/60);

// -------------------------------------------------

server.listen(PORT,()=>{
  console.log("Server running on port",PORT);
});