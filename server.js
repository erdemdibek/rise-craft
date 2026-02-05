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
  machines:[],
  started:false,
  meeting:false,
  votes:{}
};

function resetMachines(){
  lobby.machines=[];
  const xs=[300,700,1100,1500,1900];
  let i=0;
  xs.forEach(x=>{
    lobby.machines.push({x,y:300,broken:false});
    lobby.machines.push({x,y:800,broken:false});
  });
}
resetMachines();

app.use(express.static(path.join(__dirname,"public")));
app.get("/",(_,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function assignRoles(){
  lobby.players.forEach(p=>p.role="Operatör");
  lobby.players[Math.floor(Math.random()*lobby.players.length)].role="Hain";
  io.emit("rolesAssigned",lobby.players.map(p=>({id:p.id,role:p.role})));
}

io.on("connection",socket=>{
  socket.on("joinLobby",({name},cb)=>{
    if(!name) return cb({error:"İsim gir"});
    const isAdmin=lobby.players.length===0;
    lobby.players.push({
      id:socket.id,name,
      x:Math.random()*MAP_W,y:Math.random()*MAP_H,
      color:`hsl(${Math.random()*360},70%,50%)`,
      ready:false,alive:true,isAdmin
    });
    io.emit("lobbyUpdate",lobby);
    cb({isAdmin});
  });

  socket.on("playerReady",()=>{
    const p=lobby.players.find(p=>p.id===socket.id);
    if(p) p.ready=true;
    io.emit("lobbyUpdate",lobby);
  });

  socket.on("startGame",()=>{
    const admin=lobby.players.find(p=>p.id===socket.id&&p.isAdmin);
    if(!admin) return;
    if(lobby.players.length<4) return;
    if(lobby.players.some(p=>!p.ready)) return;
    lobby.started=true;
    assignRoles();
    io.emit("gameStart");
  });

  socket.on("move",d=>{
    const p=lobby.players.find(p=>p.id===socket.id);
    if(p&&p.alive&&!lobby.meeting){p.x=d.x;p.y=d.y}
  });

  socket.on("killPlayer",id=>{
    const k=lobby.players.find(p=>p.id===socket.id);
    const t=lobby.players.find(p=>p.id===id);
    if(k&&t&&k.role==="Hain"&&t.alive&&dist(k,t)<60){
      t.alive=false;
      io.emit("playerKilled",t.id);
      lobby.meeting=true;
      io.emit("startMeeting");
      setTimeout(()=>{
        lobby.meeting=false;
        const c={};
        Object.values(lobby.votes).forEach(v=>c[v]=(c[v]||0)+1);
        let out=null,max=0;
        for(const i in c){if(c[i]>max){max=c[i];out=i}}
        if(out){
          const p=lobby.players.find(p=>p.id===out);
          if(p) p.alive=false;
        }
        lobby.votes={};
        io.emit("endMeeting");
      },15000);
    }
  });

  socket.on("vote",id=>{
    if(lobby.meeting){
      const p=lobby.players.find(p=>p.id===socket.id);
      if(p&&p.alive) lobby.votes[p.id]=id;
    }
  });

  socket.on("disconnect",()=>{
    lobby.players=lobby.players.filter(p=>p.id!==socket.id);
    io.emit("lobbyUpdate",lobby);
  });
});

server.listen(PORT,()=>console.log("🚀 Server running"));