const socket = io();
let lobbyId="default", playerName="", playerRole="", machines={}, players={}, selfId=null;
let deadBodies=[], phaserScene, playerCircle;
let playerSprites={}, machineSprites={}, nameTexts={}, corpseSprites={};
let joystick={dirX:0, dirY:0};
let machineNames=[];

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
socket.on("gameStart", ({ roles, machines:gm, players:pl })=>{
  playerRole=roles[socket.id];
  selfId=socket.id;
  machines=gm;
  players=pl;
  document.getElementById("lobby").style.display="none";
  startPhaserGame();
});

/* ---------------- EVENTS ---------------- */
socket.on("playerKilled", ({ targetId })=>{
  deadBodies.push(targetId);
  const p=players[targetId];

  if(phaserScene){
    corpseSprites[targetId]=phaserScene.add
      .text(p.x,p.y,"☠️",{fontSize:"32px"})
      .setOrigin(0.5);
  }
});

socket.on("machineBroken",({machineName})=>{
  machines[machineName]="bozuk";
  updateMachineSprite(machineName);
});
socket.on("machineRepaired",({machineName})=>{
  machines[machineName]="ok";
  updateMachineSprite(machineName);
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

/* ---------------- PHASER ---------------- */
function startPhaserGame(){
  machineNames=Object.keys(machines);

  new Phaser.Game({
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
      default: "arcade",
      arcade: { debug: false }
    },
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

  this.infoText=this.add.text(
    window.innerWidth-10,10,"",
    {fontSize:"16px",color:"#fff"}
  ).setOrigin(1,0).setScrollFactor(0);

  for(const id in players){
    if(id!==selfId){
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

  this.killBtn=this.add.text(50,window.innerHeight-200,"Öldür",{backgroundColor:"#f00",padding:10})
    .setScrollFactor(0).setInteractive().setVisible(false);

  this.repairBtn=this.add.text(150,window.innerHeight-200,"Tamir",{backgroundColor:"#00f",padding:10})
    .setScrollFactor(0).setInteractive().setVisible(false);

  this.meetingBtn=this.add.text(250,window.innerHeight-200,"Toplantı",{backgroundColor:"#0ff",padding:10})
    .setScrollFactor(0).setInteractive().setVisible(false);

  this.killBtn.on("pointerdown",()=>{
    for(const id in playerSprites){
      if(!players[id].alive) continue;
      const d=Phaser.Math.Distance.Between(
        playerCircle.x,playerCircle.y,
        playerSprites[id].x,playerSprites[id].y
      );
      if(d<50 && players[id].role==="operatör")
        socket.emit("killPlayer",{lobbyId,targetId:id});
    }
  });

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
}

function updateMachineSprite(name){
  if(machineSprites[name])
    machineSprites[name].fillColor=machines[name]==="ok"?0x00ff00:0xff0000;
}

/* ---------------- UPDATE ---------------- */
function update(){
  let canKill=false, canRepair=false, canMeet=false;

  if(playerRole==="hain"){
    for(const id in playerSprites){
      if(!players[id].alive) continue;
      if(players[id].role!=="operatör") continue;

      if(Phaser.Math.Distance.Between(
        playerCircle.x,playerCircle.y,
        playerSprites[id].x,playerSprites[id].y)<60) {
        canKill=true;
        break;
      }
    }
  }

  if(playerRole==="operatör"){
    for(const n in machineSprites){
      const m=machineSprites[n];
      if(Phaser.Math.Distance.Between(
        playerCircle.x,playerCircle.y,m.x,m.y)<50 && machines[n]==="bozuk")
        canRepair=true;
    }

    for(const id of deadBodies){
      const c=corpseSprites[id];
      if(c && Phaser.Math.Distance.Between(
        playerCircle.x,playerCircle.y,c.x,c.y)<50)
        canMeet=true;
    }
  }

  phaserScene.killBtn.setVisible(canKill);
  phaserScene.repairBtn.setVisible(canRepair);
  phaserScene.meetingBtn.setVisible(canMeet);

  phaserScene.infoText.setText(
    `Rol: ${playerRole}\nKalan: ${Object.values(players).filter(p=>p.alive).length}`
  );
}