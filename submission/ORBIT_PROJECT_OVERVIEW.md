# ORBIT — Spatial Intelligence Workspace: Project Overview

**Competition:** Meta VR Start Developer Competition 2026  
**Category / Track:** Productivity & Spatial Computing  
**Developer:** Solo Developer  
**Status:** Production Ready (Verified on Immersive Web SDK 1.1.0-rc.2)  

---

## 1. Executive Summary

Modern enterprise software and engineering programs routinely involve dozens of interconnected milestones, critical technical dependencies, and volatile delivery timelines. Today, teams attempt to manage these complex topologies using flat, two-dimensional tools: dense Gantt charts, sprawling spreadsheets, and linear issue trackers. 

When a project experiences delay, flat tools obscure the underlying cause. Critical paths become lost in infinite vertical scrolls; dependency chains remain invisible; and predicting the downstream "blast radius" of a delayed milestone requires tedious manual analysis.

**ORBIT** transforms complex workflows into an **interactive, physics-grounded spatial intelligence workspace**. Built on the official Immersive Web SDK (IWSDK 1.1.0-rc.2), Three.js r185, and EliCS v3.4.2 for Meta Quest 3, ORBIT turns abstract dependency networks into tangible 3D topological graphs that teams can explore, manipulate, and simulate with their hands.

```
                    ┌────────────────────────┐
                    │      ORBIT WORKSPACE   │
                    │   (Radial 3D Geometry) │
                    └───────────┬────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  SPATIAL DAG │        │  NAVIGATOR   │        │   WHAT-IF    │
│ VISUALIZATION│        │ INTELLIGENCE │        │   SANDBOX    │
│  & CPM CORE  │        │  RECOMMENDER │        │  SIMULATION  │
└──────────────┘        └──────────────┘        └──────────────┘
```

---

## 2. The Core Problem: The Flat-Screen Bottleneck

1. **Dimensional Compression:** Workflow graphs are multidimensional networks (directed acyclic graphs). Squeezing a DAG onto a flat 2D viewport forces severe compromises: artificial hierarchy, overlapping connector lines, and endless panning.
2. **Invisible Critical Paths:** Traditional project trackers treat all tasks with equal visual weight. Identifying which specific task sequence governs the final launch date requires digging through date columns rather than immediate visual perception.
3. **High-Risk "What-If" Decisions:** When technical teams consider alternative schedules, they must either alter live production boards or copy data into throwaway spreadsheets. There is no lightweight, interactive sandbox to test schedule hypotheses risk-free.
4. **Lack of Explainable AI Assistance:** Modern AI tools often generate opaque recommendations without showing their mathematical or topological justification.

---

## 3. The ORBIT Solution

ORBIT provides an integrated spatial computing environment organized into four core pillars:

### Pillar 1: Pure Mathematical Workflow Engine & CPM Core
- **Deterministic Scheduling:** Implements an enterprise-grade Critical Path Method (CPM) algorithm calculating Early Start/Finish, Late Start/Finish, and Total Float/Slack across all milestones.
- **Immediate Critical Path Highlighting:** Zero-slack tasks are automatically surfaced as a glowing golden-amber highway through the 3D space, separating critical tasks from flexible timeline buffers.
- **Topological Integrity Guard:** Validates graph structure using Kahn’s topological sort. Automatically prevents circular dependencies, self-loops, and orphan references with immediate transactional rollback.

### Pillar 2: Ergonomic 3D Spatial Layout & Direct Manipulation
- **Curved Ergonomic Arc:** Arranges tasks in a radial workspace ($1.75\,\text{m}$ radius, $1.35\,\text{m}$ center height) spanning a $-35^\circ$ to $+35^\circ$ field of view, keeping every task within natural arm’s reach.
- **Selective Per-Frame Geometry Optimization:** Moving a node dynamically recalculates only incident Catmull-Rom spline tubes, maintaining a verified 60 FPS under active manipulation.
- **Tactile Dependency Drafting:** Users pinch connection ports to pull elastic, two-tone rubberband splines, with visual port validation and snapping.

### Pillar 3: On-Device Workflow Intelligence (ORBIT Navigator)
- **Zero Cloud Latency:** Runs entirely on-device with zero external LLM dependencies, API keys, or privacy exposure.
- **Deep Topological Auditing:** Continuously evaluates bottleneck convergence, critical path risks, downstream blast radii, and schedule compression opportunities.
- **Explainable Recommendations:** Generates structured recommendation cards explaining the exact root cause, affected downstream milestones, and quantitative schedule impact.

### Pillar 4: Risk-Free What-If Scenario Sandbox
- **Isolated Branch Simulation:** Users adjust task durations and simulate alternative schedules in an isolated state without mutating the committed baseline.
- **Real-Time Visual Schedule Diff:** The workspace instantly reflects projected project duration, schedule deltas, and shifting critical paths.
- **Explicit Transaction Lifecycle:** Scenarios require explicit user approval (`Apply`) to commit to baseline, or can be discarded (`Discard`) with a single click.

---

## 4. Target Users & Enterprise Applications

| User Persona | Key Pain Point | How ORBIT Solves It |
|---|---|---|
| **Program Managers & Delivery Leads** | "I cannot see which delayed task will blow our release date until it’s too late." | Instant 3D visual identification of the Critical Path and downstream blast radius. |
| **Engineering Architects** | "Cross-team architectural dependencies are buried across Jira boards." | Interactive spatial DAG where dependencies are tactile 3D splines with instant validation. |
| **Executive Stakeholders** | "I need to understand what happens if we cut two weeks from development." | Interactive What-If Sandbox to simulate schedule compression and see exact trade-offs before approving. |
| **Agile Scrum Masters & Tech Leads** | "Standup meetings spend 20 minutes just navigating backlog views." | Shared immersive spatial standup review where the entire program topology is visible at a glance. |

---

## 5. Technical Specifications

- **Target Platform:** Meta Quest 3, Meta Quest 3S, Meta Quest Pro.
- **Runtime Environment:** WebXR via Meta Horizon Browser (or desktop Chromium WebXR emulation).
- **Core SDK:** Immersive Web SDK (`@iwsdk/core` v1.1.0-rc.2).
- **Rendering Engine:** Super-Three (Three.js r185).
- **Entity Component System:** EliCS v3.4.2.
- **UI Architecture:** Meta UIKitML procedural HUD panels (`orbit-header`, `orbit-details`, `orbit-navigator`, `orbit-onboarding`).
- **Language & Tooling:** TypeScript 5.8, Vite 7.3, Node.js test runner, esbuild.
- **Dependencies:** **Zero external runtime dependencies** beyond official IWSDK libraries.
- **Test Coverage:** 65 automated unit and integration tests across 9 test suites; 100% passing.

---

## 6. Future Roadmap

1. **Multi-User Spatial Standups (Shared Spatial Anchors):** Enable distributed engineering teams to enter the same ORBIT workspace collaboratively, pointing and manipulating nodes together via Meta Quest Shared Spatial Anchors.
2. **Jira / GitHub Enterprise Connectors:** Bi-directional synchronization mapping Jira issues or GitHub Milestones directly into ORBIT's spatial DAG.
3. **Hybrid AI Agent Integration:** Optional integration with Gemini 2.0 / Llama 3 for natural language schedule queries ("Which team is on the critical path in Sprint 3?") while preserving deterministic CPM safety.
4. **Multi-Project Portfolio Universe:** Scaling from a single workflow graph to an interconnected galaxy of parallel corporate programs.

