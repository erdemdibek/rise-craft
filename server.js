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

const MAP_W = 1400;
const MAP_H = 900;

/* ---------------- DATA ---------------- */
const BOT_NAMES = [
  "Ahmet","Mehmet","Ali","Veli","Can","Emre","Turgay",
  "Mert","Oğuz","Kaan","Furkan","Onur","Yusuf","Kerem"
];

let lobbies = {};

/* ---------------- BOT ---------------- */
function createBot(lobby){
  const id = "bot_"+Math.random().toString(36).slice(2,8);
  lobby.players[id] = {
    name: BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)],
    alive: true,
    isBot: true,
    x: Math.random()*MAP_W,
    y: Math.random()*MAP_H
  };
  lobby.ready[id] = true;
  lobby.inputs[id] = { dirX:0, dirY:0 };
  lobby.roles[id] = "operatör";
  lobby.botAI[id] = {
    target: randomTarget(),
    think: 60 + Math.random()*120
  };
}

function randomTarget(){
  return {
    x: 50 + Math.random()*(MAP_W-100),
    y: 50 + Math.random()*(MAP_H-100)
  };
}

function fillWithBots(lobby){
  while(Object.keys(lobby.players).length < MAX_PLAYERS){
    createBot(lobby);
  }
}

/* ---------------- BOT AI ---------------- */
setInterval(()=>{
  for(const lid in lobbies){
    const l = lobbies[lid];
    if(!l.gameStarted) continue;

    for(const id in l.botAI){
      const bot = l.players[id];
      if(!bot || !bot.alive) continue;

      const ai = l.botAI[id];
      ai.think--;

      if(ai.think <= 0){
        ai.think = 60 + Math.random()*120;
        ai.target = randomTarget();
      }

      const dx = ai.target.x - bot.x;
      const dy = ai.target.y - bot.y;
      const dist = Math.hypot(dx,dy);

      if(dist < 10){
        l.inputs[id] = {dirX:0, dirY:0};
      }else{
        l.inputs[id] = {dirX:dx/dist, dirY:dy/dist};
      }
    }
  }
},250);

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

function checkGameEnd(lobbyId){
  const l = lobbies[lobbyId];
  if(!l || !l.gameStarted) return;

  const aliveH = Object.keys(l.players)
    .filter(id=>l.players[id].alive && l.roles[id]==="hain");

  const aliveO = Object.keys(l.players)
    .filter(id=>l.players[id].alive && l.roles[id]==="operatör");

  if(aliveH.length===0) endGame(lobbyId,"operatör");
  else if(aliveO.length===0) endGame(lobbyId,"hain");
}

function endGame(lobbyId,winner){
  const l = lobbies[lobbyId];
  if(!l) return;

  l.gameStarted=false;
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

  io.to(lobbyId).emit("lobbyUpdate", getLobbyInfo(lobbyId));
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

  socket.on("playerInput",({lobbyId,dirX,dirY})=>{
    const l=lobbies[lobbyId];
    if(l && l.inputs[socket.id]){
      l.inputs[socket.id]={dirX,dirY};
    }
  });

  socket.on("killPlayer",({lobbyId,targetId})=>{
    const l=lobbies[lobbyId];
    if(!l || l.roles[socket.id]!=="hain") return;
    if(!l.players[targetId] || !l.players[targetId].alive) return;

    l.players[targetId].alive=false;
    io.to(lobbyId).emit("playerKilled",{
      targetId,
      x:l.players[targetId].x,
      y:l.players[targetId].y
    });

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

/* ---------------- MOVE ---------------- */
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