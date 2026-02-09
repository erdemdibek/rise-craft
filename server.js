const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, { cors:{origin:"*"} });

const PORT = 3000;
const PLAYER_SPEED = 150;
const BOT_SPEED = 90;
const MAX_PLAYERS = 8;

/* ---------------- DATA ---------------- */
const machineNames = [
  "Fette 1200","Fette 2200","Fette 3200","Fette Fe55",
  "Korsch XT600","Korsch XL400","Bosch GKF701",
  "Kilian KTP720","Sejong","Fette 2100"
];

const rooms = [
  {x:200,y:200},{x:400,y:200},{x:600,y:200},{x:800,y:200},{x:1000,y:200},
  {x:200,y:800},{x:400,y:800},{x:600,y:800},{x:800,y:800},{x:1000,y:800}
];

const BOT_NAMES = [
  "AhmetSulus","Mehmet","Ali","Veli","Can","Emre","MALi","Turgay",
  "Mert","Oğuz","Kaan","Furkan","Onur","Yusuf","Kerem"
];

const BOT_ZONES = [
  {x:300,y:300,r:300},
  {x:700,y:300,r:350},
  {x:1100,y:500,r:400},
  {x:500,y:700,r:350},
  {x:900,y:800,r:300}
];

let lobbies = {};

/* ---------------- BOT HELPERS ---------------- */
function createBot(lobby){
  const id = "bot_"+Math.random().toString(36).slice(2,8);
  lobby.players[id] = {
    name: BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)],
    alive: true,
    isBot: true,
    x: 200 + Math.random()*800,
    y: 200 + Math.random()*600
  };
  lobby.ready[id] = true;
  lobby.inputs[id] = { dirX:0, dirY:0 };
  lobby.roles[id] = "operatör";
  lobby.botAI[id] = {
    state:"wander",
    zone: BOT_ZONES[Math.floor(Math.random()*BOT_ZONES.length)],
    target:{x:lobby.players[id].x,y:lobby.players[id].y},
    think: 60 + Math.random()*120,
    idleUntil: 0
  };
}

function fillWithBots(lobby){
  const count = Object.keys(lobby.players).length;
  for(let i=count;i<MAX_PLAYERS;i++){
    createBot(lobby);
  }
}

/* ---------------- BOT AI LOOP ---------------- */
setInterval(()=>{
  for(const lobbyId in lobbies){
    const l = lobbies[lobbyId];
    if(!l.gameStarted) continue;

    for(const id in l.botAI){
      const bot = l.players[id];
      if(!bot || !bot.alive) continue;

      const ai = l.botAI[id];
      ai.think--;

      if(ai.think <= 0){
        ai.think = 90 + Math.random()*180;

        if(Math.random() < 0.15){
          ai.state = "idle";
          ai.idleUntil = Date.now() + (500 + Math.random()*1200);
          continue;
        }

        if(Math.random() < 0.25){
          ai.zone = BOT_ZONES[Math.floor(Math.random()*BOT_ZONES.length)];
        }

        ai.state = "wander";
        ai.target = {
          x: ai.zone.x + (Math.random()*2-1)*ai.zone.r,
          y: ai.zone.y + (Math.random()*2-1)*ai.zone.r
        };
      }

      if(ai.state === "idle"){
        if(Date.now() < ai.idleUntil){
          l.inputs[id] = {dirX:0,dirY:0};
          continue;
        }else{
          ai.state = "wander";
        }
      }

      const nearby = Object.values(l.players)
        .find(p => p.alive && !p.isBot &&
          Math.hypot(p.x-bot.x,p.y-bot.y) < 220);

      if(nearby){
        ai.target.x += (Math.random()*2-1)*120;
        ai.target.y += (Math.random()*2-1)*120;
      }

      const dx = ai.target.x - bot.x;
      const dy = ai.target.y - bot.y;
      const dist = Math.hypot(dx,dy);

      if(dist < 15){
        l.inputs[id] = {dirX:0,dirY:0};
        continue;
      }

      l.inputs[id] = {
        dirX: dx/dist,
        dirY: dy/dist
      };
    }
  }
},250);

