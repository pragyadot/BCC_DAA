# BCC Lab — Interactive Graph Algorithm Visualizer

An interactive web-based learning platform for exploring **Depth-First Search (DFS), Breadth-First Search (BFS), and Biconnected Components (BCCs)** through graph construction, step-by-step algorithm visualizations, and guided explanations.

## Overview

Graph algorithms are often taught through pseudocode, static diagrams, and manually calculated traversal tables. Although these approaches explain the individual steps, understanding how concepts such as discovery time, low values, back edges, articulation points, and bridges work together can be challenging.

**BCC Lab** provides a visual and interactive environment where users can construct graphs, execute algorithms step by step, observe changes in algorithm state, and understand how graph connectivity is analysed.

The platform connects DFS traversal with low-link values, articulation-point detection, bridge identification, and Biconnected Component extraction.

## Features

### 1. Interactive Graph Builder

- Create vertices by clicking on the graph workspace.
- Connect vertices to create edges.
- Drag vertices to arrange the graph.
- Remove vertices and edges.
- Undo changes or clear the graph.
- Load predefined example graphs for experimentation.
- Use the constructed graph as the input for different algorithm explorers.

The application works with simple undirected graphs.

### 2. DFS Explorer

Visualizes Depth-First Search one operation at a time.

- Select a starting vertex.
- Follow the traversal using step-by-step controls.
- Observe the DFS stack and traversal order.
- Visualize visited vertices, tree edges, and back edges.
- Track discovery times (`disc[]`) and low values (`low[]`) during the traversal.
- Inspect the active algorithm operation and its explanation.
- Use playback controls to run, pause, or navigate through the algorithm.

### 3. BFS Explorer

Demonstrates Breadth-First Search and its level-by-level exploration strategy.

- Select a starting vertex.
- Observe the traversal order.
- Visualize the BFS queue and vertex processing.
- Follow the algorithm operation by operation.
- Compare BFS traversal with DFS-based BCC detection.

The comparison section also demonstrates a BFS-assisted connectivity approach using vertex-removal tests on the selected graph. It illustrates how connectivity can be examined without using the standard DFS low-link and edge-stack method.

### 4. Biconnected Components (BCC) Explorer

Visualizes the DFS-based Biconnected Component detection algorithm.

The explorer demonstrates:

- Discovery-time assignment.
- Low-value calculation and propagation.
- Tree-edge and back-edge processing.
- Articulation-point detection.
- Bridge identification.
- Edge-stack operations.
- Biconnected Component extraction.

The graph visualization and algorithm state are updated as the traversal progresses.

### 5. Guided Theory and Learning

Provides a structured introduction to the concepts behind BCC detection.

Topics include:

- Graph fundamentals.
- Depth-First Search.
- Discovery time.
- DFS tree edges and back edges.
- Low-link values and propagation.
- Articulation points.
- Bridges.
- Biconnected Components.
- The conditions used for articulation-point and bridge detection.
- Edge-stack-based component extraction.

A worked graph example connects the concepts to the algorithm's execution.

### 6. Practice Lab

Provides exercises for testing understanding of DFS-based BCC concepts.

- Work with different predefined graph structures.
- Select a starting vertex.
- Enter a DFS traversal order.
- Calculate and enter discovery times and low values.
- Receive feedback based on the submitted traversal and calculated results.

The practice checker accepts valid DFS traversal orders rather than requiring a single fixed neighbour ordering.

### 7. Complexity Explorer

Demonstrates how graph algorithm operations contribute to time complexity.

- Select DFS, BFS, or BCC.
- Generate an operation trace for the selected graph.
- Track vertex-processing operations.
- Count adjacency-list entries examined.
- Observe stack or queue operations.
- Follow the running count as the algorithm progresses.
- Relate graph-specific operation counts to the general complexity bound.

For adjacency-list implementations, DFS and BFS run in **O(V + E)** time. The standard DFS-based BCC algorithm also runs in **O(V + E)** time.

Here, `V` represents the number of vertices and `E` represents the number of undirected edges.

---

## Understanding the BCC Algorithm

BCC Lab uses a DFS-based approach based on discovery times and low-link values.

### Discovery Time — `disc[u]`

The discovery time of a vertex is the timestamp assigned when DFS first visits it.

Each newly discovered vertex receives the next available timestamp.

### Low Value — `low[u]`

The low value of a vertex represents the earliest discovery time reachable from that vertex's DFS subtree using tree edges and at most one back edge to an ancestor.

