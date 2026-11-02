
const canvas = document.getElementById('canvas');
const raw = localStorage.getItem('bccGraph');

if (!raw) {
  window.location.href = 'index.html';
} else {
  const data = JSON.parse(raw);
  const V = Array.isArray(data.V) ? data.V : [];
  const E = Array.isArray(data.E) ? data.E : [];

  if (!V.length) {
    window.location.href = 'index.html';
  } else {
    const vById = new Map(V.map(v => [v.id, v]));
    const adj = new Map(V.map(v => [v.id, []]));

    E.forEach(e => {
      if (adj.has(e.a) && adj.has(e.b)) {
        adj.get(e.a).push(e.b);
        adj.get(e.b).push(e.a);
      }
    });

    for (const list of adj.values()) {
      list.sort((a,b) => String(vById.get(a).label).localeCompare(String(vById.get(b).label)));
    }

    const els = {
      step: document.getElementById('stepLabel'),
      status: document.getElementById('status'),
      phase: document.getElementById('phase'),
      title: document.getElementById('title'),
      desc: document.getElementById('description'),
      algo: document.getElementById('algoBox'),
      speedValue: document.getElementById('speedValue'),
      stack: document.getElementById('stack'),
      stackCount: document.getElementById('stackCount'),
      order: document.getElementById('order'),
      timeline: document.getElementById('timeline'),
      first: document.getElementById('first'),
      prev: document.getElementById('prev'),
      play: document.getElementById('play'),
      next: document.getElementById('next'),
      last: document.getElementById('last'),
      speed: document.getElementById('speed'),
      back: document.getElementById('back'),
      intuition: document.getElementById('intuition'),
      algoTab: document.getElementById('algo'),
      completeAlgo: document.getElementById('completeAlgo'),
    };

    let mode = 'intuition';
    const completeAlgoBtn = document.getElementById('completeAlgo');
    const completeAlgoBox = document.getElementById('completeAlgoBox');
    let step = 0;
    let timer = null;

    function buildSteps() {
      const s = [];
      const seen = new Set();
      const stack = [];
      const order = [];
      const queued = new Set();

      function snapshot(kind, title, desc, algo, current = null) {
        s.push({
          kind, title, desc, algo, current,
          stack: [...stack],
          order: [...order],
          seen: [...seen]
        });
      }

      // We handle disconnected graphs too: after one component finishes,
      // DFS starts another unvisited component.
      const chosen = localStorage.getItem('bccStartVertex');
      const starts = [...(chosen && vById.has(chosen) ? [chosen] : []), ...V.map(v => v.id).filter(id => id !== chosen)];

      snapshot(
        'ready',
        'Ready',
        `We will start at ${vById.get(starts[0]).label}. The graph can contain more than one connected component; if that happens, DFS will start another component after finishing the current one.`,
        `DFS(start)
  visited = ∅
  stack = ∅`
      );

      for (const start of starts) {
        if (seen.has(start)) continue;

        stack.push(start);
        queued.add(start);
        snapshot(
          'push',
          `Put ${vById.get(start).label} on the stack`,
          `DFS needs a place to begin this component. We put ${vById.get(start).label} on the stack.`,
          `stack.push(${vById.get(start).label})`
        );

        while (stack.length) {
          const u = stack.pop();
          queued.delete(u);

          snapshot(
            'pop',
            `Take ${vById.get(u).label} from the stack`,
            `The top item is removed. Now DFS checks whether ${vById.get(u).label} has already been visited.`,
            `u = stack.pop()`
          );

          if (seen.has(u)) {
            snapshot(
              'skip',
              `${vById.get(u).label} was already visited`,
              `This vertex was already explored, so DFS does not process it again.`,
              `if visited[${vById.get(u).label}]:
  continue`
            );
            continue;
          }

          seen.add(u);
          order.push(u);

          snapshot(
            'visit',
            `Visit ${vById.get(u).label}`,
            `This is the moment ${vById.get(u).label} becomes part of the DFS traversal order.`,
            `visited.add(${vById.get(u).label})
order.append(${vById.get(u).label})`,
            u
          );

          const neighbors = [...(adj.get(u) || [])].reverse();

          if (!neighbors.length) {
            snapshot(
              'leaf',
              `${vById.get(u).label} has no neighbours`,
              `There is nowhere else to explore directly from ${vById.get(u).label}.`,
              `for v in adj[${vById.get(u).label}]:
  // no neighbours`
            );
          }

          for (const v of neighbors) {
            if (!seen.has(v) && !queued.has(v)) {
              stack.push(v);
              queued.add(v);

              snapshot(
                'push-neighbor',
                `Push ${vById.get(v).label}`,
                `${vById.get(u).label} has an unvisited neighbour, ${vById.get(v).label}. We put it on the stack so DFS can explore it later.`,
                `if not visited[${vById.get(v).label}]:
  stack.push(${vById.get(v).label})`,
                u
              );
            } else {
              snapshot(
                'seen-neighbor',
                `Check edge ${vById.get(u).label} — ${vById.get(v).label}`,
                `${vById.get(v).label} is already visited or already waiting on the stack, so we do not add another copy.`,
                `if already seen/queued:
  do not push`,
                u
              );
            }
          }
        }
      }

      snapshot(
        'done',
        'DFS complete',
        `The stack is empty. The complete traversal order is ${order.map(id => vById.get(id).label).join(' → ')}.`,
        `while stack:
  ...
return traversal`
      );

      return s;
    }

    const startSelect = document.getElementById('startVertex');
    if (startSelect) {
      const chosen = localStorage.getItem('bccStartVertex');
      startSelect.innerHTML = V.map(v => `<option value="${v.id}">${v.label}</option>`).join('');
      if (chosen && vById.has(chosen)) startSelect.value = chosen;
      else if (V[0]) { startSelect.value = V[0].id; localStorage.setItem('bccStartVertex', V[0].id); }
      startSelect.addEventListener('change', () => { localStorage.setItem('bccStartVertex', startSelect.value); location.reload(); });
    }

    const steps = buildSteps();

    function draw() {
      canvas.innerHTML = '';
      const st = steps[step];

      // SVG keeps edges in the same 0–100 coordinate system as the
      // percentage-positioned vertices, so resizing the page/sidebar cannot
      // pull the edges away from their vertices.
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'dfs-edge-layer');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');

      E.forEach(e => {
        const a = vById.get(e.a);
        const b = vById.get(e.b);
        if (!a || !b) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', Number(a.x));
        line.setAttribute('y1', Number(a.y));
        line.setAttribute('x2', Number(b.x));
        line.setAttribute('y2', Number(b.y));
        line.setAttribute('class', 'graph-edge');
        if (st.current && (st.current === e.a || st.current === e.b)) line.classList.add('active');
        svg.appendChild(line);
      });
      canvas.appendChild(svg);

      V.forEach(v => {
        const el = document.createElement('div');
        el.className = 'vertex';
        if (st.seen.includes(v.id)) el.classList.add('visited');
        if (st.stack.includes(v.id)) el.classList.add('queued');
        if (st.current === v.id) el.classList.add('current');
        el.textContent = v.label;
        el.style.left = v.x + '%';
        el.style.top = v.y + '%';
        canvas.appendChild(el);
      });
    }

    function renderStack() {
      const active = steps[step].stack;
      els.stack.innerHTML = '';
      els.stack.className = 'stack-live';
      if (!active.length) {
        els.stack.className = 'stack-empty';
        els.stack.textContent = 'Empty';
      } else {
        // The last array element is the true stack top, so display it first.
        [...active].reverse().forEach((id, index) => {
          const isTop = index === 0;
          const row = document.createElement('div');
          row.className = 'stack-live-row';
          const item = document.createElement('div');
          item.className = 'stack-item' + (isTop ? ' top' : '');
          item.textContent = vById.get(id)?.label ?? '?';
          const pointer = document.createElement('span');
          pointer.className = 'stack-row-pointer';
          pointer.textContent = isTop ? '← TOP' : '';
          row.append(item, pointer);
          els.stack.appendChild(row);
        });
      }
      const pointer = document.getElementById('stackPointer'); if (pointer) pointer.textContent = '';
      els.stackCount.textContent = active.length + ' items';
    }

    function renderOrder() {
      const arr = steps[step].order;
      els.order.innerHTML = '';

      if (!arr.length) {
        els.order.className = 'order-empty';
        els.order.textContent = 'No vertices visited';
      } else {
        els.order.className = 'order';
        arr.forEach(id => {
          const d = document.createElement('span');
          d.className = 'order-item' + (steps[step].current === id ? ' current' : '');
          d.textContent = vById.get(id).label;
          els.order.appendChild(d);
        });
      }
    }

    function renderTimeline() {
      els.timeline.innerHTML = '';
      const track = document.createElement('div');
      track.className = 'timeline-track';

      steps.forEach((_, i) => {
        const t = document.createElement('div');
        t.className =
          'tick' +
          (i < step ? ' done' : '') +
          (i === step ? ' current' : '');
        t.title = 'Step ' + (i + 1);
        t.onclick = () => go(i);
        track.appendChild(t);
      });

      els.timeline.appendChild(track);
    }

    function render() {
      const st = steps[step];
      document.body.classList.remove('focus-stack','focus-queue','focus-order','focus-graph','focus-algorithm');
      const focus = (['push','pop','push-neighbor','skip'].includes(st.kind) ? 'focus-stack' : ['visit','done'].includes(st.kind) ? 'focus-order' : ['seen-neighbor','leaf'].includes(st.kind) ? 'focus-graph' : 'focus-algorithm');
      document.body.classList.add(focus);

      els.step.textContent = `Step ${step + 1} of ${steps.length}`;
      els.status.textContent =
        step === 0
          ? 'Select Next to inspect each traversal step.'
          : st.desc;

      els.phase.textContent = st.kind.replaceAll('-', ' ').toUpperCase();
      els.title.textContent = st.title;
      els.desc.textContent = st.desc;

      els.algo.textContent = st.algo;
      els.algo.classList.toggle('hidden', mode !== 'algo');
      if (completeAlgoBox) {
        const lines = [
          ['ready','DFS(G, start):'],
          ['push','S ← empty stack; push(start)'],
          ['pop','while S ≠ ∅: u ← POP(S)'],
          ['skip','if visited[u]: continue'],
          ['visit','visited[u] ← true; append u to order'],
          ['leaf','for each v ∈ Adj[u]:'],
          ['push-neighbor','if ¬visited[v] and v ∉ S: PUSH(S, v)'],
          ['seen-neighbor','otherwise: skip this neighbour'],
          ['done','for each still-unvisited vertex: DFS from it']
        ];
        const activeKind = st.kind === 'push-neighbor' ? 'push-neighbor' : st.kind;
        completeAlgoBox.innerHTML = `<h3>Complete DFS algorithm</h3><div class="dfs-code-flow">${lines.map(([kind,line],i)=>`<div class="dfs-code-line ${kind===activeKind?'active':''}"><span>${String(i+1).padStart(2,'0')}</span>${line}</div>`).join('')}</div><p><b>Follow the highlighted line:</b> the graph shows the exact push, pop, visit or neighbour check taking place now.</p>`;
        completeAlgoBox.classList.toggle('hidden', mode !== 'complete');
      }

      draw();
      renderStack();
      renderOrder();
      renderTimeline();

      els.first.disabled = step === 0;
      els.prev.disabled = step === 0;
      els.next.disabled = step === steps.length - 1;
      els.last.disabled = step === steps.length - 1;
    }

    function go(n) {
      step = Math.max(0, Math.min(steps.length - 1, n));
      render();
    }

    function intervalMs() { return Number(els.speed.value); }

    function updateSpeedLabel() {
      els.speedValue.textContent = (intervalMs() / 1000).toFixed(2) + 's/step';
    }

    function stopTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      els.play.textContent = '▶ Play';
    }

    function play() {
      if (timer) {
        stopTimer();
        return;
      }

      if (step >= steps.length - 1) {
        go(0);
      }

      els.play.textContent = '⏸ Pause';

      timer = setInterval(() => {
        if (step >= steps.length - 1) {
          stopTimer();
          return;
        }
        go(step + 1);
      }, intervalMs());
    }

    // Navigation controls — these were missing in the previous build.
    els.first.onclick = () => { stopTimer(); go(0); };
    els.prev.onclick = () => { stopTimer(); go(step - 1); };
    els.next.onclick = () => { stopTimer(); go(step + 1); };
    els.last.onclick = () => { stopTimer(); go(steps.length - 1); };
    els.play.onclick = play;

    els.back.onclick = () => {
      stopTimer();
      window.location.href = 'index.html';
    };
    const bfsFromDfs = document.getElementById('bfsFromDfs');
    if (bfsFromDfs) bfsFromDfs.onclick = () => { stopTimer(); window.location.href = 'bfs.html'; };

    if (els.intuition) els.intuition.onclick = () => { mode='intuition'; refreshTabs(); render(); };
    els.algoTab.onclick = () => { mode='algo'; refreshTabs(); render(); };
    els.completeAlgo.onclick = () => { mode='complete'; refreshTabs(); render(); };

    function refreshTabs() {
      if (els.intuition) els.intuition.classList.toggle('active', mode === 'intuition');
      els.algoTab.classList.toggle('active', mode === 'algo');
      els.completeAlgo.classList.toggle('active', mode === 'complete');
    }

    els.speed.addEventListener('input', () => {
      updateSpeedLabel();
      if (timer) {
        stopTimer();
        play();
      }
    });

    const guide={
      intuition:`<h3> Intuition</h3><p>This section explains the purpose of the current DFS state.</p><div class="guide-tip">DFS follows an unvisited neighbour until it reaches a dead end, then backtracks to the most recent vertex with an unvisited neighbour.</div>`,
      algorithm:`<h3> Step Algorithm</h3><p>The current animation state corresponds to this small algorithm operation.</p><pre id="dfsSideAlgorithm">Choose a step to see its rule.</pre>`,
      complete:`<h3> Complete DFS Algorithm</h3><p>This panel is scrollable. Read the whole algorithm, then watch the animation execute it one state at a time.</p><pre>DFS(start):
  push start onto stack

  while stack is not empty:
    u ← pop stack
    if u is already visited:
      continue
    mark u visited
    add u to traversal order

    for each neighbour v of u:
      if v is not visited:
        push v

If another connected component remains:
  start DFS there too.</pre>`,
      variables:`<h3> Variables</h3><p><b>stack</b> — vertices waiting to be processed.</p><p><b>visited</b> — vertices already discovered.</p><p><b>current</b> — vertex being processed now.</p><p><b>traversalOrder</b> — the order in which vertices were discovered.</p><p><b>start</b> — beginning vertex of a connected component.</p>`
    };
    const gs=document.getElementById('dfsLearningSidebar'),gt=document.getElementById('dfsLearningToggle'),gc=document.getElementById('dfsLearningContent');
    function setGuide(k){
      gc.innerHTML=guide[k]||guide.intuition;
      document.querySelectorAll('[data-dlearn]').forEach(b=>b.classList.toggle('active',b.dataset.dlearn===k));
      if(k==='algorithm'){
        const pre=document.getElementById('dfsSideAlgorithm');
        if(pre) pre.textContent=steps[step]?.algo || 'Follow the highlighted DFS operation.';
      }
      gs.classList.add('open');
    }
    gt.onclick=()=>gs.classList.toggle('open');
    document.querySelectorAll('[data-dlearn]').forEach(b=>b.onclick=()=>setGuide(b.dataset.dlearn));
    setGuide('intuition');

    window.addEventListener('resize', ()=>{draw()});

    refreshTabs();
    updateSpeedLabel();
    render();
  }
}

(function(){
  const b=document.getElementById('bccFromDfs');
  if(b) b.onclick=()=>{ if(window.stopAnimation) window.stopAnimation(); location.href='bcc.html'; };
})();
