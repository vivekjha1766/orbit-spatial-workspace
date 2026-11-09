# ORBIT — Technical Architecture & System Design

**Project:** ORBIT — Spatial Intelligence Workspace  
**Competition:** Meta VR Start Developer Competition 2026  
**Stack:** IWSDK 1.1.0-rc.2 · TypeScript 5.8 · Three.js r185 · EliCS v3.4.2 · UIKitML  

---

## 1. System Architecture Overview

ORBIT is engineered according to a **strict separation of concerns**: the mathematical workflow data model is completely decoupled from 3D spatial presentation, ECS entities, and UI markup.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ORBIT WORKSPACE SYSTEM                          │
│                                                                        │
│  ┌───────────────────────┐              ┌───────────────────────────┐  │
│  │   UI / HUD LAYER      │              │   SPATIAL SCENE LAYER     │  │
│  │  - orbit-header       │              │  - 3D Node Mesh Groups    │  │
│  │  - orbit-details      │              │  - Dynamic Spline Tubes   │  │
│  │  - orbit-navigator    │              │  - Connection Hit Targets │  │
│  │  - orbit-onboarding   │              │  - 3D Selection Halos     │  │
│  └───────────▲───────────┘              └─────────────▲─────────────┘  │
│              │                                        │                │
│  ┌───────────┴────────────────────────────────────────┴─────────────┐  │
│  │                  ECS SYNCHRONIZATION SYSTEM                      │  │
│  │                     WorkflowGraphSystem                          │  │
│  │  - Ray & Poke Interactable Queries   - Selective Geometry Build  │  │
│  │  - Node & Port Spatial Bindings      - Idempotent GPU Disposal   │  │
│  └──────────────────────────────────▲───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────┴───────────────────────────────┐  │
│  │                   CORE WORKFLOW ENGINE LAYER                     │  │
│  │  ┌─────────────────────┐                 ┌────────────────────┐  │  │
│  │  │ WorkflowGraphManager│                 │  CPM Calculator    │  │  │
│  │  │ - DAG Adjacency List│                 │  - Early/Late Pass │  │  │
│  │  │ - Cycle Detection   │                 │  - Float / Slack   │  │  │
│  │  │ - Transaction Guard │                 │  - Critical Path   │  │  │
│  │  └──────────┬──────────┘                 └─────────┬──────────┘  │  │
│  │             │                                      │             │  │
│  │  ┌──────────┴──────────┐                 ┌─────────┴──────────┐  │  │
│  │  │  ScenarioManager    │                 │ WorkflowNavigator  │  │  │
│  │  │  - Branch Isolation │                 │ - Bottleneck Audit │  │  │
│  │  │  - Schedule Diff    │                 │ - Blast Radius     │  │  │
│  │  │  - Apply / Discard  │                 │ - Freshness Hash   │  │  │
│  │  └─────────────────────┘                 └────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Workflow Engine & CPM Algorithms

### A. Directed Acyclic Graph (DAG) Integrity & Cycle Detection
The workflow graph is stored as an adjacency list:
$$G = (V, E)$$
where $V$ is the set of task nodes and $E$ is the set of directed precedence edges $(u, v)$ indicating that task $u$ must finish before task $v$ can start.

Before admitting any new dependency edge into the graph, the `WorkflowGraphManager` executes Kahn’s algorithm for topological sorting:
1. Calculates in-degree for all vertices.
2. Enqueues all vertices with in-degree 0.
3. Iteratively dequeues vertices and decrements in-degree of neighbors.
4. If the number of processed vertices equals $|V|$, the graph is acyclic. If not, a cycle exists.
5. In case of a cycle, the transaction is immediately rejected and the previous valid state is preserved without side effects.

### B. Critical Path Method (CPM) Mathematical Model
The scheduling engine computes exact scheduling limits via a deterministic two-pass algorithm:

