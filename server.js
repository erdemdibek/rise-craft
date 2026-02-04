const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// LOBBY & OYUNCU VERİLERİ
const lobby = {
  players: [],
  machines: [
    { name: "Fette 1200", x: 200, y: 200, broken: false },
    { name: "Fette 2200", x: 600, y: 200, broken: false },
    { name: "Kilian KTP 720", x: 1000, y: 200, broken: false },
    { name: "Korsch XL 400", x: 1400, y: 200, broken: false },
    { name: "Bosch GKF 701", x: 1800, y: 200, broken: false },
    { name: "Fette 3200", x: 200, y: 800, broken: false },
    { name: "Korsch XT600", x: 600, y: 800, broken: false },
    { name: "Fette Fe55", x: 1000, y: 800, broken: false },
    { name: "Sejong", x: 1400, y: 800, broken: false },
    { name: "Fette 2100", x: 1800, y: 800, broken: false },
  ],
  started: false,
  time: 300,
  meeting: false,
  votes: {}
};

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// Helper: role dağıtımı
function assignRoles() {
  const players = [...lobby.players];
  const count = Math.max(1, Math.floor(players.length / 4));
  players.forEach(p => p.role = "Çalışan");
  for(let i=0;i<count;i++){
    const idx = Math.floor(Math.random()*players.length);
    players[idx].role="Hain";
    players.splice(idx,1);
  }
  io.emit("rolesAssigned", lobby.players.map(p=>({id:p.id,role:p.role})));
}

io.on("connection", socket => {
  console.log("Bağlandı:", socket.id);

  // LOBBİYE KATIL
  socket.on("joinLobby", ({name}) => {
    if(!name) return;
    let player = { id: socket.id, name, x: 400 + Math.random()*400, y: 400 + Math.random()*400, color: `hsl(${Math.random()*360},70%,50%)`, ready:false, alive:true };
    lobby.players.push(player);
    io.emit("lobbyUpdate", { players: lobby.players, machines: lobby.machines });
  });

  // HAZIR DURUMU
  socket.on("playerReady", () => {
    let p = lobby.players.find(pl => pl.id===socket.id);
    if(p) p.ready=true;
    io.emit("lobbyUpdate", { players: lobby.players, machines: lobby.machines });

    // Oyun başlat
    if(lobby.players.length>0 && lobby.players.every(pl=>pl.ready) && !lobby.started){
      lobby.started=true;
      assignRoles();
      io.emit("gameStart", { players: lobby.players, machines: lobby.machines });
      startGameLoop();
    }
  });

  // HAREKET
  socket.on("move", ({x,y})=>{
    let p = lobby.players.find(pl=>pl.id===socket.id);
    if(p) { p.x=x; p.y=y; }
  });

  // SABOTAJ / ÖLDÜRME
  socket.on("action", ({type,targetId,machineIndex})=>{
    let actor = lobby.players.find(pl=>pl.id===socket.id);
    if(!actor || !actor.alive || actor.role!="Hain") return;

    if(type==="breakMachine" && machineIndex!=null){
      lobby.machines[machineIndex].broken=true;
      io.emit("machinesUpdated", lobby.machines);
    }

    if(type==="kill" && targetId){
      let target = lobby.players.find(pl=>pl.id===targetId);
      if(target && target.alive){
        target.alive=false;
        io.emit("playerKilled", target.id);
        // acil toplantı tetikleme
        lobby.meeting=true;
        io.emit("meeting", { killerId:actor.id, deadId:target.id });
      }
    }
  });

  // OY VERME
  socket.on("vote", ({voteFor})=>{
    if(!lobby.meeting) return;
    lobby.votes[socket.id]=voteFor;
    const votesCount = Object.keys(lobby.votes).length;
    if(votesCount===lobby.players.filter(p=>p.alive).length){
      // Oylama tamam
      let tally = {};
      Object.values(lobby.votes).forEach(v=>{
        if(v) tally[v]=(tally[v]||0)+1;
      });
      let max=0, ejected=null;
      Object.entries(tally).forEach(([id,c])=>{
        if(c>max){ max=c; ejected=id; max=c; }
      });
      if(ejected){
        let p = lobby.players.find(pl=>pl.id===ejected);
        if(p){ p.alive=false; io.emit("playerEjected",p.id); }
      }
      // Reset oylama
      lobby.meeting=false;
      lobby.votes={};
      io.emit("meetingEnd");
    }
  });

  socket.on("disconnect", ()=>{
    lobby.players = lobby.players.filter(pl=>pl.id!==socket.id);
    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
  });
});

// GAME LOOP
function startGameLoop(){
  const interval = setInterval(()=>{
    if(!lobby.started){ clearInterval(interval); return; }
    lobby.time--;
    io.emit("state",{players:lobby.players, time:lobby.time});
    if(lobby.time<=0){
      io.emit("gameEnd","⏰ Süre doldu!");
      lobby.started=false;
      lobby.players.forEach(p=>p.ready=false);
      lobby.time=300;
      clearInterval(interval);
    }
  },1000);
}

server.listen(PORT, ()=>console.log(`Server çalışıyor: ${PORT}`));