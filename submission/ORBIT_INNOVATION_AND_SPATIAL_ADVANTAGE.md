# ORBIT — Innovation & The Spatial Advantage

**Project:** ORBIT — Spatial Intelligence Workspace  
**Competition:** Meta VR Start Developer Competition 2026  
**Focus:** Spatial Computing Rationale · Cognitive Ergonomics · Competitive Differentiation  

---

## 1. Why Spatial Computing? The True Spatial Affordance

Many VR productivity applications simply replicate flat desktop windows inside a virtual environment — floating rectangular browser tabs or virtual monitors. 

**ORBIT takes the opposite philosophy: it is built from the ground up for spatial affordance.**

Project networks and dependency graphs are inherently **non-planar structures**. When represented on a flat 2D screen, complex workflows suffer from severe visual compromises:
- Edges cross over one another, creating visual "spaghetti."
- Panning and zooming destroy situational awareness: you either see the entire graph as unreadable thumbnails or zoom in and lose all context of upstream and downstream milestones.
- Interacting with dependencies requires navigating complex hierarchical modal menus, dropdown pickers, and date fields.

In spatial computing, the user’s physical environment becomes the canvas. Space is not just a container — it is an active dimension of information architecture.

---

## 2. The Four Spatial Advantages of ORBIT

### 1. The Depth Advantage: Radial Topological Depth vs. 2D Clutter
In flat tools, edge lines must either route around obstacles with jagged right angles or cross directly over unrelated cards. 

In ORBIT, dependencies use **3D Catmull-Rom splines** that curve gently through physical depth:
- Edges arch upward and forward in the $Z$-axis, passing cleanly over intervening nodes without visual occlusion.
- Radial curvature allows the entire 9-node DAG to envelop the user at a comfortable $1.75\,\text{m}$ distance.
- Users naturally use **stereoscopic depth perception and head motion parallax** to separate foreground tasks from background constraints effortlessly.

```
FLAT 2D VIEWPORT:               ORBIT 3D RADIAL DEPTH:
┌─────────────────────────┐          ╭─────────╮   ╭─────────╮
│ [Node A] ───X───> [Node C]│         │ Node A  │   │ Node B  │
│      \     /            │          ╰────┬────╯   ╰────┬────╯
│       [Node B]          │               ╰───────╮     │ (Arches in Z)
│  (Crossing Lines &      │                       ▼     ▼
│   Visual Occlusion)     │                 ╭─────────────╮
└─────────────────────────┘                 │   Node C    │
                                            ╰─────────────╯
```

---

### 2. Tactile Direct Manipulation & Spatial Memory
Human brains evolved to navigate physical spaces and remember the locations of objects through **spatial memory**:
- You remember that the critical backend task is *over there, slightly to the right, elevated at eye level*.
- Grabbing a task card with distance rays or physical hands and placing it where your team wants it creates a tangible mental anchor that flat text rows cannot replicate.
- Connecting milestones feels like plugging in a physical cable: pinching an output port, stretching an elastic rubberband spline across physical space, and snapping it into an input port.

---

### 3. Peripheral Situational Awareness
On flat displays, the field of view is artificially restricted to a $16:9$ rectangle. To see an analytical inspector or recommendation panel, you must open a sidebar that shrinks your graph view.

In ORBIT, the user has a full **horizontal field of regard**:
- The **Top Header HUD** floats comfortably overhead ($y = 1.75\,\text{m}$), displaying overarching schedule telemetry without occluding tasks.
- The **Task Inspector HUD** is anchored $30^\circ$ to the left, accessible by a slight turn of the head.
- The **Navigator Intelligence HUD** is anchored $30^\circ$ to the right.
- The central field of view remains 100% dedicated to the 3D workflow graph.
This eliminates window switching, context loss, and cognitive fatigue.

---

### 4. Zero-Risk Tangible Simulation
In traditional enterprise tools, changing a date on a live Gantt chart carries real organizational risk — notifications are sent, deadlines are shifted, and confusion ensues.

In ORBIT's **What-If Scenario Sandbox**, simulating a timeline change is a tangible, isolated act:
- The user dials a task duration down by one day (e.g. from 4 days to 3 days on System Integration).
- Immediately, the entire 3D graph responds: downstream cards adjust their early dates, the golden Critical Path updates its glowing highway, and the top header metric displays the projected delta in vibrant cyan.
- The user can stand inside the alternative future, inspect the downstream consequences with their hands, and make a confident decision before committing or discarding.

---

## 3. Cognitive Load Comparison

| Dimension | Flat Screen (Gantt / Jira / Excel) | ORBIT in Meta Quest 3 | Cognitive Advantage |
|---|---|---|---|
| **Graph Navigation** | Scrollbars, 2D pan/zoom, keyboard shortcuts | Natural head rotation and gaze | **Zero mental overhead** — uses innate human spatial perception. |
| **Critical Path Perception** | Scanning numeric "Float" columns in table rows | Glowing golden-amber 3D highway cutting through space | **Instant pre-attentive visual processing** ($< 150\,\text{ms}$). |
| **Dependency Understanding** | Abstract connector arrows crossing text boxes | 3D Catmull-Rom splines arching through physical depth | **Stereoscopic depth disambiguation**; no overlapping line clutter. |
| **Impact Analysis** | Mental simulation or exporting to secondary spreadsheets | 3D halo highlights and instantaneous blast-radius calculation | **Tangible cause-and-effect visualization**. |
| **Decision Confidence** | "I hope changing this milestone didn't break another team's schedule." | "I can see all 3 downstream tasks and verified the new 26-day delivery date." | **High certainty and psychological safety**. |

---

## 4. Leveraging Meta Quest 3 & Immersive Web SDK

ORBIT maximizes the capabilities of the Meta Quest 3 hardware and IWSDK ecosystem:

1. **Lightweight WebXR Performance:** Built on IWSDK 1.1.0-rc.2 and Three.js r185, ORBIT runs entirely client-side in the browser. It delivers instant startup without 2 GB native app downloads.
2. **Ergonomic Port Hit Targets:** While visual port rings remain compact ($1.5\,\text{cm}$ radius), invisible $3.5\,\text{cm}$ hit-sphere colliders make pinch gestures effortless, accommodating hand tracking precision limits without frustrating mis-clicks.
3. **High-Contrast Canvas Texture Plates:** Procedural 1024×512 anti-aliased canvas textures ensure that task titles, float days, and assignee badges remain sharp and legible across the Quest 3’s Pancake lenses.
4. **Passthrough Ready:** ORBIT’s radial arc is calibrated to float seamlessly in front of the user's real-world physical desk, turning any home office or conference room into an immersive command center.

