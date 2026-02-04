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
  meeting:false,
  votes:{}
};

function resetMachines(){
  lobby.machines=[];
  for(let i=0;i<10;i++){
    lobby.machines.push({
      x:200+(i%5)*400,
      y:200+(i<5?0:400),
      broken:false
    });
  }
}
resetMachines();

app.use(express.static(__dirname));
app.get("/",(_,res)=>res.sendFile(path.join(__dirname,"index.html")));

function assignRoles(){
  lobby.players.forEach(p=>p.role="Operatör");
  lobby.players[Math.floor(Math.random()*lobby.players.length)].role="Hain";
  io.emit("rolesAssigned",lobby.players.map(p=>({id:p.id,role:p.role})));
}

function checkWin(){
  const alive=lobby.players.filter(p=>p.alive);
  const hain=alive.find(p=>p.role==="Hain");
  const ops=alive.filter(p=>p.role==="Operatör");

  if(!hain){
    io.emit("gameEnd","Operatörler kazandı");
    reset();
  }else if(ops.length<=2){
    io.emit("gameEnd","Hain kazandı");
    reset();
  }
}

function reset(){
  lobby.started=false;
  lobby.meeting=false;
  lobby.votes={};
  resetMachines();
  lobby.players.forEach(p=>{
    p.ready=false;
    p.alive=true;
    p.role=null;
  });
  io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
}

io.on("connection",socket=>{
  socket.on("joinLobby",({name})=>{
    if(!name) return;
    if(lobby.players.find(p=>p.id===socket.id)) return;

    lobby.players.push({
      id:socket.id,
      name,
      x:400+Math.random()*400,
      y:400+Math.random()*400,
      color:`hsl(${Math.random()*360},70%,50%)`,
      ready:false,
      alive:true,
      role:null
    });

    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});
  });

  socket.on("playerReady",()=>{
    const p=lobby.players.find(p=>p.id===socket.id);
    if(p) p.ready=true;

    io.emit("lobbyUpdate",{players:lobby.players,machines:lobby.machines});

    if(lobby.players.length>=3 && lobby.players.every(p=>p.ready) && !lobby.started){
      lobby.started=true;
      assignRoles();
      io.emit("gameStart",{players:lobby.players,machines:lobby.machines});
    }
  });

  socket.on("move",({x,y})=>{
    const p=lobby.players.find(p=>p.id===socket.id);
    if(p&&p.alive&&!lobby.meeting){p.x=x;p.y=y;}
  });

  socket.on("vote",({voteFor})=>{
    if(!lobby.meeting) return;
    lobby.votes[socket.id]=voteFor;

    if(Object.keys(lobby.votes).length===lobby.players.filter(p=>p.alive).length){
      const count={};
      Object.values(lobby.votes).forEach(v=>count[v]=(count[v]||0)+1);
      const out=Object.entries(count).sort((a,b)=>b[1]-a[1])[0];
      if(out){
        const p=lobby.players.find(p=>p.id===out[0]);
        if(p){p.alive=false;}
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

server.listen(PORT,()=>console.log("Server:",PORT));