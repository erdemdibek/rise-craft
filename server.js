const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const MACHINE_NAMES = [
  "Fette 1200","Fette 2200","Fette 3200","Fette Fe55",
  "Korsch XT600","Korsch XL400","Bosch GKF701","Kilian KTP720",
  "Sejong","Fette 2100"
];

const lobbies = {}; // lobbyId => { players:[], ready:{}, roles:{}, machines:{}, dead:[], votes:{}, voting:false }

function randomMachine(lobby) {
  const names = Object.keys(lobby.machines);
  const available = names.filter(name => lobby.machines[name] === "ok");
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// Periodik makine bozulması
setInterval(() => {
  for (const lobbyId in lobbies) {
    const lobby = lobbies[lobbyId];
    if (!lobby.voting) {
      const m = randomMachine(lobby);
      if (m) {
        lobby.machines[m] = "bozuk";
        io.to(lobbyId).emit("machineBroken", { machineName: m });
      }
    }
  }
}, 15000); // her 15 saniye

io.on("connection", socket => {
  console.log("Player connected:", socket.id);

  socket.on("joinLobby", ({ lobbyId, name }) => {
    if (!lobbies[lobbyId]) {
      lobbies[lobbyId] = {
        players: [],
        ready: {},
        roles: {},
        machines: MACHINE_NAMES.reduce((acc,m)=>{acc[m]="ok";return acc;}, {}),
        dead: [],
        votes: {},
        voting: false
      };
    }
    const lobby = lobbies[lobbyId];
    lobby.players.push({ id: socket.id, name, alive:true });
    lobby.ready[socket.id] = false;
    socket.join(lobbyId);
    io.to(lobbyId).emit("lobbyUpdate", lobby);
  });

  socket.on("setReady", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId]; if (!lobby) return;
    lobby.ready[socket.id] = true;
    io.to(lobbyId).emit("lobbyUpdate", lobby);
  });

  socket.on("startGame", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId]; if (!lobby) return;
    const players = [...lobby.players];
    const hainIndex = Math.floor(Math.random() * players.length);
    players.forEach((p,i)=>lobby.roles[p.id] = (i===hainIndex)?"hain":"operator");
    io.to(lobbyId).emit("gameStart", { roles: lobby.roles, machines: lobby.machines });
  });

  socket.on("killPlayer", ({ lobbyId, targetId }) => {
    const lobby = lobbies[lobbyId]; if (!lobby) return;
    if (lobby.roles[socket.id] !== "hain") return;
    const target = lobby.players.find(p=>p.id===targetId);
    if (target && target.alive) {
      target.alive = false;
      lobby.dead.push(targetId);
      io.to(lobbyId).emit("playerKilled", { targetId });
    }
  });

  socket.on("repairMachine", ({ lobbyId, machineName }) => {
    const lobby = lobbies[lobbyId]; if (!lobby) return;
    if (lobby.machines[machineName] === "bozuk") {
      lobby.machines[machineName] = "ok";
      io.to(lobbyId).emit("machineRepaired", { machineName });
    }
  });

  // Oylama başlatma
  socket.on("startVote", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId]; if (!lobby || lobby.voting) return;
    lobby.voting = true;
    lobby.votes = {};
    io.to(lobbyId).emit("voteStart", { players: lobby.players.filter(p=>p.alive) });
    setTimeout(()=>{
      endVoting(lobbyId);
    }, 20000); // 20 saniye
  });

  socket.on("vote", ({ lobbyId, targetId }) => {
    const lobby = lobbies[lobbyId]; if (!lobby || !lobby.voting) return;
    lobby.votes[targetId] = (lobby.votes[targetId] || 0)+1;
  });

  function endVoting(lobbyId){
    const lobby = lobbies[lobbyId]; if(!lobby) return;
    lobby.voting = false;
    const votes = lobby.votes;
    let maxVotes = 0, eliminated = null;
    for(const id in votes){
      if(votes[id] > maxVotes){
        maxVotes = votes[id];
        eliminated = id;
      }
    }
    if(eliminated){
      const player = lobby.players.find(p=>p.id===eliminated);
      if(player){
        player.alive = false;
        lobby.dead.push(eliminated);
        io.to(lobbyId).emit("playerEliminated", { targetId: eliminated });
        checkWin(lobbyId);
      }
    }
  }

  function checkWin(lobbyId){
    const lobby = lobbies[lobbyId]; if(!lobby) return;
    const alivePlayers = lobby.players.filter(p=>p.alive);
    const aliveHains = alivePlayers.filter(p=>lobby.roles[p.id]==="hain");
    const aliveOps = alivePlayers.filter(p=>lobby.roles[p.id]==="operator");
    if(aliveHains.length===0){
      io.to(lobbyId).emit("gameOver", { winner:"Operatörler" });
    }else if(aliveHains.length >= aliveOps.length){
      io.to(lobbyId).emit("gameOver", { winner:"Hain" });
    }
  }

  socket.on("disconnect", () => {
    for(const lobbyId in lobbies){
      const lobby = lobbies[lobbyId];
      lobby.players = lobby.players.filter(p=>p.id!==socket.id);
      delete lobby.ready[socket.id];
      delete lobby.roles[socket.id];
      io.to(lobbyId).emit("lobbyUpdate", lobby);
    }
  });
});

server.listen(3000, ()=>console.log("Server running on http://localhost:3000"));