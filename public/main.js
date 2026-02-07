const socket = io();

let lobbyId="default", playerName="", selfId=null;
let roles={}, players={}, machines={};
let playerRole="", isGhost=false;

let phaserScene, playerCircle;
let playerSprites={}, corpseSprites={}, nameTexts={};
let joystick={dirX:0,dirY:0};

// Phaser UI Buttons
let repairBtnBg, repairBtnText;
let killBtnBg, killBtnText;

/* ---------------- LOBBY ---------------- */
joinBtn.onclick=()=>{
  playerName=nameInput.value||"Player";
  socket.emit("joinLobby",{lobbyId,name:playerName});
};
readyBtn.onclick=()=>socket.emit("setReady",{lobbyId});
startBtn.onclick=()=>socket.emit("startGame",{lobbyId});

socket.on("lobbyUpdate",l=>{
  playersList.innerHTML="";
  let allReady=true;
  l.players.forEach(p=>{
    playersList.innerHTML+=`<div>${p.name} ${l.ready[p.id]?"✔":"❌"}</div>`;
    if(!l.ready[p.id]) allReady=false;
  });
  startBtn.style.display = (allReady && l.hostId===socket.id)?"block":"none";
});

/* ---------------- GAME START ---------------- */
socket.on("gameStart",d=>{
  roles=d.roles;
  players=d.players;
  machines=d.machines;
  selfId=socket.id;
  playerRole=roles[selfId];
  lobby.style.display="none";
  startGame();
});

/* ---------------- EVENTS ---------------- */
socket.on("updatePlayerPosition",({id,x,y})=>{
  if(players[id]){
    players[id].x=x; players[id].y=y;
    if(id===selfId) playerCircle.setPosition(x,y);
    else if(playerSprites[id]){
      playerSprites[id].setPosition(x,y);
      nameTexts[id].setPosition(x,y-30);
    }
  }
});

socket.on("machineBroken",({name})=>{
  if(machines[name]){
    machines[name].state="bozuk";
    machines[name].sprite.setFillStyle(0xff0000);
  }
});

socket.on("machineRepaired",({name})=>{
  if(machines[name]){
    machines[name].state="ok";
    machines[name].sprite.setFillStyle(0x00ff00);
  }
});

socket.on("playerKilled",({targetId,x,y})=>{
  handlePlayerDeath(targetId,x,y);
});

socket.on("playerEliminated",({targetId,x,y})=>{
  handlePlayerDeath(targetId,x,y);
});

socket.on("gameOver",({winner})=>{
  alert(winner);
  location.reload();
});

socket.on("playerDisconnected",({id})=>{
  if(players[id]){
    if(playerSprites[id]) playerSprites[id].destroy();
    if(nameTexts[id]) nameTexts[id].destroy();
    delete players[id]; delete playerSprites[id]; delete nameTexts[id];
  }
});

function handlePlayerDeath(targetId,x,y){
  if(players[targetId]) players[targetId].alive=false;
  if(playerSprites[targetId]){
    playerSprites[targetId].destroy();
    nameTexts[targetId].destroy();
    delete playerSprites[targetId];
    delete nameTexts[targetId];
  }
  corpseSprites[targetId]=phaserScene.add.text(x,y,"☠️",{fontSize:"32px"}).setOrigin(0.5);
  if(targetId===selfId){
    isGhost=true;
    playerCircle.setAlpha(0.3);
  }
}