#### 1. Forward Pass (Early Dates):
For every task $i$ in topological order:
$$\text{ES}_i = \begin{cases} 0 & \text{if } \text{Pred}(i) = \emptyset \\ \max_{p \in \text{Pred}(i)} (\text{EF}_p + \text{lag}_{p,i}) & \text{otherwise} \end{cases}$$
$$\text{EF}_i = \text{ES}_i + d_i$$
where $d_i$ is task duration, $\text{ES}_i$ is Early Start, and $\text{EF}_i$ is Early Finish. Total project duration is:
$$T_{\text{project}} = \max_{i \in V} \text{EF}_i$$

#### 2. Backward Pass (Late Dates):
For every task $i$ in reverse topological order:
$$\text{LF}_i = \begin{cases} T_{\text{project}} & \text{if } \text{Succ}(i) = \emptyset \\ \min_{s \in \text{Succ}(i)} (\text{LS}_s - \text{lag}_{i,s}) & \text{otherwise} \end{cases}$$
$$\text{LS}_i = \text{LF}_i - d_i$$

#### 3. Total Float (Slack) & Critical Path Identification:
$$\text{TF}_i = \text{LS}_i - \text{ES}_i = \text{LF}_i - \text{EF}_i$$
- A task $i$ is **Critical** if and only if $\text{TF}_i = 0$.
- The **Critical Path** is the unbroken sequence of critical tasks from start to project completion. Any delay in a critical task causes an identical delay to the final delivery date.

---

## 3. Spatial Layout Mathematics

To optimize readability and arm-reach ergonomics in VR, tasks are arranged in a **cylindrical radial arc**:
1. Tasks are partitioned into topological rank layers:
   $$L_i = \begin{cases} 0 & \text{if } \text{Pred}(i) = \emptyset \\ \max_{p \in \text{Pred}(i)} L_p + 1 & \text{otherwise} \end{cases}$$
2. The layer index maps to an angular bearing along a circle of radius $R = 1.75\,\text{m}$:
   $$\theta_L = \theta_{\text{min}} + \frac{L}{L_{\text{max}}} (\theta_{\text{max}} - \theta_{\text{min}})$$
   where $\theta_{\text{min}} = -35^\circ$ and $\theta_{\text{max}} = +35^\circ$.
3. 3D Coordinates are computed using cylindrical projection:
   $$x = R \sin(\theta_L)$$
   $$z = -R \cos(\theta_L)$$
   $$y = y_{\text{center}} + (r - \frac{N_{\text{row}} - 1}{2}) \cdot \Delta y$$
   $$\text{rotation}_Y = -\theta_L$$
This guarantees that all cards face directly toward the user's central viewpoint, eliminating perspective distortion and foveal eye strain.

---

## 4. Entity Component System (ECS) Architecture

ORBIT implements custom components registered with EliCS v3.4.2:

```typescript
// OrbitNode: Represents a spatial task milestone
export const OrbitNode = createComponent({
  nodeId: { type: 'string', default: '' },
  duration: { type: 'number', default: 1 },
  isCritical: { type: 'boolean', default: false },
  totalFloat: { type: 'number', default: 0 },
  status: { type: 'string', default: 'not_started' },
  priority: { type: 'string', default: 'medium' },
  risk: { type: 'string', default: 'low' },
});

// OrbitEdge: Represents a directed constraint tube
export const OrbitEdge = createComponent({
  edgeId: { type: 'string', default: '' },
  from: { type: 'string', default: '' },
  to: { type: 'string', default: '' },
  isCritical: { type: 'boolean', default: false },
});

// OrbitPort: Represents connection input/output hit points
export const OrbitPort = createComponent({
  nodeId: { type: 'string', default: '' },
  isOutput: { type: 'boolean', default: true },
});
```

