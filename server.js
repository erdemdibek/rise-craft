const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const MAKINELER = [
  "Fette 1200",
  "Fette 2200",
  "Kilian KTP 720",
  "Korsch XL 400",
  "Bosch GKF 701",
  "Fette 3200",
  "Korsch XT600",
  "Fette Fe55",
  "Sejong",
  "Fette 2100"
];

const odalar = {};

app.get("/oda-olustur", (req, res) => {
  const kod = Math.random().toString(36).substring(2,6).toUpperCase();
  odalar[kod] = {
    kod,
    oyuncular: {},
    basladi: false,
    hain: null,
    sure: 300,
    sabotaj: null,
    gorevler: {}
  };
  res.json({ odaKodu: kod });
});

io.on("connection", socket => {

  socket.on("oda-katil", ({ odaKodu, isim }) => {
    const oda = odalar[odaKodu];
    if (!oda) return;

    oda.oyuncular[socket.id] = {
      id: socket.id,
      isim,
      x: 400,
      y: 400,
      renk: `hsl(${Math.random()*360},70%,50%)`
    };

    socket.join(odaKodu);
    io.to(odaKodu).emit("state", oda);
  });

  socket.on("oyunu-baslat", odaKodu => {
    const oda = odalar[odaKodu];
    if (!oda || oda.basladi) return;

    oda.basladi = true;
    const ids = Object.keys(oda.oyuncular);
    oda.hain = ids[Math.floor(Math.random()*ids.length)];

    ids.forEach(id=>{
      if(id!==oda.hain){
        oda.gorevler[id] = false;
        io.to(id).emit("rol","CALISAN");
      } else {
        io.to(id).emit("rol","HAIN");
      }
    });

    const timer = setInterval(()=>{
      oda.sure--;
      io.to(odaKodu).emit("sure", oda.sure);
      if(oda.sure<=0){
        clearInterval(timer);
        io.to(odaKodu).emit("oyun-bitti","⏱️ SÜRE BİTTİ – HAİN KAZANDI");
      }
    },1000);
  });

  socket.on("hareket", ({ odaKodu, x, y }) => {
    const oda = odalar[odaKodu];
    if(!oda || !oda.oyuncular[socket.id]) return;
    oda.oyuncular[socket.id].x=x;
    oda.oyuncular[socket.id].y=y;
    io.to(odaKodu).emit("state", oda);
  });

  socket.on("gorev", odaKodu => {
    const oda = odalar[odaKodu];
    if(!oda || socket.id===oda.hain) return;

    oda.gorevler[socket.id]=true;
    const bitti = Object.values(oda.gorevler).every(v=>v);
    if(bitti){
      io.to(odaKodu).emit("oyun-bitti","🟢 TÜM GÖREVLER TAMAMLANDI");
    }
  });

  socket.on("sabotaj", odaKodu => {
    const oda = odalar[odaKodu];
    if(!oda || socket.id!==oda.hain) return;
    oda.sabotaj="Makine arızası!";
    io.to(odaKodu).emit("sabotaj", oda.sabotaj);
  });

  socket.on("sabotaj-coz", odaKodu => {
    const oda = odalar[odaKodu];
    if(!oda) return;
    oda.sabotaj=null;
    io.to(odaKodu).emit("sabotaj-bitti");
  });

});

server.listen(process.env.PORT||3000,()=>{
  console.log("HAİN OYUNU ÇALIŞIYOR");
});
