(() => {
  const raw = localStorage.getItem('bccGraph');
  if (!raw) { location.href = 'index.html'; return; }

  const G = JSON.parse(raw);
  const V = Array.isArray(G.V) ? G.V : [];
  const E = Array.isArray(G.E) ? G.E : [];
  const byId = new Map(V.map(v => [v.id, v]));
  const adj = new Map(V.map(v => [v.id, []]));
  E.forEach(e => {
    if (adj.has(e.a) && adj.has(e.b)) {
      adj.get(e.a).push(e.b);
      adj.get(e.b).push(e.a);
    }
  });
  for (const list of adj.values()) {
    list.sort((a,b) => String(byId.get(a)?.label).localeCompare(String(byId.get(b)?.label)));
  }

  const $ = id => document.getElementById(id);
  const canvas = $('bccCanvas'), phase = $('phase'), stepLabel = $('stepLabel');
  const title = $('title'), description = $('description'), formula = $('formulaBox'), causeEffect = $('causeEffect');
  const edgeStack = $('edgeStack'), bccList = $('bccList');
  const speed = $('speed'), speedValue = $('speedValue');

  const disc = new Map(), low = new Map(), parent = new Map();
  const edgeStackState = [], components = [], articulation = new Set(), bridges = new Set();
  let clock = 0;
  const steps = [];

  const key = (a,b) => String(a) < String(b) ? `${a}|${b}` : `${b}|${a}`;
  const label = id => byId.get(id)?.label ?? '?';


  function snapshot(message, kind, current=null, activeEdge=null, extraFormula='') {
    steps.push({
      message, kind, current, activeEdge,
      disc: new Map(disc), low: new Map(low),
      stack: edgeStackState.map(e => [...e]),
      components: components.map(c => c.map(e => [...e])),
      articulation: new Set(articulation),
      bridges: new Set(bridges),
      formula: extraFormula
    });
  }

  function dfs(u) {
    disc.set(u, ++clock);
    low.set(u, clock);
    snapshot(
      `${label(u)} is discovered now. We assign disc[${label(u)}] = ${clock}. Initially low[${label(u)}] is the same.`,
      'discover', u, null,
      `disc[${label(u)}] = low[${label(u)}] = ${clock}`
    );

    let children = 0;

    for (const v of (adj.get(u) || [])) {
      if (!disc.has(v)) {
        children++;
        parent.set(v, u);
        edgeStackState.push([u,v]);
        snapshot(
          `We take the DFS tree edge ${label(u)} — ${label(v)}. It is pushed onto the edge stack.`,
          'tree', v, [u,v],
          `push(${label(u)} — ${label(v)})`
        );

        dfs(v);

        const oldLow = low.get(u);
        low.set(u, Math.min(low.get(u), low.get(v)));
        if (low.get(u) !== oldLow) {
          snapshot(
            `We return from ${label(v)}. Its low value is ${low.get(v)}, so the smaller value moves upward to ${label(u)}.`,
            'low', u, [u,v],
            `low[${label(u)}] = min(${oldLow}, ${low.get(v)}) = ${low.get(u)}`
          );
        } else {
          snapshot(
            `We return from ${label(v)}. ${label(u)} keeps its current low value of ${low.get(u)}.`,
            'return', u, [u,v],
            `low[${label(u)}] = ${low.get(u)}`
          );
        }

        // A DFS tree edge (u,v) is a bridge exactly when the child subtree
        // cannot reach u or any ancestor of u through a back edge.
        if (low.get(v) > disc.get(u)) {
          bridges.add(key(u,v));
          snapshot(
            `${label(u)} — ${label(v)} is a bridge because low[${label(v)}] = ${low.get(v)} > disc[${label(u)}] = ${disc.get(u)}. Removing this edge separates the graph.`,
            'bridge', u, [u,v],
            `low[${label(v)}] > disc[${label(u)}]  →  bridge`
          );
        }

        const p = parent.get(u);
        const isArt = (p === undefined && children > 1) ||
                      (p !== undefined && low.get(v) >= disc.get(u));

        if (isArt) {
          articulation.add(u);
          snapshot(
            `${label(u)} is an articulation point: this child subtree cannot reach an ancestor of ${label(u)}.`,
            'articulation', u, [u,v],
            `low[${label(v)}] ≥ disc[${label(u)}]  →  articulation point`
          );
        }

        if (low.get(v) >= disc.get(u)) {
          const comp = [];
          let popped = null;
          do {
            popped = edgeStackState.pop();
            if (popped) comp.push(popped);
          } while (popped && key(popped[0], popped[1]) !== key(u,v));

          components.push(comp);
          snapshot(
            `The condition is met, so we pop edges until ${label(u)} — ${label(v)}. Those edges form one biconnected component.`,
            'bcc', u, [u,v],
            `low[${label(v)}] ≥ disc[${label(u)}]  →  pop edge stack → BCC`
          );
        }
      } else if (v !== parent.get(u) && disc.get(v) < disc.get(u)) {
        low.set(u, Math.min(low.get(u), disc.get(v)));
        edgeStackState.push([u,v]);
        snapshot(
          `${label(u)} — ${label(v)} is a back edge to an earlier-discovered vertex. This gives the subtree a way back to disc[${label(v)}].`,
          'back', u, [u,v],
          `low[${label(u)}] = min(low[${label(u)}], disc[${label(v)}]) = ${low.get(u)}`
        );
      }
    }
  }

  const startSelect = $('bccStartVertex');
  const chosenStart = localStorage.getItem('bccStartVertex');
  if (startSelect) {
    startSelect.innerHTML = V.map(v => `<option value="${v.id}">${v.label}</option>`).join('');
    if (chosenStart && byId.has(chosenStart)) startSelect.value = chosenStart;
    else if (V[0]) { startSelect.value = V[0].id; localStorage.setItem('bccStartVertex', V[0].id); }
    startSelect.addEventListener('change', () => { localStorage.setItem('bccStartVertex', startSelect.value); location.reload(); });
  }
  const starts = [...(chosenStart && byId.has(chosenStart) ? [chosenStart] : []), ...V.map(v => v.id).filter(id => id !== chosenStart)];
  for (const id of starts) { if (!disc.has(id)) dfs(id); }

  if (edgeStackState.length) {
    const comp = [];
    while (edgeStackState.length) comp.push(edgeStackState.pop());
    components.push(comp);
    snapshot(
      'DFS is complete. Any remaining edges are popped as the final biconnected component.',
      'bcc', null, null,
      'remaining edge stack → final BCC'
    );
  }

  snapshot(
    `Finished. We found ${components.length} biconnected component${components.length === 1 ? '' : 's'}.`,
    'done'
  );

  let current = 0, timer = null;

  let bccDisplayMode='learning';
  const completeAlgorithmMode = $('completeAlgorithmMode');
  function algorithmSnippet(s){
    const map={
      discover:`1. disc[u] ← low[u] ← ++time\n   where u = ${s.current ? label(s.current) : 'current vertex'}`,
      tree:`2. if v is unvisited:\n      parent[v] ← u\n      push (u,v)\n      DFS(v)`,
      back:`3. else if v is an ancestor:\n      low[u] ← min(low[u], disc[v])\n      push (u,v)`,
      low:`4. after DFS(v):\n      low[u] ← min(low[u], low[v])`,
      return:`4. after DFS(v):\n      low[u] ← min(low[u], low[v])`,
      bridge:`5. if low[v] > disc[u]:\n      edge (u,v) is a bridge`,
      articulation:`6. if low[v] ≥ disc[u]:\n      u is an articulation point`,
      bcc:`6. if low[v] ≥ disc[u]:\n      pop edges until (u,v)\n      → one BCC`,
      done:`7. After DFS:\n   pop any remaining edges\n   → final BCC(s)`
    };
    return map[s.kind] || 'Follow the current algorithm state.';
  }

  const algorithmSteps = [
    ['discover','disc[u] = low[u] = ++time'],
    ['tree','if v is unvisited: push (u,v); DFS(v)'],
    ['back','else if v is an ancestor: low[u] = min(low[u], disc[v])'],
    ['low','after DFS(v): low[u] = min(low[u], low[v])'],
    ['bridge','if low[v] > disc[u]: (u,v) is a bridge'],
    ['articulation','if low[v] >= disc[u]: u separates a child subtree'],
    ['bcc','pop edge stack through (u,v): one BCC'],
    ['done','finish component; clear remaining edge stack']
  ];
  function renderLiveAlgorithm(s) {
    const target = $('liveAlgorithm');
    if (!target) return;
    const active = s.kind === 'return' ? 'low' : s.kind;
    target.innerHTML = algorithmSteps.map(([kind,line],i) =>
      `<div class="algo-line ${kind===active?'active':'muted'}"><span>${String(i+1).padStart(2,'0')}</span> ${escapeHtml(line)}</div>`
    ).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function connectedGroupsWithoutBridges(bridgeKeys) {
    const removed = new Set(bridgeKeys);
    const seen = new Set(), groups = [];
    for (const v of V) {
      if (seen.has(v.id)) continue;
      const group = [], queue = [v.id]; seen.add(v.id);
      while (queue.length) {
        const u = queue.shift(); group.push(u);
        for (const w of (adj.get(u) || [])) {
          if (removed.has(key(u,w)) || seen.has(w)) continue;
          seen.add(w); queue.push(w);
        }
      }
      groups.push(group);
    }
    return groups;
  }

  function render(s) {
    document.body.classList.remove('focus-stack','focus-queue','focus-order','focus-graph','focus-algorithm');
    document.body.classList.add(['tree','back','bcc'].includes(s.kind)?'focus-stack':['discover','low','bridge','articulation','done'].includes(s.kind)?'focus-graph':'focus-algorithm');
    phase.textContent = s.kind.toUpperCase();
    stepLabel.textContent = `Step ${current + 1} of ${steps.length}`;
    title.textContent =
      s.kind === 'discover' ? 'Discovery time assigned' :
      s.kind === 'tree' ? 'DFS tree edge' :
      s.kind === 'back' ? 'Back edge found' :
      s.kind === 'low' ? 'Low value moves upward' :
      s.kind === 'bridge' ? 'Bridge found' :
      s.kind === 'articulation' ? 'Articulation point found' :
      s.kind === 'bcc' ? 'BCC extracted' :
      s.kind === 'done' ? 'BCC decomposition complete' :
      'Returning from subtree';
    description.textContent = s.message;
    formula.textContent = s.formula || '';
    if (causeEffect) {
      const why={
        discover:'Cause: DFS reaches an unvisited vertex. → Effect: it gets the next discovery time, and low starts equal to disc.',
        tree:'Cause: DFS chooses an unvisited neighbour. → Effect: the tree edge is pushed because it may belong to a BCC.',
        back:'Cause: an edge reaches an earlier vertex. → Effect: this subtree has a route upward, so its low value may decrease.',
        low:'Cause: DFS returns from a child. → Effect: the child’s best reachable discovery time is propagated to the parent.',
        return:'Cause: the child has finished. → Effect: the parent keeps the best low value found so far.',
        bridge:'Cause: low[child] > disc[parent]. → Effect: the child subtree cannot reach the parent or any ancestor, so this tree edge is a bridge.',
      articulation:'Cause: low[child] ≥ disc[parent]. → Effect: the child subtree cannot reach an ancestor of the parent, so the parent can separate it.',
        bcc:'Cause: the separation condition is satisfied. → Effect: pop the edge stack until the tree edge; those edges are one BCC.',
        done:'Cause: DFS is complete. → Effect: any remaining stack edges form the final BCC.'
      };
      causeEffect.textContent=why[s.kind]||'Follow the highlighted state to see what caused it and what it causes next.';
    }
    if (bccDisplayMode==='algorithm') {
      description.textContent = 'Here is the exact algorithmic operation represented by this state:';
      formula.textContent = algorithmSnippet(s);
      if (causeEffect) causeEffect.textContent = 'Algorithm clue: use this rule to understand why the state changed, but keep watching the animation for the actual data values.';
    }
    if (bccDisplayMode==='complete') {
      title.textContent = 'Complete BCC algorithm';
      description.textContent = 'This is the entire algorithm in one place. The animation above shows where each line comes alive.';
      formula.innerHTML = `<pre class="complete-algo">DFS(u):
  disc[u] = low[u] = ++time

  for each v adjacent to u:
    if v is unvisited:
      parent[v] = u
      push (u, v) onto edgeStack
      DFS(v)
      low[u] = min(low[u], low[v])

      if low[v] > disc[u]:
        edge (u, v) is a bridge

      if low[v] >= disc[u]:
        u is an articulation point (when u is not the DFS root)
        pop edges until (u, v)
        those popped edges form one BCC

    else if v != parent[u] and disc[v] < disc[u]:
      low[u] = min(low[u], disc[v])
      push (u, v) onto edgeStack

For a DFS root:
  it is an articulation point only if it has more than one DFS child.

After a connected component finishes:
  pop any remaining edges → final BCC.</pre>`;
      if (causeEffect) causeEffect.textContent = 'Read the whole flow first, then return to the step controls to watch each line execute on the graph.';
    }

    const stackPointer = $('edgeStackPointer');
    if (stackPointer) stackPointer.textContent = '';
    const activeEdges = s.stack || [];
    edgeStack.className = 'edge-stack edge-stack-live';
    edgeStack.innerHTML = activeEdges.length ? [...activeEdges].reverse().map((e, index) => {
      const isTop = index === 0;
      return `<div class="edge-stack-row"><div class="edge-stack-item${isTop ? ' is-top' : ''}">${label(e[0])} — ${label(e[1])}</div><span class="edge-row-pointer">${isTop ? '← TOP' : ''}</span></div>`;
    }).join('') : '<span class="muted">Empty</span>';

    bccList.innerHTML = s.components.length
      ? s.components.map((c,i) => `<div class="chip"><b>BCC ${i+1}:</b> ${c.map(e => `${label(e[0])}—${label(e[1])}`).join(', ')}</div>`).join('')
      : '<span class="muted">None yet</span>';

    const articulationList = $('articulationList');
    const articulationCount = $('articulationCount');
    const foundArticulationLabels = [...s.articulation]
      .map(id => label(id))
      .sort((a, b) => a.localeCompare(b));
    if (articulationCount) articulationCount.textContent = `${foundArticulationLabels.length} found`;
    if (articulationList) {
      articulationList.innerHTML = foundArticulationLabels.length
        ? foundArticulationLabels.map(vertexLabel => `<span class="articulation-chip">${vertexLabel}</span>`).join('')
        : `<span class="muted">${s.kind === 'done' ? 'None in this graph' : 'None identified yet'}</span>`;
    }

    const bridgeList = $('bridgeList');
    const bridgeCount = $('bridgeCount');
    const bridgeKeys = [...(s.bridges || [])];
    const bridgeLabels = bridgeKeys.map(k => k.split('|').map(label).join(' — '));
    if (bridgeCount) bridgeCount.textContent = `${bridgeLabels.length} found`;
    if (bridgeList) bridgeList.innerHTML = bridgeLabels.length
      ? bridgeLabels.map(edge => `<span class="bridge-chip">${edge}</span>`).join('')
      : `<span class="muted">${s.kind === 'done' ? 'No bridges in this graph' : 'None identified yet'}</span>`;
    const bridgeSplit = $('bridgeSplit');
    if (bridgeSplit) {
      const groups = connectedGroupsWithoutBridges(bridgeKeys);
      bridgeSplit.innerHTML = bridgeKeys.length
        ? `<div class="split-caption">Graph groups after removing the bridges found so far</div>${groups.map((g,i)=>`<span class="split-group"><b>Group ${i+1}</b> ${g.map(label).join(', ')}</span>`).join('')}`
        : '<span class="muted">As bridges are found, see how the graph separates.</span>';
    }
    const graphLesson = $('graphLesson');
    if (graphLesson) {
      const whyText = causeEffect ? causeEffect.textContent : '';
      graphLesson.innerHTML = `<span class="graph-lesson-kicker">${s.kind === 'bridge' ? 'BRIDGE FOUND' : s.kind === 'bcc' ? 'COMPONENT FOUND' : s.kind === 'articulation' ? 'ARTICULATION POINT' : 'FOLLOW THE GRAPH'}</span><b>${escapeHtml(s.message)}</b><small>${escapeHtml(whyText)}</small><small class="graph-lesson-code">CODE · ${escapeHtml(algorithmSnippet(s).split('\n').join(' · '))}</small>`;
    }

    draw(s);
    renderLiveAlgorithm(s);
    renderTimeline();
    if(bccDisplayMode==='algorithm'){const pre=$('sideAlgorithm');if(pre)pre.textContent=algorithmSnippet(s);}

    $('first').disabled = current === 0;
    $('prev').disabled = current === 0;
    $('next').disabled = current === steps.length-1;
    $('last').disabled = current === steps.length-1;
  }

  function draw(s) {
    canvas.innerHTML = '';

    // Draw edges in an SVG with a 0–100 coordinate system.  This keeps the
    // graph perfectly aligned with the percentage-positioned vertices even
    // when the learning sidebar opens/closes and the canvas width changes.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'bcc-edge-layer');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');

    const labeledComponents = new Set();
    E.forEach(e => {
      const a = byId.get(e.a), b = byId.get(e.b);
      if (!a || !b) return;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', Number(a.x));
      line.setAttribute('y1', Number(a.y));
      line.setAttribute('x2', Number(b.x));
      line.setAttribute('y2', Number(b.y));
      line.setAttribute('class', 'graph-edge');
      const edgeKey = key(e.a,e.b);
      const componentIndex = (s.components || []).findIndex(comp => comp.some(ce => key(ce[0],ce[1]) === edgeKey));
      if (componentIndex >= 0) line.classList.add(`bcc-component-${componentIndex % 6}`);
      if (s.bridges && s.bridges.has(edgeKey)) line.classList.add('bridge-edge');
      if (s.activeEdge && key(...s.activeEdge) === edgeKey) line.classList.add('active');
      if (s.kind === 'back' && s.activeEdge && edgeKey === key(...s.activeEdge)) line.classList.add('back');
      if (s.kind === 'bridge' && s.activeEdge && edgeKey === key(...s.activeEdge)) line.classList.add('bridge-current');
      svg.appendChild(line);
      if (s.bridges && s.bridges.has(edgeKey)) {
        const cut = document.createElementNS('http://www.w3.org/2000/svg','text');
        cut.setAttribute('x',(Number(a.x)+Number(b.x))/2);
        cut.setAttribute('y',(Number(a.y)+Number(b.y))/2 + 2.2);
        cut.setAttribute('class','bridge-cut-mark');
        cut.textContent='×';
        svg.appendChild(cut);
      }
      if (componentIndex >= 0 && !labeledComponents.has(componentIndex)) {
        labeledComponents.add(componentIndex);
        const text = document.createElementNS('http://www.w3.org/2000/svg','text');
        text.setAttribute('x',(Number(a.x)+Number(b.x))/2);
        text.setAttribute('y',(Number(a.y)+Number(b.y))/2 - 1.5);
        text.setAttribute('class','bcc-edge-label');
        text.textContent=`BCC ${componentIndex+1}`;
        svg.appendChild(text);
      }
    });
    canvas.appendChild(svg);

    const bridgeGroups = connectedGroupsWithoutBridges([...(s.bridges || [])]);
    const bridgeGroupOf = new Map();
    bridgeGroups.forEach((group,index)=>group.forEach(id=>bridgeGroupOf.set(id,index)));
    const bccMembership = new Map();
    (s.components || []).forEach((component,index)=>component.forEach(edge=>edge.forEach(id=>{
      if(!bccMembership.has(id)) bccMembership.set(id,[]);
      if(!bccMembership.get(id).includes(index)) bccMembership.get(id).push(index);
    })));
    V.forEach(v => {
      const el = document.createElement('div');
      el.className = 'vertex';
      if ((s.bridges || new Set()).size) el.classList.add(`bridge-group-${(bridgeGroupOf.get(v.id) || 0) % 6}`);
      if (s.disc.has(v.id)) el.classList.add('visited');
      if (s.current === v.id) el.classList.add('current');
      if (s.articulation.has(v.id)) el.classList.add('articulation');
      const memberships=bccMembership.get(v.id)||[];
      if(memberships.length===1) el.classList.add(`bcc-vertex-${memberships[0] % 6}`);
      if(memberships.length>1) el.classList.add('bcc-shared-vertex');
      el.textContent = v.label;
      el.style.left = `${v.x}%`;
      el.style.top = `${v.y}%`;
      canvas.appendChild(el);
      const values = document.createElement('div');
      values.className = 'bcc-node-values';
      values.style.left = `${v.x}%`;
      values.style.top = `calc(${v.y}% + 27px)`;
      const d = s.disc.get(v.id), l = s.low.get(v.id);
      values.textContent = d == null ? 'disc — · low —' : `disc ${d} · low ${l == null ? '—' : l}`;
      canvas.appendChild(values);
    });
  }

  function renderTimeline() {
    $('timeline').innerHTML =
      `<div class="timeline-track">${
        steps.map((_,i)=>`<div class="tick ${i<current?'done ':''}${i===current?'current':''}" data-i="${i}"></div>`).join('')
      }</div>`;
    $('timeline').querySelectorAll('.tick').forEach(t => t.onclick=()=>go(Number(t.dataset.i)));
  }

  function go(n) {
    stop();
    current = Math.max(0, Math.min(steps.length-1, n));
    render(steps[current]);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer=null; }
    $('play').textContent='▶ Play';
    const lessonButton=$('startLesson'); if(lessonButton) lessonButton.textContent='▶ Start learning';
  }

  function getDelay() {
    return Number(speed.value);
  }

  function updateSpeedLabel() {
    speedValue.textContent = `${(getDelay()/1000).toFixed(2)}s/step`;
  }

  function play() {
    if (timer) { stop(); return; }
    $('play').textContent='⏸ Pause';
    if(startLessonButton) startLessonButton.textContent='⏸ Lesson playing';
    timer = setInterval(()=>{
      if (current >= steps.length-1) { stop(); return; }
      current++;
      render(steps[current]);
    }, getDelay());
  }

  $('first').onclick=()=>go(0);
  $('prev').onclick=()=>go(current-1);
  $('next').onclick=()=>go(current+1);
  $('last').onclick=()=>go(steps.length-1);
  $('play').onclick=play;
  const startLessonButton=$('startLesson');
  if(startLessonButton) startLessonButton.onclick=()=>{ stop(); current=0; render(steps[current]); play(); };
  $('play').addEventListener('click',()=>{ if(startLessonButton) startLessonButton.textContent=timer?'⏸ Lesson playing':'▶ Start learning'; });
  speed.oninput=()=>{
    updateSpeedLabel();
    if (timer) { stop(); play(); }
  };
  $('back').onclick=()=>{ stop(); location.href='index.html'; };
  $('dfsFromBcc').onclick=()=>{ stop(); location.href='dfs.html'; };
  window.onresize=()=>{ render(steps[current]); };

  const learningMode=$('learningMode'), algorithmMode=$('algorithmMode');
  function setBccMode(m){
    bccDisplayMode=m;
    if(learningMode) learningMode.classList.toggle('active',m==='learning');
    if(algorithmMode) algorithmMode.classList.toggle('active',m==='algorithm');
    if(completeAlgorithmMode) completeAlgorithmMode.classList.toggle('active',m==='complete');
    render(steps[current]);
    const sideMode=m==='learning'?'intuition':m;
    document.querySelectorAll('[data-learn]').forEach(b=>b.classList.toggle('active',b.dataset.learn===sideMode));
    syncSidePanel(sideMode);
  }
  if(learningMode) learningMode.onclick=()=>setBccMode('learning');
  if(algorithmMode) algorithmMode.onclick=()=>setBccMode('algorithm');
  if(completeAlgorithmMode) completeAlgorithmMode.onclick=()=>setBccMode('complete');

  updateSpeedLabel();
  render(steps[0]);

  const sidebar=$('learningSidebar'), toggle=$('learningToggle'), content=$('learningContent');
  const guide={
    intuition:`<h3> Intuition</h3><p>This panel explains <b>why</b> the current state matters.</p><div class="guide-tip">Check the highlighted vertex or edge. Identify the value that changed and how it affects the BCC test.</div>`,
    algorithm:`<h3> Step Algorithm</h3><p>This is the small algorithm rule represented by the current animation state.</p><pre id="sideAlgorithm">Choose a step to see its rule.</pre>`,
    complete:`<h3> Complete Algorithm</h3><p>This panel is scrollable. Read the whole algorithm here, then use the animation to see each part happen.</p><pre>DFS(u):
  disc[u] = low[u] = ++time

  for each v adjacent to u:
    if v is unvisited:
      parent[v] = u
      push (u, v) onto edgeStack
      DFS(v)
      low[u] = min(low[u], low[v])

      if low[v] >= disc[u]:
        if u is not the DFS root:
          u is an articulation point
        pop edges until (u, v)
        popped edges form one BCC

    else if v != parent[u] and disc[v] < disc[u]:
      low[u] = min(low[u], disc[v])
      push (u, v) onto edgeStack

For a DFS root:
  it is an articulation point only if
  it has more than one DFS child.

After a connected component finishes:
  pop remaining edges → final BCC.</pre>`,
    variables:`<h3> Variables</h3><p><code>disc[u]</code> — when DFS first discovers <b>u</b>.</p><p><code>low[u]</code> — the earliest discovery time reachable from <b>u</b>'s subtree.</p><p><code>parent[u]</code> — the vertex that discovered <b>u</b>.</p><p><code>edgeStack</code> — edges waiting to be grouped into a BCC.</p><p><code>time</code> — counter used to create discovery numbers.</p>`
  };
  function syncSidePanel(kind){
    if(!content)return;
    content.innerHTML=guide[kind]||guide.intuition;
    if(kind==='algorithm'){const pre=$('sideAlgorithm');if(pre)pre.textContent=algorithmSnippet(steps[current]);}
  }
  if(toggle) toggle.onclick=()=>sidebar.classList.toggle('open');
  document.querySelectorAll('[data-learn]').forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll('[data-learn]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const mode=btn.dataset.learn;
    if(mode==='intuition')setBccMode('learning');
    else if(mode==='algorithm')setBccMode('algorithm');
    else if(mode==='complete')setBccMode('complete');
    syncSidePanel(mode);
    sidebar.classList.add('open');
  });
  syncSidePanel('intuition');

  document.querySelectorAll('.app-tab').forEach(tab=>{
    tab.onclick=()=>{
      document.querySelectorAll('.app-tab').forEach(t=>t.classList.toggle('active',t===tab));
      document.querySelectorAll('.page-section').forEach(sec=>sec.classList.toggle('active-section',sec.id===tab.dataset.section));
      document.body.style.height='auto';
      document.body.style.overflow='auto';
    };
  });

  // Deep-link from the homepage and traversal screens directly into the guided lesson.
  if (location.hash === '#learn-disc-low' || location.hash === '#theorySection') {
    const theoryTab = document.querySelector('.app-tab[data-section="theorySection"]');
    if (theoryTab) {
      theoryTab.click();
      requestAnimationFrame(() => document.getElementById('guidedLessonTitle')?.scrollIntoView({block:'start'}));
    }
  }

  // ==================== TRY YOURSELF PRACTICE LAB ====================
  const practicePanel = $('practicePanel');
  const practiceLearning = $('practiceLearning');
  const practiceAlgorithm = $('practiceAlgorithm');
  const practiceModes = document.querySelectorAll('[data-practice-mode]');
  let practiceMode = 'easy';
  let practiceDisplay = 'learning';

  // The Practice Lab deliberately uses a DIFFERENT graph from Explore.
  // This keeps practice a genuine self-test instead of letting the learner
  // simply repeat the graph they just built/observed.
  let PRACTICE_V = [
    {id:'pA',label:'A',x:18,y:42},
    {id:'pB',label:'B',x:38,y:22},
    {id:'pC',label:'C',x:62,y:42},
    {id:'pD',label:'D',x:62,y:72},
    {id:'pE',label:'E',x:38,y:88},
    {id:'pF',label:'F',x:18,y:70}
  ];
  let PRACTICE_E = [
    {a:'pA',b:'pB'}, {a:'pB',b:'pC'}, {a:'pC',b:'pA'},
    {a:'pC',b:'pD'}, {a:'pD',b:'pE'}, {a:'pE',b:'pC'},
    {a:'pE',b:'pF'}
  ];
  let practiceById, practiceAdj;
  function rebuildPracticeGraph(){
    practiceById = new Map(PRACTICE_V.map(v=>[v.id,v]));
    practiceAdj = new Map(PRACTICE_V.map(v=>[v.id,[]]));
    PRACTICE_E.forEach(e=>{practiceAdj.get(e.a).push(e.b);practiceAdj.get(e.b).push(e.a)});
    for(const list of practiceAdj.values()) list.sort((a,b)=>practiceById.get(a).label.localeCompare(practiceById.get(b).label));
  }
  const practiceGraphs = {
    joined: {V:PRACTICE_V,E:PRACTICE_E},
    chain: {V:[{id:'qA',label:'A',x:12,y:50},{id:'qB',label:'B',x:31,y:50},{id:'qC',label:'C',x:50,y:50},{id:'qD',label:'D',x:69,y:50},{id:'qE',label:'E',x:88,y:50}],E:[{a:'qA',b:'qB'},{a:'qB',b:'qC'},{a:'qC',b:'qD'},{a:'qD',b:'qE'}]},
    blocks: {V:[{id:'rA',label:'A',x:14,y:50},{id:'rB',label:'B',x:30,y:25},{id:'rC',label:'C',x:30,y:75},{id:'rD',label:'D',x:55,y:50},{id:'rE',label:'E',x:78,y:25},{id:'rF',label:'F',x:78,y:75}],E:[{a:'rA',b:'rB'},{a:'rB',b:'rC'},{a:'rC',b:'rA'},{a:'rC',b:'rD'},{a:'rD',b:'rE'},{a:'rE',b:'rF'},{a:'rF',b:'rD'}]},
    hub: {V:[{id:'sA',label:'A',x:15,y:50},{id:'sB',label:'B',x:38,y:20},{id:'sC',label:'C',x:38,y:80},{id:'sD',label:'D',x:65,y:20},{id:'sE',label:'E',x:65,y:80},{id:'sF',label:'F',x:88,y:50}],E:[{a:'sA',b:'sB'},{a:'sA',b:'sC'},{a:'sB',b:'sC'},{a:'sB',b:'sD'},{a:'sC',b:'sE'},{a:'sD',b:'sE'},{a:'sD',b:'sF'},{a:'sE',b:'sF'}]}
  };
  rebuildPracticeGraph();

  function calculatePracticeAnswer(startId = (localStorage.getItem('bccPracticeStart') || 'pA')){
    const discP=new Map(), lowP=new Map(), parentP=new Map();
    const stackP=[], compsP=[], artsP=new Set();
    let timeP=0;
    const pKey=(a,b)=>{const la=practiceById.get(a).label,lb=practiceById.get(b).label;return la<lb?`${la}|${lb}`:`${lb}|${la}`;};
    function visit(u){
      discP.set(u,++timeP); lowP.set(u,timeP);
      let children=0;
      for(const v of practiceAdj.get(u)){
        if(!discP.has(v)){
          children++; parentP.set(v,u); stackP.push([u,v]); visit(v);
          lowP.set(u,Math.min(lowP.get(u),lowP.get(v)));
          const parent=parentP.get(u);
          if((parent===undefined && children>1) || (parent!==undefined && lowP.get(v)>=discP.get(u))) artsP.add(u);
          if(lowP.get(v)>=discP.get(u)){
            const comp=[]; let edge;
            do{edge=stackP.pop(); if(edge) comp.push(edge);}while(edge && pKey(edge[0],edge[1])!==pKey(u,v));
            compsP.push(comp);
          }
        } else if(v!==parentP.get(u) && discP.get(v)<discP.get(u)){
          lowP.set(u,Math.min(lowP.get(u),discP.get(v)));
          stackP.push([u,v]);
        }
      }
    }
    const practiceStarts=[...(practiceById.has(startId)?[startId]:[]), ...PRACTICE_V.map(v=>v.id).filter(id=>id!==startId)];
    for(const id of practiceStarts) if(!discP.has(id)) visit(id);
    if(stackP.length){const comp=[];while(stackP.length)comp.push(stackP.pop());compsP.push(comp);}
    const order=[...discP.entries()].sort((a,b)=>a[1]-b[1]).map(([id])=>id);
    const discs=Object.fromEntries(PRACTICE_V.map(v=>[v.id,discP.get(v.id)]));
    const lows=Object.fromEntries(PRACTICE_V.map(v=>[v.id,lowP.get(v.id)]));
    const arts=[...artsP].sort((a,b)=>practiceById.get(a).label.localeCompare(practiceById.get(b).label)).map(id=>practiceById.get(id).label);
    const bccs=compsP.map(comp=>comp.map(e=>pKey(e[0],e[1])).sort()).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return {order,discs,lows,arts,bccs};
  }

  const initialPracticeGraph=practiceGraphs[localStorage.getItem('bccPracticeGraph') || 'joined'] || practiceGraphs.joined;
  PRACTICE_V=initialPracticeGraph.V; PRACTICE_E=initialPracticeGraph.E; rebuildPracticeGraph();
  if(!practiceById.has(localStorage.getItem('bccPracticeStart'))) localStorage.setItem('bccPracticeStart',PRACTICE_V[0].id);
  let practiceAnswer=calculatePracticeAnswer(localStorage.getItem('bccPracticeStart'));

  function expectedPractice() { return practiceAnswer; }

  function normalizeOrder(value){
    return value.toUpperCase().replace(/→/g,' ').replace(/->/g,' ').replace(/,/g,' ').trim().split(/\s+/).filter(Boolean);
  }
  function normalizeArts(value){
    return value.toUpperCase().replace(/,/g,' ').replace(/→/g,' ').trim().split(/\s+/).filter(Boolean).sort();
  }
  function parseBccs(value){
    // Accept the formats shown to learners: AB, A-B, or A–B.
    // Internally, every undirected edge is canonicalised as A|B.
    return value.toUpperCase().split('|').map(group=>group.trim()).filter(Boolean).map(group=>
      group.split(/[,\s]+/).filter(Boolean).map(edge=>{
        const hyphenated=edge.match(/^([A-Z])[-–—]([A-Z])$/);
        const compact=edge.match(/^([A-Z])([A-Z])$/);
        const match=hyphenated || compact;
        return match ? [match[1],match[2]].sort().join('|') : edge;
      }).sort()
    ).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  function same(a,b){ return JSON.stringify(a)===JSON.stringify(b); }

  function practiceHelp(kind){
    const intuition={
      easy:'No answers are required here. Reveal the solution to see the a valid DFS order, discovery/low values, articulation points, and edge groups. Use this once before attempting the graded levels.',
      learner:'Enter any valid DFS first-visit order for this graph, beginning at your selected start vertex. Neighbours may be explored in any order; the checker verifies whether your sequence can be produced by a genuine depth-first traversal.',
      intermediate:'Enter any valid DFS order for the selected start vertex, then fill in disc[u] (first-visit time) and low[u] (earliest discovery time reachable from that subtree through tree/back edges). Your discovery and low values are checked against the DFS tree implied by your order.',
      strict:'Complete every field: DFS order, all disc[] and low[] values, articulation points, and the biconnected components as edge groups. Enter edges as AB or A-B; separate different components with |. Edge order and direction do not matter.'
    };
    const algorithm={
      easy:'DFS(u): disc[u] = low[u] = ++time; inspect each neighbour; after DFS(v), low[u] = min(low[u], low[v]); if low[v] >= disc[u], pop the edge stack for one BCC.',
      learner:'Algorithm clue: the next newly discovered vertex must be adjacent to the current DFS path. Backtrack only when the current branch has no unvisited neighbour.',
      intermediate:'Algorithm clue: disc[u] = ++time; low[u] starts as disc[u]; tree edge → DFS child → low[u] = min(low[u], low[v]); back edge → low[u] = min(low[u], disc[v]).',
      strict:'Algorithm clue: use low[v] >= disc[u] to detect the separation boundary, then pop edges until the tree edge (u,v) to obtain the BCC.'
    };
    return practiceDisplay==='learning' ? intuition[kind] : algorithm[kind];
  }

  function renderPractice(){
    if(!practicePanel) return;
    const exp=expectedPractice();
    const orderLabels=practiceAnswer.order.map(id=>practiceById.get(id).label);
    const practiceStart=localStorage.getItem('bccPracticeStart') || PRACTICE_V[0].id;
    const challengeHeader=`<div class="practice-challenge"><div class="challenge-graph"><div class="challenge-title">Challenge graph · provided for you</div><label>Graph set <select id="practiceGraphSet"><option value="joined" ${localStorage.getItem('bccPracticeGraph')==='joined'?'selected':''}>Joined cycles</option><option value="chain" ${localStorage.getItem('bccPracticeGraph')==='chain'?'selected':''}>Chain · bridge edges</option><option value="blocks" ${localStorage.getItem('bccPracticeGraph')==='blocks'?'selected':''}>Two blocks + connector</option><option value="hub" ${localStorage.getItem('bccPracticeGraph')==='hub'?'selected':''}>Two routes + hub</option></select></label><label class="start-picker">Start vertex <select id="practiceStartVertex">${PRACTICE_V.map(v=>`<option value="${v.id}" ${v.id===practiceStart?'selected':''}>${v.label}</option>`).join('')}</select></label><div class="challenge-mini" id="practiceMini"></div><small>${PRACTICE_V.length} vertices · ${PRACTICE_E.length} edges · different from your Explore graph</small><div class="challenge-tip"><b>Traversal rule:</b> start at your selected vertex. Choose neighbours in any order, but finish each DFS branch before returning to an earlier vertex.</div></div>`;
    if(practiceMode==='easy'){
      practicePanel.innerHTML=`${challengeHeader}<div class="challenge-form"><div class="practice-intro"><h3>Worked example</h3><p>${practiceHelp('easy')}</p><div class="practice-algo-note">${practiceDisplay==='learning' ? ' You can inspect the supplied challenge graph first. In this mode the website will show you the reasoning rather than asking you to enter answers.' : ' '+practiceHelp('easy')}</div></div><button id="practiceRevealEasy" class="practice-primary">▶ Show the guided solution</button><div id="practiceEasyResult" class="practice-result"></div></div></div>`;
      $('practiceRevealEasy').onclick=()=>{
        const discText=PRACTICE_V.map(v=>`${v.label}=${practiceAnswer.discs[v.id]}`).join(', ');
        const lowText=PRACTICE_V.map(v=>`${v.label}=${practiceAnswer.lows[v.id]}`).join(', ');
        const bccText=practiceAnswer.bccs.map(c=>c.map(edge=>edge.split('|').join('')).join(', ')).join(' | ');
        const text=practiceDisplay==='learning'
          ? `<b>Guided solution:</b><p>DFS first visits ${orderLabels.join(' → ')}. Discovery times: ${discText}. Low values: ${lowText}.</p><p><b>Articulation points:</b> ${practiceAnswer.arts.join(', ') || 'None'}. These are vertices whose removal increases the number of connected components.</p><p><b>BCC edge groups:</b> ${bccText}. A single bridge edge can form a one-edge BCC.</p>`
          : `<b>Algorithm view:</b><p>disc: ${discText}. low: ${lowText}.</p><p>Articulation points: ${practiceAnswer.arts.join(', ') || 'None'}. Applying low[child] ≥ disc[parent] and the special DFS-root rule gives the articulation points; popping the edge stack gives ${bccText}.</p>`;
        $('practiceEasyResult').className='practice-result reveal';$('practiceEasyResult').innerHTML=text;
      };
      drawPracticeMini();
      $('practiceGraphSet').onchange=()=>{const g=practiceGraphs[$('practiceGraphSet').value];PRACTICE_V=g.V;PRACTICE_E=g.E;rebuildPracticeGraph();localStorage.setItem('bccPracticeGraph',$('practiceGraphSet').value);localStorage.setItem('bccPracticeStart',PRACTICE_V[0].id);practiceAnswer=calculatePracticeAnswer(PRACTICE_V[0].id);renderPractice();};
      $('practiceStartVertex').onchange=()=>{localStorage.setItem('bccPracticeStart',$('practiceStartVertex').value);practiceAnswer=calculatePracticeAnswer($('practiceStartVertex').value);renderPractice();};
      return;
    }

    let html=`${challengeHeader}<div class="challenge-form"><div class="practice-intro"><h3>${practiceMode==='learner'?'DFS order practice':practiceMode==='intermediate'?'Discovery + low-value practice':'Full BCC challenge'}</h3><p>${practiceHelp(practiceMode)}</p></div>`;
    html+=`<label>DFS traversal order <span>${practiceDisplay==='learning' ? 'Intuition hint: follow one path deeply before backing up.' : 'Algorithm clue: visit each unvisited vertex and record first-visit order.'} Example format: A → B → C</span><input id="pOrder" placeholder="A → B → C → D → E → F"></label>`;
    if(practiceMode==='intermediate'||practiceMode==='strict'){
      html+=`<div class="practice-note">${practiceDisplay==='learning' ? '<b>Intuition:</b> disc is when DFS first arrives; low is how far upward the subtree can reach.' : '<b>Algorithm:</b> start low[u] = disc[u], then update from child low values and back-edge discovery times.'}</div><div class="practice-table"><div class="table-head"><b>Vertex</b><b>disc[]</b><b>low[]</b></div>`;
      PRACTICE_V.forEach(v=>html+=`<div class="table-row"><b>${v.label}</b><input inputmode="numeric" id="disc-${v.id}" placeholder="—"><input inputmode="numeric" id="low-${v.id}" placeholder="—"></div>`);
      html+=`</div>`;
    }
    if(practiceMode==='strict'){
      html+=`<label>Articulation points <span>${practiceDisplay==='learning' ? 'Intuition: which vertex can separate a child subtree?' : 'Algorithm: check low[child] ≥ disc[parent].'} Separate labels with commas</span><input id="pArts" placeholder="A, D"></label>`;
      html+=`<label>Biconnected components <span>${practiceDisplay==='learning' ? 'Intuition: which edges come out together when a boundary is reached?' : 'Algorithm: pop until the corresponding tree edge.'} Enter edge pairs as AB or A-B; separate components with |.</span><input id="pBcc" placeholder="AB, BC, CA | CD, DE, EC | EF"></label>`;
    }
    html+=`<div class="practice-actions"><button id="gradePractice" class="practice-primary"> Check my work</button></div><div id="practiceResult" class="practice-result"></div></div></div>`;
    practicePanel.innerHTML=html;
    drawPracticeMini();
    $('practiceGraphSet').onchange=()=>{const g=practiceGraphs[$('practiceGraphSet').value];PRACTICE_V=g.V;PRACTICE_E=g.E;rebuildPracticeGraph();localStorage.setItem('bccPracticeGraph',$('practiceGraphSet').value);localStorage.setItem('bccPracticeStart',PRACTICE_V[0].id);practiceAnswer=calculatePracticeAnswer(PRACTICE_V[0].id);renderPractice();};
    $('practiceStartVertex').onchange=()=>{localStorage.setItem('bccPracticeStart',$('practiceStartVertex').value);practiceAnswer=calculatePracticeAnswer($('practiceStartVertex').value);renderPractice();};
    $('gradePractice').onclick=gradePractice;
  }

  function drawPracticeMini(){
    const box=$('practiceMini'); if(!box)return; box.innerHTML='';
    const w=box.clientWidth||300,h=box.clientHeight||150;
    PRACTICE_E.forEach(e=>{const a=practiceById.get(e.a),b=practiceById.get(e.b);if(!a||!b)return;const el=document.createElement('div');el.className='practice-edge';const ax=a.x/100*w,ay=a.y/100*h,bx=b.x/100*w,by=b.y/100*h,dx=bx-ax,dy=by-ay;el.style.left=ax+'px';el.style.top=ay+'px';el.style.width=Math.hypot(dx,dy)+'px';el.style.transform=`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`;box.appendChild(el)});
    PRACTICE_V.forEach(v=>{const el=document.createElement('div');el.className='practice-node';el.textContent=v.label;el.style.left=v.x+'%';el.style.top=v.y+'%';box.appendChild(el)});
  }

  function practiceFeedback(kind, vertexLabel, expectedValue){
    const intuition={
      order:`Start at the selected vertex. DFS follows one unvisited neighbour as deeply as possible before it backs up. You may choose neighbours in any order; only the depth-first rule matters.`,
      disc:`Discovery time is simply the number DFS gives a vertex when it first visits it. Trace the first-visit order and count from 1.`,
      low:`Start with low[u] = disc[u]. Then look for a child subtree or a back edge that can reach an earlier discovery time. The smallest reachable discovery time is low[u].`,
      arts:`Look for a DFS child whose subtree cannot reach above its parent. The boundary appears when low[child] >= disc[parent].`,
      bcc:`Follow the edge stack. When low[child] >= disc[parent], pop edges until that tree edge is removed. Everything popped together is one BCC.`
    };
    const algorithm={
      order:`Algorithm clue: choose an unvisited start vertex, mark it visited, then recursively visit each unvisited neighbour. Record the first-visit order.`,
      disc:`Algorithm clue: when DFS first discovers u, execute disc[u] = ++time.`,
      low:`Algorithm clue: initialise low[u] = disc[u]. For a tree edge use low[u] = min(low[u], low[v]); for a back edge use low[u] = min(low[u], disc[v]).`,
      arts:`Algorithm clue: for a non-root parent u, u is an articulation point when low[v] >= disc[u] for a DFS child v. The root uses the special two-children rule.`,
      bcc:`Algorithm clue: when low[v] >= disc[u], pop the edge stack until (u,v). The popped edges form one biconnected component.`
    };
    return (practiceDisplay==='learning'?intuition:algorithm)[kind] || '';
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function gradePractice(){
    const order=normalizeOrder($('pOrder')?.value||'');
    const labels=PRACTICE_V.map(v=>v.label.toUpperCase());
    const startLabel=(practiceById.get(localStorage.getItem('bccPracticeStart') || PRACTICE_V[0].id)?.label || PRACTICE_V[0].label).toUpperCase();
    const uniqueOrder=order.length===labels.length && new Set(order).size===labels.length && labels.every(x=>order.includes(x));
    let exp=expectedPractice(), validDfs=false;
    if(uniqueOrder && order[0]===startLabel){
      const rank=new Map(order.map((label,i)=>[PRACTICE_V.find(v=>v.label.toUpperCase()===label)?.id,i]));
      for(const list of practiceAdj.values()) list.sort((a,b)=>(rank.get(a)??999)-(rank.get(b)??999));
      const candidate=calculatePracticeAnswer(localStorage.getItem('bccPracticeStart'));
      validDfs=candidate.order.map(id=>practiceById.get(id).label.toUpperCase()).join('|')===order.join('|');
      if(validDfs) exp=candidate;
      for(const list of practiceAdj.values()) list.sort((a,b)=>practiceById.get(a).label.localeCompare(practiceById.get(b).label));
    }
    const checks=[];
    const expectedOrder=exp.order.map(id=>practiceById.get(id)?.label ?? '?');
    checks.push({
      key:'order', title:'DFS traversal order', user:order.length?order.join(' → '):'No answer entered', expected:validDfs?order.join(' → '):expectedOrder.join(' → '),
      correct:validDfs, hint:practiceFeedback('order')+' Check that each new vertex is adjacent to the active DFS path and that a branch is completed before backtracking.',
      explanation:validDfs?`Your order is a valid DFS traversal. The DFS tree and low-link values are calculated from this exact order.`:`A valid DFS order must start at ${escapeHtml(startLabel)} and follow a depth-first path. Your sequence either repeats/omits a vertex or cannot be produced by DFS on these edges. One valid order is <b>${escapeHtml(expectedOrder.join(' → '))}</b>.`
    });

    if(practiceMode==='intermediate'||practiceMode==='strict'){
      PRACTICE_V.forEach(v=>{
        const d=Number($(`disc-${v.id}`)?.value); const l=Number($(`low-${v.id}`)?.value);
        const dUser=Number.isFinite(d)&&$('disc-'+v.id)?.value.trim()!==''?String(d):'No answer entered';
        const lUser=Number.isFinite(l)&&$('low-'+v.id)?.value.trim()!==''?String(l):'No answer entered';
        checks.push({
          key:`disc-${v.id}`, title:`disc[${v.label}]`, user:dUser, expected:String(exp.discs[v.id]), correct:d===exp.discs[v.id],
          hint:practiceFeedback('disc',v.label,exp.discs[v.id]),
          explanation:`<b>disc[${v.label}] = ${exp.discs[v.id]}</b> because DFS first reaches ${v.label} as the ${exp.discs[v.id]}${exp.discs[v.id]===1?'st':exp.discs[v.id]===2?'nd':exp.discs[v.id]===3?'rd':'th'} discovered vertex.`
        });
        checks.push({
          key:`low-${v.id}`, title:`low[${v.label}]`, user:lUser, expected:String(exp.lows[v.id]), correct:l===exp.lows[v.id],
          hint:practiceFeedback('low',v.label,exp.lows[v.id]),
          explanation:`<b>low[${v.label}] = ${exp.lows[v.id]}</b>. It is the earliest discovery time reachable from ${v.label}'s subtree using the DFS tree and available back edges.`
        });
      });
    }

    if(practiceMode==='strict'){
      const arts=normalizeArts($('pArts')?.value||'');
      const bcc=parseBccs($('pBcc')?.value||'');
      checks.push({
        key:'arts', title:'Articulation points', user:arts.length?arts.join(', '):'No answer entered', expected:exp.arts.length?exp.arts.join(', '):'None', correct:same(arts,exp.arts),
        hint:practiceFeedback('arts'),
        explanation:`The articulation points are <b>${escapeHtml(exp.arts.join(', ')||'none')}</b>. These are the vertices where the DFS low-value condition identifies a separation boundary.`
      });
      const bccAnswer=exp.bccs.map(c=>c.map(e=>e.replace('|','')).join(', ')).join(' | ');
      checks.push({
        key:'bcc', title:'Biconnected components', user:bcc.length?bcc.map(c=>c.map(e=>e.replace('|','')).join(', ')).join(' | '):'No answer entered', expected:bccAnswer, correct:same(bcc,exp.bccs),
        hint:practiceFeedback('bcc'),
        explanation:`The edge groups are <b>${escapeHtml(bccAnswer)}</b>. Each group is the set of edges popped together when a separation boundary is reached.`
      });
    }

    const totalChecks=checks.length;
    const correctChecks=checks.filter(c=>c.correct).length;
    const percent=Math.round(correctChecks/totalChecks*100);
    const result=$('practiceResult');
    if(!result)return;

    if(correctChecks===totalChecks){
      result.className='practice-result success';
      result.innerHTML=`<div class="practice-score"><b> ${percent}% — Excellent!</b><span>${correctChecks} / ${totalChecks} checkpoints solved independently.</span></div><p>You have completed this mode. Try the next mode when you are ready for a stricter test.</p>`;
      return;
    }

    const review=checks.map((c,i)=>{
      if(c.correct){
        return `<div class="practice-review-item correct"><div class="review-main"><span class="review-icon"></span><div><b>${escapeHtml(c.title)}</b><small>Your answer: ${escapeHtml(c.user)} · Correct</small></div></div></div>`;
      }
      return `<div class="practice-review-item wrong" data-review="${i}">
        <div class="review-main"><span class="review-icon">!</span><div><b>${escapeHtml(c.title)}</b><small>Your answer: ${escapeHtml(c.user)}</small></div></div>
        <div class="review-actions"><button type="button" class="review-hint" data-review-hint="${i}"> Hint</button><button type="button" class="review-reveal" data-review-reveal="${i}">Reveal answer</button></div>
        <div class="review-detail hidden" id="review-detail-${i}"></div>
      </div>`;
    }).join('');

    result.className='practice-result error';
    result.innerHTML=`<div class="practice-score"><b>${percent}% — Let's work through this.</b><span>${correctChecks} / ${totalChecks} checkpoints solved independently · ${totalChecks-correctChecks} need review.</span></div><p>Use Hint to work through each checkpoint. Reveal the answer when you are ready to compare your reasoning.</p><div class="practice-review-list">${review}</div>`;

    result.querySelectorAll('[data-review-hint]').forEach(btn=>btn.onclick=()=>{
      const i=Number(btn.dataset.reviewHint), c=checks[i], box=$(`review-detail-${i}`);
      box.className='review-detail';
      box.innerHTML=`<span class="detail-label"> HINT</span>${escapeHtml(c.hint)}`;
      btn.classList.add('used');
    });
    result.querySelectorAll('[data-review-reveal]').forEach(btn=>btn.onclick=()=>{
      const i=Number(btn.dataset.reviewReveal), c=checks[i], box=$(`review-detail-${i}`);
      box.className='review-detail answer';
      box.innerHTML=`<span class="detail-label"> ANSWER + WHY</span>${c.explanation}<div class="revealed-value">Correct answer: <b>${escapeHtml(c.expected)}</b></div>`;
      btn.textContent='Answer revealed';
      btn.disabled=true;
    });
  }

  function revealPractice(exp){
    if(practiceMode==='easy') return;
    $('pOrder').value=exp.order.map(id=>practiceById.get(id)?.label ?? '?').join(' → ');
    if(practiceMode==='intermediate'||practiceMode==='strict') PRACTICE_V.forEach(v=>{$(`disc-${v.id}`).value=exp.discs[v.id];$(`low-${v.id}`).value=exp.lows[v.id];});
    if(practiceMode==='strict'){$('pArts').value=exp.arts.join(', ');$('pBcc').value=exp.bccs.map(c=>c.map(e=>e.replace('|','')).join(',')).join(' | ');}
    $('practiceResult').className='practice-result reveal';$('practiceResult').innerHTML='<b>Answer revealed.</b> Now change one value and use Check my work to see exactly what the grader catches.';
  }

  practiceModes.forEach(btn=>btn.onclick=()=>{practiceMode=btn.dataset.practiceMode;practiceModes.forEach(b=>b.classList.toggle('active',b===btn));renderPractice();});
  if(practiceLearning) practiceLearning.onclick=()=>{practiceDisplay='learning';practiceLearning.classList.add('active');practiceAlgorithm?.classList.remove('active');renderPractice();};
  if(practiceAlgorithm) practiceAlgorithm.onclick=()=>{practiceDisplay='algorithm';practiceAlgorithm.classList.add('active');practiceLearning?.classList.remove('active');renderPractice();};
  renderPractice();
})();