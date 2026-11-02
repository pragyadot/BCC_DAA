const canvas=document.getElementById('canvas'),empty=document.getElementById('empty'),vc=document.getElementById('vc'),ec=document.getElementById('ec'),valid=document.getElementById('valid'),hint=document.getElementById('hint'),dfs=document.getElementById('dfs'),bfs=document.getElementById('bfs'),bcc=document.getElementById('bcc');
let V=[],E=[],selected=null,drag=null,history=[];
const examples={
triangle:{v:[[35,32],[65,32],[50,68]],e:[[0,1],[1,2],[2,0]]},
chain:{v:[[18,50],[39,50],[61,50],[82,50]],e:[[0,1],[1,2],[2,3]]},
bcc:{v:[[18,50],[42,28],[42,72],[67,50],[84,50]],e:[[0,1],[0,2],[1,2],[1,3],[2,3],[3,4]]},
multi:{v:[[18,50],[37,30],[37,70],[62,30],[62,70],[83,50]],e:[[0,1],[0,2],[1,2],[1,3],[2,4],[3,4],[3,5],[4,5]]}};
function label(i){let s='';do{s=String.fromCharCode(65+i%26)+s;i=Math.floor(i/26)-1}while(i>=0);return s}
function nextAvailableLabel(){
  const used=new Set(V.map(v=>v.label));
  let i=0;
  while(used.has(label(i))) i++;
  return label(i);
}
function saveHistory(){
  history.push(JSON.stringify({V,E}));
  if(history.length>30) history.shift();
  document.getElementById('undo').disabled=false;
}
function point(e){let r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100}}
function hasEdge(a,b){return E.some(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a))}
function render(){
 canvas.querySelectorAll('.vertex,.edge').forEach(x=>x.remove());empty.style.display=V.length?'none':'grid';
 let r=canvas.getBoundingClientRect();
 E.forEach(edge=>{let a=V.find(x=>x.id===edge.a),b=V.find(x=>x.id===edge.b);if(!a||!b)return;let el=document.createElement('div');el.className='edge';let ax=a.x/100*r.width,ay=a.y/100*r.height,bx=b.x/100*r.width,by=b.y/100*r.height,dx=bx-ax,dy=by-ay;el.style.left=ax+'px';el.style.top=ay+'px';el.style.width=Math.hypot(dx,dy)+'px';el.style.transform=`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`;el.title='Double-click to remove';el.ondblclick=e=>{e.stopPropagation();saveHistory();E=E.filter(x=>x!==edge);render()};canvas.appendChild(el)});
 V.forEach(v=>{let el=document.createElement('div');el.className='vertex'+(selected===v.id?' selected':'');el.textContent=v.label;el.style.left=v.x+'%';el.style.top=v.y+'%';el.ondblclick=e=>{e.stopPropagation();saveHistory();V=V.filter(x=>x.id!==v.id);E=E.filter(x=>x.a!==v.id&&x.b!==v.id);selected=null;render()};el.onclick=e=>{e.stopPropagation();if(selected===null){selected=v.id;hint.textContent=`Selected ${v.label}. Click another vertex to connect.`}else if(selected===v.id){selected=null;hint.textContent='Click empty space to add a vertex.'}else{if(!hasEdge(selected,v.id)){saveHistory();E.push({a:selected,b:v.id});}let o=V.find(x=>x.id===selected);hint.textContent=`Connected ${o.label} and ${v.label}.`;selected=null}render()};
 el.onpointerdown=e=>{if(e.button!==0)return;drag=v.id;el.setPointerCapture?.(e.pointerId)};el.onpointermove=e=>{if(drag!==v.id)return;let p=point(e);v.x=Math.max(4,Math.min(96,p.x));v.y=Math.max(6,Math.min(94,p.y));render()};el.onpointerup=()=>{drag=null};canvas.appendChild(el)});
 update()}
function update(){vc.textContent=V.length;ec.textContent=E.length;let ready=V.length>=2&&E.length>0;dfs.disabled=!ready;if(bfs)bfs.disabled=!ready;bcc.disabled=!ready;if(!V.length){valid.className='notice';valid.textContent='Add at least two vertices.'}else if(!E.length){valid.className='notice warn';valid.textContent='Add at least one edge before starting.'}else{valid.className='notice good';valid.textContent=' Graph is ready for exploration.'}}
canvas.onclick=e=>{if(e.target!==canvas)return;if(selected!==null){selected=null;render();return}let p=point(e);saveHistory();V.push({id:crypto.randomUUID(),label:nextAvailableLabel(),x:p.x,y:p.y});render()};
document.getElementById('clear').onclick=()=>{if(!V.length&&!E.length)return;saveHistory();V=[];E=[];selected=null;hint.textContent='Click an empty space to add a vertex.';render()};
document.getElementById('undo').onclick=()=>{if(!history.length)return;let last=JSON.parse(history.pop());V=last.V;E=last.E;selected=null;hint.textContent='Undid the last graph change.';document.getElementById('undo').disabled=!history.length;render()};

