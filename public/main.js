const socket = io();
let lobbyId = "default", playerName = "", playerRole = "", machines = {}, players = {}, selfId = null;
let deadBodies = [];

// Lobby butonları
document.getElementById("joinBtn").onclick = () => {
  playerName = document.getElementById("nameInput").value || "Player";
  socket.emit("joinLobby", { lobbyId, name: playerName });
};
document.getElementById("readyBtn").onclick = () => socket.emit("setReady", { lobbyId });
document.getElementById("startBtn").onclick = () => socket.emit("startGame", { lobbyId });

// Lobby güncelleme
socket.on("lobbyUpdate", (lobby) => {
  const list = document.getElementById("playersList"); list.innerHTML = "";
  let allReady = true;
  lobby.players.forEach(p => {
    const ready = lobby.ready[p.id] ? "✔️" : "❌";
    list.innerHTML += `<div>${p.name} ${ready}</div>`;
    if (!lobby.ready[p.id]) allReady = false;
  });
  document.getElementById("startBtn").style.display = (allReady && lobby.players[0]?.id === socket.id) ? "block" : "none";
  // Güncelleme oyuncu verilerini clienta kaydet
  lobby.players.forEach(p => players[p.id] = p);
});

// Oyun başlat
socket.on("gameStart", ({ roles, machines: gameMachines, players: allPlayers }) => {
  playerRole = roles[socket.id]; selfId = socket.id; players = allPlayers; machines = gameMachines;
  document.getElementById("lobby").style.display = "none";
  startPhaserGame();
});

// Eventler
socket.on("playerKilled", ({ targetId }) => { deadBodies.push(targetId); addLog(`${players[targetId].name} öldürüldü!`); });
socket.on("machineRepaired", ({ machineName }) => { machines[machineName] = "ok"; updateMachineSprite(machineName); addLog(`${machineName} tamir edildi!`); });
socket.on("machineBroken", ({ machineName }) => { machines[machineName] = "bozuk"; updateMachineSprite(machineName); addLog(`${machineName} bozuldu!`); });
socket.on("voteStart", ({ players: alivePlayers }) => showVoteUI(alivePlayers));
socket.on("playerEliminated", ({ targetId }) => addLog(`${players[targetId].name} oy ile elendi!`));
socket.on("gameOver", ({ winner }) => addLog(`Oyun bitti! Kazanan: ${winner}`));

socket.on("updatePlayerPosition", ({ id, x, y }) => {
  if(!players[id]) players[id] = { x, y };
  else { players[id].x = x; players[id].y = y; }

  if(id !== selfId && playerSprites[id]){
    playerSprites[id].setPosition(x, y);
    nameTexts[id].setPosition(x, y-30);
  }
});

// Log
function addLog(text){
  const log = document.getElementById("log");
  const entry = document.createElement("div"); entry.innerText=text;
  log.appendChild(entry); setTimeout(()=>entry.remove(),10000);
}

// Phaser
let phaserScene, playerCircle, playerSprites = {}, machineSprites = {}, nameTexts = {}, joystick = {dirX:0, dirY:0};
let machineNames = [];
const playerSpeed = 150;

function startPhaserGame(){
  machineNames = Object.keys(machines);

  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: { default:"arcade", arcade:{ debug:false } },
    scene:{ preload, create, update }
  };
  new Phaser.Game(config);
}

const machinePositions = [
  {x:200,y:200},{x:400,y:200},{x:600,y:200},{x:800,y:200},{x:1000,y:200},
  {x:200,y:800},{x:400,y:800},{x:600,y:800},{x:800,y:800},{x:1000,y:800}
];

function preload(){}

