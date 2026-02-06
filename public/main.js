const socket = io();
let lobbyId="default", playerName="",playerRole="",machines={},players={},selfId=null;

document.getElementById("joinBtn").onclick = ()=> {
  playerName = document.getElementById("nameInput").value || "Player";
  socket.emit("joinLobby",{lobbyId,name:playerName});
};
document.getElementById("readyBtn").onclick = ()=>{ socket.emit("setReady",{lobbyId}); };
document.getElementById("startBtn").onclick = ()=>{ socket.emit("startGame",{lobbyId}); };

socket.on("lobbyUpdate",(lobby)=>{
  const list = document.getElementById("playersList"); list.innerHTML="";
  let allReady = true;
  lobby.players.forEach(p=>{
    const ready = lobby.ready[p.id]?"✔️":"❌";
    list.innerHTML+=`<div>${p.name} ${ready}</div>`;
    if(!lobby.ready[p.id]) allReady=false;
  });
  document.getElementById("startBtn").style.display = (allReady && lobby.players[0].id===socket.id)?"block":"none";
});

socket.on("gameStart",({roles,machines:gameMachines})=>{
  document.getElementById("lobby").style.display="none";
  playerRole=roles[socket.id]; selfId=socket.id; players=roles; machines=gameMachines;
  startPhaserGame();
});

socket.on("playerKilled",({targetId})=>{ addLog(`${targetId} öldürüldü`); });
socket.on("machineRepaired",({machineName})=>{ addLog(`${machineName} tamir edildi`); machines[machineName]="ok"; });
socket.on("machineBroken",({machineName})=>{ addLog(`${machineName} bozuldu`); machines[machineName]="bozuk"; updateMachineSprite(machineName); });
socket.on("voteStart",({players:alivePlayers})=>{ showVoteUI(alivePlayers); });
socket.on("playerEliminated",({targetId})=>{ addLog(`${targetId} oy ile elendi!`); });
socket.on("gameOver",({winner})=>{ addLog(`Oyun bitti! Kazanan: ${winner}`); });

function addLog(text){
  const log=document.getElementById("log");
  const entry=document.createElement("div"); entry.innerText=text;
  log.appendChild(entry); setTimeout(()=>entry.remove(),10000);
}

// Phaseri başlat
function startPhaserGame(){
  const config = {
    type:Phaser.AUTO,
    width:window.innerWidth,
    height:window.innerHeight,
    physics:{ default:"arcade", arcade:{debug:false} },
    scene:{ preload, create, update }
  };
  const game = new Phaser.Game(config);

  let playerCircle, playerSprites={}, machineSprites={}, joystick={x:0,y:0,pointer:null};
  const playerSpeed = 150;
  const machineNames = Object.keys(machines);

  function preload(){}

  function create(){
    const self = this;
    playerCircle = this.add.circle(400,300,20,0x00ff00).setDepth(1);

    // Diğer oyuncular
    for(const id in players){ if(id!==selfId){
      const circle=this.add.circle(Phaser.Math.Between(100,700),Phaser.Math.Between(100,500),20,0x00ff00);
      playerSprites[id]=circle;
    }}

    // Makineler
    machineNames.forEach(name=>{
      const x=Phaser.Math.Between(100,700), y=Phaser.Math.Between(100,500);
      const color=machines[name]==="ok"?0x00ff00:0xff0000;
      const m=this.add.rectangle(x,y,40,40,color);
      m.name=name; machineSprites[name]=m;
    });

    // Joystick
    this.input.on("pointerdown",p=>{ joystick.pointer=p; joystick.x=p.x; joystick.y=p.y; });
    this.input.on("pointerup",p=>{ joystick.pointer=null; });
    this.input.on("pointermove",p=>{ if(joystick.pointer && p.id===joystick.pointer.id){ joystick.x=p.x; joystick.y=p.y; }});

    // Öldür/Tamir butonları
    this.killBtn=this.add.text(50,window.innerHeight-100,"Öldür",{backgroundColor:"#ff0000",padding:{x:10,y:5}}).setInteractive();
    this.repairBtn=this.add.text(150,window.innerHeight-100,"Tamir Et",{backgroundColor:"#0000ff",padding:{x:10,y:5}}).setInteractive();

    this.killBtn.on("pointerdown",()=>{ 
      for(const id in playerSprites){
        const dist=Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,playerSprites[id].x,playerSprites[id].y);
        if(dist<50) socket.emit("killPlayer",{lobbyId,targetId:id});
      }
    });

    this.repairBtn.on("pointerdown",()=>{ 
      for(const name in machineSprites){
        const m=machineSprites[name];
        const dist=Phaser.Math.Distance.Between(playerCircle.x,playerCircle.y,m.x,m.y);
        if(dist<50 && machines[name]==="bozuk"){
          socket.emit("repairMachine",{lobbyId,machineName:name}); machines[name]="ok"; m.fillColor=0x00ff00;
        }
      }
    });

    // Mini harita
    this.minimap=this.add.graphics();
  }

  function updateMachineSprite(name){
    const m = machineSprites[name]; if(!m) return;
    m.fillColor = machines[name]==="ok"?0x00ff00:0xff0000;
  }

  function showVoteUI(alivePlayers){
    const container=document.createElement("div"); container.style.position="absolute";
    container.style.top="50%"; container.style.left="50%"; container.style.transform="translate(-50%,-50%)";
    container.style.background="rgba(0,0,0,0.7)"; container.style.padding="20px"; container.id="voteUI";
    alivePlayers.forEach(p=>{
      const btn=document.createElement("button"); btn.innerText=p.name; btn.style.margin="5px";
      btn.onclick=()=>{ socket.emit("vote",{lobbyId,targetId:p.id}); document.body.removeChild(container); };
      container.appendChild(btn);
    });
    document.body.appendChild(container);
    addLog("Oylama başladı! 20 saniye içinde oy verin.");
  }

  function update(){
    let vx=0,vy=0;
    if(joystick.pointer){ vx=joystick.x-playerCircle.x; vy=joystick.y-playerCircle.y;
      const len=Math.sqrt(vx*vx+vy*vy); if(len>0){ vx=(vx/len)*playerSpeed; vy=(vy/len)*playerSpeed; } }
    playerCircle.x+=vx*(1/60); playerCircle.y+=vy*(1/60);

    // Mini harita
    const mm=this.minimap; mm.clear();
    mm.fillStyle(0x000000,0.3); mm.fillRect(window.innerWidth-150,10,140,140);
    mm.fillStyle(0x00ff00,1);
    for(const id in playerSprites){ const p=playerSprites[id]; mm.fillRect(window.innerWidth-150+p.x*0.1,10+p.y*0.1,5,5); }
    mm.fillStyle(0xffff00,1); mm.fillRect(window.innerWidth-150+playerCircle.x*0.1,10+playerCircle.y*0.1,5,5);
    machineNames.forEach(name=>{ const m=machineSprites[name]; const color=machines[name]==="ok"?0x00ff00:0xff0000; mm.fillStyle(color,1); mm.fillRect(window.innerWidth-150+m.x*0.1,10+m.y*0.1,5,5); });
  }
}