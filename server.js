const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const MAP_W = 2000;
const MAP_H = 1200;

let players = [];
let machines = [];
let started = false;
let meeting = false;
let votes = {};
let gameOver = false;

/* ---------- MAP ---------- */
function resetMachines(){
  machines=[];
  let i=0;
  for(let x=300;x<=1700;x+=400){
    machines.push({x,y:300,broken:false,name:"Makine "+(++i)});
    machines.push({x,y:800,broken:false,name:"Makine "+(++i)});
  }
}
resetMachines();

/* ---------- ROLES ---------- */
function assignRoles(){
  players.forEach(p=>p.role="Masum");
  const traitor = players[Math.floor(Math.random()*players.length)];
  traitor.role = "Hain";
}

/* ---------- LOBBY ---------- */
function lobbyUpdate(){
  const lobbyPlayers = players.map(p=>({
    id: p.id,
    name: p.name,
    ready: p.ready,
    admin: p.admin
  }));

  io.emit("lobby",{
    players: lobbyPlayers,
    canStart:
      players.length >= 4 &&
      players.every(p=>p.ready)
  });
}

/* ---------- SOCKET ---------- */
io.on("connection", socket => {

  socket.on("join", name => {
    if(started || gameOver) return;

    players.push({
      id: socket.id,
      name,
      x: Math.random()*MAP_W,
      y: Math.random()*MAP_H,
      color: `hsl(${Math.random()*360},70%,50%)`,
      alive: true,
      ready: false,
      admin: players.length === 0,
      role: null
    });

    lobbyUpdate();
  });

  socket.on("ready",()=>{
    const p = players.find(p=>p.id===socket.id);
    if(!p) return;

    p.ready = !p.ready;
    lobbyUpdate();
  });

  socket.on("start",()=>{
    const admin = players.find(p=>p.admin && p.id===socket.id);
    if(!admin) return;
    if(players.length < 4) return;
    if(players.some(p=>!p.ready)) return;

    started = true;
    gameOver = false;

    assignRoles();

    players.forEach(p=>{
      io.to(p.id).emit("role",p.role);
    });

    io.emit("gameStarted");
  });
socket.on("move", ({dx, dy}) => {
  const p = players.find(p => p.id === socket.id);
  if(!p || !started || gameOver) return;

  // Ölüler serbest dolaşır
  if(!p.alive){
    p.x += dx * 6;
    p.y += dy * 6;
    return;
  }

  if(meeting) return; // toplantı sırasında hareket yok

  // Harita sınırları
  p.x = Math.max(20, Math.min(MAP_W - 20, p.x + dx * 6));
  p.y = Math.max(20, Math.min(MAP_H - 20, p.y + dy * 6));
});

  socket.on("disconnect",()=>{
    const wasAdmin = players.find(p=>p.id===socket.id)?.admin;
    players = players.filter(p=>p.id!==socket.id);

    if(wasAdmin && players.length>0){
      players[0].admin = true;
    }

    lobbyUpdate();
  });

});

/* ---------- STATE ---------- */
setInterval(()=>{
  if(!started || gameOver) return;
  io.emit("state",{players,machines});
},50);

server.listen(process.env.PORT||3000,
  ()=>console.log("🚀 SERVER READY"));