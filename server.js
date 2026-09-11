const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 8080);
const CLIENT = path.join(__dirname, 'battle_flowers_online.html');
const waiting = [];
const matches = new Map();
let nextMatch = 1;

const httpServer = http.createServer((req,res)=>{
  if(req.url === '/' || req.url === '/index.html'){
    fs.readFile(CLIENT,(err,data)=>{
      if(err){res.writeHead(500);return res.end('Client file not found');}
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      res.end(data);
    });
    return;
  }
  res.writeHead(404); res.end('Not found');
});
const wss = new WebSocket.Server({server:httpServer});

function send(ws,obj){
  if(ws && ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(obj));
}
function removeWaiting(ws){
  const i=waiting.findIndex(x=>x.ws===ws);
  if(i>=0) waiting.splice(i,1);
}
function validTeam(team){
  return Array.isArray(team) && team.length===3 && team.every(x=>x && typeof x.id==='string' && Number.isInteger(x.level) && x.level>=1 && x.level<=5);
}
function makeMatch(a,b){
  const id='BF-'+String(nextMatch++).padStart(6,'0');
  const match={id,a,b,turn:'A'};
  matches.set(id,match);
  a.matchId=id; a.side='A'; a.opponent=b;
  b.matchId=id; b.side='B'; b.opponent=a;
  const base={type:'match',matchId:id,turn:match.turn};
  send(a.ws,{...base,side:'A',opponent:{username:b.username,team:b.team}});
  send(b.ws,{...base,side:'B',opponent:{username:a.username,team:a.team}});
}

wss.on('connection',(ws)=>{
  const player={ws,username:'Player',team:[],matchId:null,side:null,opponent:null};
  ws.on('message',(raw)=>{
    let msg; try{msg=JSON.parse(raw.toString())}catch(e){return send(ws,{type:'error',message:'پیام نامعتبر است'});}
    if(msg.type==='queue'){
      if(player.matchId) return send(ws,{type:'error',message:'شما داخل یک مسابقه هستید'});
      if(!validTeam(msg.team)) return send(ws,{type:'error',message:'تیم باید دقیقاً ۳ گل معتبر داشته باشد'});
      player.username=String(msg.username||'Player').slice(0,24);
      player.team=msg.team;
      removeWaiting(ws);
      const other=waiting.shift();
      if(!other){ waiting.push(player); send(ws,{type:'queued'}); }
      else makeMatch(other,player);
      return;
    }
    if(msg.type==='action'){
      const m=matches.get(player.matchId);
      if(!m || msg.matchId!==player.matchId) return send(ws,{type:'error',message:'مسابقه پیدا نشد'});
      if(m.turn!==player.side) return send(ws,{type:'error',message:'هنوز نوبت شما نیست'});
      const a=msg.action||{};
      if(!['attack','special'].includes(a.action) || typeof a.attackerId!=='string') return send(ws,{type:'error',message:'حرکت نامعتبر است'});
      const own=player.team.find(x=>x.id===a.attackerId);
      if(!own) return send(ws,{type:'error',message:'مهاجم متعلق به تیم شما نیست'});
      if(a.targetId!==null && a.targetId!==undefined && typeof a.targetId!=='string') return send(ws,{type:'error',message:'هدف نامعتبر است'});
      m.turn = player.side==='A'?'B':'A';
      send(player.opponent.ws,{type:'action',action:{action:a.action,attackerId:a.attackerId,targetId:a.targetId??null},nextTurn:m.turn});
      return;
    }
  });
  ws.on('close',()=>{
    removeWaiting(ws);
    const m=player.matchId ? matches.get(player.matchId) : null;
    if(m){
      send(player.opponent.ws,{type:'opponent_left'});
      matches.delete(player.matchId);
    }
  });
});

httpServer.listen(PORT,()=>console.log(`Battle Flowers server running on http://localhost:${PORT}`));
