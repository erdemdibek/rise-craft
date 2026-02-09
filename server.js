const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, { cors:{origin:"*"} });

const PORT = 3000;
const PLAYER_SPEED = 150;
const BOT_SPEED = 120;
const MAX_PLAYERS = 8;

/* ---------------- DATA ---------------- */
const BOT_NAMES = [
  "Ahmet","Mehmet","Ali","Veli","Can","Emre","Turgay",
  "Mert","Oğuz","Kaan","Furkan","Onur","Yusuf","Kerem"
];

const MAP = { w:1400, h:1000 };

let lobbies = {};

/* ---------------- BOT HELPERS ---------------- */
function createBot(lobby){
  const id = "bot_"+Math.random().toString(36).slice(2,8);
  lobby.players[id] = {
    name: BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)],
    alive: true,
    isBot: true,
    x: Math.random()*MAP.w,
    y: Math.random()*MAP.h
  };
  lobby.ready[id] = true;
  lobby.inputs[id] = { dirX:0, dirY:0 };
  lobby.roles[id] = "operatör";
  lobby.botAI[id] = {
    target: randomPoint(),
    think: 0
  };
}

function fillWithBots(lobby){
  while(Object.keys(lobby.players).length < MAX_PLAYERS){
    createBot(lobby);
  }
}

function randomPoint(){
  return {
    x: 100 + Math.random()*(MAP.w-200),
    y: 100 + Math.random()*(MAP.h-200)
  };
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
        ai.think = 60 + Math.random()*120;

        // %30 tamamen yeni hedef (insan gibi rota değiştirir)
        if(Math.random() < 0.3){
          ai.target = randomPoint();
        }
      }

      const dx = ai.target.x - bot.x;
      const dy = ai.target.y - bot.y;
      const dist = Math.hypot(dx,dy);

      if(dist < 20){
        ai.target = randomPoint();
        l.inputs[id] = {dirX:0, dirY:0};
        continue;
      }

      l.inputs[id] = {
        dirX: dx / dist,
        dirY: dy / dist
      };
    }
  }
},200);

/* ---------------- GAME FLOW ---------------- */
function startGame(lobbyId){
  const l = lobbies[lobbyId];
  if(l.gameStarted) return;

  fillWithBots(l);

  const humans = Object.keys(l.players).filter(id=>!l.players[id].isBot);
  const hainId = humans[Math.floor(Math.random()*humans.length)];

  Object.keys(l.players).forEach(id=>{
    l.roles[id] = id===hainId ? "hain" : "operatör";
  });

  l.gameStarted = true;
  io.to(lobbyId).emit("gameStart",{roles:l.roles,players:l.players});
}

/* ---------------- GAME END CHECK ---------------- */
function checkGameEnd(lobbyId){
  const l = lobbies[lobbyId];
  if(!l || !l.gameStarted) return;

  const aliveH = Object.keys(l.players)
    .filter(id=>l.players[id].alive && l.roles[id]==="hain");

  const aliveO = Object.keys(l.players)
    .filter(id=>l.players[id].alive && l.roles[id]==="operatör");

  if(aliveH.length === 0){
    endGame(lobbyId,"operatör");
  } else if(aliveO.length === 0){
    endGame(lobbyId,"hain");
  }
}

function endGame(lobbyId,winner){
  const l = lobbies[lobbyId];
  if(!l) return;

  l.gameStarted = false;

  io.to(lobbyId).emit("gameEndMessage",{
    text: winner==="hain" ? "Hain Kazandı!" : "Kazanan işçi sınıfı!"
  });
}

/* ---------------- RESET ---------------- */
function resetLobby(lobbyId){
  const l = lobbies[lobbyId];
  if(!l) return;

  Object.keys(l.players).forEach(id=>{
    if(l.players[id].isBot){
      delete l.players[id];
      delete l.inputs[id];
      delete l.roles[id];
      delete l.ready[id];
      delete l.botAI[id];
    }else{
      l.players[id].alive = true;
      l.ready[id] = false;
    }
  });

  io.to(lobbyId).emit("lobbyUpdate",getLobbyInfo(lobbyId));
}

/* ---------------- SOCKET ---------------- */
io.on("connection",socket=>{
  socket.on("joinLobby",({lobbyId,name})=>{
    if(!lobbies[lobbyId]){
      lobbies[lobbyId]={players:{},ready:{},roles:{},inputs:{},botAI:{},gameStarted:false};
    }

    lobbies[lobbyId].players[socket.id]={name,alive:true,x:300,y:300};
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

  socket.on("killPlayer",({lobbyId,targetId})=>{
    const l=lobbies[lobbyId];
    if(!l || l.roles[socket.id]!=="hain") return;
    if(!l.players[targetId] || !l.players[targetId].alive) return;

    l.players[targetId].alive = false;
    checkGameEnd(lobbyId);
  });

  socket.on("confirmGameEnd",({lobbyId})=>{
    resetLobby(lobbyId);
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

/* ---------------- MOVE LOOP ---------------- */
setInterval(()=>{
  for(const lid in lobbies){
    const l=lobbies[lid];
    if(!l.gameStarted) continue;

    for(const id in l.players){
      const p=l.players[id];
      if(!p.alive) continue;
      const i=l.inputs[id];
      if(!i) continue;

      const speed = p.isBot ? BOT_SPEED : PLAYER_SPEED;
      p.x += i.dirX * speed / 60;
      p.y += i.dirY * speed / 60;

      io.to(lid).emit("updatePlayerPosition",{id,x:p.x,y:p.y});
    }
  }
},1000/60);

server.listen(PORT,()=>console.log("Server running",PORT));