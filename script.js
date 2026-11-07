const N=4,C=120,OX=230,OY=50,$=id=>document.getElementById(id);
const OPP={N:'S',E:'W',S:'N',W:'E'},D={E:[1,0],S:[0,1]};
// Tile kinds: the positions a tile cycles through (each Q press moves to the next one).
// A position is one or more wires, joined with '+', each wire naming the two edges it links.
const K={
  str:['WE','NS'],
  cor:['NE','ES','SW','WN'],
  tee:['NS+WS','WE+WN','NS+NE','WE+ES'],   // three edges joined, rotating
  rot:['WE','NS','WE+NS'],                 // WE+NS = two wires crossing, not touching
  dia:['WN+ES','NE+SW']                    // two separate corner wires split by a diagonal bar
};
const FILL={iso:'#6f6c63',cw:'#4b4a3a',diag:'#5c3d2c',rot:'#3d3f43',blue:'#2f3a6b',olive:'#5e5a33'};
// Scenario cell: R(art, kind, solvedPosition, presses). The start position is worked out
// by winding back `presses` steps from the solved position, so the board starts exactly
// as in the game and the listed press counts solve it.
const R=(a,k,s,p=0)=>({a,k,s,p});
const LEON_A=[
 [R('cw','str',0),  R('diag','tee',0,1),R('iso','cor',1,2),R('rot','str',0)],
 [R('cw','str',1),  R('cw','str',1),    R('iso','cor',0,3),R('diag','cor',2,1)],
 [R('diag','cor',1),R('rot','rot',2),   R('rot','tee',3,2),R('iso','cor',3,1)],
 [R('iso','cor',3,1),R('diag','cor',0,1),R('iso','cor',3,1),R('cw','str',1)]];
// Leon B: output terminal is on the bottom row, solved in 10 presses.
const LEON_B=[
 [R('diag','dia',1,1),R('iso','cor',1),    R('diag','dia',0,1),R('iso','cor',2)],
 [R('cw','str',1),    R('iso','cor',1,1),  R('rot','rot',2),   R('diag','dia',0)],
 [R('diag','dia',1,1),R('blue','tee',0,3), R('olive','str',1,1),R('iso','cor',3)],
 [R('rot','rot',2),   R('iso','cor',3,1),  R('diag','dia',1,1),R('cw','str',0)]];
// Claire A (Claire's panel in the Police Chief's office): output terminal on the top row, solved in 7 presses.
// Decoded from the "Seven Moves Only" guide screenshot: start wiring + press counts.
const CLAIRE_A=[
 [R('rot','rot',2),   R('rot','rot',2),    R('diag','dia',1,1),R('diag','dia',0)],
 [R('diag','dia',0,1),R('diag','dia',1),   R('rot','rot',2),   R('rot','rot',2)],
 [R('rot','rot',2),   R('rot','rot',2),    R('blue','tee',2,3),R('diag','dia',0,1)],
 [R('diag','dia',0),  R('diag','dia',1,1), R('diag','dia',0),  R('diag','dia',0)]];
// Claire B (Claire's 2nd run, Private Collection panel): output terminal on the bottom row, solved in 11 presses.
// Solved wiring read from the solved screenshot, press counts from the "Claire B-Run" panel of the solutions image.
const CLAIRE_B=[
 [R('iso','cor',2),   R('diag','dia',0,1), R('diag','dia',1),   R('cw','str',1)],
 [R('diag','dia',1,1),R('rot','rot',2),    R('blue','tee',1,3), R('diag','dia',1,1)],
 [R('diag','dia',0),  R('rot','rot',2),    R('olive','str',0,1),R('iso','cor',3,2)],
 [R('iso','cor',3),   R('diag','dia',1,1), R('rot','rot',2),    R('cw','str',0,1)]];
const SCENARIOS={
  leonA:{name:'Leon A',grid:LEON_A,out:0},
  leonB:{name:'Leon B',grid:LEON_B,out:3},
  claireA:{name:'Claire A',grid:CLAIRE_A,out:0},
  claireB:{name:'Claire B',grid:CLAIRE_B,out:3,v:3}};
