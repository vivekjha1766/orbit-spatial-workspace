# ORBIT — Spatial Intelligence Workspace

> **Think in Systems. Act in Space.**  
> Built for the **Meta VR Start Developer Competition 2026** (Developer Track).

**Live WebXR Application:** [https://vivekjha1766.github.io/orbit-spatial-workspace/](https://vivekjha1766.github.io/orbit-spatial-workspace/)  
**GitHub Repository:** [https://github.com/vivekjha1766/orbit-spatial-workspace](https://github.com/vivekjha1766/orbit-spatial-workspace)  
**Demo Video:** Included in Devpost submission package (`ORBIT_FINAL_DEMO.mp4`)

---

## Overview

Traditional project management and systems engineering tools force complex dependency networks onto 2D screens: dense Gantt charts, sprawling node graphs, and disconnected tables. When dependencies tangle, bottlenecks become invisible until milestones fail.

**ORBIT** transforms workflow planning into an immersive **Spatial Intelligence Workspace**. Built on WebXR and the Meta Immersive Web SDK (IWSDK), ORBIT projects workflow dependency graphs directly into 3D stereoscopic space. Planners and engineers can physically manipulate tasks, validate dependency constraints with real-time cycle detection, simulate "what-if" duration modifications, and receive algorithmic schedule recommendations powered by the **ORBIT Navigator**.

---

## Core Capabilities

1. **3D Topological Workflow Graph Engine & CPM**
   - Interactive 9-node, 12-dependency baseline representing an end-to-end engineering lifecycle.
   - Real-time Critical Path Method (CPM) calculation computing Early Start (ES), Early Finish (EF), Late Start (LS), Late Finish (LF), and Total Float (Slack).
   - Dynamic Critical Path highlighting with glowing spatial pulses indicating bottleneck tasks.

2. **Spatial Node Manipulation & Direct Interaction**
   - 6-DOF spatial raycasting and direct grab manipulation for task nodes.
   - Real-time Task Inspector showing task metadata, duration, slack, and status.

3. **Live Dependency Creation & Cycle Detection**
   - Interactive spatial wire drawing between node source and target anchors.
   - Real-time graph validation rejecting duplicate dependencies and cyclic dependencies (e.g., self-loops or circular references) with audible/visual feedback.

4. **What-If Scenario Simulation**
   - Interactive duration adjustments on critical path tasks (e.g., simulating accelerating `Engine Prototype` from 7d to 6d).
   - Real-time recalculation of total project duration (27d &rarr; 26d) with non-destructive state preview and revert/commit capabilities.

5. **ORBIT Navigator (Algorithmic Guidance)**
   - Algorithmic analysis engine assessing schedule health, risk distribution, and critical bottlenecks.
   - Explainable guidance score (88/100 Health Score) with actionable mitigation recommendations.

6. **Onboarding & Workspace Reset**
   - Integrated 3D onboarding guidance for new operators.
   - Non-destructive workspace reset that cleanly tears down modified graph states and restores pristine 9-node/12-edge baseline.

---

## Technology Stack

- **Platform:** WebXR (Meta Quest 3 browser / desktop WebXR emulators via IWER)
- **Framework:** Meta Immersive Web SDK (`@meta/iwsdk`)
- **Language:** TypeScript 5.7+ / ESNext
- **Build System:** Vite 6 with automated GitHub Actions CI/CD
- **Testing:** Custom zero-dependency test suite (CPM, cycle detection, scenario simulation, Navigator verification)

---

## Local Development

```sh
# Clone repository
git clone https://github.com/vivekjha1766/orbit-spatial-workspace.git
cd orbit-spatial-workspace

# Install dependencies
npm install

# Run type check and tests
npm run typecheck
npm test

# Start local development server
npm run dev
```

Open `http://localhost:5173` in a WebXR-compatible browser or use the built-in IWER emulator controls.

---

## Continuous Deployment

This repository uses GitHub Actions (`.github/workflows/deploy.yml`) to automatically validate types, run unit tests, build production assets, and deploy to GitHub Pages on every push to `main`.

---

## Disclosures & Environment

- **Testing Environment:** Developed, profiled, and verified using Meta Quest 3 WebXR emulation via IWER and Meta IWSDK.
- **Independence:** 100% client-side WebXR application with zero external cloud dependencies, zero external tracking, and full offline determinism.
