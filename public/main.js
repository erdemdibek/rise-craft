const socket = io();

let lobbyId="default", playerName="", selfId=null;
let roles={}, players={}, machines={};
let playerRole="", isGhost=false;

let phaserScene, playerCircle;
let playerSprites={}, corpseSprites={}, nameTexts={};
let joystick={dirX:0,dirY:0};

// OYLAMA İÇİN GLOBAL DEĞİŞKENLER
let voteSceneBg, voteSceneTitle, voteButtons = {}, voteTimerText;
let voteActive = false;

// Phaser UI Buttons
let repairBtnBg, repairBtnText;
let killBtnBg, killBtnText;
let meetingBtnBg, meetingBtnText;

/* ---------------- LOG ---------------- */
function addLog(text){
  const logBar = document.getElementById("logBar");
  const div = document.createElement("div");
  div.innerText = text;
  logBar.appendChild(div);
  logBar.scrollTop = logBar.scrollHeight;

  setTimeout(() => { div.remove(); }, 10000);
}

/* ---------------- LOBBY ---------------- */
const joinBtn = document.getElementById("joinBtn");
const readyBtn = document.getElementById("readyBtn");
const startBtn = document.getElementById("startBtn");
const nameInput = document.getElementById("nameInput");
const playersListEl = document.getElementById("playersList");
const lobby = document.getElementById("lobby");

joinBtn.onclick = () => {
  playerName = nameInput.value || "Player";
  socket.emit("joinLobby",{lobbyId,name:playerName});
};
readyBtn.onclick = () => socket.emit("setReady",{lobbyId});
startBtn.onclick = () => socket.emit("startGame",{lobbyId});

socket.on("lobbyUpdate", l => {
  playersListEl.innerHTML = "";
  let allReady = true;
  l.players.forEach(p=>{
    playersListEl.innerHTML += `<div>${p.name} ${l.ready[p.id]?"✔":"❌"}</div>`;
    if(!l.ready[p.id]) allReady=false;
  });
  startBtn.style.display = (allReady && l.hostId===socket.id) ? "block" : "none";
});

/* ---------------- GAME START ---------------- */
socket.on("gameStart", d=>{
  roles = d.roles; players = d.players; machines = d.machines;
  selfId = socket.id; playerRole = roles[selfId];
  lobby.style.display="none";
  startGame();
});

/* ---------------- EVENTS ---------------- */
socket.on("updatePlayerPosition", ({id,x,y})=>{
  if(players[id]){
    players[id].x=x; players[id].y=y;
    if(id===selfId) playerCircle.setPosition(x,y);
    else if(playerSprites[id]){
      playerSprites[id].setPosition(x,y);
      nameTexts[id].setPosition(x,y-30);
    }
  }
});

socket.on("machineBroken", ({name}) => {
  if(machines[name]){
    machines[name].state="bozuk";
    machines[name].sprite.setFillStyle(0xff0000);
  }
});

socket.on("machineRepaired", ({name}) => {
  if(machines[name]){
    machines[name].state="ok";
    machines[name].sprite.setFillStyle(0x00ff00);
  }
});

socket.on("playerKilled", ({targetId,x,y}) => handlePlayerDeath(targetId,x,y));
socket.on("playerEliminated", ({targetId,x,y}) => handlePlayerDeath(targetId,x,y));

socket.on("gameOver", ({winner}) => { alert(winner); location.reload(); });
socket.on("playerDisconnected", ({id}) => {
  if(players[id]){
    if(playerSprites[id]) playerSprites[id].destroy();
    if(nameTexts[id]) nameTexts[id].destroy();
    delete players[id]; delete playerSprites[id]; delete nameTexts[id];
  }
});

// OYLAMA EVENT
socket.on("voteStart", ({players}) => {
  voteActive = true;
  showVoteScreen(players);
});

// OYLAMA SONUÇ EVENTİ
socket.on("voteResult", ({eliminatedId}) => {
  if(eliminatedId && players[eliminatedId]){
    handlePlayerDeath(eliminatedId, players[eliminatedId].x, players[eliminatedId].y);
    addLog(`${players[eliminatedId].name} en çok oyu alarak elendi!`);
  }
});

socket.on("addLog", t => addLog(t));

