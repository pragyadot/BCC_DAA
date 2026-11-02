BCC Lab v43 — Workspace and Practice Update

Start: open index.html in a browser. Build or load a graph, then open DFS, BFS, BCC, or Complexity from the builder.

What changed in v43
- Practice Lab accepts any valid DFS preorder for the selected start vertex; neighbour ordering is not fixed alphabetically. The submitted order is used to derive the DFS tree, discovery times, low values, articulation points, and BCC edge groups before grading.
- Added a fourth practice graph set: Two routes + hub. Existing Joined cycles, Chain, and Two blocks + connector remain.
- Removed the redundant Learning mode button from DFS and BFS playback headers. Play/Pause remains the playback control; Step Algorithm and Complete Algorithm remain available.
- Tightened desktop workspace proportions so playback controls and step count remain above the graph, the graph uses less vertical space, and live state panels sit in a compact right column. Responsive single-column layout remains for narrower screens.
- Strengthened synchronized focus styling across the graph, explanation, stack/queue, and traversal order as the active operation changes.
- BFS/BCC comparison labels the currently loaded Graph Builder graph and continues to calculate its vertex-removal/BFS connectivity tests from that graph.
- Articulation point results remain visible in the BCC Explorer state panel and on the graph.

Validation
- JavaScript syntax checks passed for app.js, dfs.js, bfs.js, bcc.js, and complexity.js using Node.js.
- A headless Chromium smoke-test attempt could not complete in this environment, so full interactive browser verification is not claimed. Please open index.html locally and test the flows in your desktop browser.

Notes
- Keep this folder together; the HTML pages load their companion JS and CSS files locally.
- Your previous v42 archive is not modified.
