const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const MAP_W = 2000;
const MAP_H = 1200;

let players = [];
let machines = [];
let started = false;

/* MEETING */
let meeting = false;
let votes = {};

function resetMachines(){
  machines=[];
  let i=0;
  for(let x=300;x<=1700;x+=400){
    machines.push({x,y:300,broken:false,name:"Makine "+(++i)});
    machines.push({x,y:800,broken:false,name:"Makine "+(++i)});
  }
}
resetMachines();

function assignRoles(){
  players.forEach(p=>p.role="Masum");
  const traitor = players[Math.floor(Math.random()*players.length)];
  traitor.role = "Hain";
}

function lobbyUpdate(){
  io.emit("lobby",{
    players,
    canStart: players.length>=4 &&
              players.every(p=>p.ready) &&
              players.find(p=>p.admin)
  });
}

function endMeeting(){
  meeting=false;
  let tally={};

  Object.values(votes).forEach(v=>{
    tally[v]=(tally[v]||0)+1;
  });

  let max=0, out=null;
  for(const id in tally){
    if(tally[id]>max){ max=tally[id]; out=id; }
  }

  if(out){
    const p=players.find(x=>x.id===out);
    if(p){ p.alive=false; io.emit("log",`🗳️ ${p.name} oylandı ve öldü`); }
  }

  votes={};
  io.emit("meetingEnd");
}

io.on("connection", socket => {

  socket.on("join", name => {
    if(started) return;
    players.push({
      id: socket.id,
      name,
      x: Math.random()*MAP_W,
      y: Math.random()*MAP_H,
      color: `hsl(${Math.random()*360},70%,50%)`,
      alive: true,
      ready: false,
      admin: players.length===0,
      role: null
    });
    lobbyUpdate();
  });

  socket.on("ready",()=>{
    const p=players.find(p=>p.id===socket.id);
    if(p) p.ready=true;
    lobbyUpdate();
  });

  socket.on("start",()=>{
    if(players.length<4) return;
    if(players.some(p=>!p.ready)) return;
    started=true;
    assignRoles();
    players.forEach(p=>io.to(p.id).emit("role",p.role));
    io.emit("gameStarted");
  });

  socket.on("move",({dx,dy})=>{
    if(meeting) return;
    const p=players.find(p=>p.id===socket.id);
    if(!p||!p.alive||!started) return;
    p.x=Math.max(20,Math.min(MAP_W-20,p.x+dx*6));
    p.y=Math.max(20,Math.min(MAP_H-20,p.y+dy*6));
  });

  socket.on("kill", targetId=>{
    const killer=players.find(p=>p.id===socket.id);
    const target=players.find(p=>p.id===targetId);
    if(!killer||!target) return;
    if(!killer.alive||!target.alive) return;
    if(killer.role!=="Hain") return;

    const dist=Math.hypot(killer.x-target.x,killer.y-target.y);
    if(dist<60){
      target.alive=false;
      io.emit("log",`💀 ${target.name} öldürüldü`);
      meeting=true;
      votes={};
      io.emit("meetingStart",players.filter(p=>p.alive));
      setTimeout(endMeeting,15000);
    }
  });

  socket.on("vote",id=>{
    if(!meeting) return;
    const p=players.find(p=>p.id===socket.id);
    if(!p||!p.alive) return;
    votes[socket.id]=id;
  });

  socket.on("disconnect",()=>{
    players=players.filter(p=>p.id!==socket.id);
    lobbyUpdate();
  });

});

setInterval(()=>{
  if(!started) return;
  io.emit("state",{players,machines,meeting});
},50);

server.listen(process.env.PORT||3000,
  ()=>console.log("🚀 SERVER READY"));