function handlePlayerDeath(targetId,x,y){
  if(players[targetId]) players[targetId].alive=false;

  if(playerSprites[targetId]){
    playerSprites[targetId].destroy();
    nameTexts[targetId].destroy();
    delete playerSprites[targetId];
    delete nameTexts[targetId];
  }

  corpseSprites[targetId] = phaserScene.add.text(x,y,"☠️",{fontSize:"32px"}).setOrigin(0.5);

  // Log: Hainin ismi gizli
  addLog(`Bir oyuncu öldü`);

  if(targetId===selfId){
    isGhost=true;
    playerCircle.setAlpha(0.3);
  }
}

/* ---------------- PHASER ---------------- */
function startGame(){
  new Phaser.Game({
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: { create, update }
  });
}

function create(){
  phaserScene=this; this.cameras.main.setBackgroundColor("#2b2b2b");

  // INFO TEXT
  this.infoText=this.add.text(10,10,"",{fontSize:"16px",color:"#fff"}).setScrollFactor(0);

  // PLAYER
  const me=players[selfId];
  playerCircle=this.add.circle(me.x,me.y,20,0x00ff00);
  this.cameras.main.startFollow(playerCircle);

  // OTHER PLAYERS
  for(const id in players){
    if(id!==selfId && players[id].alive){
      const p = players[id];
      playerSprites[id] = this.add.circle(p.x,p.y,20,0x00ff00);
      nameTexts[id] = this.add.text(p.x,p.y-30,p.name).setOrigin(0.5);
    }
  }

  // MACHINES
  for(const n in machines){
    const m = machines[n];
    m.sprite=this.add.rectangle(m.x,m.y,40,40,m.state==="ok"?0x00ff00:0xff0000);
    m.text=this.add.text(m.x,m.y-30,n,{color:"#fff"}).setOrigin(0.5);
  }

  // PHASER UI BUTTONS
  repairBtnBg=this.add.rectangle(this.scale.width-120,this.scale.height-180,160,50,0x00aa00)
    .setScrollFactor(0).setDepth(100).setVisible(false);
  repairBtnText=this.add.text(this.scale.width-120,this.scale.height-180,"TAMİR ET",{fontSize:"18px",color:"#fff"})
    .setOrigin(0.5).setScrollFactor(0).setDepth(101).setVisible(false);
  repairBtnBg.setInteractive().on("pointerdown",()=>{
    for(const n in machines){
      const m=machines[n];
      if(m.state==="bozuk" && Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,m.x,m.y)<80){
        socket.emit("repairMachine",{lobbyId,name:n}); break;
      }
    }
  });

  killBtnBg=this.add.rectangle(this.scale.width-120,this.scale.height-120,160,50,0xaa0000)
    .setScrollFactor(0).setDepth(100).setVisible(false);
  killBtnText=this.add.text(this.scale.width-120,this.scale.height-120,"ÖLDÜR",{fontSize:"18px",color:"#fff"})
    .setOrigin(0.5).setScrollFactor(0).setDepth(101).setVisible(false);
  killBtnBg.setInteractive().on("pointerdown",()=>{
    for(const id in players){
      const p=players[id];
      if(p.alive && roles[id]==="operatör" &&
        Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,p.x,p.y)<80){
        socket.emit("killPlayer",{lobbyId,targetId:id}); break;
      }
    }
  });

  meetingBtnBg=this.add.rectangle(this.scale.width-120,this.scale.height-60,160,50,0x0000aa)
    .setScrollFactor(0).setDepth(100).setVisible(false);
  meetingBtnText=this.add.text(this.scale.width-120,this.scale.height-60,"TOPLANTI",{fontSize:"18px",color:"#fff"})
    .setOrigin(0.5).setScrollFactor(0).setDepth(101).setVisible(false);
  meetingBtnBg.setInteractive().on("pointerdown",()=>{
    socket.emit("startVote",{lobbyId});
    meetingBtnBg.setVisible(false); meetingBtnText.setVisible(false);
  });

  // JOYSTICK
  const h = this.scale.height;
  this.joyBase=this.add.circle(90,h-90,55,0x000000,0.4).setScrollFactor(0);
  this.joyThumb=this.add.circle(90,h-90,25,0xffffff,0.8).setScrollFactor(0);
  this.input.on("pointerdown", p => { if(Phaser.Math.Distance.Between(p.x,p.y,this.joyBase.x,this.joyBase.y)<60) this.joyActive=true; });
  this.input.on("pointermove", p => {
    if(!this.joyActive) return;
    const a=Math.atan2(p.y-this.joyBase.y,p.x-this.joyBase.x);
    joystick.dirX=Math.cos(a); joystick.dirY=Math.sin(a);
    this.joyThumb.setPosition(this.joyBase.x+joystick.dirX*40,this.joyBase.y+joystick.dirY*40);
  });
  this.input.on("pointerup", ()=>{
    this.joyActive=false; joystick.dirX=0; joystick.dirY=0;
    this.joyThumb.setPosition(this.joyBase.x,this.joyBase.y);
  });
}

