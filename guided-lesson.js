(() => {
  const $ = id => document.getElementById(id);
  if (!$('guidedNext')) return;

  // One consistent undirected graph: triangles A-B-C-A and C-D-E-C.
  // DFS tree: A-B, B-C, C-D, D-E. Back edges: C-A and E-C.
  const stages = [
    {concept:'01 · DISCOVERY TIME',title:'DFS gives each vertex a first-visit number',body:'Start at A. DFS follows A → B → C → D → E. The first time a vertex is reached, the clock increases and that number is written beside the vertex. This is its discovery time, written disc[vertex]. It is not a distance.',formula:'disc[A] = 1  →  disc[B] = 2  →  disc[C] = 3  →  disc[D] = 4  →  disc[E] = 5',why:'A smaller discovery time means DFS reached that vertex earlier. These numbers let us describe how far back a part of the DFS tree can reconnect.',seen:['A','B','C','D','E'],disc:{A:1,B:2,C:3,D:4,E:5},low:{},tree:['AB','BC','CD','DE'],back:[],focus:'AB'},
    {concept:'02 · TREE EDGES AND BACK EDGES',title:'Not every edge is used to discover a new vertex',body:'The four solid edges A–B, B–C, C–D and D–E discovered new vertices. The remaining edges C–A and E–C lead to ancestors that DFS has already visited. In an undirected DFS these are back edges. They create alternate routes toward earlier vertices.',formula:'Tree edges: A–B, B–C, C–D, D–E\nBack edges: C–A and E–C',why:'A back edge can let a subtree reconnect higher in the DFS tree instead of relying only on the edge that brought DFS into that subtree.',seen:['A','B','C','D','E'],disc:{A:1,B:2,C:3,D:4,E:5},low:{},tree:['AB','BC','CD','DE'],back:['CA','EC'],focus:'EC'},
    {concept:'03 · LOW VALUE',title:'low[x] records the earliest ancestor reachable from x’s subtree',body:'For a vertex x, begin with disc[x]. Then consider back edges from x or any vertex below x in its DFS tree. low[x] is the smallest discovery time among those reachable ancestors and x itself. A child can also pass its low value upward when DFS returns.',formula:'low[x] = minimum reachable discovery time\n(using DFS-tree edges down, and at most one back edge up)',why:'For E, the back edge E–C reaches discovery time 3, so low[E] = 3 instead of 5. E’s parent D receives that information too, so low[D] = 3.',seen:['A','B','C','D','E'],disc:{A:1,B:2,C:3,D:4,E:5},low:{A:1,B:1,C:1,D:3,E:3},tree:['AB','BC','CD','DE'],back:['CA','EC'],focus:'EC'},
    {concept:'04 · PROPAGATION',title:'DFS carries the child’s result back to its parent',body:'DFS finishes E and returns to D. D compares its own discovery time (4) with E’s low value (3), and keeps the smaller number. D then returns to C and passes 3 upward. C also has the back edge C–A, which reaches discovery time 1, so low[C] becomes 1.',formula:'low[D] = min(disc[D], low[E]) = min(4, 3) = 3\nlow[C] = min(disc[C], low[D], disc[A]) = min(3, 3, 1) = 1',why:'The update happens after DFS(child) returns. That is why the algorithm can use the child’s completed low value.',seen:['A','B','C','D','E'],disc:{A:1,B:2,C:3,D:4,E:5},low:{A:1,B:1,C:1,D:3,E:3},tree:['AB','BC','CD','DE'],back:['CA','EC'],focus:'CD'},
    {concept:'05 · ARTICULATION POINT',title:'Can this child subtree get to an ancestor above its parent?',body:'Now compare C with its DFS child D. D’s subtree has low[D] = 3, while disc[C] = 3. It can return to C, but it cannot reach A or B without passing through C. Removing C therefore separates D and E from A and B. C is an articulation point.',formula:'low[D] ≥ disc[C]\n3 ≥ 3  →  C is an articulation point',why:'For a non-root parent, equality is enough: reaching the parent itself does not create a route around that parent. The DFS root uses a separate rule, explained in the next step.',seen:['A','B','C','D','E'],disc:{A:1,B:2,C:3,D:4,E:5},low:{A:1,B:1,C:1,D:3,E:3},tree:['AB','BC','CD','DE'],back:['CA','EC'],focus:'CD'},
    {concept:'06 · BRIDGE',title:'A bridge needs the child to be unable to reach the parent too',body:'The edge C–D is not a bridge because E can return to C through E–C. In general, if a child subtree can reach the parent itself, its tree edge lies on a cycle and is not a bridge. A tree edge is a bridge only when the child subtree cannot reach the parent or any ancestor.',formula:'Bridge (u,v) only if low[v] > disc[u]\nHere: low[D] = disc[C] = 3  →  C–D is not a bridge',why:'The strict greater-than sign excludes equality. Equality means there is a return route to the parent.',seen:['A','B','C','D','E'],disc:{A:1,B:2,C:3,D:4,E:5},low:{A:1,B:1,C:1,D:3,E:3},tree:['AB','BC','CD','DE'],back:['CA','EC'],focus:'EC'},
    {concept:'07 · ROOT RULE AND BCC',title:'The root rule and how the edge stack forms a component',body:'The DFS root has no parent above it, so it is an articulation point only if it has more than one DFS-tree child. For BCC extraction, push each DFS tree edge and back edge onto an edge stack. When low[child] ≥ disc[parent], pop through that child’s tree edge. The popped edges form one biconnected component.',formula:'Root is an articulation point ⇢ more than 1 DFS-tree child\nBCC boundary ⇢ low[child] ≥ disc[parent]',why:'In this graph, the stack first yields {C–D, D–E, E–C}; then {A–B, B–C, C–A}. The two triangles share C, which is the articulation point.',seen:['A','B','C','D','E'],disc:{A:1,B:2,C:3,D:4,E:5},low:{A:1,B:1,C:1,D:3,E:3},tree:['AB','BC','CD','DE'],back:['CA','EC'],focus:'C'}
  ];
  let step = 0;
  const edgeIds = {AB:'AB',BC:'BC',CA:'CA',CD:'CD',DE:'DE',EC:'EC'};
  function render(){
    const s=stages[step];
    $('guidedStepCount').textContent=`Step ${step+1} of ${stages.length}`;
    $('guidedConcept').textContent=s.concept;
    $('guidedTitle').textContent=s.title;
    $('guidedBody').textContent=s.body;
    $('guidedFormula').textContent=s.formula;
    $('guidedWhy').textContent=s.why;
    $('guidedPrev').disabled=step===0;
    $('guidedNext').textContent=step===stages.length-1?'Restart lesson ↻':'Next idea →';
    ['A','B','C','D','E'].forEach(v=>{
      const disc=s.disc[v], low=s.low[v];
      $(`value${v}`).textContent=s.seen.includes(v)?`disc ${disc}${low===undefined?'':` · low ${low}`}`:'not visited';
      $(`node${v}`).classList.toggle('guided-node-active',s.seen.includes(v));
    });
    Object.keys(edgeIds).forEach(e=>{
      const el=$(`edge${e}`); if(!el)return;
      el.classList.toggle('guided-edge-active',s.tree.includes(e));
      el.classList.toggle('guided-edge-focus',e===s.focus);
      el.classList.toggle('guided-back-edge',s.back.includes(e));
    });
  }
  $('guidedPrev').addEventListener('click',()=>{step=Math.max(0,step-1);render()});
  $('guidedNext').addEventListener('click',()=>{step=step===stages.length-1?0:step+1;render()});

  const cases={
    equal:{heading:'Equal: the child subtree can return to the parent, but not above it.',body:'Assume u is not the DFS root and v is one of its DFS children. low[v] = disc[u] means the subtree rooted at v has a back edge to u, but none to an ancestor above u. If u is removed, that child subtree is cut off: u is an articulation point. But edge (u,v) is not a bridge because the back edge gives another route between the same vertices.',ap:'YES (u)',bridge:'NO (u–v)'},
    below:{heading:'Less than: the child subtree reaches above its parent.',body:'low[v] < disc[u] means some vertex in v’s subtree has a back edge to a strict ancestor of u. This child subtree can get around u, so this child does not make u an articulation point. The edge (u,v) is not a bridge. Another child of u could still make u an articulation point.',ap:'NO from this child',bridge:'NO (u–v)'},
    above:{heading:'Greater than: the child subtree cannot reach u or anything above u.',body:'low[v] > disc[u] means there is no back edge from v’s subtree to u or to an ancestor of u. The tree edge (u,v) is the only connection from that subtree to the rest of the graph. It is a bridge, and removing u separates this child subtree too (so u is an articulation point, assuming u is not the DFS root).',ap:'YES (u)',bridge:'YES (u–v)'}
  };
  document.querySelectorAll('.condition-choice').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.condition-choice').forEach(b=>b.classList.toggle('active',b===btn));
    const c=cases[btn.dataset.case];
    $('conditionResult').innerHTML=`<b>${c.heading}</b><p>${c.body}</p><div class="condition-rules"><span>Articulation point: <strong>${c.ap}</strong></span><span>Bridge: <strong>${c.bridge}</strong></span></div>`;
  }));
  render();
})();
