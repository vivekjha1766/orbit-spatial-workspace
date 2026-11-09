# ORBIT — Competition Demo Video Recording Checklist & Operator Guide (Revised)

**Project:** ORBIT — Spatial Intelligence Workspace  
**Tagline:** Think in Systems. Act in Space.  
**Target Video Duration:** 2 minutes 40 seconds (160 seconds) | Strict Maximum: Under 3:00 (180s)  
**Recording Tool:** OBS Studio (or Windows Game Bar `Win + Alt + R`)  
**Resolution:** 1920×1080 (1080p60) or 2560×1440 (1440p60)  
**Mandatory Disclosure:** "Recorded using Meta Quest 3 emulation via IWER and the Immersive Web SDK."  

---

## 1. Pre-Recording System Setup

### Display & Operating System
- [ ] **Display Resolution:** Set monitor to `1920x1080` or `2560x1440` at 60 Hz.
- [ ] **Windows Focus Assist:** Turn ON "Do Not Disturb" / "Priority Only" in Windows to suppress popup notifications.
- [ ] **Taskbar & Chrome Toolbars:** Hide or crop out OS taskbar and browser URL bars. Use full-windowed Chromium mode.
- [ ] **Browser Zoom:** Set zoom to exactly 100% (`Ctrl + 0`).
- [ ] **Dev Server:** Verify dev server is running on `https://localhost:8081` (`npx @iwsdk/cli dev restart --open --foreground --allow-browser-automation`).

### OBS Studio Setup
- [ ] **Canvas Resolution:** `1920x1080` (or `2560x1440`).
- [ ] **Framerate:** Set strictly to `60.00 FPS` (constant framerate).
- [ ] **Source:** Window Capture targeting `chrome.exe: meta_vr_entry`.
- [ ] **Capture Cursor:** Enabled (shows virtual pointer/laser ray line cleanly).
- [ ] **Encoder:** NVIDIA NVENC H.264 / AMD VCE / x264 at 18,000 to 25,000 Kbps CBR.
- [ ] **Audio:** AAC 320 Kbps, 48 kHz.

---

## 2. In-App Pre-Flight Verification

Verify each item before recording:
- [ ] **Zero Scene Clutter:** No starter template robot or plinths in front of the user. Workspace is open and unobstructed.
- [ ] **Workflow Integrity:** Exactly 9 task cards in a radial arc and 12 dependency edges.
- [ ] **Critical Path:** Bright golden-amber splines connecting `requirements -> ui_design -> frontend_dev -> integration -> testing -> deployment`.
- [ ] **Header Metrics:** Top header reads: `Duration: 27 Days · Critical Path: 6 Tasks (Zero Slack) · Dependencies: 12 Constraints · Top Bottleneck: Integration (88/100)`.
- [ ] **Task Inspector:** Left panel populated with `integration` details (`4 Days`, `Slack: 0.0 Days`, `Downstream: 3 Tasks Blocked`, `Score: 88/100`).
- [ ] **Navigator Panel:** Right panel displays Recommendation #1: `Convergence Bottleneck: End-to-End System Integration (CRITICAL, 88/100)`.
- [ ] **Reset Button:** Confirm `Reset Demo` button is visible in top right of header HUD. Press `R` or click `Reset Demo` to verify instant baseline restoration.
- [ ] **Console Status:** Verify 0 console errors and 0 unhandled rejections in DevTools.

---

## 3. Rehearsal Routine & Timing Breakdown (Target: 2:40 / 160s)

Practice the 7-scene sequence with a stopwatch:

- [ ] **Scene 1 (0:00 – 0:20 | 20s):** Establishing wide view of radial DAG. Display lower-third disclosure caption:  
  *`Recorded using Meta Quest 3 emulation via IWER and the Immersive Web SDK.`*
- [ ] **Scene 2 (0:20 – 0:40 | 20s):** Pan eye-level view across the 9 tasks; emphasize the glowing golden-amber 27-day Critical Path.
- [ ] **Scene 3 (0:40 – 1:05 | 25s):** Select `integration` card (cyan halo activates); grab with distance ray and translate forward/right; show incident splines stretching smoothly.
- [ ] **Scene 4 (1:05 – 1:30 | 25s):** Pinch right output port of `architecture`; draft rubberband spline to its own input port (show red `REJECTED: Self-dependencies are forbidden`); drag to `testing` input port (show green `VALID CONNECTION`) and release to connect.
- [ ] **Scene 5 (1:30 – 1:55 | 25s):** Pan right to Navigator; view Recommendation #1 (`End-to-End System Integration`, 88/100); click **`Highlight 3D`**; show 3D card for `integration` pulsing with an amber halo.
- [ ] **Scene 6 (1:55 – 2:20 | 25s):** Focus on Task Inspector What-If Sandbox; click **`-1d`** stepper button; proposed duration shifts 4d $\to$ 3d; header updates to `26 Days Projected (-1.0d Improvement)`.
- [ ] **Scene 7 (2:20 – 2:40 | 20s):** Click **`Apply`** in inspector to commit 26d schedule; click **`Reset Demo`** in header to restore 27-day baseline; pull camera back for closing outro.

---

## 4. Voiceover & Audio Production

- [ ] **Microphone Quality:** Use a studio condenser or dynamic microphone with pop filter.
- [ ] **Pacing:** Speak at a natural, conversational tempo (~133 words per minute). Total script is **355 words**.
- [ ] **Clarity:** Pronounce technical terms naturally ("Critical Path Method", "Directed Acyclic Graph", "Immersive Web SDK").
- [ ] **Level Balance:** Peak voiceover audio between `-6 dB` and `-3 dB`. Keep UI audio subtle at `-20 dB`.
- [ ] **Zero Copyright Issues:** Do not add commercial music tracks. Use clean ambient background tones or voice-only with UI audio.

---

## 5. Post-Production & YouTube Upload Checklist

- [ ] **Video Length:** Strictly **under 3 minutes** (`2:38` to `2:45` target). Confirm duration before uploading.
- [ ] **Emulation Disclosure Overlay:** Ensure caption is visible during the first 10–15 seconds:  
  *`Recorded using Meta Quest 3 emulation via IWER and the Immersive Web SDK.`*
- [ ] **YouTube Visibility:** Set to **Public** (avoid private/unlisted access issues during judging).
- [ ] **Video Title:** `ORBIT — Spatial Intelligence Workspace | Meta VR Start Developer Competition 2026`
- [ ] **Description:** Include project overview, tech stack (IWSDK 1.1.0-rc.2, Three.js, EliCS, WebXR), and key features.
- [ ] **Category:** Science & Technology.
- [ ] **Link Copy:** Copy the public YouTube link and paste directly into the Devpost submission draft.
