const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const MAP_W = 2000;
const MAP_H = 1200;
const MIN_PLAYERS = 4;

let players = [];
let machines = [];
let started = false;
let meeting = false;
let votes = {};
let gameOver = false;

/* ---------- MACHINES ---------- */
const MACHINE_NAMES = [
  "Elektrik","Oksijen","Reaktör","Radar","İletişim",
  "Motor","Yakıt","Silah","Kalkan","Navigasyon"
];

function spawnMachines(){
  machines = MACHINE_NAMES.map((n,i)=>({
    id:i,
    name:n,
    x:Math.random()*MAP_W,
    y:Math.random()*MAP_H,
    broken:false
  }));
}

setInterval(()=>{
  if(started && !meeting && !gameOver){
    const m = machines[Math.floor(Math.random()*machines.length)];
    if(m && !m.broken){
      m.broken = true;
      io.emit("log", `⚙️ ${m.name} bozuldu`);
    }
  }
},15000);

/* ---------- ROLES ---------- */
function assignRoles(){
  players.forEach(p=>p.role="Operatör");
  const h = players[Math.floor(Math.random()*players.length)];
  if(h) h.role="Hain";
}

/* ---------- WIN CHECK ---------- */
function checkWin(){
  const alive = players.filter(p=>p.alive);
  const hain = alive.filter(p=>p.role==="Hain").length;
  const ops = alive.filter(p=>p.role==="Operatör").length;

  if(hain === 0){
    io.emit("log","🎉 Operatörler kazandı");
    gameOver=true;
  }
  if(hain >= ops){
    io.emit("log","💀 Hain kazandı");
    gameOver=true;
  }
}

/* ---------- LOBBY ---------- */
function updateLobby(){
  const canStart = players.length >= MIN_PLAYERS && players.every(p=>p.ready);
  io.emit("lobby", { 
    players: players.map(p=>({
      id: p.id,
      name: p.name,
      ready: p.ready,
      admin: p.admin
    })),
    canStart
  });
}

/* ---------- SOCKET ---------- */
io.on("connection", socket => {

  /* JOIN */
  socket.on("join", name=>{
    if(started || gameOver) return;
    players.push({
      id: socket.id,
      name,
      x: Math.random()*MAP_W,
      y: Math.random()*MAP_H,
      alive: true,
      ghost: false,
      ready: false,
      admin: players.length===0,
      role: null
    });
    io.emit("log", `👤 ${name} katıldı`);
    updateLobby();
  });

  /* READY */
  socket.on("ready", ()=>{
    const p = players.find(p=>p.id===socket.id);
    if(!p) return;
    p.ready = !p.ready;
    updateLobby();
  });

  /* START */
  socket.on("start", ()=>{
    const admin = players.find(p=>p.id===socket.id && p.admin);
    if(!admin) return;
    if(players.length < MIN_PLAYERS) return;
    if(players.some(p=>!p.ready)) return;

    started = true;
    gameOver = false;
    spawnMachines();
    assignRoles();

    players.forEach(p=>{
      io.to(p.id).emit("role", p.role);
    });

    io.emit("gameStarted");
    io.emit("log","🎮 Oyun başladı");
  });

  /* MOVE */
  socket.on("move", ({dx,dy})=>{
    const p = players.find(p=>p.id===socket.id);
    if(!p || !started || gameOver) return;

    p.x = Math.max(0, Math.min(MAP_W, p.x + dx*6));
    p.y = Math.max(0, Math.min(MAP_H, p.y + dy*6));
  });

  /* KILL */
  socket.on("kill", ()=>{
    const k = players.find(p=>p.id===socket.id);
    if(!k || k.role!=="Hain" || !k.alive) return;

    const target = players.find(p=>p.alive && !p.ghost && p.id!==k.id && Math.hypot(p.x-k.x, p.y-k.y)<60);
    if(!target) return;

    target.alive=false;
    target.ghost=true;
    io.emit("log", `💀 ${target.name} öldürüldü`);
    checkWin();
  });

  /* REPORT */
  socket.on("report", ()=>{
    const reporter = players.find(p=>p.id===socket.id && p.alive && !p.ghost);
    if(!reporter) return;

    const found = players.find(p=>p.ghost && Math.hypot(p.x-reporter.x, p.y-reporter.y)<60);
    if(!found) return; // ceset yoksa toplantı başlatılmaz

    meeting=true;
    votes={};
    io.emit("meetingStart", players.filter(p=>p.alive));

    setTimeout(()=>{
      const counts={};
      Object.values(votes).forEach(v=>counts[v]=(counts[v]||0)+1);
      const out = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
      if(out){
        const p = players.find(x=>x.id===out);
        if(p){p.alive=false;p.ghost=true;io.emit("log", `🗳️ ${p.name} elendi`);}
      }
      meeting=false;
      io.emit("meetingEnd");
      checkWin();
    }, 20000);
  });

  /* VOTE */
  socket.on("vote", id=>{
    if(meeting) votes[socket.id]=id;
  });

  /* REPAIR */
  socket.on("repair", id=>{
    const m = machines.find(x=>x.id===id);
    if(!m || !m.broken) return;

    const p = players.find(p=>p.id===socket.id && p.role==="Operatör" && p.alive);
    if(!p) return;

    if(Math.hypot(p.x-m.x,p.y-m.y)<60){
      m.broken=false;
      io.emit("log", `🔧 ${m.name} tamir edildi`);
    }
  });

  /* DISCONNECT */
  socket.on("disconnect", ()=>{
    const wasAdmin = players.find(p=>p.id===socket.id)?.admin;
    players = players.filter(p=>p.id!==socket.id);

    if(wasAdmin && players[0]) players[0].admin=true;
    updateLobby();
  });
});

/* ---------- STATE ---------- */
setInterval(()=>{
  if(started && !gameOver){
    io.emit("state",{ players, machines });
  }
},50);

server.listen(3000, ()=>console.log("🚀 SERVER READY"));