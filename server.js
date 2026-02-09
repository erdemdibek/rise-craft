const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, { cors:{origin:"*"} });

const PORT = 3000;
const PLAYER_SPEED = 150;
const MAX_PLAYERS = 8;

const BOT_NAMES = [
  "Ahmet","Mehmet","Ali","Veli","Can","Mert","Emre","Burak",
  "Kerem","Onur","Serkan","Oğuz","Tolga","Furkan","Umut"
];

const machineNames = [
  "Fette 1200","Fette 2200","Fette 3200","Fette Fe55",
  "Korsch XT600","Korsch XL400","Bosch GKF701",
  "Kilian KTP720","Sejong","Fette 2100"
];

const rooms = [
  {id:"room1", x:200, y:200},{id:"room2", x:400, y:200},
  {id:"room3", x:600, y:200},{id:"room4", x:800, y:200},
  {id:"room5", x:1000,y:200},{id:"room6", x:200, y:800},
  {id:"room7", x:400, y:800},{id:"room8", x:600, y:800},
  {id:"room9", x:800, y:800},{id:"room10",x:1000,y:800},
];

let lobbies = {};

/* ---------------- BOT HELPERS ---------------- */
function addBotsIfNeeded(lobbyId){
  const l = lobbies[lobbyId];
  if(!l) return;

  const current = Object.keys(l.players).length;
  const need = MAX_PLAYERS - current;
  if(need <= 0) return;

  for(let i=0;i<need;i++){
    const id = "bot_"+Math.random().toString(36).substr(2,9);
    const name = BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)];

    l.players[id] = {
      name,
      alive:true,
      x:200+Math.random()*800,
      y:200+Math.random()*600,
      isBot:true
    };
    l.ready[id] = true;
    l.inputs[id] = { dirX:0, dirY:0 };
    l.roles[id] = "operatör";
  }
}

function botLogic(lobbyId){
  const l = lobbies[lobbyId];
  if(!l || !l.gameStarted) return;

  for(const id in l.players){
    const p = l.players[id];
    if(!p.isBot || !p.alive) continue;

    // Hareket
    l.inputs[id].dirX = (Math.random()*2-1)*0.6;
    l.inputs[id].dirY = (Math.random()*2-1)*0.6;

    // Tamir
    for(const mName in l.machines){
      const m = l.machines[mName];
      if(m.state==="bozuk" && Math.hypot(p.x-m.x,p.y-m.y)<80){
        m.state="ok";
        io.to(lobbyId).emit("machineRepaired",{name:mName});
        io.to(lobbyId).emit("addLog",`${p.name} ${mName} makinesini tamir etti`);
      }
    }
  }
}

/* ---------------- START GAME ---------------- */
function startGame(lobbyId){
  const l = lobbies[lobbyId];
  if(!l || l.gameStarted) return;

  addBotsIfNeeded(lobbyId);

  const realPlayers = Object.keys(l.players).filter(id=>!l.players[id].isBot);
  const hainId = realPlayers[Math.floor(Math.random()*realPlayers.length)];

  for(const id in l.players){
    l.roles[id] = id===hainId ? "hain" : "operatör";
  }

  l.gameStarted = true;
  io.to(lobbyId).emit("gameStart",{
    roles:l.roles,
    machines:l.machines,
    players:l.players
  });
}

/* ---------------- CONNECTION ---------------- */
io.on("connection", socket => {

  socket.on("joinLobby", ({ lobbyId, name }) => {
    if(!lobbies[lobbyId]){
      lobbies[lobbyId]={
        players:{},ready:{},machines:{},roles:{},
        inputs:{},votes:{},gameStarted:false
      };
      machineNames.forEach((m,i)=>{
        lobbies[lobbyId].machines[m]={
          state:"ok",x:rooms[i].x,y:rooms[i].y
        };
      });
    }

    lobbies[lobbyId].players[socket.id]={
      name,alive:true,x:200+Math.random()*800,y:200+Math.random()*600
    };
    lobbies[lobbyId].ready[socket.id]=false;
    lobbies[lobbyId].inputs[socket.id]={dirX:0,dirY:0};

    socket.join(lobbyId);
    io.to(lobbyId).emit("lobbyUpdate",getLobbyInfo(lobbyId));
  });

  socket.on("setReady", ({ lobbyId }) => {
    const l=lobbies[lobbyId]; if(!l) return;
    l.ready[socket.id]=true;
    io.to(lobbyId).emit("lobbyUpdate",getLobbyInfo(lobbyId));
    if(Object.values(l.ready).every(r=>r)) setTimeout(()=>startGame(lobbyId),1000);
  });

  socket.on("playerInput", ({ lobbyId, dirX, dirY }) => {
    const l=lobbies[lobbyId]; if(!l||!l.players[socket.id]?.alive) return;
    l.inputs[socket.id]={dirX,dirY};
  });

  socket.on("castVote", ({ lobbyId, targetId }) => {
    const l=lobbies[lobbyId]; if(!l) return;
    l.votes[socket.id]=targetId;
  });

});

/* ---------------- HELPERS ---------------- */
function getLobbyInfo(id){
  const l=lobbies[id];
  return {
    players:Object.entries(l.players).map(([id,p])=>({id,name:p.name,alive:p.alive})),
    ready:l.ready
  };
}

/* ---------------- GAME LOOP ---------------- */
setInterval(()=>{
  for(const id in lobbies){
    const l=lobbies[id];
    if(!l.gameStarted) continue;

    botLogic(id);

    for(const pid in l.players){
      const p=l.players[pid];
      if(!p.alive) continue;
      const i=l.inputs[pid];
      p.x+=i.dirX*PLAYER_SPEED/60;
      p.y+=i.dirY*PLAYER_SPEED/60;
      io.to(id).emit("updatePlayerPosition",{id:pid,x:p.x,y:p.y});
    }
  }
},1000/60);

server.listen(PORT,()=>console.log("Server running",PORT));