const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000; // Render uyumlu
let gameInterval = null;

const MACHINE_NAMES = [
  "Fette 1200","Fette 2200","Fette 3200","Korsch XT600",
  "Korsch XL400","Bosch GKF701","Kilian KTP 720",
  "Sejong","Fette 2100","Fette Fe55"
];

const MAP_W = 2000, MAP_H = 1200;

const lobby = {
  players: [],
  machines: [],
  started: false,
  time: 300,
  meeting: false,
  votes: {}
};

function resetMachines(){
  lobby.machines=[];
  const xs=[300,700,1100,1500,1900];
  let i=0;
  xs.forEach(x=>{
    lobby.machines.push({x,y:300,broken:false,name:MACHINE_NAMES[i++]});
    lobby.machines.push({x,y:800,broken:false,name:MACHINE_NAMES[i++]});
  });
}
resetMachines();

app.use(express.static(path.join(__dirname,"public")));
app.get("/", (_, res) => res.sendFile(path.join(__dirname,"public","index.html")));

const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);

function assignRoles(){
  lobby.players.forEach(p=>p.role="Operatör");
  lobby.players[Math.floor(Math.random()*lobby.players.length)].role="Hain";
  io.emit("rolesAssigned", lobby.players.map(p=>({id:p.id,role:p.role})));
}

function resetGame(){
  lobby.started=false;
  lobby.meeting=false;
  lobby.votes={};
  lobby.time=300;
  resetMachines();
  if(gameInterval){ clearInterval(gameInterval); gameInterval=null; }
  lobby.players.forEach(p=>{
    p.alive=true;
    p.ready=false;
    p.tasksCompleted=0;
    p.inGame=false;
  });
}

function checkWin(){
  const ops=lobby.players.filter(p=>p.role==="Operatör" && p.alive);
  const hain=lobby.players.filter(p=>p.role==="Hain" && p.alive);
  const broken=lobby.machines.filter(m=>m.broken).length;

  if(hain.length===0){
    io.emit("gameEnd","🎉 Operatörler kazandı!");
    resetGame();
  } else if(hain.length>0 && (ops.length===0 || broken===lobby.machines.length)){
    io.emit("gameEnd","💀 Hain kazandı!");
    resetGame();
  }
}

function startMeeting(){
  lobby.meeting=true;
  lobby.votes={};
  io.emit("startMeeting");
  setTimeout(endMeeting,15000);
}

function endMeeting(){
  lobby.meeting=false;
  const count={};
  Object.values(lobby.votes).forEach(v=>count[v]=(count[v]||0)+1);
  let max=0, out=null;
  for(const id in count){ if(count[id]>max){ max=count[id]; out=id; } }
  if(out){
    const p=lobby.players.find(p=>p.id===out);
    if(p) p.alive=false;
  }
  io.emit("endMeeting", out);
  checkWin();
}

io.on("connection", socket => {

  socket.on("joinLobby", ({name}, cb) => {
    if(!name) return cb({error:"İsim gir"});
    const isAdmin = lobby.players.length===0;
    const inGame = lobby.started;
    lobby.players.push({
      id:socket.id,
      name,
      x:Math.random()*MAP_W,
      y:Math.random()*MAP_H,
      color:`hsl(${Math.random()*360},70%,50%)`,
      ready:false,
      alive:!inGame,
      role:null,
      tasksCompleted:0,
      lastKill:0,
      inGame:!inGame,
      isAdmin
    });
    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
    cb({success:true, inGame:!inGame, isAdmin});
  });

  socket.on("playerReady",()=>{
    const p=lobby.players.find(p=>p.id===socket.id);
    if(!p) return;
    p.ready=true;
    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
  });

  socket.on("startGame",()=>{
    const admin = lobby.players.find(p=>p.id===socket.id && p.isAdmin);
    if(!admin) return;
    if(lobby.players.filter(p=>!p.ready).length>0) return;
    if(lobby.players.length<4) return; // Minimum 4 kişi
    lobby.started=true;
    lobby.players.forEach(p=>p.inGame=true);
    assignRoles();
    io.emit("gameStart");
    startLoop();
  });

  socket.on("move", d => {
    const p=lobby.players.find(p=>p.id===socket.id);
    if(p && p.alive && !lobby.meeting){
      p.x=d.x; p.y=d.y;
    }
  });

  socket.on("action", ({type, machineIndex}) => {
    const p=lobby.players.find(p=>p.id===socket.id);
    const m=lobby.machines[machineIndex];
    if(!p||!m||dist(p,m)>80||lobby.meeting) return;
    if(type==="fixMachine" && p.role==="Operatör" && m.broken){
      m.broken=false;
      p.tasksCompleted++;
      io.emit("machinesUpdate", lobby.machines);
      checkWin();
    }
  });

  socket.on("killPlayer", targetId => {
    const killer=lobby.players.find(p=>p.id===socket.id);
    const target=lobby.players.find(p=>p.id===targetId);
    if(!killer||!target) return;
    if(killer.role!=="Hain" || !killer.alive || !target.alive) return;
    if(dist(killer,target)>60 || lobby.meeting) return;
    const now=Date.now();
    if(now-killer.lastKill<3000) return;
    killer.lastKill=now;
    target.alive=false;
    io.emit("playerKilled", target.id);
    startMeeting();
  });

  socket.on("vote", id => {
    if(!lobby.meeting) return;
    const p=lobby.players.find(p=>p.id===socket.id);
    if(p && p.alive) lobby.votes[p.id] = id;
  });

  socket.on("disconnect", ()=>{
    lobby.players=lobby.players.filter(p=>p.id!==socket.id);
    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
  });

});

function startLoop(){
  if(gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(()=>{
    if(!lobby.started || lobby.meeting) return;
    lobby.time--;
    if(lobby.time % 15 === 0){
      const ok=lobby.machines.filter(m=>!m.broken);
      if(ok.length){
        ok[Math.floor(Math.random()*ok.length)].broken=true;
        io.emit("machinesUpdate", lobby.machines);
      }
    }
    io.emit("state",{players:lobby.players, time:lobby.time});
    if(lobby.time <= 0){
      io.emit("gameEnd","⏰ Süre doldu");
      resetGame();
    }
  },1000);
}

server.listen(PORT,()=>console.log(`🚀 Server running on port ${PORT}`));