const M={N:[60,0],E:[120,60],S:[60,120],W:[0,60]};
let L,st,OUT=0,cur=[0,0],moves=0;
// ---- timer + best times ----
let KEY='leonA',t0=0,raf=0,solved=false,finalMs=0;
const mem={};
const fmt=ms=>{const t=Math.floor(ms/10),cs=t%100,s=Math.floor(t/100)%60,m=Math.floor(t/6000);return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`};
const bk=k=>'re2circuit.best.'+k+(SCENARIOS[k].v||'');
const getBest=k=>{try{const v=JSON.parse(localStorage.getItem(bk(k)));if(Array.isArray(v))return v}catch(e){}return mem[bk(k)]||[]};
const setBest=(k,v)=>{mem[bk(k)]=v;try{localStorage.setItem(bk(k),JSON.stringify(v))}catch(e){}};
const tick=()=>{$('time').textContent=fmt(performance.now()-t0);raf=requestAnimationFrame(tick)};
const startTimer=()=>{t0=performance.now();raf=requestAnimationFrame(tick)};
const stopTimer=()=>{cancelAnimationFrame(raf);raf=0};
function renderBest(hl=-1){
  const b=getBest(KEY);
  $('bestTime').textContent=b.length?fmt(b[0].t):'--';
  $('bsName').textContent=SCENARIOS[KEY].name;
  $('best').innerHTML=b.length?b.map((e,i)=>`<li class="${i==hl?'new':''}"><span>${fmt(e.t)}</span><em>${e.m} moves</em></li>`).join(''):'<li class="empty">No times yet. Solve the board to set one.</li>';
}
function finish(){
  const t=performance.now()-t0;stopTimer();
  solved=true;finalMs=t;$('time').textContent=fmt(t);
  const prev=getBest(KEY),entry={t:Math.round(t),m:moves},all=[...prev,entry].sort((a,b)=>a.t-b.t);
  const rank=all.indexOf(entry);setBest(KEY,all.slice(0,5));
  let badge;
  if(!prev.length)badge='First time on the board';
  else if(rank==0)badge=`New best! ${((prev[0].t-entry.t)/1000).toFixed(2)}s faster`;
  else if(rank<5)badge=`#${rank+1} on your best times`;
  else badge=`Best is ${fmt(prev[0].t)}`;
  $('win').innerHTML=`<strong>Circuit restored</strong><span class="big">${fmt(t)}</span><span>${moves} moves</span><span class="badge${rank==0?' gold':''}">${badge}</span><small>Press R or Reset to go again</small>`;
  $('win').hidden=false;$('board').classList.add('solved');
  renderBest(rank<5?rank:-1);render();
}
const outY=()=>OY+OUT*C+60;
const pos=(r,c)=>K[L[r][c].k];
const pathOf=([a,b])=>OPP[a]==b?`M${M[a]}L${M[b]}`:`M${M[a]}Q60,60 ${M[b]}`;
const wire=(d,on)=>`<path class="w0" d="${d}"/><path class="w1 ${on?'on':''}" d="${d}"/><path class="w2" d="${d}"/>`;
const lamp=(x,y,on)=>`<circle cx="${x}" cy="${y}" r="11" fill="${on?'#ffe27a':'#4a432c'}" stroke="#1d1a12" stroke-width="2" ${on?'filter="url(#glow)"':''}/>`;

function analyze(){
  const id=(r,c,p)=>(r*N+c)*4+'NESW'.indexOf(p),par=[...Array(N*N*4).keys()];
  const f=x=>par[x]==x?x:par[x]=f(par[x]),u=(a,b)=>{par[f(a)]=f(b)};
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    pos(r,c)[st[r][c]].split('+').forEach(w=>u(id(r,c,w[0]),id(r,c,w[1])));
    for(const p in D){const nr=r+D[p][1],nc=c+D[p][0];if(nr<N&&nc<N)u(id(r,c,p),id(nr,nc,OPP[p]))}
  }
  const a=f(id(0,0,'W')),b=f(id(3,0,'W')),o=f(id(OUT,3,'E'));
  return{f,id,lit:new Set([a,b]),win:a==b&&b==o,outLit:o==a||o==b};
}

