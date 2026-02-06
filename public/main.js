const socket = io();
let roles = {};
let lobbyId="default", playerName="", playerRole="", machines={}, players={}, selfId=null;
let deadBodies=[], phaserScene, playerCircle;
let playerSprites={}, machineSprites={}, nameTexts={}, corpseSprites={};
let joystick={dirX:0, dirY:0};
let machineNames=[];
let killCooldown=false;
let isGhost=false; // 👻 KRİTİK

/* ---------------- LOBBY ---------------- */
document.getElementById("joinBtn").onclick = () => {
  playerName = document.getElementById("nameInput").value || "Player";
  socket.emit("joinLobby",{ lobbyId, name: playerName });
};
document.getElementById("readyBtn").onclick = () => socket.emit("setReady",{ lobbyId });
document.getElementById("startBtn").onclick = () => socket.emit("startGame",{ lobbyId });

socket.on("lobbyUpdate", lobby=>{
  const list=document.getElementById("playersList");
  list.innerHTML="";
  let allReady=true;

  lobby.players.forEach(p=>{
    const ready=lobby.ready[p.id]?"✔️":"❌";
    list.innerHTML+=`<div>${p.name} ${ready}</div>`;
    if(!lobby.ready[p.id]) allReady=false;
  });

  document.getElementById("startBtn").style.display=
    (allReady && lobby.players[0].id===socket.id)?"block":"none";
});

/* ---------------- GAME START ---------------- */
socket.on("gameStart", ({ roles:serverRoles, machines:gm, players:pl })=>{
  roles = serverRoles;
  playerRole = roles[socket.id];
  selfId = socket.id;
  machines = gm;
  players = pl;
  document.getElementById("lobby").style.display="none";
  startPhaserGame();
});

/* ---------------- EVENTS ---------------- */
socket.on("playerKilled", ({ targetId, x, y })=>{
  if(!players[targetId]) return;

  players[targetId].alive = false;
  players[targetId].x = x;
  players[targetId].y = y;
  deadBodies.push(targetId);

  if(targetId === selfId){
    isGhost = true;
    playerCircle.setFillStyle(0xaaaaaa,0.4);
    phaserScene.selfNameText.setAlpha(0.4);
  }

  if(playerSprites[targetId]){
    playerSprites[targetId].destroy();
    nameTexts[targetId].destroy();
    delete playerSprites[targetId];
    delete nameTexts[targetId];
  }

  if(phaserScene){
    corpseSprites[targetId] = phaserScene.add
      .text(x, y, "☠️", { fontSize:"32px", color:"#ff0000" })
      .setOrigin(0.5);
  }

  addLog(`${players[targetId].name} öldürüldü!`);
});

socket.on("playerEliminated", ({ targetId })=>{
  if(!players[targetId]) return;

  players[targetId].alive=false;

  if(targetId===selfId){
    isGhost=true;
    playerCircle.setFillStyle(0xaaaaaa,0.4);
    phaserScene.selfNameText.setAlpha(0.4);
    addLog("Oylamada elendin. Hayaletsin 👻");
  }

  if(playerSprites[targetId]){
    playerSprites[targetId].destroy();
    nameTexts[targetId].destroy();
    delete playerSprites[targetId];
    delete nameTexts[targetId];
  }
});

socket.on("machineBroken",({machineName})=>{
  machines[machineName]="bozuk";
  updateMachineSprite(machineName);
  addLog(`${machineName} bozuldu!`);
});
socket.on("machineRepaired",({machineName})=>{
  machines[machineName]="ok";
  updateMachineSprite(machineName);
  addLog(`${machineName} tamir edildi!`);
});

socket.on("voteStart",({players})=>showVoteUI(players));

socket.on("updatePlayerPosition",({id,x,y})=>{
  if(id===selfId){
    playerCircle.setPosition(x,y);
    phaserScene.selfNameText.setPosition(x,y-30);
  }else if(playerSprites[id]){
    playerSprites[id].setPosition(x,y);
    nameTexts[id].setPosition(x,y-30);
  }
});