function create(){
  phaserScene = this;

  this.physics.world.setBounds(0,0,1200,1000);

  // Oyuncu
  playerCircle = this.add.circle(400,500,20,0x00ff00).setDepth(1);
  this.cameras.main.startFollow(playerCircle,true,0.1,0.1);
  this.cameras.main.setBounds(0,0,1200,1000);

  this.infoText = this.add.text(10,10,`Rol: ${playerRole}\nKalan: ${Object.keys(players).length}`,{fontSize:'16px',color:'#fff'}).setScrollFactor(0);
  this.selfNameText = this.add.text(playerCircle.x,playerCircle.y-30,playerName,{fontSize:'16px',color:'#fff'}).setOrigin(0.5);

  // Diğer oyuncular
  for(const id in players){
    if(id!==selfId){
      const x = Phaser.Math.Between(100,1100);
      const y = Phaser.Math.Between(100,900);
      const circle = this.add.circle(x,y,20,0x00ff00);
      playerSprites[id]=circle;
      const nameText = this.add.text(x,y-30,players[id].name,{fontSize:'16px',color:'#fff'}).setOrigin(0.5);
      nameTexts[id]=nameText;
    }
  }

  // Makineler
  machinePositions.forEach((pos,idx)=>{
    const name = machineNames[idx];
    const color = machines[name]==="ok"?0x00ff00:0xff0000;
    const m = this.add.rectangle(pos.x,pos.y,40,40,color);
    m.name=name;
    machineSprites[name]=m;
    const text = this.add.text(pos.x,pos.y-30,name,{fontSize:'14px',color:'#fff'}).setOrigin(0.5);
    m.nameText=text;
  });

  // Joystick
  const base = this.add.circle(100,window.innerHeight-100,50,0x888888,0.5).setScrollFactor(0);
  const thumb = this.add.circle(100,window.innerHeight-100,25,0xcccccc,0.8).setScrollFactor(0);
  joystick.base=base; joystick.thumb=thumb;

  this.input.on('pointerdown', p=>{ if(Phaser.Math.Distance.Between(p.x,p.y,base.x,base.y)<60) joystick.active=true; });
  this.input.on('pointerup', p=>{ joystick.active=false; thumb.setPosition(base.x,base.y); joystick.dirX=0; joystick.dirY=0; });
  this.input.on('pointermove', p=>{
    if(joystick.active){
      const dx=p.x-base.x, dy=p.y-base.y;
      const dist=Math.min(Math.sqrt(dx*dx+dy*dy),50);
      const angle=Math.atan2(dy,dx);
      thumb.setPosition(base.x+dist*Math.cos(angle), base.y+dist*Math.sin(angle));
      joystick.dirX=Math.cos(angle)*(dist/50); joystick.dirY=Math.sin(angle)*(dist/50);
    }
  });

  // Butonlar
  this.killBtn = this.add.text(50,window.innerHeight-200,"Öldür",{backgroundColor:"#ff0000",padding:{x:10,y:5}})
                    .setInteractive().setScrollFactor(0).setVisible(playerRole==="hain");
  this.repairBtn = this.add.text(150,window.innerHeight-200,"Tamir Et",{backgroundColor:"#0000ff",padding:{x:10,y:5}})
                        .setInteractive().setScrollFactor(0).setVisible(playerRole==="operatör");

  this.killBtn.on("pointerdown",()=>{
    for(const id in playerSprites){
      const p = playerSprites[id];
      const dist = Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,p.x,p.y);
      if(dist<50 && !deadBodies.includes(id)) socket.emit("killPlayer",{lobbyId,targetId:id});
    }
  });
  this.repairBtn.on("pointerdown",()=>{
    for(const name in machineSprites){
      const m = machineSprites[name];
      const dist = Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,m.x,m.y);
      if(dist<50 && machines[name]==="bozuk") socket.emit("repairMachine",{lobbyId,machineName:name});
    }
  });

  // Mini harita
  this.minimap=this.add.graphics().setScrollFactor(0).setDepth(1000);
}

function updateMachineSprite(name){
  const m = machineSprites[name]; if(!m) return;
  m.fillColor = machines[name]==="ok"?0x00ff00:0xff0000;
}

function showVoteUI(alivePlayers){
  const container=document.createElement("div");
  container.style.position="absolute"; container.style.top="50%"; container.style.left="50%";
  container.style.transform="translate(-50%,-50%)"; container.style.background="rgba(0,0,0,0.7)";
  container.style.padding="20px"; container.id="voteUI";
  alivePlayers.forEach(p=>{
    const btn=document.createElement("button"); btn.innerText=p.name; btn.style.margin="5px";
    btn.onclick=()=>{ socket.emit("vote",{lobbyId,targetId:p.id}); document.body.removeChild(container); };
    container.appendChild(btn);
  });
  document.body.appendChild(container);
  addLog("Oylama başladı! 20 saniye içinde oy verin.");
}

function update(){
  if(!phaserScene) return;

  // --- Server-authoritative hareket ---
  if(playerRole && joystick.dirX!==0 || joystick.dirY!==0){
    socket.emit("playerInput", { lobbyId, dirX: joystick.dirX, dirY: joystick.dirY });
  }

  if(players[selfId]){
    const p = players[selfId];
    playerCircle.setPosition(p.x, p.y);
    phaserScene.selfNameText.setPosition(p.x, p.y-30);
  }

  for(const id in playerSprites){
    const pSprite = playerSprites[id];
    const t = nameTexts[id];
    const pData = players[id];
    if(pData){
      pSprite.setPosition(pData.x, pData.y);
      t.setPosition(pData.x, pData.y-30);
    }
  }

  machineNames.forEach(name=>{
    const m = machineSprites[name];
    if(m) m.nameText.setPosition(m.x, m.y-30);
  });

  // Kill / Repair buton görünürlüğü ve infoText
  let aliveCount = Object.values(players).filter(p=>p.alive).length;
  phaserScene.infoText.setText(`Rol: ${playerRole}\nKalan: ${aliveCount}`);

  if(playerRole==="hain"){
    let visible=false;
    for(const id in playerSprites){
      const p = playerSprites[id];
      const dist = Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,p.x,p.y);
      if(dist<50 && !deadBodies.includes(id)) visible=true;
    }
    phaserScene.killBtn.setVisible(visible);
  } else if(playerRole==="operatör"){
    let repairVisible=false;
    for(const name in machineSprites){
      const m = machineSprites[name];
      const dist = Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,m.x,m.y);
      if(dist<50 && machines[name]==="bozuk") repairVisible=true;
    }
    phaserScene.repairBtn.setVisible(repairVisible);
  }

  // Mini harita
  const mm=phaserScene.minimap;
  mm.clear();
  mm.fillStyle(0x000000,0.3); mm.fillRect(window.innerWidth-150,10,140,140);
  mm.fillStyle(0x00ff00,1);
  for(const id in playerSprites){
    const p = playerSprites[id]; mm.fillRect(window.innerWidth-150+p.x*0.1,10+p.y*0.1,5,5);
  }
  mm.fillStyle(0xffff00,1); mm.fillRect(window.innerWidth-150+playerCircle.x*0.1,10+playerCircle.y*0.1,5,5);
  machineNames.forEach(name=>{
    const m = machineSprites[name];
    const color=machines[name]==="ok"?0x00ff00:0xff0000;
    mm.fillStyle(color,1); mm.fillRect(window.innerWidth-150+m.x*0.1,10+m.y*0.1,5,5);
  });
}