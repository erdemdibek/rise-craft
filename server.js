const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, { cors:{origin:"*"} });

const PORT = 3000;
const PLAYER_SPEED = 150;

const machineNames = ["Fette 1200","Fette 2200","Fette 3200","Fette 3200","Fette Fe55","Korsch XT600","Korsch XL400","Bosch GKF701","Kilian KTP720","Sejong","Fette 2100"];
const machinePositions = [
  {x:200,y:200},{x:400,y:200},{x:600,y:200},{x:800,y:200},{x:1000,y:200},
  {x:200,y:800},{x:400,y:800},{x:600,y:800},{x:800,y:800},{x:1000,y:800}
];

let lobbies = {};

io.on("connection", socket => {

  socket.on("joinLobby", ({ lobbyId, name }) => {
    if(!lobbies[lobbyId]){
      lobbies[lobbyId] = { hostId: socket.id, players: {}, ready: {}, machines: {}, roles: {}, inputs: {}, votes: {}, gameStarted: false };
      machineNames.forEach((m,i)=>{lobbies[lobbyId].machines[m]={state:"ok",x:machinePositions[i].x,y:machinePositions[i].y}});
    }

    lobbies[lobbyId].players[socket.id] = { name, alive: true, x: 200+Math.random()*800, y: 200+Math.random()*600 };
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
    const l = lobbies[lobbyId]; if(!l || l.gameStarted) return;
    if(!Object.values(l.ready).every(r=>r)) return;

    const ids = Object.keys(l.players);
    const hainId = ids[Math.floor(Math.random()*ids.length)];
    ids.forEach(id => { l.roles[id] = id===hainId ? "hain" : "operatör"; });

    l.gameStarted = true;
    io.to(lobbyId).emit("gameStart", { roles: l.roles, machines: l.machines, players: l.players });
  });

  socket.on("playerInput", ({ lobbyId, dirX, dirY }) => {
    const l = lobbies[lobbyId]; if(!l||!l.players[socket.id] || !l.players[socket.id].alive) return;
    l.inputs[socket.id] = { dirX, dirY };
  });

  socket.on("killPlayer", ({ lobbyId, targetId }) => {
    const l = lobbies[lobbyId]; if(!l) return;
    if(l.roles[socket.id] !== "hain") return;
    const killer = l.players[socket.id]; const target = l.players[targetId];
    if(!killer || !target || !target.alive) return;
    const d = Math.hypot(killer.x - target.x, killer.y - target.y); if(d>80) return;

    target.alive = false;
    io.to(lobbyId).emit("playerKilled",{ targetId, x: target.x, y: target.y });

    // Hainin ismi loga yazılmaz
    io.to(lobbyId).emit("addLog","Bir oyuncu öldü");

    checkGameEnd(lobbyId);
  });

  socket.on("repairMachine", ({ lobbyId, name }) => {
    const l = lobbies[lobbyId]; if(!l||l.roles[socket.id]!=="operatör" || !l.players[socket.id].alive) return;
    const p = l.players[socket.id]; const m = l.machines[name];
    const dist = Math.hypot(p.x - m.x, p.y - m.y); if(dist>80 || m.state==="ok") return;

    m.state = "ok";
    io.to(lobbyId).emit("machineRepaired", { name });
    io.to(lobbyId).emit("addLog",`${p.name} ${name} makinesini tamir etti`);
  });

  socket.on("startVote", ({ lobbyId }) => {
    const l = lobbies[lobbyId]; if(!l) return;
    l.votes = {};

    const alive = Object.entries(l.players)
      .filter(([_,p])=>p.alive)
      .map(([id,p])=>({ id, name: p.name }));

    io.to(lobbyId).emit("voteStart", { players: alive });
    io.to(lobbyId).emit("addLog","Toplantı başladı! Oy kullanabilirsiniz.");

    setTimeout(() => {
      const counts = {};
      Object.values(l.votes).forEach(id => { counts[id] = (counts[id]||0)+1; });

      let max = 0, elim = null, tie = false;
      Object.entries(counts).forEach(([id,c]) => {
        if(c>max){ max=c; elim=id; tie=false; }
        else if(c===max){ tie=true; }
      });

      if(!elim || tie){
        io.to(lobbyId).emit("voteResult", { eliminatedId: null });
        return;
      }

      const target = l.players[elim];
      if(target){
        target.alive = false;
        io.to(lobbyId).emit("playerEliminated", { targetId: elim, x: target.x, y: target.y });
        io.to(lobbyId).emit("voteResult", { eliminatedId: elim });
      }

      checkGameEnd(lobbyId);
    },15000);
  });

  socket.on("castVote", ({ lobbyId, targetId }) => {
    const l = lobbies[lobbyId];
    if(!l||!l.players[socket.id]?.alive) return; // Ölüler oy kullanamaz
    l.votes[socket.id] = targetId;
  });

  socket.on("disconnect", () => {
    for(const lobbyId in lobbies){
      const l = lobbies[lobbyId];
      if(l.players[socket.id]){
        delete l.players[socket.id]; 
        delete l.ready[socket.id]; 
        delete l.inputs[socket.id];

        // Eğer host gidiyorsa yeni host ata
        if(l.hostId === socket.id){
          const remaining = Object.keys(l.players);
          l.hostId = remaining.length ? remaining[0] : null;
        }

        io.to(lobbyId).emit("playerDisconnected",{id: socket.id});
        io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId)); // Yeni hostu gönder
      }
    }
  });

});

