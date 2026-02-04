const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

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
  for(let x=200;x<=1800;x+=400){
    lobby.machines.push({x,y:200,broken:false});
    lobby.machines.push({x,y:800,broken:false});
  }
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
      x:500+Math.random()*200,
      y:500+Math.random()*200,
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
      assignRoles();
      io.emit("gameStart",{players:lobby.players,machines:lobby.machines});
      startLoop();
    }
  });

  socket.on("move",({x,y})=>{
    const p=lobby.players.find(p=>p.id===socket.id);
    if(p && p.alive && !lobby.meeting){
      p.x=x; p.y=y;
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
    if(!lobby.started){ clearInterval(t); return; }
    lobby.time--;
    io.emit("state",{players:lobby.players,time:lobby.time});
    if(lobby.time<=0){
      io.emit("gameEnd","⏰ Süre doldu");
      lobby.started=false;
      clearInterval(t);
    }
  },1000);
}

server.listen(PORT,()=>console.log("🚀 http://localhost:"+PORT));