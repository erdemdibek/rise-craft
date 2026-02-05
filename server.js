const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
let gameInterval = null;

/* === MACHINE NAMES === */
const MACHINE_NAMES = [
  "Fette 1200",
  "Fette 2200",
  "Fette 3200",
  "Korsxh XT600",
  "Korsch XL400",
  "Bosch GKF701",
  "Kilian KTP 720",
  "Sejong",
  "Fette 2100",
  "Fette Fe55"
];

const lobby = {
  players: [],
  machines: [],
  started: false,
  time: 300,
  meeting: false,
  votes: {}
};

/* ================= MACHINES ================= */
function resetMachines(){
  lobby.machines = [];
  const xs = [300,700,1100,1500,1900];
  let i = 0;

  xs.forEach(x=>{
    lobby.machines.push({
      x, y:300,
      broken:false,
      name: MACHINE_NAMES[i++]
    });
    lobby.machines.push({
      x, y:800,
      broken:false,
      name: MACHINE_NAMES[i++]
    });
  });
}
resetMachines();

/* ================= SERVER ================= */
app.use(express.static(path.join(__dirname,"public")));
app.get("/",(_,res)=>{
  res.sendFile(path.join(__dirname,"public","index.html"));
});

/* ================= ROLES ================= */
function assignRoles(){
  lobby.players.forEach(p=>p.role="Operatör");
  lobby.players[Math.floor(Math.random()*lobby.players.length)].role="Hain";

  io.emit("rolesAssigned", lobby.players.map(p=>({
    id:p.id,
    role:p.role
  })));
}

/* ================= HELPERS ================= */
const distance = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function resetGame(){
  lobby.started = false;
  lobby.meeting = false;
  lobby.votes = {};
  resetMachines();

  lobby.players.forEach(p=>{
    p.alive = true;
    p.ready = false;
    p.role = null;
    p.tasksCompleted = 0;
    p.killCooldown = 0;
  });
}

function checkWin(){
  if(!lobby.started) return;

  const aliveOps = lobby.players.filter(p=>p.role==="Operatör" && p.alive);
  const aliveHain = lobby.players.filter(p=>p.role==="Hain" && p.alive);
  const broken = lobby.machines.filter(m=>m.broken);

  if(broken.length === 0 && aliveHain.length === 0){
    io.emit("gameEnd","🎉 Operatörler kazandı!");
    resetGame();
  }

  if(
    aliveHain.length > 0 &&
    (aliveOps.length === 0 || broken.length === lobby.machines.length)
  ){
    io.emit("gameEnd","💀 Hain kazandı!");
    resetGame();
  }
}

/* ================= SOCKET ================= */
io.on("connection",socket=>{

  socket.on("joinLobby",({name},cb)=>{
    if(!name?.trim()) return cb({error:"İsim boş"});
    if(lobby.players.find(p=>p.id===socket.id)) return cb({success:true});

    lobby.players.push({
      id:socket.id,
      name:name.trim(),
      x:500+Math.random()*300,
      y:500+Math.random()*300,
      color:`hsl(${Math.random()*360},70%,50%)`,
      ready:false,
      alive:true,
      role:null,
      tasksCompleted:0,
      killCooldown:0
    });

    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
    cb({success:true});
  });

  socket.on("playerReady",()=>{
    const p = lobby.players.find(p=>p.id===socket.id);
    if(!p) return;
    p.ready = true;

    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});

    if(lobby.players.length>=3 && lobby.players.every(p=>p.ready)){
      lobby.started = true;
      lobby.time = 300;
      resetMachines();
      assignRoles();
      io.emit("gameStart");
      startLoop();
    }
  });

  socket.on("move",({x,y})=>{
    const p=lobby.players.find(p=>p.id===socket.id);
    if(p && p.alive && !lobby.meeting){
      p.x=x; p.y=y;
    }
  });

  socket.on("action",({type,machineIndex})=>{
    const p=lobby.players.find(p=>p.id===socket.id);
    const m=lobby.machines[machineIndex];
    if(!p || !m || !p.alive || distance(p,m)>80) return;

    if(type==="breakMachine" && p.role==="Hain" && !m.broken){
      m.broken=true;
      io.emit("machinesUpdate",lobby.machines);
      checkWin();
    }

    if(type==="fixMachine" && p.role==="Operatör" && m.broken){
      m.broken=false;
      p.tasksCompleted++;
      io.emit("machinesUpdate",lobby.machines);
      checkWin();
    }
  });

  socket.on("killPlayer",(id)=>{
    const p=lobby.players.find(p=>p.id===socket.id);
    const t=lobby.players.find(p=>p.id===id);
    if(!p||!t||!p.alive||!t.alive) return;
    if(p.role!=="Hain"||p.killCooldown>0||distance(p,t)>80) return;

    t.alive=false;
    p.killCooldown=10;
    io.emit("playerKilled",t.id);
    checkWin();
  });

  socket.on("disconnect",()=>{
    lobby.players=lobby.players.filter(p=>p.id!==socket.id);
    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
  });
});

/* ================= LOOP ================= */
function startLoop(){
  if(gameInterval) clearInterval(gameInterval);

  gameInterval=setInterval(()=>{
    if(!lobby.started) return clearInterval(gameInterval);

    lobby.time--;
    lobby.players.forEach(p=>p.killCooldown>0 && p.killCooldown--);

    io.emit("state",{players:lobby.players,time:lobby.time});

    if(lobby.time<=0){
      io.emit("gameEnd","⏰ Süre doldu");
      resetGame();
      clearInterval(gameInterval);
    }
  },1000);
}

server.listen(PORT,()=>console.log("🚀 Server:",PORT));