/* ---------------- UPDATE ---------------- */
function update(){
  // Ghost hareketini destekle
  if(playerCircle && isGhost){
    playerCircle.x += joystick.dirX*2;
    playerCircle.y += joystick.dirY*2;
  }

  socket.emit("playerInput",{lobbyId,dirX:joystick.dirX,dirY:joystick.dirY});
  this.infoText.setText(`Rol: ${playerRole}${isGhost?" 👻":""}\nKalan: ${Object.values(players).filter(p=>p.alive).length}`);

  repairBtnBg.setVisible(false); repairBtnText.setVisible(false);
  killBtnBg.setVisible(false); killBtnText.setVisible(false);
  meetingBtnBg.setVisible(false); meetingBtnText.setVisible(false);

  // repair
  if(!isGhost && playerRole==="operatör"){
    for(const n in machines){
      const m=machines[n];
      if(m.state==="bozuk" && Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,m.x,m.y)<80){
        repairBtnBg.setVisible(true); repairBtnText.setVisible(true); break;
      }
    }
  }

  // kill
  if(!isGhost && playerRole==="hain"){
    for(const id in players){
      const p=players[id];
      if(p.alive && roles[id]==="operatör" &&
        Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,p.x,p.y)<80){
        killBtnBg.setVisible(true); killBtnText.setVisible(true); break;
      }
    }
  }

  // meeting
  if(!isGhost && playerRole==="operatör"){
    for(const id in corpseSprites){
      const c = corpseSprites[id];
      if(Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,c.x,c.y)<80){
        meetingBtnBg.setVisible(true); meetingBtnText.setVisible(true); break;
      }
    }
  }
}

/* ---------------- OYLAMA ---------------- */
function showVoteScreen(playersList){
  const w = phaserScene.scale.width;
  const h = phaserScene.scale.height;

  voteSceneBg = phaserScene.add.rectangle(w/2, h/2, w*0.9, h*0.8, 0x000000, 0.8)
    .setScrollFactor(0).setDepth(200);
  voteSceneTitle = phaserScene.add.text(w/2, h*0.15, "OY VER", { fontSize:"32px", color:"#fff", fontStyle:"bold" })
    .setOrigin(0.5).setScrollFactor(0).setDepth(201);

  const buttonHeight = 50, gap = 20;
  let startY = h*0.3;
  for(const id in playersList){
    const p = playersList[id];
    if(id === selfId) continue;

    const btnBg = phaserScene.add.rectangle(w/2, startY, 200, buttonHeight, 0x0077ff)
      .setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive();
    const btnText = phaserScene.add.text(w/2, startY, p.name, {fontSize:"20px", color:"#fff"})
      .setOrigin(0.5).setScrollFactor(0).setDepth(202);

    btnBg.on("pointerdown", ()=>{
      castVote(id); hideVoteScreen();
    });

    voteButtons[id] = {btnBg, btnText};
    startY += buttonHeight + gap;
  }

  voteTimerText = phaserScene.add.text(w/2, h*0.85, "10", {fontSize:"28px", color:"#fff"})
    .setOrigin(0.5).setScrollFactor(0).setDepth(201);

  let timer = 10;
  const timerInterval = setInterval(()=>{
    timer--;
    if(!voteActive){ clearInterval(timerInterval); return; }
    voteTimerText.setText(timer);
    if(timer<=0){
      hideVoteScreen();
      clearInterval(timerInterval);
      socket.emit("endVote",{lobbyId}); // Server’a oylama bittiğini bildir
    }
  },1000);
}

function castVote(targetId){
  socket.emit("castVote",{targetId, lobbyId});
}

function hideVoteScreen(){
  voteActive=false;
  if(voteSceneBg) voteSceneBg.destroy();
  if(voteSceneTitle) voteSceneTitle.destroy();
  if(voteTimerText) voteTimerText.destroy();
  for(const id in voteButtons){
    voteButtons[id].btnBg.destroy();
    voteButtons[id].btnText.destroy();
  }
  voteButtons = {};
}