const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, { cors:{origin:"*"} });

const PORT = 3000;
const PLAYER_SPEED = 150;

/* ⚠️ DÜZELTİLDİ: 10 makine – 10 pozisyon */
const machineNames = [
  "Fette 1200","Fette 2200","Fette 3200","Fette Fe55",
  "Korsch XT600","Korsch XL400","Bosch GKF701",
  "Kilian KTP720","Sejong","Fette 2100"
];

const machinePositions = [
  {x:200,y:200},{x:400,y:200},{x:600,y:200},{x:800,y:200},{x:1000,y:200},
  {x:200,y:800},{x:400,y:800},{x:600,y:800},{x:800,y:800},{x:1000,y:800}
];

let lobbies = {};

io.on("connection", socket => {

  socket.on("joinLobby", ({ lobbyId, name }) => {
    if(!lobbies[lobbyId]){
      lobbies[lobbyId] = {
        hostId: socket.id,
        players: {},
        ready: {},
        machines: {},
        roles: {},
        inputs: {},
        votes: {},
        gameStarted: false
      };

      machineNames.forEach((m,i)=>{
        lobbies[lobbyId].machines[m] = {
          state:"ok",
          x: machinePositions[i].x,
          y: machinePositions[i].y
        };
      });
    }

    lobbies[lobbyId].players[socket.id] = {
      name,
      alive: true,
      x: 200 + Math.random()*800,
      y: 200 + Math.random()*600
    };

    lobbies[lobbyId].ready[socket.id] = false;
    lobbies[lobbyId].inputs[socket.id] = { dirX:0, dirY:0 };

    socket.join(lobbyId);
    io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
  });

  socket.on("setReady", ({ lobbyId }) => {
    const l = lobbies[lobbyId]; if(!l) return;
    l.ready[socket.id] = true;
    io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
  });

  socket.on("startGame", ({ lobbyId }) => {
    const l = lobbies[lobbyId];
    if(!l || l.gameStarted) return;
    if(!Object.values(l.ready).every(r=>r)) return;

    const ids = Object.keys(l.players);
    const hainId = ids[Math.floor(Math.random()*ids.length)];
    ids.forEach(id => l.roles[id] = id===hainId ? "hain" : "operatör");

    l.gameStarted = true;
    io.to(lobbyId).emit("gameStart", {
      roles: l.roles,
      machines: l.machines,
      players: l.players
    });
  });

  socket.on("playerInput", ({ lobbyId, dirX, dirY }) => {
    const l = lobbies[lobbyId];
    if(!l || !l.players[socket.id]?.alive) return;
    l.inputs[socket.id] = { dirX, dirY };
  });

  socket.on("killPlayer", ({ lobbyId, targetId }) => {
    const l = lobbies[lobbyId];
    if(!l || l.roles[socket.id] !== "hain") return;

    const killer = l.players[socket.id];
    const target = l.players[targetId];
    if(!killer || !target || !target.alive) return;

    if(Math.hypot(killer.x-target.x,killer.y-target.y)>80) return;

    target.alive = false;
    io.to(lobbyId).emit("playerKilled",{targetId,x:target.x,y:target.y});
    io.to(lobbyId).emit("addLog","Bir oyuncu öldü");

    checkGameEnd(lobbyId);
  });

  socket.on("startVote", ({ lobbyId }) => {
    const l = lobbies[lobbyId]; if(!l) return;
    l.votes = {};

    const alive = Object.entries(l.players)
      .filter(([_,p])=>p.alive)
      .map(([id,p])=>({id,name:p.name}));

    io.to(lobbyId).emit("voteStart",{players:alive});

    setTimeout(()=>finishVote(lobbyId),15000);
  });

  socket.on("castVote", ({ lobbyId, targetId }) => {
    const l = lobbies[lobbyId];
    if(!l || !l.players[socket.id]?.alive) return;
    l.votes[socket.id] = targetId;
  });

  socket.on("disconnect", () => {
    for(const lobbyId in lobbies){
      const l = lobbies[lobbyId];
      if(!l.players[socket.id]) continue;

      delete l.players[socket.id];
      delete l.ready[socket.id];
      delete l.inputs[socket.id];

      if(l.hostId === socket.id){
        l.hostId = Object.keys(l.players)[0] || null;
      }

      io.to(lobbyId).emit("playerDisconnected",{id:socket.id});
      io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
    }
  });

});

/* ---------------- HELPERS ---------------- */

function getLobbyInfo(id){
  const l = lobbies[id];
  return {
    hostId: l.hostId,
    players: Object.entries(l.players)
      .map(([id,p])=>({id,name:p.name,alive:p.alive})),
    ready: l.ready
  };
}

function finishVote(id){
  const l = lobbies[id];
  const count = {};
  Object.values(l.votes).forEach(v=>count[v]=(count[v]||0)+1);

  let max=0,elim=null,tie=false;
  for(const k in count){
    if(count[k]>max){max=count[k];elim=k;tie=false;}
    else if(count[k]===max) tie=true;
  }

  if(!elim || tie){
    io.to(id).emit("voteResult",{eliminatedId:null});
    return;
  }

  l.players[elim].alive=false;
  io.to(id).emit("playerEliminated",{
    targetId:elim,
    x:l.players[elim].x,
    y:l.players[elim].y
  });
  io.to(id).emit("voteResult",{eliminatedId:elim});
  checkGameEnd(id);
}

function checkGameEnd(id){
  const l = lobbies[id];
  const alive = Object.entries(l.players).filter(([_,p])=>p.alive);
  const h = alive.filter(([id])=>l.roles[id]==="hain");
  const o = alive.filter(([id])=>l.roles[id]==="operatör");

  if(h.length===0 || h.length>=o.length){
    io.to(id).emit("gameOver",{winner:h.length===0?"Kazanan işçi sınıfı!":"Hain kazandı"});
    l.gameStarted=false;
    Object.keys(l.ready).forEach(id=>l.ready[id]=false);
    Object.values(l.players).forEach(p=>p.alive=true);
    io.to(id).emit("lobbyUpdate",getLobbyInfo(id));
  }
}

/* ---------------- TICK ---------------- */

setInterval(()=>{
  for(const id in lobbies){
    const l=lobbies[id]; if(!l.gameStarted) continue;
    for(const pid in l.players){
      const p=l.players[pid]; if(!p.alive) continue;
      const i=l.inputs[pid];
      p.x+=i.dirX*PLAYER_SPEED/60;
      p.y+=i.dirY*PLAYER_SPEED/60;
      io.to(id).emit("updatePlayerPosition",{id:pid,x:p.x,y:p.y});
    }
  }
},1000/60);

server.listen(PORT,()=>console.log("Server running",PORT));