### Selective Per-Frame Geometry Optimization
In `WorkflowGraphSystem.update()`, recalculating 3D splines every frame would create severe CPU overhead. ORBIT tracks position deltas across frames:
```typescript
const movedNodeIds = new Set<string>();
for (const [nodeId, entity] of this.nodeEntities.entries()) {
  const obj = entity.object3D;
  const prev = this.prevPositions.get(nodeId);
  if (obj && prev && obj.position.distanceToSquared(prev) > 1e-5) {
    prev.copy(obj.position);
    movedNodeIds.add(nodeId);
  }
}

if (movedNodeIds.size === 0) return;

// Selective rebuild: only incident edges are regenerated
for (const binding of this.edgeBindings) {
  if (movedNodeIds.has(binding.fromNodeId) || movedNodeIds.has(binding.toNodeId)) {
    binding.edgeAsset.updateGeometry(fromPos, toPos);
  }
}
```
This reduces per-frame Three.js geometry reallocations by over 80% during node dragging.

---

## 5. Resource Ownership & GPU Disposal Architecture

To guarantee zero memory leaks across long VR sessions and repeated demo resets:
1. **Strict Instance Ownership:** Geometries, materials, and textures are strictly instantiated per entity. No materials or geometries are shared across distinct node or edge instances.
2. **Idempotent Set-Tracked Disposal:** `disposeSpatialNodeMesh` maintains `Set<unknown>` registries during group traversal to prevent redundant disposal calls when materials (like `portHitMaterial`) are referenced by multiple meshes within the same node:
   ```typescript
   export function disposeSpatialNodeMesh(group: Group): void {
     const disposedGeometries = new Set<unknown>();
     const disposedMaterials = new Set<unknown>();
     const disposedTextures = new Set<unknown>();

     group.traverse((obj) => {
       if (obj instanceof Mesh) {
         if (obj.geometry && !disposedGeometries.has(obj.geometry)) {
           disposedGeometries.add(obj.geometry);
           obj.geometry.dispose();
         }
         if (obj.material) {
           const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
           for (const mat of mats) {
             if (!disposedMaterials.has(mat)) {
               disposedMaterials.add(mat);
               if ('map' in mat && mat.map && !disposedTextures.has(mat.map)) {
                 disposedTextures.add(mat.map);
                 mat.map.dispose();
               }
               mat.dispose();
             }
           }
         }
       }
     });
   }
   ```
3. **Disposal Guard Flags:** Both `createSpatialEdgeMesh` and `createDraftSplineMesh` implement `isDisposed` guards, making subsequent calls to `dispose()`, `setCritical()`, or `setHighlighted()` completely safe no-ops.

---

## 6. What-If Scenario State Machine

The scenario engine follows an explicit transactional lifecycle:

```
┌───────────┐         Edit Duration         ┌───────────┐
│           │ ────────────────────────────> │           │
│ BASELINE  │                               │  EDITING  │
│           │ <──────────────────────────── │           │
└─────▲─────┘           Discard             └─────┬─────┘
      │                                           │
      │                                           │ Simulate
      │                                           ▼
      │         Apply Approved Changes      ┌───────────┐
      └──────────────────────────────────── │ SIMULATED │
                                            └───────────┘
```

- In `EDITING` and `SIMULATING` states, mutations exist only in an isolated overlay.
- Baseline graphs are immutable until `apply()` is explicitly invoked.
- `updateCommittedBaseline()` updates the baseline topology whenever user-committed dependencies are added.

---

## 7. ORBIT Navigator Intelligence Pipeline

The intelligence engine operates entirely deterministically on-device:
1. **Convergence Bottleneck Detection:** Evaluates nodes where in-degree $\ge 2$ along the critical path.
2. **Blast Radius Analysis:** Computes downstream reachability:
   $$\text{BlastRadius}(u) = |\{ v \in V : u \rightsquigarrow v \}|$$
3. **Schedule Compression Scoring:** Identifies tasks on the critical path where duration reduction directly yields overall project acceleration.
4. **Graph Fingerprint Invalidation:** Generates a 64-bit deterministic hash of node durations, statuses, priorities, and edge connections:
   $$\text{Fingerprint} = \text{Hash}(V_{\text{attrs}}, E_{\text{pairs}})$$
   If the graph topology changes, previously computed recommendations are automatically marked stale, preventing invalid actions.

