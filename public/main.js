const socket = io();
let lobbyId="default", playerName="", selfId=null;
let roles={}, players={}, machines={};
let playerRole="", isGhost=false;
let phaserScene, playerCircle;
let playerSprites={}, corpseSprites={}, nameTexts={};
let joystick={dirX:0, dirY:0};

document.getElementById("joinBtn").onclick=()=>{
  playerName=document.getElementById("nameInput").value||"Player";
  socket.emit("joinLobby",{lobbyId,name:playerName});
};
document.getElementById("readyBtn").onclick=()=>socket.emit("setReady",{lobbyId});
document.getElementById("startBtn").onclick=()=>socket.emit("startGame",{lobbyId});

socket.on("lobbyUpdate", lobby=>{
  let allReady=true;
  document.getElementById("playersList").innerHTML="";
  lobby.players.forEach(p=>{
    document.getElementById("playersList").innerHTML+=
      `<div>${p.name} ${lobby.ready[p.id]?"✔":"❌"}</div>`;
    if(!lobby.ready[p.id]) allReady=false;
  });
  document.getElementById("startBtn").style.display=
    allReady && lobby.hostId===socket.id ? "block":"none";
});

socket.on("gameStart", data=>{
  roles=data.roles;
  players=data.players;
  machines=data.machines;
  selfId=socket.id;
  playerRole=roles[selfId];
  document.getElementById("lobby").style.display="none";
  startGame();
});

socket.on("playerKilled",({targetId,x,y})=>{
  players[targetId].alive=false;
  if(targetId===selfId){isGhost=true;}
  if(phaserScene){
    corpseSprites[targetId]=phaserScene.add.text(x,y,"☠️",{fontSize:"32px"}).setOrigin(0.5);
  }
});

socket.on("playerEliminated",({targetId,x,y})=>{
  players[targetId].alive=false;
  if(targetId===selfId)isGhost=true;
});

socket.on("updatePlayerPosition",({id,x,y})=>{
  if(id===selfId){
    playerCircle.setPosition(x,y);
  }else if(playerSprites[id]){
    playerSprites[id].setPosition(x,y);
    nameTexts[id].setPosition(x,y-30);
  }
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
  playerCircle=this.add.circle(400,500,20,0x00ff00);
  this.cameras.main.startFollow(playerCircle);

  for(const id in players){
    if(id!==selfId){
      const p=players[id];
      playerSprites[id]=this.add.circle(p.x,p.y,20,0x00ff00);
      nameTexts[id]=this.add.text(p.x,p.y-30,p.name).setOrigin(0.5);
    }
  }
}

function update(){
  socket.emit("playerInput",{lobbyId,dirX:joystick.dirX,dirY:joystick.dirY});
}