const MAP_WIDTH=2000, MAP_HEIGHT=1200, PLAYER_SPEED=3;
const socket=io();

const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");
function resize(){canvas.width=innerWidth; canvas.height=innerHeight;}
window.addEventListener("resize",resize); resize();

const rotateLock=document.getElementById("rotateLock");
function checkOrientation(){rotateLock.style.display = innerHeight>innerWidth?"flex":"none";}
window.addEventListener("resize",checkOrientation); checkOrientation();

let me=null, players={}, machines=[], time=300, sabotage=null, cam={x:0,y:0}, role=null, alive=true;
let targetKillId=null;

// UI
const joinBtn=document.getElementById("joinBtn");
const readyBtn=document.getElementById("readyBtn");
const killBtn=document.getElementById("killBtn");
const repairBtn=document.getElementById("repairBtn");
const emergencyBtn=document.getElementById("emergencyBtn");
const meetingUI=document.getElementById("meetingUI");
const votesContainer=document.getElementById("votesContainer");
const voteSkip=document.getElementById("voteSkip");

joinBtn.onclick=()=>{
  const name=document.getElementById("name").value;
  if(!name)return alert("İsim gir");
  socket.emit("joinLobby",{name});
};

readyBtn.onclick=()=>socket.emit("playerReady");

// GAME LOOP
function clamp(){ if(!me) return; me.x=Math.max(20,Math.min(MAP_WIDTH-20,me.x)); me.y=Math.max(20,Math.min(MAP_HEIGHT-20,me.y)); }
function draw(){
  if(me){ cam.x=Math.max(0,Math.min(MAP_WIDTH-canvas.width,me.x-canvas.width/2)); cam.y=Math.max(0,Math.min(MAP_HEIGHT-canvas.height,me.y-canvas.height/2)); }

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#222"; ctx.fillRect(-cam.x,-cam.y,MAP_WIDTH,MAP_HEIGHT);

  machines.forEach((m,i)=>{
    ctx.fillStyle=m.repaired?"#0f0":"#666";
    ctx.fillRect(m.x-50-cam.x,m.y-30-cam.y,100,60);
    ctx.fillStyle="#fff"; ctx.fillText(m.name,m.x-40-cam.x,m.y-40-cam.y);
  });

  Object.values(players).forEach(p=>{
    if(!p.alive) return;
    ctx.beginPath(); ctx.arc(p.x-cam.x,p.y-cam.y,20,0,Math.PI*2);
    ctx.fillStyle=p.color; ctx.fill();
    ctx.fillText(p.name,p.x-20-cam.x,p.y-30-cam.y);
  });

  ctx.fillStyle="#fff"; ctx.fillText("⏱ "+time,20,30);
  if(sabotage) ctx.fillText("⚠️ "+sabotage,200,30);

  requestAnimationFrame(draw);
}
draw();

// MOVEMENT
document.addEventListener("keydown",e=>{
  if(!me || !alive) return;
  if(e.key==="w") me.y-=PLAYER_SPEED;
  if(e.key==="s") me.y+=PLAYER_SPEED;
  if(e.key==="a") me.x-=PLAYER_SPEED;
  if(e.key==="d") me.x+=PLAYER_SPEED;
  clamp();
  socket.emit("move",{x:me.x,y:me.y});
});

// Joystick
const joystick=document.getElementById("joystick");
const thumb=document.getElementById("joystickThumb");
let dragging=false,startX=0,startY=0;
joystick.addEventListener("touchstart",e=>{dragging=true; startX=e.touches[0].clientX; startY=e.touches[0].clientY;});
joystick.addEventListener("touchmove",e=>{
  if(!dragging||!me||!alive) return;
  const dx=e.touches[0].clientX-startX;
  const dy=e.touches[0].clientY-startY;
  me.x+=dx*0.03; me.y+=dy*0.03;
  clamp();
  socket.emit("move",{x:me.x,y:me.y});
  thumb.style.left=35+dx+"px"; thumb.style.top=35+dy+"px";
});
joystick.addEventListener("touchend",()=>{dragging=false; thumb.style.left="35px"; thumb.style.top="35px";});

// SOCKET EVENTS
socket.on("lobbyUpdate",d=>{
  players={}; machines=d.machines;
  d.players.forEach(p=>players[p.id]=p);
  if(!me && players[socket.id]){ me=players[socket.id]; role=me.role; alive=me.alive; }
});

socket.on("gameStart",d=>{
  d.players.forEach(p=>players[p.id]=p);
  machines=d.machines;
  me=players[socket.id]; role=me.role; alive=me.alive;
  joystick.style.display="block";
  if(role==="Hain") killBtn.style.display="block";
  if(role==="Çalışan") repairBtn.style.display="block";
});

socket.on("state",d=>{
  d.players.forEach(p=>players[p.id]=p);
  machines=d.machines;
  time=d.time; sabotage=d.sabotage;
});

socket.on("playerKilled",({targetId})=>{
  if(players[targetId]) players[targetId].alive=false;
});

socket.on("machinesUpdate", machinesUpdated=>{machines=machinesUpdated;});

socket.on("meetingStart", ({players: pl})=>{
  meetingUI.style.display="flex"; votesContainer.innerHTML="";
  pl.forEach(p=>{
    if(!p.alive) return;
    const btn=document.createElement("button");
    btn.textContent=p.name;
    btn.onclick=()=>{ socket.emit("vote",p.id); meetingUI.style.display="none"; };
    votesContainer.appendChild(btn);
  });
});

socket.on("meetingEnd",()=>{meetingUI.style.display="none";});

socket.on("playerEjected", ({id,role:eRole})=>{
  if(players[id]) players[id].alive=false;
  if(id===socket.id) alive=false; alert(`❌ ${players[id].name} (${eRole}) oyla atıldı!`);
});

socket.on("gameEnd", msg=>{alert(msg); killBtn.style.display="none"; repairBtn.style.display="none"; alive=true;});

// BUTTONS
killBtn.onclick=()=>{
  if(!me || role!=="Hain") return;
  const near = Object.values(players).filter(p=>p.alive && p.id!==socket.id && Math.hypot(p.x-me.x,p.y-me.y)<60);
  if(near.length>0) socket.emit("kill",near[0].id);
};

repairBtn.onclick=()=>{
  if(!me || role!=="Çalışan") return;
  machines.forEach((m,i)=>{ if(Math.hypot(m.x-me.x,m.y-me.y)<50 && !m.repaired) socket.emit("repairMachine",i); });
};

emergencyBtn.onclick=()=>socket.emit("emergencyMeeting");