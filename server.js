const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

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

/* ================= SOCKET ================= */
io.on("connection",socket=>{
  console.log("🔌 Connected:",socket.id);

  socket.on("joinLobby",({name},cb)=>{
    if(!name || !name.trim()){
      return cb({error:"İsim boş olamaz"});
    }

    if(lobby.players.find(p=>p.id===socket.id)){
      return cb({success:true});
    }

    lobby.players.push({
      id:socket.id,
      name:name.trim(),
      x:500+Math.random()*300,
      y:500+Math.random()*300,
      color:`hsl(${Math.random()*360},70%,50%)`,
      ready:false,
      alive:true,
      role:null
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

  /* ========== MACHINE ACTIONS (YENİ) ========== */
  socket.on("action",({type,machineIndex})=>{
    const p=lobby.players.find(p=>p.id===socket.id);
    const m=lobby.machines[machineIndex];
    if(!p || !m || !p.alive) return;

    if(distance(p,m) > 80) return; // makineye yakınlık şart

    // HAIN BOZAR
    if(type==="breakMachine" && p.role==="Hain"){
      if(!m.broken){
        m.broken=true;
        io.emit("machinesUpdate",lobby.machines);
      }
    }

    // OPERATÖR TAMİR EDER
    if(type==="fixMachine" && p.role==="Operatör"){
      if(m.broken){
        m.broken=false;
        io.emit("machinesUpdate",lobby.machines);
      }
    }
  });

  socket.on("disconnect",()=>{
    lobby.players=lobby.players.filter(p=>p.id!==socket.id);
    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
  });
});

/* ================= GAME LOOP ================= */
function startLoop(){
  const t=setInterval(()=>{
    if(!lobby.started){
      clearInterval(t);
      return;
    }

    lobby.time--;
    io.emit("state",{players:lobby.players,time:lobby.time});

    if(lobby.time<=0){
      io.emit("gameEnd","⏰ Süre doldu");
      lobby.started=false;
      clearInterval(t);
    }
  },1000);
}

server.listen(PORT,()=>console.log("🚀 Server:",PORT));