Low values are updated while DFS explores back edges and propagates information from child vertices to their parents.

### Articulation Points

An articulation point is a vertex whose removal increases the number of connected components in the graph.

For a non-root vertex `u` and its DFS child `v`, the condition is:

`low[v] >= disc[u]`

If the child's subtree cannot reach an ancestor of `u` without passing through `u`, then `u` separates that subtree from the rest of the graph.

The DFS root follows a special rule: it is an articulation point if it has more than one DFS tree child.

### Bridges

A bridge is an edge whose removal increases the number of connected components.

For a DFS tree edge `(u, v)`, where `u` is the parent of `v`, the bridge condition is:

`low[v] > disc[u]`

The strict inequality is important. If `low[v] == disc[u]`, the subtree can still reach the parent through a back edge, so the tree edge is not a bridge.

### Biconnected Component Extraction

The algorithm maintains an edge stack during DFS.

When the condition

`low[v] >= disc[u]`

is satisfied, edges are popped from the stack until the corresponding tree edge `(u, v)` is removed. The popped edges form one Biconnected Component.

This allows the algorithm to identify multiple components while retaining the articulation vertices shared between them.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure and application layout |
| CSS3 | Styling, responsive layouts, and visual states |
| JavaScript | Graph representation, algorithm logic, and interactivity |
| SVG | Graph rendering and visual highlighting |
| Browser APIs | Client-side interaction and graph-state handling |

The application is implemented using vanilla HTML, CSS, and JavaScript. No frontend framework or backend server is required to run the application.

## Project Structure

```text
BCC_Lab/
│
├── index.html                  # Home page and Graph Builder
├── dfs.html                    # DFS Explorer
├── bfs.html                    # BFS Explorer
├── bcc.html                    # BCC Explorer, Theory and Practice Lab
├── complexity.html             # Complexity Explorer
├── bcc-bfs-comparison.html     # DFS and BFS-assisted comparison
│
├── app.js                      # Graph Builder functionality
├── dfs.js                      # DFS implementation and visualization
├── bfs.js                      # BFS implementation and visualization
├── bcc.js                      # BCC detection and visualization
├── complexity.js               # Complexity operation traces
├── guided-lesson.js            # Guided theory lesson interactions
│
├── style.css                   # Main styles
├── dfs.css                     # DFS styles
├── bcc.css                     # BCC styles
├── complexity.css              # Complexity Explorer styles
├── redesign.css                # Shared visual styling
├── workspace-redesign.css      # Workspace layout styling
└── atlas-pages.css             # Additional page styling
```

## Getting Started

### Prerequisites

- A modern web browser (Google Chrome, Microsoft Edge, Firefox, etc.).
- No additional software installation is required.

### Run Locally

1. Download or clone this repository.

2. Extract the project folder if downloaded as a ZIP archive.

3. Open the project directory.

4. Open `index.html` in a web browser.

5. Use the Graph Builder to create a graph or load a predefined example.

6. Select an explorer to begin analysing the graph.

All project files should remain in their original relative locations so that HTML pages can load their corresponding CSS and JavaScript files correctly.

### Deployment

BCC Lab can be deployed as a static website using services such as **GitHub Pages**, **Netlify**, or **Vercel**.

For GitHub Pages:

1. Push the project files to a GitHub repository.
2. Navigate to the repository's **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Choose the `main` branch and the root (`/`) directory.
5. Save the configuration and access the published website using the generated GitHub Pages URL.

---

## Algorithm Complexity

| Algorithm | Time Complexity | Space Complexity |
|---|---|---|
| DFS | O(V + E) | O(V) |
| BFS | O(V + E) | O(V) |
| DFS-based BCC | O(V + E) | O(V + E) |

The space complexity includes auxiliary structures such as visited arrays, recursion stack, parent information, and the edge stack used during BCC extraction.

## Applications

The concepts explored in BCC Lab are useful in understanding:

- Network reliability and connectivity.
- Identification of critical vertices and connections.
- Network vulnerability analysis.
- Graph decomposition.
- Connectivity analysis in undirected networks.
- Fundamental graph traversal techniques.

## Scope and Limitations

- The application focuses on simple undirected graphs.
- The standard BCC detection method implemented is DFS-based.
- BFS is included for traversal learning and comparison, not as a replacement for the standard DFS-based low-link BCC algorithm.
- The application is a client-side educational tool and does not require a backend database or server.

## License

No license has been specified yet. Add a `LICENSE` file to the repository if the project is intended for public reuse or distribution.
