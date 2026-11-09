# ORBIT — Competition Demo Video Script & Voiceover Guide (Revised)

**Project:** ORBIT — Spatial Intelligence Workspace  
**Tagline:** Think in Systems. Act in Space.  
**Competition:** Meta VR Start Developer Competition 2026  
**Target Video Duration:** 2 minutes 40 seconds (160 seconds) — Hard Maximum: Under 3:00 (180s)  
**Spoken Word Count:** ~355 words (~133 words per minute, natural presentation tempo)  
**Emulation Disclosure:** "Recorded using Meta Quest 3 emulation via IWER and the Immersive Web SDK."  
**Audio Track:** Spoken English voiceover + subtle ambient UI audio (zero copyrighted music)  

---

## Storyboard & Narration Breakdown

### Scene 1: Problem & Product Introduction (0:00 – 0:20)
- **Timecode:** `0:00 – 0:20` (20s) | **Word Count:** 48 words
- **Visual:** Establishing wide perspective of the ORBIT spatial workspace. A curved arc of floating graphite task cards connected by glowing dependency splines against a clean studio background. Top header HUD displays project telemetry: `Duration: 27 Days · Critical Path: 6 Tasks (Zero Slack) · Dependencies: 12 Constraints · Top Bottleneck: Integration (88/100)`.
- **On-Screen Disclosure:** Discrete lower-third text displayed during the first 10 seconds:  
  *`Recorded using Meta Quest 3 emulation via IWER and the Immersive Web SDK.`*
- **Voiceover:**
  > "Complex engineering projects fail when critical dependencies stay hidden inside flat spreadsheets and endless Gantt charts.
  > 
  > This is **ORBIT** — an interactive spatial intelligence workspace built with the Immersive Web SDK for Meta Quest 3.
  > 
  > ORBIT lets teams think in systems and act in space."

---

### Scene 2: Spatial Workflow Overview & Critical Path (0:20 – 0:40)
- **Timecode:** `0:20 – 0:40` (20s) | **Word Count:** 46 words
- **Visual:** Eye-level first-person view ($z = 0, y = 1.35\,\text{m}$). The camera slowly pans across the radial arc spanning $-35^\circ$ to $+35^\circ$. All 9 task cards face inward toward the user. The golden-amber Critical Path splines glow prominently through the center.
- **Voiceover:**
  > "Stepping into the workspace, our software product launch workflow curves naturally within arm's reach. 
  > 
  > Nine milestones and twelve constraints are organized in 3D space.
  > 
  > Cutting through the center is the golden **Critical Path** — six zero-slack tasks that strictly govern our twenty-seven-day project delivery date."

---

### Scene 3: Direct Task Selection & Spatial Manipulation (0:40 – 1:05)
- **Timecode:** `0:40 – 1:05` (25s) | **Word Count:** 53 words
- **Visual:** Virtual pointer selects the `integration` task card (`End-to-End System Integration`). A glowing cyan selection halo activates. The left Task Inspector HUD immediately updates: `Duration: 4 Days`, `Total Float: 0.0 Days`, `Downstream Blast Radius: 3 Tasks Blocked`, `Bottleneck Score: 88 / 100`.
- **Action:** User grabs `integration` with the distance-grab ray and translates it forward and sideways in 3D space. Incident dependency splines stretch and re-route smoothly in real time.
- **Voiceover:**
  > "Selecting 'System Integration' instantly populates the Task Inspector. We see its blast radius: three downstream milestones depend on this single milestone.
  > 
  > Because ORBIT uses an entity component system with selective spline regeneration, we can reposition any task directly in 3D.
  > 
  > Incident dependency tubes adapt dynamically in real time."

---

### Scene 4: Spatial Dependency Creation & Transactional Validation (1:05 – 1:30)
- **Timecode:** `1:05 – 1:30` (25s) | **Word Count:** 56 words
- **Visual:** Pointer moves to the right output port of `architecture` (`System Architecture & Interface Design`). The cyan port activates with enlarged hit affordance. User pinches/triggers to pull out an elastic rubberband spline.
- **Action 1 (Rejection):** User aims spline back at the input port of `architecture` (self-loop). The port flashes coral red with inspector feedback: `REJECTED: Self-dependencies are forbidden`.
- **Action 2 (Acceptance):** User aims spline at the input port of `testing` (`Multi-Device QA & Usability Testing`). The port flashes emerald green: `VALID CONNECTION`. User releases to connect. A new 3D tube spline materializes, updating dependencies to 13 constraints.
- **Voiceover:**
  > "Adding dependencies is tactile and intuitive.
  > 
  > We pinch an output port to draft a real-time connection spline.
  > 
  > If we attempt an invalid self-loop or cycle, ORBIT immediately rejects it with visual feedback.
  > 
  > Snapping to a valid input port safely creates the dependency, instantly recalculating Critical Path Method schedules across the entire network."

