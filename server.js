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
  machines: [
    { name: "Fette 1200", x: 200, y: 200, repaired: false },
    { name: "Fette 2200", x: 600, y: 200, repaired: false },
    { name: "Kilian KTP 720", x: 1000, y: 200, repaired: false },
    { name: "Korsch XL 400", x: 1400, y: 200, repaired: false },
    { name: "Bosch GKF 701", x: 1800, y: 200, repaired: false },
    { name: "Fette 3200", x: 200, y: 800, repaired: false },
    { name: "Korsch XT600", x: 600, y: 800, repaired: false },
    { name: "Fette Fe55", x: 1000, y: 800, repaired: false },
    { name: "Sejong", x: 1400, y: 800, repaired: false },
    { name: "Fette 2100", x: 1800, y: 800, repaired: false },
  ],
  started: false,
  sabotage: null,
  time: 300,
  meeting: false
};

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

// Assign roles randomly
function assignRoles() {
  const totalPlayers = lobby.players.length;
  const numHain = Math.max(1, Math.floor(totalPlayers/4));
  const shuffled = [...lobby.players].sort(()=>Math.random()-0.5);
  shuffled.forEach((p,i)=>p.role=(i<numHain?"Hain":"Çalışan"));
  lobby.players.forEach(p=>p.alive=true);
}

io.on("connection", socket=>{
  console.log("🔌 Bağlanan:", socket.id);

  // LOBBİYE KATIL
  socket.on("joinLobby", ({name})=>{
    if(!name) return;
    let player = {
      id: socket.id,
      name,
      x: 400 + Math.random()*400,
      y: 400 + Math.random()*400,
      color: `hsl(${Math.random()*360},70%,50%)`,
      ready: false,
      alive: true,
      role: null,
      votes:0
    };
    lobby.players.push(player);
    io.emit("lobbyUpdate", {players:lobby.players, machines:lobby.machines});
  });

  // HAZIR DURUMU
  socket.on("playerReady", ()=>{
    const p = lobby.players.find(pl=>pl.id===socket.id);
    if(p) p.ready = true;
    io.emit("lobbyUpdate", {players:lobby.players, machines:lobby.machines});

    if(lobby.players.every(pl=>pl.ready) && !lobby.started){
      lobby.started = true;
      assignRoles();
      io.emit("gameStart", {players:lobby.players, machines:lobby.machines});
      startGameLoop();
    }
  });

  // HAREKET
  socket.on("move", ({x,y})=>{
    const p = lobby.players.find(pl=>pl.id===socket.id);
    if(p && p.alive) {p.x=x; p.y=y;}
  });

  // ÖLDÜRME
  socket.on("kill", targetId=>{
    const killer = lobby.players.find(p=>p.id===socket.id);
    const target = lobby.players.find(p=>p.id===targetId);
    if(!killer || !target) return;
    if(killer.role!=="Hain" || !killer.alive) return;
    if(!target.alive) return;

    const dx = killer.x - target.x;
    const dy = killer.y - target.y;
    if(Math.sqrt(dx*dx+dy*dy)>60) return; // yakın olmalı

    target.alive = false;
    io.emit("playerKilled", {targetId: target.id, killerId: killer.id});
  });

  // MAKİNE ONARMA
  socket.on("repairMachine", machineIndex=>{
    const p = lobby.players.find(pl=>pl.id===socket.id);
    if(!p || !p.alive) return;
    if(lobby.machines[machineIndex]) lobby.machines[machineIndex].repaired = true;
    io.emit("machinesUpdate", lobby.machines);
  });

  // ACİL TOPLANTI
  socket.on("emergencyMeeting", ()=>{
    lobby.meeting = true;
    io.emit("meetingStart", {
      players: lobby.players.map(p=>({id:p.id,name:p.name,alive:p.alive}))
    });
  });

  // OY VERME
  socket.on("vote", targetId=>{
    const voter = lobby.players.find(p=>p.id===socket.id);
    if(!voter || !voter.alive) return;
    const target = lobby.players.find(p=>p.id===targetId);
    if(!target || !target.alive) return;
    target.votes++;
  });

  // DISCONNECT
  socket.on("disconnect", ()=>{
    lobby.players = lobby.players.filter(p=>p.id!==socket.id);
    io.emit("lobbyUpdate", {players:lobby.players, machines:lobby.machines});
    console.log("❌ Ayrıldı:", socket.id);
  });
});

// GAME LOOP
function startGameLoop(){
  const interval = setInterval(()=>{
    if(!lobby.started) { clearInterval(interval); return; }

    // Zaman ve sabotaj
    lobby.time--;
    io.emit("state", {players:lobby.players, sabotage:lobby.sabotage, time:lobby.time});

    // Oylama kontrolü
    if(lobby.meeting){
      setTimeout(resolveVotes,15000); // 15 saniye oylama
      lobby.meeting = false;
    }

    // Kazanan kontrolü
    const aliveHain = lobby.players.filter(p=>p.alive && p.role==="Hain").length;
    const aliveCalisan = lobby.players.filter(p=>p.alive && p.role==="Çalışan").length;
    const allRepaired = lobby.machines.every(m=>m.repaired);

    if(aliveHain===0){
      io.emit("gameEnd","🏆 Çalışanlar kazandı!");
      resetGame();
    } else if(aliveHain>=aliveCalisan){
      io.emit("gameEnd","💀 Hain kazandı!");
      resetGame();
    } else if(allRepaired){
      io.emit("gameEnd","🏆 Çalışanlar kazandı! Tüm makineler onarıldı!");
      resetGame();
    }

    if(lobby.time<=0){
      io.emit("gameEnd","⏰ Süre doldu! Oyun bitti.");
      resetGame();
    }

  },1000);
}

function resolveVotes(){
  const alivePlayers = lobby.players.filter(p=>p.alive);
  let maxVotes = 0;
  let votedOut = null;

  alivePlayers.forEach(p=>{
    if(p.votes>maxVotes){
      maxVotes = p.votes;
      votedOut = p;
    }
    p.votes = 0;
  });

  if(votedOut){
    votedOut.alive=false;
    io.emit("playerEjected",{id:votedOut.id, role:votedOut.role});
  }

  io.emit("meetingEnd");
}

function resetGame(){
  lobby.started=false;
  lobby.time=300;
  lobby.players.forEach(p=>{p.ready=false; p.alive=true; p.votes=0; p.role=null;});
  lobby.machines.forEach(m=>m.repaired=false);
}

server.listen(PORT, ()=>console.log(`🚀 Server çalışıyor: ${PORT}`));