/* ---------------- GAME FLOW ---------------- */
function startGame(lobbyId){
  const l = lobbies[lobbyId];
  if(l.gameStarted) return;

  fillWithBots(l);

  const ids = Object.keys(l.players).filter(id=>!l.players[id].isBot);
  const hainId = ids[Math.floor(Math.random()*ids.length)];

  Object.keys(l.players).forEach(id=>{
    if(id===hainId) l.roles[id]="hain";
    else l.roles[id]="operatör";
  });

  l.gameStarted=true;
  io.to(lobbyId).emit("gameStart",{
    roles:l.roles,
    machines:l.machines,
    players:l.players
  });
}

/* ---------------- SOCKET ---------------- */
io.on("connection", socket=>{
  socket.on("joinLobby",({lobbyId,name})=>{
    if(!lobbies[lobbyId]){
      lobbies[lobbyId]={
        players:{},ready:{},roles:{},inputs:{},
        machines:{},votes:{},botAI:{},
        gameStarted:false
      };
      machineNames.forEach((m,i)=>{
        lobbies[lobbyId].machines[m]={
          state:"ok",x:rooms[i].x,y:rooms[i].y
        };
      });
    }

    lobbies[lobbyId].players[socket.id]={
      name,alive:true,x:300,y:300
    };
    lobbies[lobbyId].ready[socket.id]=false;
    lobbies[lobbyId].inputs[socket.id]={dirX:0,dirY:0};

    socket.join(lobbyId);
    io.to(lobbyId).emit("lobbyUpdate",getLobbyInfo(lobbyId));
  });

  socket.on("setReady",({lobbyId})=>{
    const l=lobbies[lobbyId];
    l.ready[socket.id]=true;
    io.to(lobbyId).emit("lobbyUpdate",getLobbyInfo(lobbyId));
    if(Object.values(l.ready).every(r=>r)) startGame(lobbyId);
  });

  socket.on("playerInput",({lobbyId,dirX,dirY})=>{
    const l=lobbies[lobbyId];
    if(l.players[socket.id]?.alive)
      l.inputs[socket.id]={dirX,dirY};
  });

  socket.on("killPlayer",({lobbyId,targetId})=>{
    const l=lobbies[lobbyId];
    if(l.roles[socket.id]!=="hain") return;

    const k=l.players[socket.id];
    const t=l.players[targetId];
    if(!k||!t||!t.alive) return;
    if(Math.hypot(k.x-t.x,k.y-t.y)>80) return;

    t.alive=false;
    io.to(lobbyId).emit("playerKilled",{targetId,x:t.x,y:t.y});

    // ---- GAME END CHECK ----
    const aliveHain = Object.keys(l.players)
      .filter(id=>l.players[id].alive && l.roles[id]==="hain");

    const aliveOps = Object.keys(l.players)
      .filter(id=>l.players[id].alive && l.roles[id]==="operatör");

    if(aliveHain.length===0){
      io.to(lobbyId).emit("gameEnd",{winner:"operatör"});
      l.gameStarted=false;
    }
    if(aliveOps.length===0){
      io.to(lobbyId).emit("gameEnd",{winner:"hain"});
      l.gameStarted=false;
    }
  });
});

/* ---------------- HELPERS ---------------- */
function getLobbyInfo(id){
  const l=lobbies[id];
  return {
    players:Object.entries(l.players).map(([id,p])=>({
      id,name:p.name,alive:p.alive
    })),
    ready:l.ready
  };
}

/* ---------------- MOVE TICK ---------------- */
setInterval(()=>{
  for(const lid in lobbies){
    const l=lobbies[lid];
    if(!l.gameStarted) continue;

    for(const id in l.players){
      const p=l.players[id];
      if(!p.alive) continue;
      const i=l.inputs[id];
      if(!i) continue;

      p.x+=i.dirX*(p.isBot?BOT_SPEED:PLAYER_SPEED)/60;
      p.y+=i.dirY*(p.isBot?BOT_SPEED:PLAYER_SPEED)/60;

      io.to(lid).emit("updatePlayerPosition",{id,x:p.x,y:p.y});
    }
  }
},1000/60);

server.listen(PORT,()=>console.log("Server running",PORT));