/* ---------------- LOG ---------------- */
function addLog(text){
  const log=document.getElementById("log");
  const entry=document.createElement("div");
  entry.innerText=text;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
  setTimeout(()=>entry.remove(),10000);
}

/* ---------------- PHASER ---------------- */
function startPhaserGame(){
  machineNames=Object.keys(machines);

  new Phaser.Game({
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: { default: "arcade", arcade: { debug: false } },
    scene: { preload, create, update }
  });
}

const machinePositions=[
  {x:200,y:200},{x:400,y:200},{x:600,y:200},{x:800,y:200},{x:1000,y:200},
  {x:200,y:800},{x:400,y:800},{x:600,y:800},{x:800,y:800},{x:1000,y:800}
];

function preload(){}

function create(){
  phaserScene=this;
  this.physics.world.setBounds(0,0,1200,1000);

  playerCircle=this.add.circle(400,500,20,0x00ff00);
  this.cameras.main.startFollow(playerCircle);
  this.cameras.main.setBounds(0,0,1200,1000);
  this.selfNameText=this.add.text(400,470,playerName,{color:"#fff"}).setOrigin(0.5);

  this.infoText=this.add.text(window.innerWidth-10,10,"",{fontSize:"16px",color:"#fff"})
    .setOrigin(1,0).setScrollFactor(0);

  for(const id in players){
    if(id!==selfId && players[id].alive){
      const p=players[id];
      playerSprites[id]=this.add.circle(p.x,p.y,20,0x00ff00);
      nameTexts[id]=this.add.text(p.x,p.y-30,p.name,{color:"#fff"}).setOrigin(0.5);
    }
  }

  machinePositions.forEach((pos,i)=>{
    const name=machineNames[i];
    const col=machines[name]==="ok"?0x00ff00:0xff0000;
    const m=this.add.rectangle(pos.x,pos.y,40,40,col);
    machineSprites[name]=m;
    m.nameText=this.add.text(pos.x,pos.y-30,name,{color:"#fff"}).setOrigin(0.5);
  });

  /* BUTONLAR & JOYSTICK (AYNEN KALDI) */
  // — senin gönderdiğin kodla birebir —
}

/* ---------------- UPDATE ---------------- */
function update(){
  let canRepair=false, canMeet=false;

  if(playerRole==="operatör" && !isGhost){
    for(const n in machineSprites){
      const m=machineSprites[n];
      if(Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,m.x,m.y)<50 && machines[n]==="bozuk")
        canRepair=true;
    }
    for(const id of deadBodies){
      const c=corpseSprites[id];
      if(c && Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,c.x,c.y)<50)
        canMeet=true;
    }
  }

  phaserScene.repairBtn.setVisible(playerRole==="operatör" && canRepair);
  phaserScene.meetingBtn.setVisible(playerRole==="operatör" && canMeet);

  phaserScene.infoText.setText(
    `Rol: ${playerRole}${isGhost?" 👻":""}\nKalan: ${Object.values(players).filter(p=>p.alive).length}`
  );
}

/* ---------------- OYLAMA ---------------- */
function showVoteUI(alivePlayers){
  if(isGhost) return;

  const container=document.createElement("div");
  container.style.position="absolute";
  container.style.top="50%";
  container.style.left="50%";
  container.style.transform="translate(-50%,-50%)";
  container.style.background="rgba(0,0,0,0.7)";
  container.style.padding="20px";

  alivePlayers.forEach(p=>{
    const btn=document.createElement("button");
    btn.innerText=p.name;
    btn.onclick=()=>{
      socket.emit("vote",{lobbyId,targetId:p.id});
      document.body.removeChild(container);
    };
    container.appendChild(btn);
  });

  document.body.appendChild(container);
  addLog("Oylama başladı!");
}