document.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{let x=examples[b.dataset.ex],ids=x.v.map(()=>crypto.randomUUID());V=x.v.map((p,i)=>({id:ids[i],label:label(i),x:p[0],y:p[1]}));E=x.e.map(([a,b])=>({a:ids[a],b:ids[b]}));history=[];document.getElementById('undo').disabled=true;selected=null;hint.textContent='Example loaded. Drag vertices if you want.';render()});
document.getElementById('guide').onclick=()=>document.getElementById('modal').classList.remove('hidden');
document.getElementById('close').onclick=()=>document.getElementById('modal').classList.add('hidden');
document.getElementById('modal').onclick=e=>{if(e.target.id==='modal')e.currentTarget.classList.add('hidden')};
dfs.onclick=()=>{localStorage.setItem('bccGraph',JSON.stringify({V,E}));location.href='dfs.html'};
if(bfs)bfs.onclick=()=>{localStorage.setItem('bccGraph',JSON.stringify({V,E}));location.href='bfs.html'};
bcc.onclick=()=>{localStorage.setItem('bccRoutePreference','direct');localStorage.setItem('bccGraph',JSON.stringify({V,E}));location.href='bcc.html'};
render();
const whatBccToggle=document.getElementById('whatBccToggle');
const whatBcc=document.getElementById('whatBcc');
if(whatBccToggle&&whatBcc){
  whatBccToggle.onclick=()=>{
    whatBcc.classList.toggle('hidden');
    whatBccToggle.textContent=whatBcc.classList.contains('hidden')
      ? ' What are Biconnected Components?'
      : ' Hide BCC introduction';
  };
}

/* ===== v9 Learning Guide + direct BCC route ===== */
(function(){
  const sidebar=document.getElementById('learningSidebar');
  const toggle=document.getElementById('learningToggle');
  const content=document.getElementById('learningContent');

  const learning={
    'what-dfs':`<h3>What is DFS?</h3>
      <p><b>Depth-First Search</b> is a graph traversal method. It follows one route as deeply as possible before backtracking to explore another route.</p>
      <p>Its purpose here is to give us the traversal structure from which discovery times and low values are built.</p>`,
    'intuition':`<h3>DFS intuition</h3>
      <p>Imagine exploring a maze. Keep moving forward while there is an unexplored route. When you cannot continue, backtrack.</p>
      <p>Watch the stack in the DFS visualizer: it makes that exploration and backtracking visible.</p>`,
    'algorithm':`<h3>Full DFS algorithm</h3>
      <pre>DFS(start):
  mark start visited
  push start

  while stack is not empty:
    current ← stack.pop()
    for each neighbour of current:
      if neighbour is unvisited:
        mark neighbour visited
        push neighbour</pre>`,
    'variables':`<h3>DFS variables</h3>
      <p><b>stack</b> → vertices waiting to be explored.</p>
      <p><b>visited</b> → vertices already discovered.</p>
      <p><b>current</b> → the vertex currently being processed.</p>
      <p><b>traversal order</b> → the order in which vertices are visited.</p>`,
    'what-bcc':`<h3>What are Biconnected Components?</h3>
      <p>A biconnected component is a maximal part of a graph whose connectivity does not depend on a single articulation vertex.</p>
      <p><b>Our visual story:</b></p>
      <p>DFS → discovery time → low value → articulation point → edge stack → BCC.</p>
      <p>The BCC explorer will make that cause-and-effect chain visible.</p>`
  };

  if(sidebar && toggle){
    toggle.onclick=()=>{
      sidebar.classList.toggle('open');
      toggle.title=sidebar.classList.contains('open')?'Collapse learning guide':'Open learning guide';
    };
  }
  document.querySelectorAll('[data-learn]').forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll('[data-learn]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      if(content) content.innerHTML=learning[btn.dataset.learn] || '';
      if(sidebar) sidebar.classList.add('open');
    };
  });

  const direct=document.getElementById('bccDirect');
  if(direct){
    direct.onclick=()=>{
      if(typeof localStorage!=='undefined'){
        try{ localStorage.setItem('bccRoutePreference','direct'); }catch(e){}
      }
      location.href='bcc.html';
    };
  }
  const dfs=document.getElementById('dfsExplore');
  if(dfs){
    dfs.onclick=()=>{
      if(typeof localStorage!=='undefined'){
        try{ localStorage.setItem('bccRoutePreference','dfs'); }catch(e){}
      }
      location.href='dfs.html';
    };
  }
})();

/* ===== Learning path modal ===== */
(function(){
  const roadmap=document.getElementById('roadmap');
  document.getElementById('welcomeGuide')?.addEventListener('click',()=>roadmap?.classList.remove('hidden'));
  document.getElementById('closeRoadmap')?.addEventListener('click',()=>roadmap?.classList.add('hidden'));
  roadmap?.addEventListener('click',e=>{if(e.target===roadmap) roadmap.classList.add('hidden');});
})();