---

### Scene 5: ORBIT Navigator & Bottleneck Intelligence (1:30 – 1:55)
- **Timecode:** `1:30 – 1:55` (25s) | **Word Count:** 52 words
- **Visual:** Focus shifts $+28^\circ$ right to the ORBIT Navigator panel. It displays: `Convergence Bottleneck: End-to-End System Integration`, `Severity: CRITICAL`, `Bottleneck Score: 88/100`, `Merges 2 incoming workflows`, `3 tasks dependent`.
- **Action:** User clicks **`Highlight 3D`**. In the central workspace, the 3D card for `integration` begins pulsing with an amber halo and glowing rim.
- **Voiceover:**
  > "ORBIT features an on-device intelligence engine called **ORBIT Navigator**.
  > 
  > Running deterministically without external cloud LLMs, Navigator audits our graph topology.
  > 
  > It identifies 'System Integration' as our top convergence bottleneck with a score of 88 out of 100.
  > 
  > Clicking 'Highlight 3D' spotlights the affected task card directly inside the spatial graph."

---

### Scene 6: What-If Scenario Simulation & Schedule Comparison (1:55 – 2:20)
- **Timecode:** `1:55 – 2:20` (25s) | **Word Count:** 54 words
- **Visual:** Focus moves to the Task Inspector's `WHAT-IF SCENARIO SANDBOX`. 
- **Action:** User clicks the **`-1d`** stepper button on `integration`. The proposed duration shifts from 4 to 3 days. The sandbox enters `SIMULATED` state.
- **Visible Result:** The inspector displays `Projected Duration: 26 Days` and `Schedule Delta: -1.0 Days (Improvement)`. The top header metric updates to reflect the compressed 26-day timeline.
- **Voiceover:**
  > "Next, we explore solutions in the What-If Scenario Sandbox.
  > 
  > We decrement the proposed duration of 'System Integration' from four days to three days.
  > 
  > Instantly, the projected timeline recalculates to twenty-six days — a full day saved.
  > 
  > Downstream dates update in place, allowing us to evaluate schedule trade-offs before committing changes."

---

### Scene 7: Approval, Reset Demo & Closing (2:20 – 2:40)
- **Timecode:** `2:20 – 2:40` (20s) | **Word Count:** 46 words
- **Visual:** User clicks **`Apply`** in the inspector to commit the 26-day schedule. Then user clicks **`Reset Demo`** in the header. In a single frame, the entire workspace restores cleanly to the original 27-day, 12-constraint baseline.
- **Camera:** Camera glides back to the wide establishing shot as title card appears: `ORBIT — Spatial Intelligence Workspace · Built for Meta Quest 3`.
- **Voiceover:**
  > "We click 'Apply' to commit our approved plan.
  > 
  > And with one click on 'Reset Demo', the workspace restores cleanly back to baseline.
  > 
  > Spatial computing transforms abstract project risk into clear, actionable spatial intelligence.
  > 
  > Think in Systems. Act in Space.
  > 
  > Thank you."

---

## Narration Timing & Spoken Word Count Summary

| Scene | Section | Timecode | Duration | Word Count | Speaking Rate |
|---|---|---|---|---|---|
| **1** | Problem & Product Introduction | `0:00 – 0:20` | 20s | 48 words | 144 wpm |
| **2** | Spatial Workflow Overview & Critical Path | `0:20 – 0:40` | 20s | 46 words | 138 wpm |
| **3** | Direct Manipulation & Task Inspection | `0:40 – 1:05` | 25s | 53 words | 127 wpm |
| **4** | Dependency Creation & Validation | `1:05 – 1:30` | 25s | 56 words | 134 wpm |
| **5** | ORBIT Navigator & Bottleneck Detection | `1:30 – 1:55` | 25s | 52 words | 125 wpm |
| **6** | What-If Scenario Simulation | `1:55 – 2:20` | 25s | 54 words | 130 wpm |
| **7** | Approval, Reset Demo & Closing | `2:20 – 2:40` | 20s | 46 words | 138 wpm |
| **Total** | **Full Video** | **0:00 – 2:40** | **160s** | **355 words** | **~133 wpm** |

> [!NOTE]
> The total duration of 2 minutes 40 seconds (160 seconds) provides a comfortable 20-second safety margin beneath the strict 3-minute (180-second) competition cutoff.
