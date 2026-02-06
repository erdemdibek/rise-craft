const socket = io();
let roles = {};
let lobbyId="default", playerName="", playerRole="", machines={}, players={}, selfId=null;
let deadBodies=[], phaserScene, playerCircle;
let playerSprites={}, machineSprites={}, nameTexts={}, corpseSprites={};
let joystick={dirX:0, dirY:0};
let machineNames=[];
let killCooldown=false; // Öldür tuşu cooldown durumu

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
  roles = serverRoles;          // 🔥 KRİTİK SATIR
  playerRole = roles[socket.id];
  selfId = socket.id;
  machines = gm;
  players = pl;
  document.getElementById("lobby").style.display="none";
  startPhaserGame();
});

/* ---------------- EVENTS ---------------- */
socket.on("playerKilled", ({ targetId })=>{
  if(!players[targetId]) return;

  players[targetId].alive = false;
  deadBodies.push(targetId);

  const p = players[targetId];
  addLog(`${p.name} öldürüldü!`);

  if(playerSprites[targetId]){
    playerSprites[targetId].destroy();
    nameTexts[targetId].destroy();
    delete playerSprites[targetId];
    delete nameTexts[targetId];
  }

  if(phaserScene){
    corpseSprites[targetId] = phaserScene.add
      .text(p.x, p.y, "☠️", { fontSize:"32px", color:"#ff0000" })
      .setOrigin(0.5);
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

  // PLAYER
  playerCircle=this.add.circle(400,500,20,0x00ff00);
  this.cameras.main.startFollow(playerCircle);
  this.cameras.main.setBounds(0,0,1200,1000);
  this.selfNameText=this.add.text(400,470,playerName,{color:"#fff"}).setOrigin(0.5);

  // INFO TEXT
  this.infoText=this.add.text(window.innerWidth-10,10,"",{fontSize:"16px",color:"#fff"})
    .setOrigin(1,0).setScrollFactor(0);

  // Other players
  for(const id in players){
    if(id!==selfId){
      const p=players[id];
      playerSprites[id]=this.add.circle(p.x,p.y,20,0x00ff00);
      nameTexts[id]=this.add.text(p.x,p.y-30,p.name,{color:"#fff"}).setOrigin(0.5);
    }
  }

  // Machines
  machinePositions.forEach((pos,i)=>{
    const name=machineNames[i];
    const col=machines[name]==="ok"?0x00ff00:0xff0000;
    const m=this.add.rectangle(pos.x,pos.y,40,40,col);
    machineSprites[name]=m;
    m.nameText=this.add.text(pos.x,pos.y-30,name,{color:"#fff"}).setOrigin(0.5);
  });

  // BUTTONS
  this.repairBtn=this.add.text(150,window.innerHeight-200,"Tamir",{backgroundColor:"#00f",padding:10})
    .setScrollFactor(0).setInteractive().setVisible(false);
  this.meetingBtn=this.add.text(250,window.innerHeight-200,"Toplantı",{backgroundColor:"#0ff",padding:10})
    .setScrollFactor(0).setInteractive().setVisible(false);

  // HAIN ÖLDÜR BUTONU - joystick yanında daimi
  if(playerRole==="hain"){
    this.killBtn=this.add.circle(200,window.innerHeight-100,40,0xff0000,0.7)
      .setScrollFactor(0)
      .setInteractive();

    const killText=this.add.text(this.killBtn.x,this.killBtn.y,"ÖLDÜR",{color:"#fff",fontSize:"16px"})
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.killBtn.on("pointerdown",()=>{
      if(killCooldown) return;
      // En yakın operatörü öldür
      let closestId=null, closestDist=Infinity;
      for(const id in playerSprites){
        if(id===selfId) continue;
        const p=players[id];
        if(!p || !p.alive || roles[id]!=="operatör") continue;
        const d=Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,playerSprites[id].x,playerSprites[id].y);
        if(d<closestDist){
          closestDist=d;
          closestId=id;
        }
      }
      if(closestId){
        socket.emit("killPlayer",{lobbyId,targetId:closestId});
        killCooldown=true;
        this.killBtn.setFillStyle(0x555555,0.7);
        setTimeout(()=>{ 
          killCooldown=false; 
          this.killBtn.setFillStyle(0xff0000,0.7);
        },10000); // 10 saniye cooldown
      }
    });
  }

  this.repairBtn.on("pointerdown",()=>{
    for(const n in machineSprites){
      const m=machineSprites[n];
      const d=Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,m.x,m.y);
      if(d<50 && machines[n]==="bozuk")
        socket.emit("repairMachine",{lobbyId,machineName:n});
    }
  });

  this.meetingBtn.on("pointerdown",()=>{
    socket.emit("startVote",{lobbyId});
    this.meetingBtn.setVisible(false);
  });

  // JOYSTICK
  const base=this.add.circle(100,window.innerHeight-100,50,0x888888,0.5).setScrollFactor(0);
  const thumb=this.add.circle(100,window.innerHeight-100,25,0xcccccc,0.8).setScrollFactor(0);
  joystick.base=base; joystick.thumb=thumb;

  this.input.on('pointerdown', p=>{
    if(Phaser.Math.Distance.Between(p.x,p.y,base.x,base.y)<60) joystick.active=true;
  });
  this.input.on('pointerup', p=>{
    joystick.active=false;
    thumb.setPosition(base.x,base.y);
    joystick.dirX=0; joystick.dirY=0;
    socket.emit("playerInput",{lobbyId, dirX:0, dirY:0 });
  });
  this.input.on('pointermove', p=>{
    if(joystick.active){
      const dx=p.x-base.x;
      const dy=p.y-base.y;
      const dist=Math.min(Math.sqrt(dx*dx+dy*dy),50);
      const angle=Math.atan2(dy,dx);
      thumb.setPosition(base.x+dist*Math.cos(angle), base.y+dist*Math.sin(angle));
      joystick.dirX=Math.cos(angle)*(dist/50);
      joystick.dirY=Math.sin(angle)*(dist/50);
      socket.emit("playerInput",{lobbyId, dirX:joystick.dirX, dirY:joystick.dirY });
    }
  });
}

