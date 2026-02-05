const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const path=require("path");

const app=express();
const server=http.createServer(app);
const io=new Server(server);

const PORT=process.env.PORT||3000;
const MAP_W=2000,MAP_H=1200;

const lobby={
  players:[],
  machinesconst express=require("express");
const http=require("http");
const {Server}=require("socket.io");

const app=express();
const server=http.createServer(app);
const io=new Server(server);

app.use(express.static("public"));

const MAP_W=2000,MAP_H=1200;

let players=[];
let machines=[];
let started=false;
let meeting=false;
let votes={};

function resetMachines(){
  machines=[];
  const xs=[300,700,1100,1500,1900];
  let i=0;
  xs.forEach(x=>{
    machines.push({x,y:300,broken:false,name:"Makine "+(++i)});
    machines.push({x,y:800,broken:false,name:"Makine "+(++i)});
  });
}
resetMachines();

io.on("connection",socket=>{

  socket.on("join",name=>{
    players.push({
      id:socket.id,
      name,
      x:Math.random()*MAP_W,
      y:Math.random()*MAP_H,
      color:`hsl(${Math.random()*360},70%,50%)`,
      alive:true,
      ready:false,
      admin:players.length===0
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
    io.emit("log","🎮 Oyun başladı");
  });

  socket.on("move",({dx,dy})=>{
    const p=players.find(p=>p.id===socket.id);
    if(!p||!p.alive||meeting) return;
    p.x=Math.max(0,Math.min(MAP_W,p.x+dx*6));
    p.y=Math.max(0,Math.min(MAP_H,p.y+dy*6));
  });

  socket.on("vote",id=>{
    if(!meeting) return;
    votes[socket.id]=id;
  });

  socket.on("disconnect",()=>{
    players=players.filter(p=>p.id!==socket.id);
    lobbyUpdate();
  });

});

function lobbyUpdate(){
  io.emit("lobby",{
    players,
    canStart:players.length>=4 && players.every(p=>p.ready) && players.find(p=>p.admin)
  });
}

setInterval(()=>{
  if(!started) return;
  io.emit("state",{players,machines});
},50);

server.listen(process.env.PORT||3000,()=>console.log("🚀 SERVER READY")););
  });
});

server.listen(PORT,()=>console.log("🚀 Server running"));