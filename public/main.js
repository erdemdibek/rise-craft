const socket = io();

let lobbyId="default", playerName="", selfId=null;
let roles={}, players={}, machines={};
let playerRole="", isGhost=false;

let phaserScene, playerCircle;
let playerSprites={}, corpseSprites={}, nameTexts={};
let joystick={dirX:0,dirY:0};
let deadBodies=[];

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
  let all=true;
  l.players.forEach(p=>{
    playersList.innerHTML+=`<div>${p.name} ${l.ready[p.id]?"✔":"❌"}</div>`;
    if(!l.ready[p.id]) all=false;
  });
  startBtn.style.display = all && l.hostId===socket.id ? "block":"none";
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
socket.on("playerKilled",({targetId,x,y})=>{
  players[targetId].alive=false;

  if(playerSprites[targetId]){
    playerSprites[targetId].destroy();
    nameTexts[targetId].destroy();
    delete playerSprites[targetId];
    delete nameTexts[targetId];
  }

  corpseSprites[targetId]=phaserScene.add
    .text(x,y,"☠️",{fontSize:"32px"}).setOrigin(0.5);

  if(targetId===selfId){
    isGhost=true;
    playerCircle.setAlpha(0.3);
  }

  addLog(players[targetId].name+" öldürüldü");
});

socket.on("playerEliminated",({targetId,x,y})=>{
  players[targetId].alive=false;

  if(playerSprites[targetId]){
    playerSprites[targetId].destroy();
    nameTexts[targetId].destroy();
    delete playerSprites[targetId];
    delete nameTexts[targetId];
  }

  corpseSprites[targetId]=phaserScene.add
    .text(x,y,"☠️",{fontSize:"32px"}).setOrigin(0.5);

  if(targetId===selfId){
    isGhost=true;
    playerCircle.setAlpha(0.3);
  }

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

  // INFO
  this.infoText=this.add.text(10,10,"",{
    fontSize:"16px",
    color:"#fff",
    backgroundColor:"rgba(0,0,0,0.6)",
    padding:{x:6,y:4}
  }).setScrollFactor(0);

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
  const positions=[
    {x:200,y:200},{x:400,y:200},{x:600,y:200},{x:800,y:200},{x:1000,y:200},
    {x:200,y:800},{x:400,y:800},{x:600,y:800},{x:800,y:800},{x:1000,y:800}
  ];

  let i=0;
  for(const n in machines){
    machines[n]={
      name:n,
      state:machines[n].state,
      x:positions[i].x,
      y:positions[i].y
    };
    machines[n].sprite=this.add.rectangle(
      machines[n].x,machines[n].y,40,40,
      machines[n].state==="ok"?0x00ff00:0xff0000
    );
    machines[n].text=this.add.text(
      machines[n].x,machines[n].y-30,n,{color:"#fff"}
    ).setOrigin(0.5);
    i++;
  }

  /* ---------- PHASER UI BUTTONS ---------- */

  // REPAIR
  repairBtnBg=this.add.rectangle(
    this.scale.width-120,
    this.scale.height-180,
    160,50,0x00aa00
  ).setScrollFactor(0).setVisible(false).setDepth(100);

  repairBtnText=this.add.text(
    this.scale.width-120,
    this.scale.height-180,
    "TAMİR ET",
    {fontSize:"18px",color:"#fff"}
  ).setOrigin(0.5).setScrollFactor(0).setVisible(false).setDepth(101);

  repairBtnBg.setInteractive().on("pointerdown",()=>{
    for(const n in machines){
      if(machines[n].state==="bozuk"){
        socket.emit("repairMachine",{lobbyId,name:n});
        break;
      }
    }
  });

  // KILL
  killBtnBg=this.add.rectangle(
    this.scale.width-120,
    this.scale.height-120,
    160,50,0xaa0000
  ).setScrollFactor(0).setVisible(false).setDepth(100);

  killBtnText=this.add.text(
    this.scale.width-120,
    this.scale.height-120,
    "ÖLDÜR",
    {fontSize:"18px",color:"#fff"}
  ).setOrigin(0.5).setScrollFactor(0).setVisible(false).setDepth(101);

  killBtnBg.setInteractive().on("pointerdown",()=>{
    for(const id in players){
      if(!players[id].alive) continue;
      if(roles[id]!=="operatör") continue;

      const p=players[id];
      if(Math.hypot(playerCircle.x-p.x,playerCircle.y-p.y)<80){
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
    const dx=p.x-this.joyBase.x;
    const dy=p.y-this.joyBase.y;
    const a=Math.atan2(dy,dx);
    joystick.dirX=Math.cos(a);
    joystick.dirY=Math.sin(a);
    this.joyThumb.setPosition(
      this.joyBase.x+joystick.dirX*40,
      this.joyBase.y+joystick.dirY*40
    );
  });

  this.input.on("pointerup",()=>{
    this.joyActive=false;
    joystick.dirX=0; joystick.dirY=0;
    this.joyThumb.setPosition(this.joyBase.x,this.joyBase.y);
  });
}

function update(){
  socket.emit("playerInput",{lobbyId,dirX:joystick.dirX,dirY:joystick.dirY});

  this.infoText.setText(
    `Rol: ${playerRole}${isGhost?" 👻":""}\n`+
    `Kalan: ${Object.values(players).filter(p=>p.alive).length}`
  );

  repairBtnBg.setVisible(false);
  repairBtnText.setVisible(false);
  killBtnBg.setVisible(false);
  killBtnText.setVisible(false);

  if(!isGhost && playerRole==="operatör"){
    for(const n in machines){
      if(machines[n].state==="bozuk" &&
        Math.hypot(playerCircle.x-machines[n].x,playerCircle.y-machines[n].y)<80){
        repairBtnBg.setVisible(true);
        repairBtnText.setVisible(true);
        break;
      }
    }
  }

  if(!isGhost && playerRole==="hain"){
    for(const id in players){
      if(players[id].alive && roles[id]==="operatör" &&
        Math.hypot(playerCircle.x-players[id].x,playerCircle.y-players[id].y)<80){
        killBtnBg.setVisible(true);
        killBtnText.setVisible(true);
        break;
      }
    }
  }
}

/* ---------------- UI ---------------- */
function showVote(list){
  if(isGhost)return;
  const d=document.createElement("div");
  d.className="vote";
  list.forEach(p=>{
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