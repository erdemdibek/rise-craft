const socket = io();

let lobbyId="default", playerName="", selfId=null;
let roles={}, players={}, machines={};
let playerRole="", isGhost=false;

let phaserScene, playerCircle;
let playerSprites={}, corpseSprites={}, nameTexts={};
let joystick={dirX:0,dirY:0};
let deadBodies=[];

let repairButton=null;
let killButton=null;

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
  deadBodies.push(targetId);

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
  if(machines[name].sprite) machines[name].sprite.setFillStyle(0xff0000);
  addLog(name+" bozuldu");
});

socket.on("machineRepaired",({name})=>{
  machines[name].state="ok";
  if(machines[name].sprite) machines[name].sprite.setFillStyle(0x00ff00);
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

  // INFO TEXT
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
    const state = machines[n].state || "ok";
    machines[n]={name:n,state:state,x:positions[i].x,y:positions[i].y};
    machines[n].sprite=this.add.rectangle(
      machines[n].x,machines[n].y,40,40,
      state==="ok"?0x00ff00:0xff0000
    );
    machines[n].text=this.add.text(machines[n].x,machines[n].y-30,n,{color:"#fff"}).setOrigin(0.5);
    i++;
  }

  // REPAIR BUTTON
  repairButton=document.createElement("button");
  repairButton.innerText="TAMİR ET";
  repairButton.style.position="absolute";
  repairButton.style.display="none";
  repairButton.onclick=()=>{
    for(const n in machines){
      if(machines[n].state==="bozuk"){
        socket.emit("repairMachine",{lobbyId,name:n});
        repairButton.style.display="none";
      }
    }
  };
  document.body.appendChild(repairButton);

  // KILL BUTTON
  killButton=document.createElement("button");
  killButton.innerText="ÖLDÜR";
  killButton.style.position="absolute";
  killButton.style.display="none";
  killButton.onclick=()=>{
    for(const id in players){
      if(players[id].alive && roles[id]==="operatör"){
        const p=players[id];
        const dist=Math.hypot(playerCircle.x-p.x,playerCircle.y-p.y);
        if(dist<80){
          socket.emit("killPlayer",{lobbyId,targetId:id});
          killButton.style.display="none";
        }
      }
    }
  };
  document.body.appendChild(killButton);

  /* -------- JOYSTICK -------- */
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
    const dist=Math.min(40,Math.hypot(dx,dy));
    const a=Math.atan2(dy,dx);
    this.joyThumb.x=this.joyBase.x+Math.cos(a)*dist;
    this.joyThumb.y=this.joyBase.y+Math.sin(a)*dist;
    joystick.dirX=Math.cos(a);
    joystick.dirY=Math.sin(a);
  });

  this.input.on("pointerup",()=>{
    this.joyActive=false;
    this.joyThumb.setPosition(this.joyBase.x,this.joyBase.y);
    joystick.dirX=0; joystick.dirY=0;
  });
}

function update(){
  socket.emit("playerInput",{lobbyId,dirX:joystick.dirX,dirY:joystick.dirY});

  this.infoText.setText(
    `Rol: ${playerRole}${isGhost?" 👻":""}\n`+
    `Kalan: ${Object.values(players).filter(p=>p.alive).length}`
  );

  // BUTTON PROXIMITY CHECK
  repairButton.style.display="none";
  killButton.style.display="none";

  const px=playerCircle.x;
  const py=playerCircle.y;

  // REPAIR BUTTON
  if(playerRole==="operatör"){
    for(const n in machines){
      const m=machines[n];
      const d=Math.hypot(px-m.x,py-m.y);
      if(m.state==="bozuk" && d<80){
        repairButton.style.left=(m.x-30)+"px";
        repairButton.style.top=(m.y-70)+"px";
        repairButton.style.display="block";
      }
    }
  }

  // KILL BUTTON
  if(playerRole==="hain"){
    for(const id in players){
      const p=players[id];
      if(p.alive && roles[id]==="operatör"){
        const d=Math.hypot(px-p.x,py-p.y);
        if(d<80){
          killButton.style.left=(p.x-30)+"px";