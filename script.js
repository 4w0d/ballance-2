/* Kugellabyrinth – statischer Matter.js-Spielkern, bewusst ohne Build-Schritt. */
(() => {
  'use strict';
  const { Engine, World, Bodies, Body, Events, Composite, Vector } = Matter;
  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#gameCanvas'), ctx = canvas.getContext('2d');
  const W = 1280, H = 800, STORAGE = 'kugellabyrinth.v1';
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;

  /** Level werden rein als Daten definiert – neue Abschnitte benötigen keine Engine-Änderung. */
  const BASE = { size: [W, H], start: [100, 100], goal: [1175, 690], walls: [], holes: [], checkpoints: [], movers: [], teleporters: [], winds: [] };
  const makeLevel = (name, config) => ({ ...BASE, name, ...config });
  const levels = [
    makeLevel('Erste Kurve', { walls:[[235,265,34,530],[425,535,34,530],[615,265,34,530],[805,535,34,530],[995,265,34,530],[94,270,135,24],[335,645,140,24],[525,290,140,24],[715,645,140,24],[905,300,135,24],[1125,500,120,24]], holes:[[100,475,25],[172,650,25],[315,125,25],[355,445,25],[525,650,25],[560,135,25],[730,470,25],[750,150,25],[920,650,25],[940,125,25],[1125,300,25],[1160,525,25]], checkpoints:[[330,95],[710,95],[1090,95]], teleporters:[[335,570,735,230]], winds:[[255,520,125,62,.00048,0],[830,130,120,62,-.00048,0]], goal:[1180,700] }),
    makeLevel('Zickzack', { start:[90,700], goal:[1180,100], walls:[[250,260,38,540],[500,540,38,520],[750,260,38,540],[1000,540,38,520]], holes:[[145,310,27],[390,680,28],[620,150,28],[875,680,28],[1110,320,27]], checkpoints:[[385,100],[875,100]] }),
    makeLevel('Engpass', { walls:[[260,0,45,535],[260,665,45,135],[590,135,45,665],[920,0,45,535],[920,665,45,135]], holes:[[130,375,32],[445,350,28],[760,590,29],[1100,400,33]], checkpoints:[[430,710]], goal:[1180,710] }),
    makeLevel('Kreuzung', { start:[100,100], goal:[1160,700], walls:[[410,0,42,290],[410,510,42,290],[0,375,400,42],[880,375,400,42],[850,0,42,290],[850,510,42,290]], holes:[[190,190,31],[190,600,31],[640,160,28],[640,610,28],[1050,190,31],[1050,600,31]], checkpoints:[[640,375]] }),
    makeLevel('Wanderer', { start:[90,700], goal:[1180,100], walls:[[330,0,42,480],[650,320,42,480],[970,0,42,480]], holes:[[150,420,30],[475,145,30],[805,650,30],[1110,430,30]], checkpoints:[[495,650]], movers:[[500,410,160,24,'x',2.2],[800,250,24,150,'y',1.8]] }),
    makeLevel('Drehmoment', { walls:[[285,0,42,520],[610,280,42,520],[935,0,42,520]], holes:[[155,640,32],[465,220,29],[770,660,31],[1110,350,32]], checkpoints:[[770,150]], winds:[[315,650,170,75,.00055,0],[760,110,160,70,-.0005,0]], goal:[1170,700] }),
    makeLevel('Doppelhelix', { start:[100,400], goal:[1180,400], walls:[[250,190,42,380],[505,0,42,510],[505,650,42,150],[775,150,42,650],[1030,0,42,510],[1030,650,42,150]], holes:[[150,140,28],[150,660,28],[380,400,30],[640,130,28],[640,670,28],[900,400,30],[1140,150,28],[1140,650,28]], checkpoints:[[640,400]] }),
    makeLevel('Schleuse', { start:[110,100], goal:[1160,690], walls:[[280,0,40,570],[510,230,40,570],[740,0,40,570],[970,230,40,570]], holes:[[130,420,30],[395,660,30],[625,130,30],[855,660,30],[1100,310,30]], checkpoints:[[620,670]], movers:[[395,175,24,145,'y',2.4],[855,620,170,24,'x',2]] }),
    makeLevel('Sternenpfad', { start:[100,700], goal:[1180,100], walls:[[220,230,40,570],[450,0,40,570],[680,230,40,570],[910,0,40,570]], holes:[[110,250,28],[330,670,29],[560,190,29],[790,670,29],[1020,190,29],[1140,550,30]], checkpoints:[[560,680],[1020,680]], teleporters:[[340,100,790,700]], winds:[[240,135,150,70,.00055,0],[915,650,155,70,-.00055,0]] }),
    makeLevel('Finale', { start:[90,100], goal:[1180,690], walls:[[210,0,38,530],[410,270,38,530],[610,0,38,530],[810,270,38,530],[1010,0,38,530]], holes:[[115,620,31],[310,150,29],[510,660,30],[710,150,29],[910,660,30],[1110,210,31]], checkpoints:[[510,690],[910,690]], movers:[[310,620,24,150,'y',2.1],[710,610,170,24,'x',2.3]], winds:[[835,115,140,75,-.00055,0]] })
  ];

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
      l.walls.forEach(([x,y,w,h])=>add(Bodies.rectangle(x,y,w,h,wallOpt),'wall'));
      l.holes.forEach(([x,y,r])=>this.parts.push({body:{position:{x,y},circleRadius:r},kind:'hole'}));
      l.checkpoints.forEach(([x,y])=>this.parts.push({body:{position:{x,y}},kind:'checkpoint'}));
      this.parts.push({body:{position:{x:l.goal[0],y:l.goal[1]}},kind:'goal'});
      l.movers.forEach(([x,y,w,h,axis,speed])=>{const b=add(Bodies.rectangle(x,y,w,h,{isStatic:true,label:'mover',friction:.02,restitution:.8}),'mover'); b.motion={origin:{x,y},axis,speed,phase:Math.random()*6.2,w,h};});
      l.teleporters.forEach(([ax,ay,bx,by],pair)=>{this.parts.push({body:{position:{x:ax,y:ay},pair,exit:{x:bx,y:by}},kind:'teleporter'});this.parts.push({body:{position:{x:bx,y:by},pair,exit:{x:ax,y:ay}},kind:'teleporter'});});
      l.winds.forEach(([x,y,w,h,fx,fy])=>this.parts.push({body:{position:{x,y},width:w,height:h,force:{x:fx,y:fy}},kind:'wind'}));
      this.spawn(l.start); this.updateHud(); this.draw();
    }
    spawn(pos) { if(this.ball)World.remove(this.engine.world,this.ball); this.ball=Bodies.circle(pos[0],pos[1],20,{label:'ball',friction:.012,frictionAir:.021,restitution:.5,density:.003}); World.add(this.engine.world,this.ball); }
    start() { this.running=true; this.paused=false; this.startTime=performance.now()-this.elapsed*1000; $('#message').textContent=this.sensor?'Neigen zum Steuern':'Pfeiltasten oder WASD zum Steuern'; }
    restart() { this.audio.click(); const p=this.checkpoint || levels[this.levelIndex].start; this.spawn(p); this.elapsed=0; this.startTime=performance.now(); this.running=true; this.paused=false; toast('Level neu gestartet'); }
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
    fail(){if(!this.running)return;this.running=false;this.audio.fall();if(store.data.settings.vibration)navigator.vibrate?.(100);toast('In ein Loch gefallen');setTimeout(()=>this.restart(),600);}
    complete(){if(!this.running)return;this.running=false;const time=this.elapsed, stars=time<25?3:time<45?2:1, key=this.levelIndex;store.data.best[key]=Math.min(store.data.best[key]??Infinity,time);store.data.stars[key]=Math.max(store.data.stars[key]??0,stars);store.data.unlocked=Math.max(store.data.unlocked,key+2);store.save();this.audio.win();if(store.data.settings.vibration)navigator.vibrate?.([30,50,80]);showResult(this,stars,time);}
    updateHud(){ $('#levelLabel').textContent=`Level ${this.levelIndex+1}`;$('#timeLabel').textContent=fmt(this.elapsed);$('#starLabel').textContent='★'.repeat(store.data.stars[this.levelIndex]||0)+'☆'.repeat(3-(store.data.stars[this.levelIndex]||0)); }
    loop(now){const dt=now-this.lastFrame;this.lastFrame=now;this.update(dt);this.draw();requestAnimationFrame(t=>this.loop(t));}
    draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#ddd7ca';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(45,42,37,.055)';ctx.lineWidth=1;for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      this.parts.forEach(p=>{const b=p.body;if(p.kind==='wall'||p.kind==='mover'){ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);ctx.fillStyle=p.kind==='wall'?'#343833':'#a86b55';ctx.fillRect(-b.bounds.max.x+b.position.x,-b.bounds.max.y+b.position.y,b.bounds.max.x-b.bounds.min.x,b.bounds.max.y-b.bounds.min.y);ctx.restore();}else if(p.kind==='hole'){ctx.beginPath();ctx.arc(b.position.x,b.position.y,b.circleRadius,0,7);ctx.fillStyle='#252722';ctx.fill();ctx.beginPath();ctx.arc(b.position.x,b.position.y,b.circleRadius-5,0,7);ctx.strokeStyle='#656961';ctx.lineWidth=2;ctx.stroke();}else if(p.kind==='goal'||p.kind==='checkpoint'||p.kind==='teleporter'){ctx.beginPath();ctx.arc(b.position.x,b.position.y,p.kind==='goal'?29:p.kind==='teleporter'?24:20,0,7);ctx.fillStyle=p.kind==='goal'?'#799d65':p.kind==='teleporter'?'#8a668f':'#8aa0a5';ctx.strokeStyle='#343833';ctx.lineWidth=3;ctx.fill();ctx.stroke();if(p.kind==='teleporter'){ctx.fillStyle='#ddd7ca';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText('↔',b.position.x,b.position.y+6);}}else if(p.kind==='wind'){const left=b.position.x-b.width/2, top=b.position.y-b.height/2, direction=b.force.x<0?-1:1, progress=(performance.now()/520)%1;ctx.save();ctx.fillStyle='rgba(102,130,144,.15)';ctx.fillRect(left,top,b.width,b.height);ctx.strokeStyle='#6e8b96';ctx.setLineDash([7,7]);ctx.strokeRect(left,top,b.width,b.height);ctx.setLineDash([]);ctx.strokeStyle='#536d77';ctx.lineWidth=2;for(let lane=0;lane<3;lane++){const y=top+16+lane*15;for(let i=0;i<3;i++){const x=left+((i*48+progress*48*direction+b.width)%b.width);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+direction*18,y);ctx.lineTo(x+direction*12,y-5);ctx.moveTo(x+direction*18,y);ctx.lineTo(x+direction*12,y+5);ctx.stroke();}}ctx.restore();}});
      if(this.ball){const b=this.ball;ctx.beginPath();ctx.ellipse(b.position.x+5,b.position.y+8,16,6,0,0,7);ctx.fillStyle='rgba(38,40,35,.2)';ctx.fill();ctx.beginPath();ctx.arc(b.position.x,b.position.y,20,0,7);ctx.fillStyle='#315552';ctx.fill();ctx.beginPath();ctx.arc(b.position.x,b.position.y,15,0,7);ctx.strokeStyle='#9ab5a4';ctx.lineWidth=2;ctx.stroke();}}
  }

  const modal=$('#modal'), content=$('#modalContent'); let game;
  function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800);}
  function openModal(html, closable=true){content.innerHTML=html;modal.classList.add('is-open');$('#closeModal').style.display=closable?'block':'none';}
  function closeModal(){modal.classList.remove('is-open');}
  function levelsMenu(){let buttons=levels.map((l,i)=>`<button class="level" data-level="${i}" ${i>=store.data.unlocked?'disabled':''}>${i+1}<small>${'★'.repeat(store.data.stars[i]||0)||'–'}</small></button>`).join('');openModal(`<p class="eyebrow">FORTSCHRITT</p><h2 id="modalTitle">Level auswählen</h2><p class="lead">Wähle eine offene Herausforderung.</p><div class="level-grid">${buttons}</div>`);content.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{game.load(+b.dataset.level);game.start();closeModal();});}
  function settingsMenu(){const s=store.data.settings;openModal(`<p class="eyebrow">ANPASSEN</p><h2 id="modalTitle">Optionen</h2><div class="setting"><label for="sens">Sensor-Empfindlichkeit</label><input id="sens" type="range" min="0.4" max="1.8" step=".1" value="${s.sensitivity}"></div><div class="setting"><label for="sound">Sound</label><input id="sound" class="toggle" type="checkbox" ${s.sound?'checked':''}></div><div class="setting"><label for="vol">Lautstärke</label><input id="vol" type="range" min="0" max="1" step=".05" value="${s.volume}"></div><div class="setting"><label for="vibe">Vibration</label><input id="vibe" class="toggle" type="checkbox" ${s.vibration?'checked':''}></div>`);[['sens','sensitivity'],['vol','volume']].forEach(([id,key])=>$('#'+id).oninput=e=>{s[key]=+e.target.value;store.save();});[['sound'],['vibe','vibration']].forEach(([id,key=id])=>$('#'+id).onchange=e=>{s[key]=e.target.checked;store.save();});}
  function showResult(g,stars,time){openModal(`<p class="eyebrow">AUSGEZEICHNET</p><h2 id="modalTitle">Level geschafft!</h2><div class="result-stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><p class="stats">Zeit: <b>${fmt(time)}</b><br>Bestzeit: <b>${fmt(store.data.best[g.levelIndex])}</b></p><div class="modal-actions"><button class="primary" data-action="next">${g.levelIndex<levels.length-1?'Nächstes Level':'Zur Levelauswahl'} <b>→</b></button><button class="secondary" data-action="levels">Level auswählen</button></div>`);}
  function welcome(){const template=$('#welcomeTemplate');openModal(template.innerHTML,false);}
  content.addEventListener('click',async e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;game.audio.click();if(action==='start'){await game.enableSensors();game.start();closeModal();}if(action==='levels')levelsMenu();if(action==='next'){if(game.levelIndex<levels.length-1){game.load(game.levelIndex+1);game.start();closeModal();}else levelsMenu();}});
  $('#closeModal').onclick=closeModal;$('#restartButton').onclick=()=>game.restart();$('#calibrateButton').onclick=()=>game.calibrate();$('#levelsButton').onclick=levelsMenu;$('#settingsButton').onclick=settingsMenu;$('#pauseButton').onclick=()=>game.togglePause();
  game=new Game();welcome();
})();
