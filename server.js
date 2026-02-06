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

/* ---------- MACHINES ---------- */
const MACHINE_NAMES = [
  "Elektrik", "Oksijen", "Reaktör", "Radar", "İletişim",
  "Motor", "Yakıt", "Silah", "Kalkan", "Navigasyon"
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
  if(started && !meeting){
    const m = machines[Math.floor(Math.random()*machines.length)];
    if(m && !m.broken){
      m.broken = true;
      io.emit("log",`⚙️ ${m.name} bozuldu`);
    }
  }
},15000);

/* ---------- ROLES ---------- */
function assignRoles(){
  players.forEach(p=>p.role="Operatör");
  const h = players[Math.floor(Math.random()*players.length)];
  if(h) h.role="Hain";
}

/* ---------- GAME CHECK ---------- */
function checkWin(){
  const alive = players.filter(p=>p.alive);
  const hain = alive.filter(p=>p.role==="Hain").length;
  const ops = alive.filter(p=>p.role==="Operatör").length;

  if(hain===0){
    io.emit("log","🎉 Operatörler kazandı");
    gameOver=true;
  }
  if(hain>=ops){
    io.emit("log","💀 Hain kazandı");
    gameOver=true;
  }
}

/* ---------- SOCKET ---------- */
io.on("connection",socket=>{

  socket.on("join",name=>{
    if(started) return;
    players.push({
      id:socket.id,
      name,
      x:Math.random()*MAP_W,
      y:Math.random()*MAP_H,
      alive:true,
      ghost:false,
      ready:false,
      admin:players.length===0,
      role:null
    });
    io.emit("log",`👤 ${name} katıldı`);
    lobby();
  });

  socket.on("ready",()=>{
    const p=players.find(p=>p.id===socket.id);
    if(p){p.ready=!p.ready;lobby();}
  });

  socket.on("start",()=>{
    const admin=players.find(p=>p.id===socket.id && p.admin);
    if(!admin) return;
    if(players.some(p=>!p.ready)) return;

    started=true;
    spawnMachines();
    assignRoles();
    players.forEach(p=>io.to(p.id).emit("role",p.role));
    io.emit("gameStarted");
  });

  socket.on("move",d=>{
    const p=players.find(p=>p.id===socket.id);
    if(!p||!started) return;
    p.x+=d.dx*6;
    p.y+=d.dy*6;
  });

  socket.on("kill",()=>{
    const k=players.find(p=>p.id===socket.id);
    if(!k||k.role!=="Hain"||!k.alive) return;

    const t=players.find(p=>
      p.alive &&
      p.id!==k.id &&
      Math.hypot(p.x-k.x,p.y-k.y)<60
    );
    if(!t) return;

    t.alive=false;
    t.ghost=true;
    io.emit("log",`💀 ${t.name} öldürüldü`);
    checkWin();
  });

  socket.on("report",()=>{
    meeting=true;
    votes={};
    io.emit("meetingStart",players.filter(p=>p.alive));
    setTimeout(()=>{
      const counts={};
      Object.values(votes).forEach(v=>counts[v]=(counts[v]||0)+1);
      const out=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
      if(out){
        const p=players.find(x=>x.id===out);
        if(p){p.alive=false;p.ghost=true;}
      }
      meeting=false;
      io.emit("meetingEnd");
      checkWin();
    },20000);
  });

  socket.on("vote",id=>{
    if(meeting) votes[socket.id]=id;
  });

  socket.on("repair",id=>{
    const m=machines.find(x=>x.id===id);
    if(m&&m.broken){
      m.broken=false;
      io.emit("log",`🔧 ${m.name} tamir edildi`);
    }
  });

  socket.on("disconnect",()=>{
    players=players.filter(p=>p.id!==socket.id);
    lobby();
  });
});

/* ---------- STATE ---------- */
function lobby(){
  io.emit("lobby",{players});
}

setInterval(()=>{
  if(started){
    io.emit("state",{players,machines});
  }
},50);

server.listen(3000,()=>console.log("SERVER READY"));