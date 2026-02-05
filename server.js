const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const MAP_W=2000, MAP_H=1200;
let players=[], started=false, meeting=false, votes={}, gameOver=false;

/* ROLES */
function assignRoles(){
  players.forEach(p=>p.role="Masum");
  players[Math.floor(Math.random()*players.length)].role="Hain";
}

/* LOBBY */
function lobbyUpdate(){
  io.emit("lobby",{
    players:players.map(p=>({id:p.id,name:p.name,ready:p.ready,admin:p.admin})),
    canStart:players.length>=4 && players.every(p=>p.ready)
  });
}

/* SOCKET */
io.on("connection",socket=>{

  socket.on("join",name=>{
    if(started||gameOver) return;
    players.push({
      id:socket.id,name,
      x:Math.random()*MAP_W,y:Math.random()*MAP_H,
      color:`hsl(${Math.random()*360},70%,50%)`,
      alive:true,ready:false,admin:players.length===0,role:null
    });
    lobbyUpdate();
  });

  socket.on("ready",()=>{
    const p=players.find(p=>p.id===socket.id);
    if(!p) return;
    p.ready=!p.ready;
    lobbyUpdate();
  });

  socket.on("start",()=>{
    const admin=players.find(p=>p.admin&&p.id===socket.id);
    if(!admin||players.some(p=>!p.ready)) return;
    started=true; gameOver=false;
    assignRoles();
    players.forEach(p=>io.to(p.id).emit("role",p.role));
    io.emit("gameStarted");
    io.emit("log","🎮 Oyun başladı");
  });

  socket.on("move",({dx,dy})=>{
    const p=players.find(p=>p.id===socket.id);
    if(!p||!started||gameOver||meeting) return;
    p.x=Math.max(20,Math.min(MAP_W-20,p.x+dx*6));
    p.y=Math.max(20,Math.min(MAP_H-20,p.y+dy*6));
  });

  socket.on("kill",id=>{
    const k=players.find(p=>p.id===socket.id);
    const t=players.find(p=>p.id===id);
    if(!k||!t||!k.alive||!t.alive||k.role!=="Hain") return;
    if(Math.hypot(k.x-t.x,k.y-t.y)<60){
      t.alive=false;
      io.emit("log",`💀 ${t.name} öldürüldü`);
      meeting=true; votes={};
      io.emit("meetingStart",players.filter(p=>p.alive).map(p=>({id:p.id,name:p.name})));
      setTimeout(()=>{
        meeting=false;
        let count={};
        Object.values(votes).forEach(v=>count[v]=(count[v]||0)+1);
        let out=Object.keys(count).sort((a,b)=>count[b]-count[a])[0];
        if(out){
          const p=players.find(x=>x.id===out);
          if(p){p.alive=false;io.emit("log",`🗳️ ${p.name} elendi`);}
        }
        io.emit("meetingEnd");
      },15000);
    }
  });

  socket.on("vote",id=>{
    if(meeting) votes[socket.id]=id;
  });

  socket.on("disconnect",()=>{
    const wasAdmin=players.find(p=>p.id===socket.id)?.admin;
    players=players.filter(p=>p.id!==socket.id);
    if(wasAdmin&&players[0]) players[0].admin=true;
    lobbyUpdate();
  });
});

/* STATE */
setInterval(()=>{
  if(started&&!gameOver) io.emit("state",{players});
},50);

server.listen(3000,()=>console.log("🚀 SERVER READY"));