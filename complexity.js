(() => {
const $=id=>document.getElementById(id); const graphEl=$('graph');
let G=null,V=[],E=[],byId=new Map(),adj=new Map(),steps=[],at=0;
const label=id=>byId.get(id)?.label??'?';
const pair=(a,b)=>String(a)<String(b)?a+'|'+b:b+'|'+a;
function loadGraph(){
  try{G=JSON.parse(localStorage.getItem('bccGraph')||'null')}catch(e){G=null}
  V=Array.isArray(G?.V)?G.V:[]; E=Array.isArray(G?.E)?G.E:[]; byId=new Map(V.map(v=>[v.id,v])); adj=new Map(V.map(v=>[v.id,[]]));
  E.forEach(e=>{if(adj.has(e.a)&&adj.has(e.b)){adj.get(e.a).push(e.b);adj.get(e.b).push(e.a)}});
  for(const list of adj.values())list.sort((a,b)=>String(label(a)).localeCompare(String(label(b))));
  $('verticesCount').textContent=V.length;$('edgesCount').textContent=E.length;
  $('graphNote').textContent=V.length?`Using the graph currently saved by Graph Builder (${V.length} vertices, ${E.length} undirected edges). If you edit the graph, return here and rebuild the trace.`:'No saved graph found. Open Graph Builder, create/load a graph, then return here.';
  const sel=$('startVertex');sel.innerHTML=V.map(v=>`<option value="${v.id}">${v.label}</option>`).join('');
  const saved=localStorage.getItem('bccStartVertex'); if(saved&&byId.has(saved))sel.value=saved;
}
function addStep(kind,title,text,code,current=null,edge=null,counters,seen,disc=null,low=null,arts=[]){steps.push({kind,title,text,code,current,edge,counters:{...counters},seen:[...seen],disc:disc?new Map(disc):new Map(),low:low?new Map(low):new Map(),arts:[...arts]})}
function buildTrace() {
  steps = []; at = 0;
  if (!V.length) { render(); return; }
  const alg = $('algorithm').value;
  const chosen = $('startVertex').value || V[0].id;
  const c = { vertex: 0, edge: 0, structure: 0 };
  const seen = new Set();
  addStep('ready', 'Ready', `Trace ${alg.toUpperCase()} on this graph, starting at ${label(chosen)}.`, `${alg.toUpperCase()}(start=${label(chosen)})`, null, null, c, seen);
  const starts = [chosen, ...V.map(v => v.id).filter(id => id !== chosen)];

  if (alg === 'dfs' || alg === 'bfs') {
    for (const start of starts) {
      if (seen.has(start)) continue;
      if (alg === 'dfs') {
        const stack = [start]; c.structure++;
        addStep('push', `Push ${label(start)}`, `Place ${label(start)} on the DFS stack.`, `stack.push(${label(start)})`, start, null, c, seen);
        while (stack.length) {
          const u = stack.pop(); c.structure++; c.vertex++;
          addStep('visit', `Pop and process ${label(u)}`, `Remove ${label(u)} from the top of the stack and process it.`, 'u = stack.pop()', u, null, c, seen);
          if (seen.has(u)) {
            addStep('skip', `Skip ${label(u)}`, 'It was already visited, so no second visit is counted.', `if visited[${label(u)}]: continue`, u, null, c, seen);
            continue;
          }
          seen.add(u);
          addStep('discover', `Visit ${label(u)}`, 'Mark it visited. Each vertex is processed at most once.', `visited.add(${label(u)})`, u, null, c, seen);
          const ns = [...(adj.get(u) || [])].reverse();
          if (!ns.length) addStep('leaf', `${label(u)} has no neighbours`, 'There are no adjacency entries to scan here.', `adj[${label(u)}] is empty`, u, null, c, seen);
          for (const v of ns) {
            c.edge++;
            addStep('scan', `Check ${label(u)} — ${label(v)}`, 'One adjacency-list entry is checked. For an undirected edge, both endpoint lists contain an entry.', `check neighbour ${label(v)} in adj[${label(u)}]`, u, [u, v], c, seen);
            if (!seen.has(v) && !stack.includes(v)) {
              stack.push(v); c.structure++;
              addStep('push', `Push ${label(v)}`, 'Add the unvisited neighbour to the DFS stack.', `stack.push(${label(v)})`, u, [u, v], c, seen);
            }
          }
        }
      } else {
        const q = [start]; seen.add(start); c.structure++;
        addStep('enqueue', `Enqueue ${label(start)}`, 'Add the start vertex to the back of the queue.', `queue.push(${label(start)})`, start, null, c, seen);
        while (q.length) {
          const u = q.shift(); c.structure++; c.vertex++;
          addStep('dequeue', `Dequeue ${label(u)}`, 'Remove the front item and process it.', 'u = queue.shift()', u, null, c, seen);
          for (const v of (adj.get(u) || [])) {
            c.edge++;
            addStep('scan', `Check ${label(u)} — ${label(v)}`, `Check one neighbour entry in ${label(u)}’s adjacency list.`, `check ${label(v)} in adj[${label(u)}]`, u, [u, v], c, seen);
            if (!seen.has(v)) {
              seen.add(v); q.push(v); c.structure++;
              addStep('enqueue', `Enqueue ${label(v)}`, 'Mark it discovered when enqueuing so it is added only once.', `visited.add(${label(v)}); queue.push(${label(v)})`, u, [u, v], c, seen);
            }
          }
        }
      }
    }
  } else {
    const disc = new Map(), low = new Map(), parent = new Map(), stack = [], arts = new Set();
    let time = 0;
    function snap(kind, title, text, code, u = null, e = null) {
      addStep(kind, title, text, code, u, e, c, seen, disc, low, arts);
    }
    function dfs(u) {
      disc.set(u, ++time); low.set(u, time); seen.add(u); c.vertex++;
      snap('discover', `Discover ${label(u)}`, 'Assign a discovery time and initialise low to the same value.', `disc[${label(u)}] = low[${label(u)}] = ${time}`, u);
      let children = 0;
      for (const v of (adj.get(u) || [])) {
        c.edge++;
        snap('scan', `Check ${label(u)} — ${label(v)}`, 'Inspect this adjacency entry to decide whether it is a tree edge, a back edge, or the parent edge.', `inspect adj[${label(u)}] → ${label(v)}`, u, [u, v]);
        if (!disc.has(v)) {
          children++; parent.set(v, u); stack.push([u, v]); c.structure++;
          snap('push-edge', `Push edge ${label(u)} — ${label(v)}`, 'Tree edges are pushed so a complete BCC can be popped when its boundary condition is met.', `edgeStack.push(${label(u)}—${label(v)})`, v, [u, v]);
          dfs(v);
          const old = low.get(u); low.set(u, Math.min(low.get(u), low.get(v)));
          snap('propagate', `Update low[${label(u)}]`, 'Propagate the child’s low value back to its parent.', `low[${label(u)}] = min(${old}, ${low.get(v)}) = ${low.get(u)}`, u, [u, v]);
          if ((parent.has(u) && low.get(v) >= disc.get(u)) || (!parent.has(u) && children > 1)) {
            arts.add(u);
            snap('articulation', `${label(u)} is an articulation point`, 'The child subtree cannot reach an ancestor above this vertex.', `low[${label(v)}] ≥ disc[${label(u)}]`, u, [u, v]);
          }
          if (low.get(v) >= disc.get(u)) {
            let popped;
            do { popped = stack.pop(); if (popped) c.structure++; }
            while (popped && pair(popped[0], popped[1]) !== pair(u, v));
            snap('bcc', 'Extract a BCC', `Pop each edge through ${label(u)}—${label(v)}. Each edge is pushed and popped at most once.`, `pop edge stack through (${label(u)}, ${label(v)})`, u, [u, v]);
          }
        } else if (v !== parent.get(u) && disc.get(v) < disc.get(u)) {
          low.set(u, Math.min(low.get(u), disc.get(v))); stack.push([u, v]); c.structure++;
          snap('back-edge', `Back edge ${label(u)} — ${label(v)}`, 'An edge to an ancestor can lower this vertex’s low value.', `low[${label(u)}] = min(low[${label(u)}], disc[${label(v)}])`, u, [u, v]);
        }
      }
    }
    for (const start of starts) if (!disc.has(start)) dfs(start);
    while (stack.length) { stack.pop(); c.structure++; }
    snap('finish', 'Finish BCC extraction', 'Any remaining edges are accounted for as the final component.', 'pop remaining edge stack');
  }
  addStep('done', 'Trace complete', `The trace processed ${V.length} vertices and ${E.length} undirected edges. The exact counter values depend on this graph and traversal order; the asymptotic bound describes how work scales as the graph grows.`, 'tracked operations = vertex work + adjacency scans + stack/queue work', null, null, c, seen);
  render();
}
function renderGraph(s){graphEl.innerHTML='';if(!V.length){graphEl.innerHTML='<div class="empty-graph">No graph is saved yet.<br>Go to Graph Builder and create or load one.</div>';return}
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');E.forEach(e=>{const a=byId.get(e.a),b=byId.get(e.b);if(!a||!b)return;const line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y);line.setAttribute('class','cx-edge'+(s.edge&&pair(s.edge[0],s.edge[1])===pair(e.a,e.b)?' active':''));svg.appendChild(line)});graphEl.appendChild(svg);
 V.forEach(v=>{const n=document.createElement('div');n.className='cx-node'+(s.seen.includes(v.id)?' visited':'')+(s.current===v.id?' current':'')+(s.arts.includes(v.id)?' articulation':'');n.style.left=v.x+'%';n.style.top=v.y+'%';n.textContent=v.label;if(s.disc.has(v.id)){n.title=`disc=${s.disc.get(v.id)}, low=${s.low.get(v.id)}`;const small=document.createElement('small');small.className='node-values';small.textContent=`${s.disc.get(v.id)}/${s.low.get(v.id)}`;n.appendChild(small)}graphEl.appendChild(n)})}
function render(){const s=steps[at];$('stepLabel').textContent=`Step ${steps.length?at+1:0} / ${steps.length}`;$('stepCount').textContent=s?.counters.vertex+s?.counters.edge+s?.counters.structure||0;$('operationTitle').textContent=s?.title||'Ready';$('operationText').textContent=s?.text||'Build a graph to begin.';$('operationCode').textContent=s?.code||'';
 const alg=$('algorithm').value;
 const algName=alg==='bcc'?'Biconnected Components (BCC)':alg==='bfs'?'Breadth-First Search (BFS)':'Depth-First Search (DFS)';
 const shortName=alg.toUpperCase();
 const bound='O(V + E)';
 $('bound').textContent=`${shortName} · ${bound}`;
 $('formula').textContent=bound;
 const c=s?.counters||{vertex:0,edge:0,structure:0};
 $('vertexOps').textContent=c.vertex;$('edgeOps').textContent=c.edge;$('structureOps').textContent=c.structure;
 $('vTerm').textContent=c.vertex;$('eTerm').textContent=c.edge;$('totalOps').textContent=c.vertex+c.edge+c.structure;
 const v=V.length,e=E.length,adjLimit=2*e;
 const structureLimit=alg==='bcc'?2*e:2*v;
 const vertexCap=Math.max(1,v), edgeCap=Math.max(1,adjLimit), structureCap=Math.max(1,structureLimit);
 const setProgress=(bar,count,cap)=>{bar.style.width=(Math.min(1,count/cap)*100)+'%';bar.parentElement.setAttribute('aria-label',`${count} of ${cap} operations counted for this graph`)};
 setProgress($('vertexBar'),c.vertex,vertexCap);setProgress($('edgeBar'),c.edge,edgeCap);setProgress($('structureBar'),c.structure,structureCap);
 $('vertexLimit').textContent=`${c.vertex} / ${v} (V=${v})`;
 $('edgeLimit').textContent=`${c.edge} / ${adjLimit} (2E=${adjLimit})`;
 $('structureLimit').textContent=`${c.structure} / ${structureLimit} (${alg==='bcc'?'2E':'2V'})`;
 $('structureLabel').textContent=alg==='bcc'?'BCC edge-stack pushes + pops':alg==='bfs'?'BFS queue enqueues + dequeues':'DFS stack pushes + pops';
 $('analysisTitle').textContent=`${shortName} on this graph`;
 $('analysisIntro').textContent=`This saved graph has ${v} vertices and ${e} undirected edges. Counts are taken from the highlighted operation; the ceilings below are calculated from these graph sizes.`;
 $('boundExplanation').textContent=alg==='bcc'
   ? `Think of the work in three buckets: visit vertices, inspect neighbours, and maintain the BCC edge stack. No vertex is discovered twice; every undirected edge appears in two adjacency lists; and each edge enters and leaves the BCC stack at most once.`
   : alg==='bfs'
   ? `BFS has three kinds of work: process each vertex, inspect its neighbour entries, and add/remove vertices from the queue. Each vertex enters and leaves the queue at most once; every undirected edge appears in two adjacency lists.`
   : `DFS has three kinds of work: process each vertex, inspect its neighbour entries, and add/remove vertices from the stack. Each vertex enters and leaves the stack at most once; every undirected edge appears in two adjacency lists.`;
 $('deriveTitle').textContent=`How ${shortName} scales on this graph`;
 const derivation=alg==='bcc'
   ? `<p><b>1 · Visit vertices:</b> each of the ${v} vertices is discovered once.</p><p><b>2 · Check connections:</b> an undirected edge is seen from both ends, so ${e} edges give ${adjLimit} neighbour checks.</p><p><b>3 · Manage the edge stack:</b> each of the ${e} edges is pushed once and popped once: ${adjLimit} stack actions.</p><p class="derived-formula">For this graph: ${v} + ${adjLimit} + ${adjLimit} = ${v+2*adjLimit} counted actions.</p>`
   : `<p><b>1 · Visit vertices:</b> at most ${v} vertices are processed.</p><p><b>2 · Check connections:</b> ${e} undirected edges create ${adjLimit} neighbour entries to inspect.</p><p><b>3 · Manage the ${alg==='bfs'?'queue':'stack'}:</b> each vertex is added and removed at most once: ${2*v} actions.</p><p class="derived-formula">For this graph: ${v} + ${adjLimit} + ${2*v} = ${3*v+adjLimit} counted actions.</p>`;
 $('dynamicDerivation').innerHTML=derivation;
 $('currentInequality').textContent=`So far, the animation has counted ${c.vertex} vertex actions, ${c.edge} neighbour checks, and ${c.structure} ${alg==='bcc'?'edge-stack':alg==='bfs'?'queue':'stack'} actions: ${c.vertex+c.edge+c.structure} actions altogether. These are counts for this graph, not a universal constant.`;
 $('bigOReason').textContent=`${alg==='bcc'?'BCC also maintains discovery/low values and extracts components using an edge stack.':alg==='bfs'?'BFS uses a FIFO queue and explores level by level.':'DFS uses a LIFO stack and explores branches before backtracking.'} For adjacency-list implementations, all three have the asymptotic bound O(V + E). It stays the same because the counted work is bounded by linear terms in V and E; the graph-specific numbers and operation types change when you switch algorithms or edit the graph.`;
 renderGraph(s||{seen:[],arts:[],disc:new Map(),low:new Map()});const history=$('history');history.innerHTML='';const from=Math.max(0,at-9);for(let i=from;i<=at&&steps.length;i++){const st=steps[i],row=document.createElement('div');row.className='history-row'+(i===at?' current':'');row.innerHTML=`<span class="num">${i+1}</span><span>${st.title}</span><span class="cost">${st.counters.vertex+st.counters.edge+st.counters.structure} total</span>`;row.onclick=()=>{at=i;render()};history.appendChild(row)}$('historyLabel').textContent=`${Math.min(at+1,10)} of ${steps.length} recent entries`;$('first').disabled=at===0;$('previous').disabled=at===0;$('next').disabled=at>=steps.length-1;$('last').disabled=at>=steps.length-1;}
$('algorithm').addEventListener('change',buildTrace);$('rebuild').onclick=()=>{loadGraph();buildTrace()};$('startVertex').addEventListener('change',()=>{localStorage.setItem('bccStartVertex',$('startVertex').value);buildTrace()});$('first').onclick=()=>{at=0;render()};$('previous').onclick=()=>{at=Math.max(0,at-1);render()};$('next').onclick=()=>{at=Math.min(steps.length-1,at+1);render()};$('last').onclick=()=>{at=steps.length-1;render()};$('reset').onclick=()=>{at=0;render()};
loadGraph();buildTrace();
})();