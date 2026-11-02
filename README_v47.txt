BCC Lab v47 — Theory and Guided Lesson Revision

This version revises the BCC Theory section to address beginner-facing gaps:
- Defines u (parent/current vertex) and v (DFS child) before using them in conditions.
- Uses one consistent five-vertex graph throughout the guided lesson.
- Separates DFS tree edges from back edges and explains what each means.
- Corrects the running example's discovery and low values.
- Explains the equality case and distinguishes articulation-point and bridge tests.
- Clarifies that a child with low[v] < disc[u] does not make u an articulation point by itself; another child may still do so.
- Explains the DFS-root exception and edge-stack BCC extraction.
- Replaces vague BCC wording with a more precise beginner-level description.

Open index.html. From the BCC Explorer, choose Theory.

Validation performed: JavaScript syntax checks for all .js files and HTML parser check for bcc.html. A full browser interaction/visual test was not completed.
