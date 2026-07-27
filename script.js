/* Ballance – statischer Matter.js-Spielkern, bewusst ohne Build-Schritt. */
(() => {
  'use strict';
  const { Engine, World, Bodies, Body, Events, Composite, Vector } = Matter;
  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#gameCanvas'), ctx = canvas.getContext('2d');
  const W = 1280, H = 800, STORAGE = 'kugellabyrinth.v1';
  const mobileDevice = matchMedia('(pointer: coarse)').matches;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;

  /** Level werden rein als Daten definiert – neue Abschnitte benötigen keine Engine-Änderung. */
  const BASE = { size: [W, H], start: [100, 100], goal: [1175, 690], walls: [], holes: [], checkpoints: [], movers: [], teleporters: [], winds: [] };
  const makeLevel = (name, config) => ({ ...BASE, name, ...config });
  const levels = [
    makeLevel('Level 1', {
  start:[100,100], goal:[1140,120],
  walls:[[660,300,24,700,0]],
  holes:[],
  checkpoints:[],
  movers:[],
  teleporters:[],
  winds:[]
}),
makeLevel('Level 2', {
  start:[180,720], goal:[1140,120],
  walls:[[900,340,24,700,0],[380,460,24,700,0]],
  holes:[],
  checkpoints:[],
  movers:[],
  teleporters:[],
  winds:[]
}),
makeLevel('Level 3', {
  start:[100,60], goal:[1180,60],
  walls:[[200,340,24,700,0],[360,460,24,700,0],[500,340,24,700,0],[640,460,24,700,0],[780,340,24,700,0],[920,460,24,700,0],[1060,340,24,700,0]],
  holes:[[260,60,26],[700,760,26],[420,760,26],[1000,40,26]],
  checkpoints:[],
  movers:[],
  teleporters:[],
  winds:[]
}),
makeLevel('Level 4', {
  start:[180,720], goal:[1140,120],
  walls:[[900,340,24,700,0],[380,460,24,700,0]],
  holes:[[80,300,26],[260,560,26],[520,160,26],[800,160,26],[620,540,26],[660,320,26],[800,600,26],[460,500,26],[560,700,26],[720,740,26],[1040,720,26],[1080,520,26],[1020,360,26],[1160,280,26],[260,180,26],[120,120,26]],
  checkpoints:[],
  movers:[],
  teleporters:[],
  winds:[]
}),
makeLevel('Level 5', {
  start:[100,60], goal:[700,740],
  walls:[[200,340,24,700,0],[360,330,24,1040,0],[500,280,24,810,0],[640,460,24,700,0],[780,395,24,810,0],[920,460,24,700,0],[1060,340,24,700,0]],
  holes:[[80,700,26],[720,40,26],[420,760,26],[1000,40,26]],
  checkpoints:[],
  movers:[],
  teleporters:[[280,60,1200,140],[860,740,440,60]],
  winds:[]
}),
makeLevel('Level 6', {
  start:[100,420], goal:[1000,60],
  walls:[[120,500,260,24,0],[120,340,240,24,0],[240,280,24,120,0],[920,120,24,440,0],[1080,240,24,520,0],[1000,500,180,24,0],[580,220,680,24,0],[380,280,24,120,0],[520,280,24,120,0],[660,280,24,120,0],[800,280,24,120,0],[920,540,24,100,0],[240,540,24,100,0]],
  holes:[[300,280,26],[580,280,26],[860,280,26]],
  checkpoints:[],
  movers:[[580,480,660,140,"y",3.5]],
  teleporters:[],
  winds:[]
}),
    makeLevel('Level 7', {
  start:[40,40], goal:[1120,680],
  walls:[[300,100,600,24,0],[460,220,520,24,0],[720,260,24,560,0],[180,340,400,24,0],[800,420,600,24,0],[840,60,24,320,0],[1080,540,560,24,0],[800,600,24,120,0],[680,660,240,24,0],[440,580,300,24,0.576],[440,380,160,24,0.524]],
  holes:[[660,160,26],[60,160,26],[100,280,26],[460,320,26],[620,280,26],[660,360,26],[1120,120,26],[1120,180,26],[980,280,26],[980,360,26],[760,480,26],[420,500,26],[600,500,26],[120,700,26],[340,600,26],[500,740,26],[880,720,26],[1120,60,26]],
  checkpoints:[[780,160]],
  movers:[],
  teleporters:[[560,340,780,60]],
  winds:[[380,160,340,100,-0.008,0],[960,200,240,420,0.008,0],[1180,200,190,420,-0.008,0]]
}),
];

  /** Eigenständige Level: Fallen werden nie im direkten Start-/Zielbereich erzeugt. */
  const challenge = (name,start,goal,walls,holes,options={}) => makeLevel(name,{start,goal,walls,holes:holes.filter(([x,y])=>Math.hypot(x-start[0],y-start[1])>100&&Math.hypot(x-goal[0],y-goal[1])>100),...options});
  if (false) { levels.splice(1, levels.length-1,
    challenge('Serpentinen',[60,60],[1180,720],[[210,0,24,560],[410,240,24,560],[610,0,24,560],[810,240,24,560],[1010,0,24,560],[100,310,135,24],[320,650,150,24],[520,300,150,24],[720,650,150,24],[920,300,150,24]],[[100,470,26],[300,150,26],[360,520,26],[520,680,26],[550,140,26],[740,500,26],[940,150,26],[1160,420,26]],{checkpoints:[[320,80],[720,80]]}),
    challenge('Treppenhaus',[60,720],[1180,80],[[180,600,300,24],[390,500,24,220],[540,420,300,24],[690,320,24,220],[840,240,300,24],[990,140,24,220],[1120,540,240,24],[280,180,220,24],[160,300,24,220]],[[100,540,26],[280,580,26],[470,390,26],[660,510,26],[790,250,26],[1040,300,26],[1060,680,26]],{checkpoints:[[500,620],[900,180]],movers:[[560,600,150,24,'x',2.1]]}),
    challenge('Kammern',[70,70],[1170,700],[[260,130,350,24],[260,130,24,220],[600,240,24,220],[390,450,430,24],[820,340,24,230],[1030,570,300,24],[1030,350,24,220],[150,650,250,24],[470,660,24,160]],[[130,350,26],[420,250,26],[510,370,26],[720,180,26],[740,590,26],[1100,470,26]],{checkpoints:[[420,570]],teleporters:[[150,520,900,120]]}),
    challenge('Kreuzgänge',[70,400],[1180,400],[[170,120,24,460],[390,0,24,300],[390,500,24,300],[600,230,420,24],[810,0,24,300],[810,500,24,300],[1030,120,24,460],[180,680,230,24],[870,120,220,24]],[[280,160,26],[280,640,26],[510,120,26],[510,670,26],[700,400,26],[940,160,26],[940,640,26]],{checkpoints:[[600,110]],movers:[[600,550,160,24,'x',1.9]]}),
    challenge('Doppelspirale',[80,80],[1160,700],[[180,100,720,24],[180,100,24,550],[180,650,650,24],[830,200,24,450],[300,220,420,24],[300,220,24,320],[300,540,330,24],[630,320,24,220],[430,340,110,24]],[[100,360,26],[260,430,26],[430,160,26],[520,470,26],[700,250,26],[920,590,26],[1100,350,26]],{checkpoints:[[720,600]],winds:[[760,380,120,300,0,-.002]]}),
    challenge('Windschlucht',[60,700],[1180,100],[[160,0,24,480],[360,320,24,480],[560,0,24,480],[760,320,24,480],[960,0,24,480],[1100,520,180,24]],[[90,420,26],[260,650,26],[460,160,26],[660,650,26],[860,160,26],[1060,620,26]],{checkpoints:[[660,100]],winds:[[250,560,120,180,.004,0],[850,170,120,180,-.004,0]],movers:[[1040,300,24,150,'y',2.3]]}),
    challenge('Schräglage',[70,80],[1170,700],[[160,190,300,24,.52],[420,330,300,24,-.52],[690,200,24,340],[850,560,320,24,.48],[1000,120,24,260],[190,610,280,24,0],[470,690,24,170]],[[150,400,26],[350,260,26],[500,500,26],[760,100,26],[850,400,26],[1080,350,26]],{checkpoints:[[760,620]],teleporters:[[300,700,900,80]]}),
    challenge('Schleusen',[70,720],[1180,80],[[200,0,24,570],[200,700,24,100],[440,230,24,570],[680,0,24,570],[680,700,24,100],[920,230,24,570],[1080,0,24,570],[1100,400,160,24]],[[110,350,26],[330,650,26],[560,130,26],[790,650,26],[1010,130,26],[1160,300,26]],{checkpoints:[[550,690]],movers:[[330,130,150,24,'x',2.5],[800,340,24,150,'y',2]]}),
    challenge('Endspiel',[60,60],[1180,720],[[180,0,24,500],[380,280,24,520],[580,0,24,500],[780,280,24,520],[980,0,24,500],[1080,560,200,24],[260,570,250,24,.55],[720,140,250,24,-.55]],[[100,280,26],[280,120,26],[340,680,26],[500,260,26],[690,680,26],[860,120,26],[1080,320,26]],{checkpoints:[[700,100],[1080,650]],winds:[[1050,180,100,250,0,.003]],movers:[[500,620,160,24,'x',2.7]]})
  ); }

  /** Verbindet überlappende oder direkt anliegende, gerade Mauerstücke zu einer glatten Kollisionskante. */
  function smoothWalls(walls) {
    const result = walls.map(w => [...w]); let merged = true;
    while (merged) { merged = false;
      outer: for (let i=0;i<result.length;i++) for (let j=i+1;j<result.length;j++) {
        const a=result[i], b=result[j], aa=a[4]||0, ba=b[4]||0;
        if (Math.abs(aa-ba)>.001) continue;
        const horizontal=a[2]>=a[3]&&b[2]>=b[3], vertical=a[3]>a[2]&&b[3]>b[2]; let replacement;
        if (horizontal&&Math.abs(a[1]-b[1])<2&&Math.abs(a[3]-b[3])<2&&Math.max(a[0]-a[2]/2,b[0]-b[2]/2)<=Math.min(a[0]+a[2]/2,b[0]+b[2]/2)) { const left=Math.min(a[0]-a[2]/2,b[0]-b[2]/2),right=Math.max(a[0]+a[2]/2,b[0]+b[2]/2); replacement=[(left+right)/2,a[1],right-left,Math.max(a[3],b[3]),aa]; }
        if (vertical&&Math.abs(a[0]-b[0])<2&&Math.abs(a[2]-b[2])<2&&Math.max(a[1]-a[3]/2,b[1]-b[3]/2)<=Math.min(a[1]+a[3]/2,b[1]+b[3]/2)) { const top=Math.min(a[1]-a[3]/2,b[1]-b[3]/2),bottom=Math.max(a[1]+a[3]/2,b[1]+b[3]/2); replacement=[a[0],(top+bottom)/2,Math.max(a[2],b[2]),bottom-top,aa]; }
        if (replacement) { result.splice(j,1); result[i]=replacement; merged=true; break outer; }
      }
    } return result;
  }

  const store = {
    data: JSON.parse(localStorage.getItem(STORAGE) || '{}'),
    defaults: { unlocked: 1, best: {}, stars: {}, settings: { sensitivity: 1, sound: true, volume: .45, vibration: true } },
    init() { this.data = { ...this.defaults, ...this.data, settings: { ...this.defaults.settings, ...(this.data.settings || {}) } }; this.save(); },
    save() { localStorage.setItem(STORAGE, JSON.stringify(this.data)); }
  }; store.init();

  class AudioFX {
    constructor() { this.context = null; }
    tone(frequency, duration=.08, type='sine', gain=.08) {
      if (!store.data.settings.sound) return;
      try { const ac = this.context ||= new AudioContext(); const osc=ac.createOscillator(), g=ac.createGain(); osc.type=type; osc.frequency.value=frequency; g.gain.setValueAtTime(gain * store.data.settings.volume, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration); osc.connect(g).connect(ac.destination); osc.start(); osc.stop(ac.currentTime+duration); } catch (_) {}
    }
    click(){this.tone(420,.045,'triangle',.06)} collision(){this.tone(90,.045,'square',.04)} win(){this.tone(620,.12,'sine',.12);setTimeout(()=>this.tone(880,.2,'sine',.1),110)} fall(){this.tone(130,.28,'sawtooth',.1)}
  }

  class Game {
    constructor() {
      this.engine=Engine.create({ enableSleeping:false }); this.engine.gravity.scale=.0016;
      this.levelIndex=0; this.ball=null; this.parts=[]; this.checkpoint=null; this.running=false; this.paused=false; this.startTime=0; this.elapsed=0; this.lastFrame=performance.now(); this.keys={}; this.tilt={beta:0,gamma:0,baseBeta:0,baseGamma:0}; this.audio=new AudioFX(); this.sensor=false;
      this.bind(); this.load(0); this.loop(performance.now());
    }
    bind() {
      addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','Escape'].includes(e.key))e.preventDefault(); if(e.key==='Escape')this.togglePause(); this.keys[e.key.toLowerCase()]=true;});
      addEventListener('keyup',e=>this.keys[e.key.toLowerCase()]=false);
      addEventListener('deviceorientation',e=>{ if(e.beta==null)return; this.sensor=true; this.tilt.beta += ((e.beta-this.tilt.baseBeta)-this.tilt.beta)*.13; this.tilt.gamma += ((e.gamma-this.tilt.baseGamma)-this.tilt.gamma)*.13; }, {passive:true});
      Events.on(this.engine,'collisionStart',evt=>this.collisions(evt));
    }
    async enableSensors() {
      try { if(window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission==='function') { const result=await window.DeviceOrientationEvent.requestPermission(); if(result!=='granted') throw Error('nicht erlaubt'); } this.calibrate(); toast('Neigungssteuerung aktiviert'); return true; } catch (_) { toast('Sensorfreigabe fehlt – Tastatursteuerung aktiv'); return false; }
    }
    load(index) {
      this.levelIndex=index; this.running=false; this.paused=false; this.elapsed=0; this.checkpoint=null; this.teleportCooldown=0; Composite.clear(this.engine.world,false); this.parts=[];
      const l=levels[index], wallOpt={isStatic:true,label:'wall',friction:.08,restitution:.55};
      const add=(body,kind)=>{this.parts.push({body,kind});World.add(this.engine.world,body);return body;};
      add(Bodies.rectangle(W/2,-15,W,30,wallOpt),'wall');add(Bodies.rectangle(W/2,H+15,W,30,wallOpt),'wall');add(Bodies.rectangle(-15,H/2,30,H,wallOpt),'wall');add(Bodies.rectangle(W+15,H/2,30,H,wallOpt),'wall');
      smoothWalls(l.walls).forEach(([x,y,w,h,angle=0])=>{const body=Bodies.rectangle(x,y,w,h,{...wallOpt,angle});body.drawSize={w,h};add(body,'wall');});
      l.holes.forEach(([x,y,r])=>this.parts.push({body:{position:{x,y},circleRadius:r},kind:'hole'}));
      l.checkpoints.forEach(([x,y])=>this.parts.push({body:{position:{x,y}},kind:'checkpoint'}));
      this.parts.push({body:{position:{x:l.goal[0],y:l.goal[1]}},kind:'goal'});
      l.movers.forEach(([x,y,w,h,axis,speed])=>{const b=add(Bodies.rectangle(x,y,w,h,{isStatic:true,label:'mover',friction:.02,restitution:.8}),'mover'); b.drawSize={w,h};b.motion={origin:{x,y},axis,speed,phase:Math.random()*6.2,w,h};});
      l.teleporters.forEach(([ax,ay,bx,by],pair)=>{this.parts.push({body:{position:{x:ax,y:ay},pair,exit:{x:bx,y:by}},kind:'teleporter'});this.parts.push({body:{position:{x:bx,y:by},pair,exit:{x:ax,y:ay}},kind:'teleporter'});});
      l.winds.forEach(([x,y,w,h,fx,fy])=>this.parts.push({body:{position:{x,y},width:w,height:h,force:{x:fx,y:fy}},kind:'wind'}));
      this.spawn(l.start); this.updateHud(); this.draw();
    }
    spawn(pos) { if(this.ball)World.remove(this.engine.world,this.ball); this.ball=Bodies.circle(pos[0],pos[1],20,{label:'ball',friction:.012,frictionAir:.021,restitution:.5,density:.003}); World.add(this.engine.world,this.ball); }
    start() { this.running=true; this.paused=false; this.startTime=performance.now()-this.elapsed*1000; $('#instruction').textContent=mobileDevice?'':'Pfeiltasten oder WASD zum Steuern'; $('#message').textContent=''; }
    restart(preserveTime=false) { this.audio.click(); const p=this.checkpoint || levels[this.levelIndex].start, savedTime=preserveTime?this.elapsed:0; this.spawn(p); this.elapsed=savedTime; this.startTime=performance.now()-savedTime*1000; this.running=true; this.paused=false; toast(preserveTime?'Checkpoint wiederholt':'Level neu gestartet'); }
    calibrate(){this.tilt.baseBeta+=this.tilt.beta;this.tilt.baseGamma+=this.tilt.gamma;this.tilt.beta=0;this.tilt.gamma=0;this.audio.click();toast('Neigung kalibriert');}
    togglePause(){if(!this.running)return;this.paused=!this.paused;if(!this.paused)this.startTime=performance.now()-this.elapsed*1000; $('#message').textContent=this.paused?'Pausiert':' '; $('#pauseButton').textContent=this.paused?'▶':'Ⅱ';}
    control() { let x=0,y=0; if(this.sensor){x=this.tilt.gamma/38;y=this.tilt.beta/38;} if(this.keys.arrowleft||this.keys.a)x-=1;if(this.keys.arrowright||this.keys.d)x+=1;if(this.keys.arrowup||this.keys.w)y-=1;if(this.keys.arrowdown||this.keys.s)y+=1; const s=store.data.settings.sensitivity; this.engine.gravity.x=clamp(x*s,-1.15,1.15);this.engine.gravity.y=clamp(y*s,-1.15,1.15); }
    collisions(evt){ if(!this.running||this.paused)return; for(const pair of evt.pairs){if(pair.bodyA===this.ball||pair.bodyB===this.ball)this.audio.collision();} }
    update(dt) {
      if(!this.running||this.paused)return; this.elapsed=(performance.now()-this.startTime)/1000; this.control();
      this.parts.filter(p=>p.kind==='mover').forEach(({body})=>{const m=body.motion,t=performance.now()/1000*m.speed+m.phase;Body.setPosition(body,{x:m.axis==='x'?m.origin.x+Math.sin(t)*115:m.origin.x,y:m.axis==='y'?m.origin.y+Math.sin(t)*115:m.origin.y});});
      Engine.update(this.engine,Math.min(dt,25));
      for(const p of this.parts){const dx=this.ball.position.x-p.body.position.x,dy=this.ball.position.y-p.body.position.y,d=Math.hypot(dx,dy); if(p.kind==='hole'&&d<p.body.circleRadius+12){this.fail();break;} if(p.kind==='checkpoint'&&d<35){this.checkpoint=[p.body.position.x,p.body.position.y];} if(p.kind==='teleporter'&&d<28&&(!this.teleportCooldown||performance.now()>this.teleportCooldown)){Body.setPosition(this.ball,p.body.exit);Body.setVelocity(this.ball,{x:0,y:0});this.teleportCooldown=performance.now()+650;this.audio.tone(310,.1,'triangle',.08);toast('Teleportiert');break;} if(p.kind==='wind'&&Math.abs(dx)<p.body.width/2&&Math.abs(dy)<p.body.height/2){Body.applyForce(this.ball,this.ball.position,p.body.force);} if(p.kind==='goal'&&d<38){this.complete();break;} }
      if(this.ball.position.y>H+45||this.ball.position.x< -45)this.fail(); this.updateHud();
    }
    fail(){if(!this.running)return;this.running=false;this.audio.fall();if(store.data.settings.vibration)navigator.vibrate?.(100);toast('In ein Loch gefallen');setTimeout(()=>this.restart(true),600);}
    complete(){if(!this.running)return;this.running=false;const time=this.elapsed, stars=time<25?3:time<45?2:1, key=this.levelIndex;store.data.best[key]=Math.min(store.data.best[key]??Infinity,time);store.data.stars[key]=Math.max(store.data.stars[key]??0,stars);store.data.unlocked=Math.max(store.data.unlocked,key+2);store.save();this.audio.win();if(store.data.settings.vibration)navigator.vibrate?.([30,50,80]);showResult(this,stars,time);}
    updateHud(){ $('#levelLabel').textContent=`Level ${this.levelIndex+1}`;$('#timeLabel').textContent=fmt(this.elapsed);$('#starLabel').textContent='★'.repeat(store.data.stars[this.levelIndex]||0)+'☆'.repeat(3-(store.data.stars[this.levelIndex]||0)); }
    loop(now){const dt=now-this.lastFrame;this.lastFrame=now;this.update(dt);this.draw();requestAnimationFrame(t=>this.loop(t));}
    draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#ddd7ca';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(45,42,37,.055)';ctx.lineWidth=1;for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      this.parts.forEach(p=>{const b=p.body;if(p.kind==='wall'||p.kind==='mover'){const size=b.drawSize||{w:b.bounds.max.x-b.bounds.min.x,h:b.bounds.max.y-b.bounds.min.y};ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);ctx.fillStyle=p.kind==='wall'?'#343833':'#a86b55';ctx.fillRect(-size.w/2,-size.h/2,size.w,size.h);ctx.restore();}else if(p.kind==='hole'){ctx.beginPath();ctx.arc(b.position.x,b.position.y,b.circleRadius,0,7);ctx.fillStyle='#252722';ctx.fill();ctx.beginPath();ctx.arc(b.position.x,b.position.y,b.circleRadius-5,0,7);ctx.strokeStyle='#656961';ctx.lineWidth=2;ctx.stroke();}else if(p.kind==='goal'||p.kind==='checkpoint'||p.kind==='teleporter'){ctx.beginPath();ctx.arc(b.position.x,b.position.y,p.kind==='goal'?29:p.kind==='teleporter'?24:20,0,7);ctx.fillStyle=p.kind==='goal'?'#799d65':p.kind==='teleporter'?'#8a668f':'#8aa0a5';ctx.strokeStyle='#343833';ctx.lineWidth=3;ctx.fill();ctx.stroke();if(p.kind==='teleporter'){ctx.fillStyle='#ddd7ca';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText('↔',b.position.x,b.position.y+6);}}else if(p.kind==='wind'){const left=b.position.x-b.width/2,top=b.position.y-b.height/2,vertical=Math.abs(b.force.y)>Math.abs(b.force.x),direction=vertical?(b.force.y<0?-1:1):(b.force.x<0?-1:1),progress=(performance.now()/520)%1;ctx.save();ctx.fillStyle='rgba(102,130,144,.15)';ctx.fillRect(left,top,b.width,b.height);ctx.strokeStyle='#6e8b96';ctx.setLineDash([7,7]);ctx.strokeRect(left,top,b.width,b.height);ctx.setLineDash([]);ctx.strokeStyle='#536d77';ctx.lineWidth=2;for(let lane=0;lane<3;lane++){for(let i=0;i<3;i++){const travel=i*48+progress*48*direction+(vertical?b.height:b.width),x=vertical?left+16+lane*15:left+(travel%b.width),y=vertical?top+(travel%b.height):top+16+lane*15;ctx.beginPath();ctx.moveTo(x,y);if(vertical){ctx.lineTo(x,y+direction*18);ctx.lineTo(x-5,y+direction*12);ctx.moveTo(x,y+direction*18);ctx.lineTo(x+5,y+direction*12);}else{ctx.lineTo(x+direction*18,y);ctx.lineTo(x+direction*12,y-5);ctx.moveTo(x+direction*18,y);ctx.lineTo(x+direction*12,y+5);}ctx.stroke();}}ctx.restore();}});
      /* Bewegte, matte Effekte: Wellen füllen jede Windzone; Teleporter wirken wie kleine Portale. */
      this.parts.forEach(p=>{const b=p.body,t=performance.now()/1000;if(p.kind==='wind'){const left=b.position.x-b.width/2,top=b.position.y-b.height/2,vertical=Math.abs(b.force.y)>Math.abs(b.force.x),direction=vertical?(b.force.y<0?-1:1):(b.force.x<0?-1:1);ctx.save();ctx.beginPath();ctx.rect(left,top,b.width,b.height);ctx.clip();ctx.strokeStyle='rgba(64,92,103,.72)';ctx.lineWidth=1.5;if(vertical){for(let x=left+9;x<left+b.width;x+=12){ctx.beginPath();for(let y=top-15;y<top+b.height+16;y+=5){const wave=x+Math.sin(y*.075+t*4*direction)*5; y===top-15?ctx.moveTo(wave,y):ctx.lineTo(wave,y)}ctx.stroke()}}else{for(let y=top+9;y<top+b.height;y+=12){ctx.beginPath();for(let x=left-15;x<left+b.width+16;x+=5){const wave=y+Math.sin(x*.075+t*4*direction)*5; x===left-15?ctx.moveTo(x,wave):ctx.lineTo(x,wave)}ctx.stroke()}}ctx.restore()}if(p.kind==='teleporter'){ctx.save();ctx.beginPath();ctx.arc(b.position.x,b.position.y,21,0,7);ctx.clip();ctx.fillStyle='#5e4966';ctx.fillRect(b.position.x-22,b.position.y-22,44,44);ctx.strokeStyle='#c3a6b8';ctx.lineWidth=2;for(let ring=0;ring<3;ring++){ctx.beginPath();const radius=7+ring*6,offset=t*(ring%2?1:-1)*2;for(let a=0;a<7;a++){const angle=a*Math.PI/3+offset,r=radius+Math.sin(t*3+a*2)*2,x=b.position.x+Math.cos(angle)*r,y=b.position.y+Math.sin(angle)*r; a?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.stroke()}for(let bubble=0;bubble<3;bubble++){const angle=t*(1+bubble*.2)+bubble*2.1,x=b.position.x+Math.cos(angle)*(5+bubble*3),y=b.position.y+Math.sin(angle*1.7)*(5+bubble*3);ctx.beginPath();ctx.arc(x,y,2+bubble*.6,0,7);ctx.fillStyle='#d5c0c7';ctx.fill()}ctx.restore()}});
      if(this.ball){const b=this.ball;ctx.beginPath();ctx.ellipse(b.position.x+5,b.position.y+8,16,6,0,0,7);ctx.fillStyle='rgba(38,40,35,.2)';ctx.fill();ctx.beginPath();ctx.arc(b.position.x,b.position.y,20,0,7);ctx.fillStyle='#315552';ctx.fill();ctx.beginPath();ctx.arc(b.position.x,b.position.y,15,0,7);ctx.strokeStyle='#9ab5a4';ctx.lineWidth=2;ctx.stroke();}}
  }

  /* Überschreibt die frühere Elementzeichnung: ohne Windpfeile, mit flächigen Wellen und matter Portal-Animation. */
  Game.prototype.draw = function draw() {
    ctx.clearRect(0,0,W,H);ctx.fillStyle='#ddd7ca';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(45,42,37,.055)';ctx.lineWidth=1;
    for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    this.parts.forEach(p=>{const b=p.body,t=performance.now()/1000;
      if(p.kind==='wall'||p.kind==='mover'){const s=b.drawSize||{w:b.bounds.max.x-b.bounds.min.x,h:b.bounds.max.y-b.bounds.min.y};ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);ctx.fillStyle=p.kind==='wall'?'#343833':'#a86b55';ctx.fillRect(-s.w/2,-s.h/2,s.w,s.h);ctx.restore();return}
      if(p.kind==='hole'){ctx.beginPath();ctx.arc(b.position.x,b.position.y,b.circleRadius,0,7);ctx.fillStyle='#252722';ctx.fill();ctx.beginPath();ctx.arc(b.position.x,b.position.y,b.circleRadius-5,0,7);ctx.strokeStyle='#656961';ctx.lineWidth=2;ctx.stroke();return}
      if(p.kind==='goal'||p.kind==='checkpoint'){ctx.beginPath();ctx.arc(b.position.x,b.position.y,p.kind==='goal'?29:20,0,7);ctx.fillStyle=p.kind==='goal'?'#799d65':'#8aa0a5';ctx.strokeStyle='#343833';ctx.lineWidth=3;ctx.fill();ctx.stroke();return}
      if(p.kind==='teleporter'){ctx.save();ctx.beginPath();ctx.arc(b.position.x,b.position.y,24,0,7);ctx.fillStyle='#5e4966';ctx.fill();ctx.strokeStyle='#343833';ctx.lineWidth=3;ctx.stroke();ctx.clip();for(let ring=0;ring<3;ring++){ctx.beginPath();const r=7+ring*6,phase=t*(ring%2?1:-1)*2;for(let n=0;n<=18;n++){const a=n/18*7+phase,rr=r+Math.sin(t*3+n+ring)*2,x=b.position.x+Math.cos(a)*rr,y=b.position.y+Math.sin(a)*rr;n?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.strokeStyle=['#c3a6b8','#a77d9d','#d5c0c7'][ring];ctx.lineWidth=2;ctx.stroke()}for(let n=0;n<3;n++){const a=t*(1+n*.2)+n*2.1;ctx.beginPath();ctx.arc(b.position.x+Math.cos(a)*(5+n*3),b.position.y+Math.sin(a*1.7)*(5+n*3),2+n*.6,0,7);ctx.fillStyle='#d5c0c7';ctx.fill()}ctx.restore();return}
      if(p.kind==='wind'){const left=b.position.x-b.width/2,top=b.position.y-b.height/2,vertical=Math.abs(b.force.y)>Math.abs(b.force.x),direction=vertical?(b.force.y<0?-1:1):(b.force.x<0?-1:1);ctx.save();ctx.fillStyle='rgba(102,130,144,.15)';ctx.fillRect(left,top,b.width,b.height);ctx.strokeStyle='#6e8b96';ctx.setLineDash([7,7]);ctx.strokeRect(left,top,b.width,b.height);ctx.setLineDash([]);ctx.beginPath();ctx.rect(left,top,b.width,b.height);ctx.clip();ctx.strokeStyle='rgba(64,92,103,.74)';ctx.lineWidth=1.5;if(vertical){for(let x=left+9;x<left+b.width;x+=12){ctx.beginPath();for(let y=top-15;y<top+b.height+16;y+=5){const wave=x+Math.sin(y*.075-t*4*direction)*5;y===top-15?ctx.moveTo(wave,y):ctx.lineTo(wave,y)}ctx.stroke()}}else{for(let y=top+9;y<top+b.height;y+=12){ctx.beginPath();for(let x=left-15;x<left+b.width+16;x+=5){const wave=y+Math.sin(x*.075-t*4*direction)*5;x===left-15?ctx.moveTo(x,wave):ctx.lineTo(x,wave)}ctx.stroke()}}ctx.restore()}
    });
    if(this.ball){const b=this.ball;ctx.beginPath();ctx.ellipse(b.position.x+5,b.position.y+8,16,6,0,0,7);ctx.fillStyle='rgba(38,40,35,.2)';ctx.fill();ctx.beginPath();ctx.arc(b.position.x,b.position.y,20,0,7);ctx.fillStyle='#315552';ctx.fill();ctx.beginPath();ctx.arc(b.position.x,b.position.y,15,0,7);ctx.strokeStyle='#9ab5a4';ctx.lineWidth=2;ctx.stroke()}
  };

  const modal=$('#modal'), content=$('#modalContent'); let game;
  function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800);}
  function openModal(html, closable=true){content.innerHTML=html;modal.classList.add('is-open');$('#closeModal').style.display=closable?'block':'none';}
  function closeModal(){modal.classList.remove('is-open');}
  function levelsMenu(){let buttons=levels.map((l,i)=>`<button class="level" data-level="${i}" ${i>=store.data.unlocked?'disabled':''}>${i+1}<small>${'★'.repeat(store.data.stars[i]||0)||'–'}</small></button>`).join('');openModal(`<p class="eyebrow">FORTSCHRITT</p><h2 id="modalTitle">Level auswählen</h2><p class="lead">Wähle eine offene Herausforderung.</p><div class="level-grid">${buttons}</div>`);content.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{game.load(+b.dataset.level);game.start();closeModal();});}
  function settingsMenu(){const s=store.data.settings;openModal(`<p class="eyebrow">ANPASSEN</p><h2 id="modalTitle">Optionen</h2><div class="setting"><label for="sens">Sensor-Empfindlichkeit</label><input id="sens" type="range" min="0.4" max="1.8" step=".1" value="${s.sensitivity}"></div><div class="setting"><label for="sound">Sound</label><input id="sound" class="toggle" type="checkbox" ${s.sound?'checked':''}></div><div class="setting"><label for="vol">Lautstärke</label><input id="vol" type="range" min="0" max="1" step=".05" value="${s.volume}"></div><div class="setting"><label for="vibe">Vibration</label><input id="vibe" class="toggle" type="checkbox" ${s.vibration?'checked':''}></div>`);[['sens','sensitivity'],['vol','volume']].forEach(([id,key])=>$('#'+id).oninput=e=>{s[key]=+e.target.value;store.save();});[['sound'],['vibe','vibration']].forEach(([id,key=id])=>$('#'+id).onchange=e=>{s[key]=e.target.checked;store.save();});}
  function showResult(g,stars,time){openModal(`<p class="eyebrow">AUSGEZEICHNET</p><h2 id="modalTitle">Level geschafft!</h2><div class="result-stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><p class="stats">Zeit: <b>${fmt(time)}</b><br>Bestzeit: <b>${fmt(store.data.best[g.levelIndex])}</b></p><div class="modal-actions"><button class="primary" data-action="next">${g.levelIndex<levels.length-1?'Nächstes Level':'Zur Levelauswahl'} <b>→</b></button><button class="secondary" data-action="levels">Level auswählen</button></div>`);}
  function welcome(){const template=$('#welcomeTemplate');openModal(template.innerHTML,false);if(!mobileDevice)content.querySelector('.hint').textContent='Die beste Erfahrung bietet ein Smartphone mit Neigungssteuerung. Auf dem Desktop steuerst du mit Pfeiltasten oder WASD.';}
  content.addEventListener('click',async e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;game.audio.click();if(action==='start'){await game.enableSensors();game.start();closeModal();}if(action==='levels')levelsMenu();if(action==='next'){if(game.levelIndex<levels.length-1){game.load(game.levelIndex+1);game.start();closeModal();}else levelsMenu();}});
  $('#closeModal').onclick=closeModal;$('#restartButton').onclick=()=>game.restart();$('#calibrateButton').onclick=()=>game.calibrate();$('#levelsButton').onclick=levelsMenu;$('#settingsButton').onclick=settingsMenu;$('#pauseButton').onclick=()=>game.togglePause();
  if(!mobileDevice)$('#calibrateButton').hidden=true;
  game=new Game();welcome();
})();
