const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let gameInterval = null;

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
  xs.forEach(x=>{
    lobby.machines.push({x:x,y:300,broken:false});
    lobby.machines.push({x:x,y:800,broken:false});
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

  io.emit("rolesAssigned",lobby.players.map(p=>({
    id:p.id,
    role:p.role
  })));
}

/* ================= HELPERS ================= */
function distance(a,b){
  return Math.hypot(a.x-b.x,a.y-b.y);
}

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

  const aliveOperators = lobby.players.filter(p=>p.role==="Operatör" && p.alive);
  const aliveHains = lobby.players.filter(p=>p.role==="Hain" && p.alive);
  const brokenMachines = lobby.machines.filter(m=>m.broken);

  if(brokenMachines.length === 0 && aliveHains.length === 0){
    io.emit("gameEnd","🎉 Operatörler kazandı!");
    resetGame();
  }

  if(
    aliveHains.length > 0 &&
    (aliveOperators.length === 0 || brokenMachines.length === lobby.machines.length)
  ){
    io.emit("gameEnd","💀 Hain kazandı!");
    resetGame();
  }
}

/* ================= SOCKET ================= */
io.on("connection",socket=>{
  console.log("🔌 Connected:",socket.id);

  socket.on("joinLobby",({name},cb)=>{
    if(!name || !name.trim()) return cb({error:"İsim boş olamaz"});
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
    const p=lobby.players.find(p=>p.id===socket.id);
    if(!p) return;
    p.ready=true;

    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});

    if(lobby.players.length>=3 && lobby.players.every(p=>p.ready) && !lobby.started){
      lobby.started=true;
      lobby.time=300;
      resetMachines();
      assignRoles();
      io.emit("gameStart",{players:lobby.players,machines:lobby.machines});
      startLoop();
    }
  });

  socket.on("move",({x,y})=>{
    const p=lobby.players.find(p=>p.id===socket.id);
    if(p && p.alive && !lobby.meeting){
      p.x=x;
      p.y=y;
    }
  });

  /* MACHINE ACTIONS */
  socket.on("action",({type,machineIndex})=>{
    if(lobby.meeting) return;

    const p=lobby.players.find(p=>p.id===socket.id);
    const m=lobby.machines[machineIndex];
    if(!p || !m || !p.alive) return;
    if(distance(p,m) > 80) return;

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

  /* KILL */
  socket.on("killPlayer",(targetId)=>{
    if(lobby.meeting) return;

    const p = lobby.players.find(p=>p.id===socket.id);
    const target = lobby.players.find(p=>p.id===targetId);

    if(!p || !target) return;
    if(!p.alive || !target.alive) return;
    if(p.role!=="Hain") return;
    if(p.killCooldown > 0) return;
    if(distance(p,target) > 80) return;

    target.alive=false;
    p.killCooldown = 10;

    io.emit("playerKilled",target.id);
    checkWin();
  });

  socket.on("disconnect",()=>{
    lobby.players = lobby.players.filter(p=>p.id!==socket.id);
    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
  });
});

/* ================= GAME LOOP ================= */
function startLoop(){
  if(gameInterval) clearInterval(gameInterval);

  gameInterval = setInterval(()=>{
    if(!lobby.started){
      clearInterval(gameInterval);
      gameInterval = null;
      return;
    }

    lobby.time--;

    lobby.players.forEach(p=>{
      if(p.killCooldown > 0) p.killCooldown--;
    });

    io.emit("state",{players:lobby.players,time:lobby.time});

    if(lobby.time<=0){
      io.emit("gameEnd","⏰ Süre doldu");
      resetGame();
      clearInterval(gameInterval);
      gameInterval = null;
    }
  },1000);
}

server.listen(PORT,()=>console.log("🚀 Server:",PORT));