const socket = io();
let lobbyId="default", playerName="", selfId=null;
let roles={}, players={}, machines={};
let playerRole="", isGhost=false;
let phaserScene, playerCircle;
let playerSprites={}, corpseSprites={}, nameTexts={};
let joystick={dirX:0,dirY:0};
let deadBodies=[];

document.getElementById("joinBtn").onclick=()=>{
  playerName=document.getElementById("nameInput").value||"Player";
  socket.emit("joinLobby",{lobbyId,name:playerName});
};
document.getElementById("readyBtn").onclick=()=>socket.emit("setReady",{lobbyId});
document.getElementById("startBtn").onclick=()=>socket.emit("startGame",{lobbyId});

socket.on("lobbyUpdate",l=>{
  let all=true;
  playersList.innerHTML="";
  l.players.forEach(p=>{
    playersList.innerHTML+=`<div>${p.name} ${l.ready[p.id]?"✔":"❌"}</div>`;
    if(!l.ready[p.id])all=false;
  });
  startBtn.style.display=all&&l.hostId===socket.id?"block":"none";
});

socket.on("gameStart",d=>{
  roles=d.roles;
  players=d.players;
  machines=d.machines;
  selfId=socket.id;
  playerRole=roles[selfId];
  lobby.style.display="none";
  startGame();
});

socket.on("playerKilled",({targetId,x,y})=>{
  players[targetId].alive=false;
  deadBodies.push(targetId);
  if(targetId===selfId)isGhost=true;
  corpseSprites[targetId]=phaserScene.add.text(x,y,"☠️",{fontSize:"32px"}).setOrigin(0.5);
  addLog(players[targetId].name+" öldürüldü");
});

socket.on("playerEliminated",({targetId,x,y})=>{
  players[targetId].alive=false;
  if(targetId===selfId)isGhost=true;
  corpseSprites[targetId]=phaserScene.add.text(x,y,"☠️",{fontSize:"32px"}).setOrigin(0.5);
  addLog(players[targetId].name+" elendi");
});

socket.on("updatePlayerPosition",({id,x,y})=>{
  if(id===selfId){
    playerCircle.setPosition(x,y);
  }else if(playerSprites[id]){
    playerSprites[id].setPosition(x,y);
    nameTexts[id].setPosition(x,y-30);
  }
});

socket.on("machineBroken",({name})=>{
  machines[name].state="bozuk";
  machines[name].sprite.setFillStyle(0xff0000);
  addLog(name+" bozuldu");
});

socket.on("machineRepaired",({name})=>{
  machines[name].state="ok";
  machines[name].sprite.setFillStyle(0x00ff00);
  addLog(name+" tamir edildi");
});

socket.on("voteStart",({players})=>showVote(players));
socket.on("gameOver",({winner})=>{
  alert(winner);
  location.reload();
});

function startGame(){
  new Phaser.Game({
    type:Phaser.AUTO,
    width:window.innerWidth,
    height:window.innerHeight,
    scene:{create,update}
  });
}

function create(){
  phaserScene=this;
  this.add.rectangle(600,500,1200,1000,0x2b2b2b);
  playerCircle=this.add.circle(players[selfId].x,players[selfId].y,20,0x00ff00);
  this.cameras.main.startFollow(playerCircle);

  for(const id in players){
    if(id!==selfId){
      const p=players[id];
      playerSprites[id]=this.add.circle(p.x,p.y,20,0x00ff00);
      nameTexts[id]=this.add.text(p.x,p.y-30,p.name).setOrigin(0.5);
    }
  }

  for(const n in machines){
    const m=machines[n];
    m.sprite=this.add.rectangle(m.x,m.y,40,40,0x00ff00);
  }
}

function update(){
  socket.emit("playerInput",{lobbyId,dirX:joystick.dirX,dirY:joystick.dirY});
}

function showVote(players){
  if(isGhost)return;
  const d=document.createElement("div");
  d.className="vote";
  players.forEach(p=>{
    const b=document.createElement("button");
    b.innerText=p.name;
    b.onclick=()=>{
      socket.emit("castVote",{lobbyId,targetId:p.id});
      d.remove();
    };
    d.appendChild(b);
  });
  document.body.appendChild(d);
}

function addLog(t){
  const l=document.getElementById("log");
  const e=document.createElement("div");
  e.innerText=t;
  l.appendChild(e);
  setTimeout(()=>e.remove(),10000);
}