function tile(r,c,A){
  const {a,k}=L[r][c],s=st[r][c],x=OX+c*C,y=OY+r*C,sel=cur[0]==r&&cur[1]==c;
  let g=`<g class="tile${sel?' sel':''}" data-r="${r}" data-c="${c}" style="--x:${x}px;--y:${y}px" transform="translate(${x},${y})"><rect class="base" x="4" y="4" width="112" height="112" rx="9" fill="${FILL[a]}"/>${sel?'<rect x="4" y="4" width="112" height="112" rx="9" fill="#6fa8ff" opacity=".2"/>':''}`;
  g+=`<rect x="9" y="9" width="102" height="102" rx="6" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/>`;
  if(a=='iso')g+=`<text class="lbl" x="60" y="45" text-anchor="middle">ISO-F</text><text class="lbl" x="60" y="86" text-anchor="middle">ISO-M</text>`;
  if(a=='cw')g+=`<text class="lbl" x="60" y="108" text-anchor="middle">CW-2</text>`;
  if(a=='olive')g+=`<text class="lbl" x="60" y="108" text-anchor="middle">CW-2</text><circle cx="60" cy="60" r="24" fill="#8b8a7c" stroke="#3a3922" stroke-width="3"/>`;
  if(a=='blue')g+=`<circle cx="60" cy="60" r="26" fill="#1d2140" stroke="#6b74a8" stroke-width="3"/><rect x="92" y="92" width="8" height="8" fill="#0d1022"/>`;
  // diagonal bar: "/" sits between the WN and ES corners, "\" between NE and SW
  if(a=='diag')g+=`<path d="M12 4L116 108L108 116L4 12Z" fill="#241711" opacity=".8" transform="${(k=='dia'?s+1:s)%2?'translate(120,0) scale(-1,1)':''}"/>`;
  if(a=='rot')g+=`<circle cx="60" cy="60" r="32" fill="#25262a" stroke="#8c8a7c" stroke-width="3"/><line x1="60" y1="60" x2="60" y2="34" stroke="#d6c58a" stroke-width="5" stroke-linecap="round" transform="rotate(${s*90} 60 60)"/>`;
  pos(r,c)[s].split('+').forEach(w=>{
    g+=wire(pathOf(w),A.lit.has(A.f(A.id(r,c,w[0]))));
    [w[0],w[1]].forEach(p=>g+=`<circle cx="${M[p][0]}" cy="${M[p][1]}" r="5" fill="#8b8878" stroke="#111" stroke-width="1.5"/>`);
  });
  return g+'</g>';
}

function render(pop){
  const A=analyze();let h='';
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)h+=tile(r,c,A);
  $('tiles').innerHTML=h;
  const oy=outY();
  $('leads').innerHTML=wire('M170,110H230',1)+wire('M170,470H230',1)+wire(`M710,${oy}H780`,A.outLit)
    +lamp(170,110,1)+lamp(170,470,1)+lamp(768,oy,A.outLit)+lamp(792,oy,A.outLit);
  $('mv').textContent=moves;
  $('msg').textContent=A.win?`Circuit restored in ${moves} moves${solved?' in '+fmt(finalMs):''}`:A.outLit?'Output powered. Connect both terminals':'Circuit dead';
  $('msg').className=A.win?'ok':'';
  if(pop)document.querySelector(`.tile[data-r="${pop[0]}"][data-c="${pop[1]}"]`)?.classList.add('pop');
}
function step(){
  if(solved)return;
  if(!t0)startTimer();
  const [r,c]=cur;
  st[r][c]=(st[r][c]+1)%pos(r,c).length;moves++;render(cur);
  if(analyze().win)finish();
}
function reset(){
  st=L.map((row,r)=>row.map((t,c)=>{const n=K[t.k].length;return((t.s-t.p)%n+n)%n}));
  cur=[0,0];moves=0;stopTimer();t0=0;solved=false;finalMs=0;
  $('time').textContent=fmt(0);$('win').hidden=true;$('board').classList.remove('solved');
  renderBest();render();
}
const clamp=v=>Math.max(0,Math.min(N-1,v));
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key.toLowerCase(),m={w:[-1,0],s:[1,0],a:[0,-1],d:[0,1]}[k];
  if(m){e.preventDefault();cur=[clamp(cur[0]+m[0]),clamp(cur[1]+m[1])];render();}
  else if(k=='r'){e.preventDefault();reset();}
  else if(k=='q'){e.preventDefault();if(!e.repeat)step();}
  else if(k=='e'){e.preventDefault();if(!e.repeat)step();}
});
// Output terminal + its cable sit on the scenario's output row (wire exits upward from the
// bottom half of the board, downward from the top half).
function drawOutput(){
  const y=outY(),dir=OUT<2?1:-1;
  $('outstat').innerHTML=
    `<path d="M780 ${y}H850C905 ${y} 905 ${y+40*dir} 905 ${y+100*dir}V${y+220*dir}" fill="none" stroke="#6a2f8f" stroke-width="14" stroke-linecap="round"/>`
    +`<rect x="745" y="${y-30}" width="70" height="60" rx="6" fill="url(#metal)" stroke="#333" stroke-width="2"/>`;
}
function load(k){
  const S=SCENARIOS[k];
  KEY=k;L=S.grid;OUT=S.out||0;cur=[0,0];
  $('sub').textContent=S.placeholder?S.name+': placeholder layout (copy of Leon A until the real board is added).':S.name+'. Connect both left terminals to the output.'+(S.note?' '+S.note:'');
  $('tabs').innerHTML=Object.keys(SCENARIOS).map(id=>`<button data-k="${id}" class="${id==k?'on':''}">${SCENARIOS[id].name}</button>`).join('');
  drawOutput();
  reset();
}
$('tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)load(b.dataset.k)});
$('rs').onclick=reset;
$('clr').onclick=()=>{if(confirm('Clear best times for '+SCENARIOS[KEY].name+'?')){setBest(KEY,[]);renderBest()}};
load('leonA');