# ORBIT — Competition Demo Video Shot List & Technical Director Guide (Revised)

**Project:** ORBIT — Spatial Intelligence Workspace  
**Competition:** Meta VR Start Developer Competition 2026  
**Recording Pipeline:** Chromium 60 FPS Window Capture · IWER Quest 3 Emulated Mode · 1920×1080 (or 2560×1440)  
**Total Target Footage:** 2 minutes 40 seconds (160 seconds) | Hard Cap: Under 3:00 (180s)  
**Emulation Disclosure:** "Recorded using Meta Quest 3 emulation via IWER and the Immersive Web SDK."  

---

## Detailed Shot Execution Table

| Shot # | Timecode & Duration | Shot Purpose | Camera / View Framing (IWER) | Actual Application Action | Expected Visible Result | Corresponding Spoken Narration | Verified in IWER? | Fallback / Operator Recovery |
|---|---|---|---|---|---|---|---|---|
| **01** | `0:00 - 0:20` (20s) | Scene establishment & problem statement | Wide central view from user head position ($x=0, y=1.35, z=0$). Eye-level wide FOV capturing full DAG and top header. | Application loads in clean resting state. Header displays baseline metrics. | Curved radial arc with 9 nodes, 12 edges, 27-day duration, golden Critical Path tubes visible. Lower-third disclosure displayed. | *"Complex engineering projects fail when critical dependencies stay hidden... This is ORBIT... Think in systems and act in space."* | **YES** | If scene is offset on startup, press `R` or click `Reset Demo` to restore default layout. |
| **02** | `0:20 - 0:40` (20s) | Spatial layout & Critical Path exploration | Smooth horizontal head pan from left ($x=-0.4$) through center to right ($x=+0.4$). | Slow, steady gaze tracking across the 9 task cards and central golden Critical Path splines. | Inward-facing radial curvature ($1.75\,\text{m}$ radius) clearly seen. Golden amber highway connects 6 zero-slack tasks. | *"Stepping into the workspace, our software product launch workflow curves naturally within arm's reach... Cutting through the center is the golden Critical Path..."* | **YES** | Pan slowly using gentle mouse drag in IWER viewport; avoid sudden snaps. |
| **03** | `0:40 - 0:52` (12s) | Task selection & contextual inspection | Head angled $15^\circ$ left, framing both the `integration` card and Task Inspector panel. | Virtual pointer moves over `integration` card and clicks to select. | Cyan selection halo illuminates around `integration`. Task Inspector updates: `Duration: 4 Days`, `Slack: 0.0 Days`, `Downstream: 3 Tasks Blocked`, `Score: 88/100`. | *"Selecting 'System Integration' instantly populates the Task Inspector. We see its blast radius: three downstream milestones depend on this single milestone."* | **YES** | If pointer click misses card, click anywhere on front face or trigger `window.__ORBIT__.selectNode('integration')`. |
| **04** | `0:52 - 1:05` (13s) | Direct spatial manipulation & spline update | Closer perspective on `integration` card and incident splines from `backend_dev` and `frontend_dev`. | Click and drag `integration` forward by $0.2\,\text{m}$ and right by $0.15\,\text{m}$. Pause briefly, then return near origin. | `integration` translates smoothly in 3D. Incoming splines from `backend_dev`/`frontend_dev` and outgoing splines to `testing`/`security_review` stretch dynamically. | *"Because ORBIT uses an entity component system with selective spline regeneration, we can reposition any task directly in 3D. Incident dependency tubes adapt dynamically..."* | **YES** | If dragged too far, click `Reset Demo` or drag back into place. Selective geometry updates only rebuild incident edges. |
| **05** | `1:05 - 1:17` (12s) | Spatial dependency draft & self-loop rejection | Focused view on `architecture` node ($z=-1.6\,\text{m}$), showing both input and output ports. | Pointer hovers right output port of `architecture` (glows active cyan). Pinch/click and pull draft rubberband spline toward its own input port (left). | Rubberband spline follows pointer. Hovering own input port turns port red with inspector feedback: `REJECTED: Self-dependencies are forbidden`. | *"Adding dependencies is tactile and intuitive. We pinch an output port to draft a real-time connection spline. If we attempt an invalid self-loop or cycle, ORBIT immediately rejects it..."* | **YES** | The 3.5cm hit sphere colliders ensure easy ray target acquisition without pixel precision. |
| **06** | `1:17 - 1:30` (13s) | Valid dependency creation & CPM recalculation | Over-the-shoulder view tracing draft spline from `architecture` across to `testing` input port. | Drag spline to left input port of `testing`. Port glows emerald green (`VALID CONNECTION`). Release click/trigger. | Spline snaps into place. New permanent 3D tube edge materializes (`architecture` $\to$ `testing`). Top header updates to `13 Constraints`. | *"...Snapping to a valid input port safely creates the dependency, instantly recalculating Critical Path Method schedules across the entire network."* | **YES** | If release doesn't register, call fallback `window.__ORBIT__.completeDraftConnection('testing')`. |
| **07** | `1:30 - 1:42` (12s) | Navigator intelligence overview | Head angled $28^\circ$ right, framing the `ORBIT NAVIGATOR // INTELLIGENCE` panel. | Pointer points at top recommendation card in Navigator. | Navigator displays: `Convergence Bottleneck: End-to-End System Integration`, `Severity: CRITICAL`, `Score: 88/100`, `Merges 2 incoming workflows`. | *"ORBIT features an on-device intelligence engine called ORBIT Navigator. Running deterministically without external cloud LLMs, Navigator audits our graph topology."* | **YES** | Ensure Navigator panel is visible; Recommendation #1 is selected by default on baseline. |
| **08** | `1:42 - 1:55` (13s) | 3D spatial highlight of recommendation | Split view capturing both the Navigator panel on right and `integration` card in center. | User clicks **`Highlight 3D`** button (`id="btn-nav-highlight"`). | The 3D card for `integration` in the central workspace begins pulsing with an intense amber halo and glowing rim. | *"It identifies 'System Integration' as our top convergence bottleneck with a score of 88 out of 100. Clicking 'Highlight 3D' spotlights the affected task card directly inside the spatial graph."* | **YES** | Click `Highlight 3D` again to toggle off, or click another node to deselect. |
| **09** | `1:55 - 2:08` (13s) | What-If duration decrement & auto-simulation | Focus on Task Inspector's `WHAT-IF SCENARIO SANDBOX` stepper controls. | Pointer clicks the **`-1d`** stepper button (`id="btn-dec-duration"`). | Proposed duration shifts `4 Days` $\to$ `3 Days`. Sandbox mode switches to `SIMULATED`. Inspector shows `Projected Duration: 26 Days` and `Schedule Delta: -1.0 Days (Improvement)`. | *"Next, we explore solutions in the What-If Scenario Sandbox. We decrement the proposed duration of 'System Integration' from four days to three days."* | **YES** | `adjustProposedDuration(-1)` auto-simulates immediately; no secondary click required. |
| **10** | `2:08 - 2:20` (12s) | Schedule comparison & downstream telemetry | Eye-level wide view showing both header metric and DAG cards with updated durations. | Pointer gestures toward top header HUD and `integration` card. | Header reflects `26 Days` projected (-1.0d delta). Downstream tasks reflect updated schedule dates in place. Zero changes committed to production baseline yet. | *"Instantly, the projected timeline recalculates to twenty-six days — a full day saved. Downstream dates update in place, allowing us to evaluate schedule trade-offs before committing changes."* | **YES** | Verify header displays updated 26-day duration with cyan highlight. |
| **11** | `2:20 - 2:30` (10s) | Scenario approval & authoritative workspace reset | Close view of Task Inspector buttons, then pan up to header. | User clicks **`Apply`** (`id="btn-apply-scenario"`), then moves pointer up and clicks **`Reset Demo`** in header (`id="btn-header-reset"`). | `Apply` commits 26d baseline. `Reset Demo` executes recursive GPU disposal and reinstantiates pristine 27-day, 12-constraint baseline in 66 ms. | *"We click 'Apply' to commit our approved plan. And with one click on 'Reset Demo', the workspace restores cleanly back to baseline."* | **YES** | Reset button `btn-header-reset` is located in top-right of header panel next to `? Guide`. |
| **12** | `2:30 - 2:40` (10s) | Closing & value proposition outro | Pull back to wide establishing view ($z=-2.8\,\text{m}$). Centered on clean 27-day workspace. | Workspace rests in pristine baseline. Outro title card overlay fades in: `ORBIT — Spatial Intelligence Workspace · Built for Meta Quest 3`. | *"Spatial computing transforms abstract project risk into clear, actionable spatial intelligence. Think in Systems. Act in Space. Thank you."* | **YES** | Hold static shot for 2 seconds before fading to black at 2:39. |

