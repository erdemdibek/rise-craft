const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
let gameInterval = null;

/* === MACHINE NAMES === */
const MACHINE_NAMES = [
  "Fette 1200","Fette 2200","Fette 3200","Korsch XT600",
  "Korsch XL400","Bosch GKF701","Kilian KTP 720",
  "Sejong","Fette 2100","Fette Fe55"
];

const lobby = {
  players: [],
  machines: [],
  started: false,
  time: 300,
  meeting: false
};

/* === MACHINES === */
function resetMachines(){
  lobby.machines = [];
  const xs = [300,700,1100,1500,1900];
  let i = 0;
  xs.forEach(x=>{
    lobby.machines.push({ x, y:300, broken:false, name:MACHINE_NAMES[i++] });
    lobby.machines.push({ x, y:800, broken:false, name:MACHINE_NAMES[i++] });
  });
}
resetMachines();

/* === SERVER === */
app.use(express.static(path.join(__dirname,"public")));
app.get("/",(_,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

/* === ROLES === */
function assignRoles(){
  lobby.players.forEach(p=>p.role="Operatör");
  const chosen = lobby.players[Math.floor(Math.random()*lobby.players.length)];
  if(chosen) chosen.role="Hain";

  io.emit(
    "rolesAssigned",
    lobby.players.map(p=>({id:p.id,role:p.role}))
  );
}

/* === HELPERS === */
const dist = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function resetGame(){
  lobby.started = false;

  if(gameInterval){
    clearInterval(gameInterval);
    gameInterval = null;
  }

  lobby.time = 300;
  resetMachines();

  lobby.players.forEach(p=>{
    p.alive = true;
    p.ready = false;
    p.tasksCompleted = 0;
    p.killCooldown = 0;
  });
}

/* === WIN CHECK === */
function checkWin(){
  const ops = lobby.players.filter(p=>p.role==="Operatör" && p.alive);
  const hain = lobby.players.filter(p=>p.role==="Hain" && p.alive);
  const broken = lobby.machines.filter(m=>m.broken).length;

  if(hain.length === 0){
    io.emit("gameEnd","🎉 Operatörler kazandı!");
    resetGame();
  }
  else if(hain.length > 0 && (ops.length === 0 || broken === lobby.machines.length)){
    io.emit("gameEnd","💀 Hain kazandı!");
    resetGame();
  }
}

/* === SOCKET === */
io.on("connection", socket => {

  socket.on("joinLobby", ({name}, cb)=>{
    if(!name) return cb({error:"İsim gir"});

    lobby.players.push({
      id: socket.id,
      name,
      x: 500,
      y: 500,
      color: `hsl(${Math.random()*360},70%,50%)`,
      ready: false,
      alive: true,
      role: null,
      tasksCompleted: 0,
      killCooldown: 0
    });

    io.emit("lobbyUpdate",{
      players: lobby.players,
      machines: lobby.machines
    });

    cb({success:true});
  });

  socket.on("playerReady", ()=>{
    const p = lobby.players.find(p=>p.id===socket.id);
    if(!p) return;

    p.ready = true;

    if(
      lobby.players.length >= 3 &&
      lobby.players.every(p=>p.ready)
    ){
      lobby.started = true;
      assignRoles();
      io.emit("gameStart");
      startLoop();
    }
  });

  socket.on("move", d=>{
    const p = lobby.players.find(p=>p.id===socket.id);
    if(p && p.alive){
      p.x = d.x;
      p.y = d.y;
    }
  });

  /* === ACTIONS === */
  socket.on("action", ({type, machineIndex})=>{
    const p = lobby.players.find(p=>p.id===socket.id);
    const m = lobby.machines[machineIndex];
    if(!p || !m || !p.alive || dist(p,m) > 80) return;

    // 🔧 SADECE OPERATÖR TAMİR EDER
    if(type === "fixMachine" && p.role === "Operatör" && m.broken){
      m.broken = false;
      p.tasksCompleted++;
      io.emit("machinesUpdate", lobby.machines);
      checkWin();
    }
  });

  /* === KILL === */
  socket.on("killPlayer", id=>{
    const killer = lobby.players.find(p=>p.id===socket.id);
    const target = lobby.players.find(p=>p.id===id);

    if(
      killer &&
      target &&
      killer.role === "Hain" &&
      killer.alive &&
      target.alive &&
      dist(killer,target) < 80
    ){
      target.alive = false;
      io.emit("playerKilled", target.id);
      checkWin();
    }
  });

  socket.on("disconnect", ()=>{
    lobby.players = lobby.players.filter(p=>p.id!==socket.id);
    io.emit("lobbyUpdate",{
      players:lobby.players,
      machines:lobby.machines
    });
  });
});

/* === GAME LOOP === */
function startLoop(){
  if(gameInterval) clearInterval(gameInterval);

  gameInterval = setInterval(()=>{
    if(!lobby.started) return;

    lobby.time--;

    // ⚙️ RANDOM SABOTAJ (15 sn)
    if(lobby.time % 15 === 0){
      const healthy = lobby.machines.filter(m=>!m.broken);
      if(healthy.length){
        const m = healthy[Math.floor(Math.random()*healthy.length)];
        m.broken = true;
        io.emit("machinesUpdate", lobby.machines);
      }
    }

    io.emit("state",{
      players: lobby.players,
      time: lobby.time
    });

    if(lobby.time <= 0){
      io.emit("gameEnd","⏰ Süre doldu!");
      resetGame();
    }
  },1000);
}

server.listen(PORT, ()=>console.log("🚀 Server 3000"));