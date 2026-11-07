const N=4,C=120,OX=230,OY=50,$=id=>document.getElementById(id);
const OPP={N:'S',E:'W',S:'N',W:'E'},D={E:[1,0],S:[0,1]};
// Tile kinds: the positions a tile cycles through (each Q press moves to the next one).
// A position is one or more wires, joined with '+', each wire naming the two edges it links.
const K={
  str:['WE','NS'],
  cor:['NE','ES','SW','WN'],
  tee:['NS+WS','WE+WN','NS+NE','WE+ES'],   // three edges joined, rotating
  rot:['WE','NS','WE+NS']                  // WE+NS = two wires crossing, not touching
};
const FILL={iso:'#6f6c63',cw:'#4b4a3a',diag:'#5c3d2c',rot:'#3d3f43'};
// Scenario cell: R(art, kind, solvedPosition, presses). The start position is worked out
// by winding back `presses` steps from the solved position, so the board starts exactly
// as in the game and the listed press counts solve it.
const R=(a,k,s,p=0)=>({a,k,s,p});
const LEON_A=[
 [R('cw','str',0),  R('diag','tee',0,1),R('iso','cor',1,2),R('rot','str',0)],
 [R('cw','str',1),  R('cw','str',1),    R('iso','cor',0,3),R('diag','cor',2,1)],
 [R('diag','cor',1),R('rot','rot',2),   R('rot','tee',3,2),R('iso','cor',3,1)],
 [R('iso','cor',3,1),R('diag','cor',0,1),R('iso','cor',3,1),R('cw','str',1)]];
const SCENARIOS={
  leonA:{name:'Leon A',grid:LEON_A},
  leonB:{name:'Leon B',placeholder:true,grid:LEON_A},
  claireA:{name:'Claire A',placeholder:true,grid:LEON_A},
  claireB:{name:'Claire B',placeholder:true,grid:LEON_A}};
const M={N:[60,0],E:[120,60],S:[60,120],W:[0,60]};
let L,st,cur=[0,0],moves=0;
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
  const a=f(id(0,0,'W')),b=f(id(3,0,'W')),o=f(id(0,3,'E'));
  return{f,id,lit:new Set([a,b]),win:a==b&&b==o,outLit:o==a||o==b};
}

function tile(r,c,A){
  const {a}=L[r][c],s=st[r][c],x=OX+c*C,y=OY+r*C,sel=cur[0]==r&&cur[1]==c;
  let g=`<g class="tile${sel?' sel':''}" data-r="${r}" data-c="${c}" style="--x:${x}px;--y:${y}px" transform="translate(${x},${y})"><rect class="base" x="4" y="4" width="112" height="112" rx="9" fill="${FILL[a]}"/>${sel?'<rect x="4" y="4" width="112" height="112" rx="9" fill="#6fa8ff" opacity=".2"/>':''}`;
  g+=`<rect x="9" y="9" width="102" height="102" rx="6" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/>`;
  if(a=='iso')g+=`<text class="lbl" x="60" y="45" text-anchor="middle">ISO-F</text><text class="lbl" x="60" y="86" text-anchor="middle">ISO-M</text>`;
  if(a=='cw')g+=`<text class="lbl" x="60" y="108" text-anchor="middle">CW-2</text>`;
  if(a=='diag')g+=`<path d="M12 4L116 108L108 116L4 12Z" fill="#241711" opacity=".8" transform="${s%2?'translate(120,0) scale(-1,1)':''}"/>`;
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
  $('leads').innerHTML=wire('M170,110H230',1)+wire('M170,470H230',1)+wire('M710,110H780',A.outLit)
    +lamp(170,110,1)+lamp(170,470,1)+lamp(768,110,A.outLit)+lamp(792,110,A.outLit);
  $('mv').textContent=moves;
  $('msg').textContent=A.win?`Circuit restored in ${moves} moves`:A.outLit?'Output powered. Connect both terminals':'Circuit dead';
  $('msg').className=A.win?'ok':'';
  if(pop)document.querySelector(`.tile[data-r="${pop[0]}"][data-c="${pop[1]}"]`)?.classList.add('pop');
}
function step(){
  const [r,c]=cur;
  st[r][c]=(st[r][c]+1)%pos(r,c).length;moves++;render(cur);
}
function reset(){
  st=L.map((row,r)=>row.map((t,c)=>{const n=K[t.k].length;return((t.s-t.p)%n+n)%n}));
  moves=0;render();
}
const clamp=v=>Math.max(0,Math.min(N-1,v));
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key.toLowerCase(),m={w:[-1,0],s:[1,0],a:[0,-1],d:[0,1]}[k];
  if(m){e.preventDefault();cur=[clamp(cur[0]+m[0]),clamp(cur[1]+m[1])];render();}
  else if(k=='q'){e.preventDefault();if(!e.repeat)step();}
  else if(k=='e'){e.preventDefault();if(!e.repeat)step();}
});
function load(k){
  L=SCENARIOS[k].grid;cur=[0,0];
  $('sub').textContent=SCENARIOS[k].placeholder?SCENARIOS[k].name+': placeholder layout (copy of Leon A until the real board is added).':SCENARIOS[k].name+'. Connect both left terminals to the output.';
  $('tabs').innerHTML=Object.keys(SCENARIOS).map(id=>`<button data-k="${id}" class="${id==k?'on':''}">${SCENARIOS[id].name}</button>`).join('');
  reset();
}
$('tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)load(b.dataset.k)});
$('rs').onclick=reset;
load('leonA');
