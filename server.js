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
  lobby.machines = [
    { x:200,y:200,broken:false },
    { x:600,y:200,broken:false },
    { x:1000,y:200,broken:false },
    { x:1400,y:200,broken:false },
    { x:1800,y:200,broken:false },
    { x:200,y:800,broken:false },
    { x:600,y:800,broken:false },
    { x:1000,y:800,broken:false },
    { x:1400,y:800,broken:false },
    { x:1800,y:800,broken:false },
  ];
}
resetMachines();

/* ================= SERVER ================= */
app.use(express.static(path.join(__dirname,"public")));
app.get("/",(_,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

/* ================= ROLES ================= */
function assignRoles(){
  lobby.players.forEach(p=>p.role="Operatör");
  const imp = lobby.players[Math.floor(Math.random()*lobby.players.length)];
  imp.role="Hain";

  io.emit("rolesAssigned", lobby.players.map(p=>({
    id:p.id,
    role:p.role
  })));
}

/* ================= WIN CHECK ================= */
function checkWin(){
  const alive = lobby.players.filter(p=>p.alive);
  const impostor = alive.find(p=>p.role==="Hain");
  const crew = alive.filter(p=>p.role==="Operatör");

  if(!impostor){
    io.emit("gameEnd","✅ Operatörler kazandı!");
    resetGame();
  } else if(crew.length<=2){
    io.emit("gameEnd","💀 Hain kazandı!");
    resetGame();
  }
}

function resetGame(){
  lobby.started=false;
  lobby.meeting=false;
  lobby.votes={};
  lobby.time=300;
  resetMachines();

  lobby.players.forEach(p=>{
    p.ready=false;
    p.alive=true;
    p.role=null;
  });

  io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
}

/* ================= SOCKET ================= */
io.on("connection",socket=>{
  console.log("🔌 Bağlandı:",socket.id);

  socket.on("joinLobby",({name},cb)=>{
    if(!name?.trim()) return cb({error:"İsim giriniz"});

    if(lobby.players.find(p=>p.id===socket.id)){
      return cb({success:true});
    }

    lobby.players.push({
      id:socket.id,
      name:name.trim(),
      x:400+Math.random()*400,
      y:400+Math.random()*400,
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
    if(p) p.ready=true;

    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});

    if(
      lobby.players.length>=3 &&
      lobby.players.every(p=>p.ready) &&
      !lobby.started
    ){
      lobby.started=true;
      assignRoles();
      io.emit("gameStart",{players:lobby.players,machines:lobby.machines});
      startLoop();
    }
  });

  socket.on("move",({x,y})=>{
    if(lobby.meeting) return;
    const p=lobby.players.find(p=>p.id===socket.id);
    if(p&&p.alive){ p.x=x; p.y=y; }
  });

  socket.on("action",({type,targetId,machineIndex})=>{
    const actor=lobby.players.find(p=>p.id===socket.id);
    if(!actor||!actor.alive||actor.role!=="Hain"||lobby.meeting) return;

    if(type==="kill"){
      const t=lobby.players.find(p=>p.id===targetId);
      if(t&&t.alive&&t.id!==actor.id){
        t.alive=false;
        io.emit("playerKilled",t.id);
        lobby.meeting=true;
        io.emit("meeting");
      }
    }

    if(type==="breakMachine"){
      if(lobby.machines[machineIndex]){
        lobby.machines[machineIndex].broken=true;
        io.emit("machinesUpdated",lobby.machines);
      }
    }
  });

  socket.on("vote",({voteFor})=>{
    if(!lobby.meeting) return;

    lobby.votes[socket.id]=voteFor;

    const alive=lobby.players.filter(p=>p.alive).length;
    if(Object.keys(lobby.votes).length===alive){
      let tally={};

      Object.values(lobby.votes).forEach(v=>{
        if(!v) return;
        tally[v]=(tally[v]||0)+1;
      });

      const sorted=Object.entries(tally).sort((a,b)=>b[1]-a[1]);
      if(sorted.length>1 && sorted[0][1]===sorted[1][1]){
        // eşit oy → kimse atılmıyor
      } else if(sorted[0]){
        const p=lobby.players.find(p=>p.id===sorted[0][0]);
        if(p){ p.alive=false; io.emit("playerEjected",p.id); }
      }

      lobby.votes={};
      lobby.meeting=false;
      io.emit("meetingEnd");
      checkWin();
    }
  });

  socket.on("disconnect",()=>{
    lobby.players=lobby.players.filter(p=>p.id!==socket.id);
    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
  });
});

/* ================= GAME LOOP ================= */
function startLoop(){
  const i=setInterval(()=>{
    if(!lobby.started){ clearInterval(i); return; }
    lobby.time--;
    io.emit("state",{players:lobby.players,time:lobby.time});
    if(lobby.time<=0){
      io.emit("gameEnd","⏰ Süre doldu!");
      resetGame();
      clearInterval(i);
    }
  },1000);
}

server.listen(PORT,()=>console.log("🚀 Server çalışıyor:",PORT));