function getLobbyInfo(id){
  const l = lobbies[id];
  return { hostId: l.hostId, players: Object.entries(l.players).map(([id,p])=>({id,name:p.name, alive: p.alive})), ready: l.ready };
}

function checkGameEnd(id){
  const l = lobbies[id];
  const alive = Object.entries(l.players).filter(([_,p])=>p.alive);
  const h = alive.filter(([id])=>l.roles[id]==="hain");
  const o = alive.filter(([id])=>l.roles[id]==="operatör");

  let gameOver = false;
  let winner = "";

  if(h.length===0){
    winner = "Kazanan işçi sınıfı!";
    gameOver = true;
  }
  else if(h.length >= o.length){
    winner = "Hain kazandı";
    gameOver = true;
  }

  if(gameOver){
    io.to(id).emit("gameOver",{winner});

    // Lobiye dönüldüğünde start butonunun çıkması için
    for(const pid in l.ready) l.ready[pid] = false;       // Hazır durumları sıfırla
    for(const pid in l.players) l.players[pid].alive = true; // Oyuncuları yeniden canlandır

    io.to(id).emit("lobbyUpdate", getLobbyInfo(id)); // Lobby güncellemesi gönder

    l.gameStarted = false; // Oyunu durdur
  }
}

setInterval(()=>{
  Object.entries(lobbies).forEach(([lobbyId,l])=>{
    if(!l.gameStarted) return;
    Object.entries(l.players).forEach(([id,p])=>{
      if(!p.alive) return;
      const i=l.inputs[id];
      p.x += i.dirX*PLAYER_SPEED/60;
      p.y += i.dirY*PLAYER_SPEED/60;
      io.to(lobbyId).emit("updatePlayerPosition",{id,x:p.x,y:p.y});
    });
  });
},1000/60);

setInterval(()=>{
  Object.entries(lobbies).forEach(([lobbyId,l])=>{
    if(!l.gameStarted) return;
    const ok = Object.keys(l.machines).filter(m=>l.machines[m].state==="ok");
    if(!ok.length) return;
    const m = ok[Math.floor(Math.random()*ok.length)];
    l.machines[m].state="bozuk";
    io.to(lobbyId).emit("machineBroken",{name:m});
  });
},30000);

server.listen(PORT, ()=>console.log("Server running", PORT));