function updateMachineSprite(name){
  if(machineSprites[name])
    machineSprites[name].fillColor=machines[name]==="ok"?0x00ff00:0xff0000;
}

/* ---------------- UPDATE ---------------- */
function update(){
  // OPERATÖR
  let canRepair=false, canMeet=false;
  if(playerRole==="operatör"){
    for(const n in machineSprites){
      const m=machineSprites[n];
      const d=Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,m.x,m.y);
      if(d<50 && machines[n]==="bozuk") canRepair=true;
    }
    for(const id of deadBodies){
      const c=corpseSprites[id];
      if(c && Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,c.x,c.y)<50) canMeet=true;
    }
  }

  phaserScene.repairBtn.setVisible(playerRole==="operatör" && canRepair);
  phaserScene.meetingBtn.setVisible(playerRole==="operatör" && canMeet);

  phaserScene.infoText.setText(
    `Rol: ${playerRole}\nKalan: ${Object.values(players).filter(p=>p.alive).length}`
  );

  for(const id in playerSprites)
    nameTexts[id].setPosition(playerSprites[id].x,playerSprites[id].y-30);
  for(const n in machineSprites)
    machineSprites[n].nameText.setPosition(machineSprites[n].x,machineSprites[n].y-30);
}

/* ---------------- OYLAMA ---------------- */
function showVoteUI(alivePlayers){
  const container=document.createElement("div");
  container.style.position="absolute";
  container.style.top="50%";
  container.style.left="50%";
  container.style.transform="translate(-50%,-50%)";
  container.style.background="rgba(0,0,0,0.7)";
  container.style.padding="20px";
  container.id="voteUI";

  alivePlayers.forEach(p=>{
    const btn=document.createElement("button");
    btn.innerText=p.name;
    btn.style.margin="5px";
    btn.onclick=()=>{
      socket.emit("vote",{lobbyId,targetId:p.id});
      document.body.removeChild(container);
    };
    container.appendChild(btn);
  });

  document.body.appendChild(container);
  addLog("Oylama başladı! 20 saniye içinde oy verin.");
}