/* ---------------- PHASER ---------------- */
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
  this.cameras.main.setBackgroundColor("#2b2b2b");

  // INFO TEXT
  this.infoText=this.add.text(10,10,"",{fontSize:"16px",color:"#fff"}).setScrollFactor(0);

  // PLAYER
  const me=players[selfId];
  playerCircle=this.add.circle(me.x,me.y,20,0x00ff00);
  this.cameras.main.startFollow(playerCircle);

  // OTHER PLAYERS
  for(const id in players){
    if(id!==selfId && players[id].alive){
      const p=players[id];
      playerSprites[id]=this.add.circle(p.x,p.y,20,0x00ff00);
      nameTexts[id]=this.add.text(p.x,p.y-30,p.name).setOrigin(0.5);
    }
  }

  // MACHINES
  for(const n in machines){
    const m=machines[n];
    m.sprite=this.add.rectangle(m.x,m.y,40,40,m.state==="ok"?0x00ff00:0xff0000);
    m.text=this.add.text(m.x,m.y-30,n,{color:"#fff"}).setOrigin(0.5);
  }

  /* ---------- PHASER UI BUTTONS ---------- */
  repairBtnBg=this.add.rectangle(this.scale.width-120,this.scale.height-180,160,50,0x00aa00)
    .setScrollFactor(0).setDepth(100).setVisible(false);
  repairBtnText=this.add.text(this.scale.width-120,this.scale.height-180,"TAMİR ET",
    {fontSize:"18px",color:"#fff"}).setOrigin(0.5).setScrollFactor(0).setDepth(101).setVisible(false);

  repairBtnBg.setInteractive().on("pointerdown",()=>{
    for(const n in machines){
      const m=machines[n];
      if(m.state==="bozuk" && Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,m.x,m.y)<80){
        socket.emit("repairMachine",{lobbyId,name:n});
        break;
      }
    }
  });

  killBtnBg=this.add.rectangle(this.scale.width-120,this.scale.height-120,160,50,0xaa0000)
    .setScrollFactor(0).setDepth(100).setVisible(false);
  killBtnText=this.add.text(this.scale.width-120,this.scale.height-120,"ÖLDÜR",
    {fontSize:"18px",color:"#fff"}).setOrigin(0.5).setScrollFactor(0).setDepth(101).setVisible(false);

  killBtnBg.setInteractive().on("pointerdown",()=>{
    for(const id in players){
      const p=players[id];
      if(p.alive && roles[id]==="operatör" && Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,p.x,p.y)<80){
        socket.emit("killPlayer",{lobbyId,targetId:id});
        break;
      }
    }
  });

  /* ---------- JOYSTICK ---------- */
  const h=this.scale.height;
  this.joyBase=this.add.circle(90,h-90,55,0x000000,0.4).setScrollFactor(0);
  this.joyThumb=this.add.circle(90,h-90,25,0xffffff,0.8).setScrollFactor(0);

  this.input.on("pointerdown",p=>{
    if(Phaser.Math.Distance.Between(p.x,p.y,this.joyBase.x,this.joyBase.y)<60)
      this.joyActive=true;
  });

  this.input.on("pointermove",p=>{
    if(!this.joyActive)return;
    const a=Math.atan2(p.y-this.joyBase.y,p.x-this.joyBase.x);
    joystick.dirX=Math.cos(a); joystick.dirY=Math.sin(a);
    this.joyThumb.setPosition(this.joyBase.x+joystick.dirX*40,this.joyBase.y+joystick.dirY*40);
  });

  this.input.on("pointerup",()=>{
    this.joyActive=false;
    joystick.dirX=0; joystick.dirY=0;
    this.joyThumb.setPosition(this.joyBase.x,this.joyBase.y);
  });
}

function update(){
  socket.emit("playerInput",{lobbyId,dirX:joystick.dirX,dirY:joystick.dirY});
  this.infoText.setText(`Rol: ${playerRole}${isGhost?" 👻":""}\nKalan: ${Object.values(players).filter(p=>p.alive).length}`);

  repairBtnBg.setVisible(false); repairBtnText.setVisible(false);
  killBtnBg.setVisible(false); killBtnText.setVisible(false);

  if(!isGhost && playerRole==="operatör"){
    for(const n in machines){
      const m=machines[n];
      if(m.state==="bozuk" && Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,m.x,m.y)<80){
        repairBtnBg.setVisible(true); repairBtnText.setVisible(true); break;
      }
    }
  }

  if(!isGhost && playerRole==="hain"){
    for(const id in players){
      const p=players[id];
      if(p.alive && roles[id]==="operatör" && Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,p.x,p.y)<80){
        killBtnBg.setVisible(true); killBtnText.setVisible(true); break;
      }
    }
  }
}