---

## Technical Director Notes & Control Label Matrix

| Target System Action | Exact Visible Button Label | Element ID | Location in UI |
|---|---|---|---|
| Reset Workspace to Baseline | **`Reset Demo`** | `btn-header-reset` | Header Panel (top right, next to `? Guide`) |
| Open Onboarding Tour | **`? Guide`** | `btn-header-guide` | Header Panel (top right) |
| Decrement Duration | **`-1d`** | `btn-dec-duration` | Task Inspector (What-If Stepper) |
| Increment Duration | **`+1d`** | `btn-inc-duration` | Task Inspector (What-If Stepper) |
| Simulate Scenario | **`Simulate`** | `btn-simulate-scenario` | Task Inspector (Button Group) |
| Commit Scenario Changes | **`Apply`** | `btn-apply-scenario` | Task Inspector (Button Group) |
| Discard Scenario Draft | **`Discard`** | `btn-discard-scenario` | Task Inspector (Button Group) |
| Toggle 3D Spatial Highlight | **`Highlight 3D`** | `btn-nav-highlight` | Navigator Panel (middle button row) |
| Next Recommendation | **`Next >`** | `btn-nav-next` | Navigator Panel (middle button row) |
| Previous Recommendation | **`< Prev`** | `btn-nav-prev` | Navigator Panel (middle button row) |
| Simulate from Recommendation | **`Simulate Action`** | `btn-nav-simulate` | Navigator Panel (bottom button row) |
| Apply from Recommendation | **`Apply to Baseline`** | `btn-nav-apply` | Navigator Panel (bottom button row) |
| Start Tour | **`Start Exploring`** | `btn-guide-next` | Onboarding HUD Panel |
| Skip Tour | **`Skip Tour`** | `btn-guide-skip` | Onboarding HUD Panel |

---

## Verified Programmatic & Keyboard Shortcuts for Operator

These shortcuts are verified in the source code ([`orbit-system.ts`](file:///c:/Users/jhavi/Desktop/ai_ml_dev/projects/Meta-VR-Competition/meta_vr_entry/src/orbit/orbit-system.ts)) and can be used as transparent keyboard recovery triggers during recording:

- **`R` key:** Triggers `resetSampleWorkspace()` (same as clicking `Reset Demo`).
- **`N` or `Right Arrow` key:** Triggers `onboardingNext()` (advances onboarding step).
- **`P` or `Left Arrow` key:** Triggers `onboardingPrev()` (previous onboarding step).
- **`S` key:** Triggers `onboardingSkip()` (skips onboarding to complete).
- **Console API:** `window.__ORBIT__.selectNode('integration')`
- **Console API:** `window.__ORBIT__.adjustProposedDuration(-1)`
- **Console API:** `window.__ORBIT__.resetSampleWorkspace()`
