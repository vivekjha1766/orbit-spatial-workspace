import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const SCENE_DEFS = [
  { id: 1, name: 'Problem & Product Introduction', duration: 20.0 },
  { id: 2, name: 'Spatial Workflow Overview & Critical Path', duration: 20.0 },
  { id: 3, name: 'Direct Task Selection & Spatial Manipulation', duration: 25.0 },
  { id: 4, name: 'Spatial Dependency Creation & Transactional Validation', duration: 25.0 },
  { id: 5, name: 'ORBIT Navigator & Bottleneck Intelligence', duration: 25.0 },
  { id: 6, name: 'What-If Scenario Simulation & Schedule Comparison', duration: 25.0 },
  { id: 7, name: 'Approval, Reset Demo & Closing', duration: 20.0 },
];

export default async function run({ page, cdp, workspaceRoot }) {
  console.log('=== STARTING AUTOMATED DEMO RECORDING FOR ALL 7 SCENES ===');

  let appTarget = null;
  for (const f of page.frames()) {
    try {
      const hasOrbit = await f.evaluate(() => typeof window.__ORBIT__ !== 'undefined');
      if (hasOrbit) {
        appTarget = f;
        break;
      }
    } catch {}
  }
  if (!appTarget) {
    const hasOrbit = await page.evaluate(() => typeof window.__ORBIT__ !== 'undefined');
    if (hasOrbit) appTarget = page;
  }
  if (!appTarget) {
    throw new Error('Could not find frame with window.__ORBIT__');
  }

  const rawDir = path.resolve(workspaceRoot, '..', 'submission', 'final_demo', 'raw_scenes');
  fs.mkdirSync(rawDir, { recursive: true });

  const recordScene = async (sceneDef, setupFn, updateFn) => {
    const { id, name, duration } = sceneDef;
    console.log(`\n--- Recording Scene ${id}: ${name} (${duration}s) ---`);

    // Clean frame directory
    const framesDir = path.join(rawDir, `frames_${String(id).padStart(2, '0')}`);
    if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
    fs.mkdirSync(framesDir, { recursive: true });

    // Initial setup in app
    await appTarget.evaluate(setupFn);
    await page.waitForTimeout(600);

    let frameIndex = 0;
    const onFrame = async (params) => {
      const filename = path.join(framesDir, `frame_${String(frameIndex++).padStart(6, '0')}.jpg`);
      fs.writeFileSync(filename, Buffer.from(params.data, 'base64'));
      try {
        await cdp.send('Page.screencastFrameAck', { sessionId: params.sessionId });
      } catch {}
    };

    cdp.on('Page.screencastFrame', onFrame);

    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 90,
      maxWidth: 1920,
      maxHeight: 1080,
      everyNthFrame: 1
    });

    const startTime = Date.now();
    const durationMs = duration * 1000;
    while (Date.now() - startTime < durationMs) {
      const elapsed = (Date.now() - startTime) / 1000.0;
      await appTarget.evaluate(updateFn, { elapsed, duration });
      await page.waitForTimeout(66); // ~15 update ticks per second
    }

    await cdp.send('Page.stopScreencast');
    cdp.off('Page.screencastFrame', onFrame);

    console.log(`Captured ${frameIndex} frames for Scene ${id}`);

    const outMp4 = path.join(rawDir, `scene_${String(id).padStart(2, '0')}.mp4`);
    if (fs.existsSync(outMp4)) fs.unlinkSync(outMp4);

    // Calculate exact input framerate so the video duration matches target duration perfectly
    const inputFramerate = (frameIndex / duration).toFixed(3);
    const ffmpegCmd = `ffmpeg -y -framerate ${inputFramerate} -i "${framesDir}\\frame_%06d.jpg" -vf "scale=1920:1080" -c:v libx264 -preset fast -pix_fmt yuv420p -t ${duration} "${outMp4}"`;
    console.log(`Encoding scene_${String(id).padStart(2, '0')}.mp4 at ${inputFramerate} fps...`);
    execSync(ffmpegCmd);

    const stat = fs.statSync(outMp4);
    console.log(`Scene ${id} finished: ${outMp4} (${stat.size} bytes)`);
    return { id, frameIndex, size: stat.size };
  };

  const results = [];

  // ================= SCENE 1 =================
  results.push(await recordScene(
    SCENE_DEFS[0],
    () => {
      const orbit = window.__ORBIT__;
      orbit.resetSampleWorkspace();
      orbit.deselect();
      orbit.clearSpatialHighlights();
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        cam.position.set(0, 1.55, 1.15);
        cam.rotation.set(-0.16, 0, 0);
      }
    },
    ({ elapsed, duration }) => {
      const orbit = window.__ORBIT__;
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        cam.position.z = 1.15 - 0.1 * (elapsed / duration);
        cam.position.y = 1.55 + 0.02 * Math.sin(elapsed * 0.5);
      }
    }
  ));

  // ================= SCENE 2 =================
  results.push(await recordScene(
    SCENE_DEFS[1],
    () => {
      const orbit = window.__ORBIT__;
      orbit.deselect();
      orbit.clearSpatialHighlights();
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        cam.position.set(-0.45, 1.48, 0.95);
        cam.rotation.set(-0.14, 0.25, 0);
      }
    },
    ({ elapsed, duration }) => {
      const orbit = window.__ORBIT__;
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        const p = elapsed / duration;
        cam.position.x = -0.45 + 0.9 * p;
        cam.rotation.y = 0.25 - 0.5 * p;
        cam.position.y = 1.48 + 0.03 * Math.sin(p * Math.PI);
      }
    }
  ));

  // ================= SCENE 3 =================
  results.push(await recordScene(
    SCENE_DEFS[2],
    () => {
      const orbit = window.__ORBIT__;
      orbit.deselect();
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        cam.position.set(-0.18, 1.45, 0.9);
        cam.rotation.set(-0.12, 0.08, 0);
      }
      window.__SCENE3_STATE__ = { selected: false, origPos: null };
    },
    ({ elapsed }) => {
      const orbit = window.__ORBIT__;
      const st = window.__SCENE3_STATE__;
      
      // Select integration at t=2s
      if (elapsed >= 2.0 && !st.selected) {
        orbit.selectNode('integration');
        st.selected = true;
        const intEnt = orbit.nodeEntities.get('integration');
        if (intEnt?.object3D) {
          st.origPos = intEnt.object3D.position.clone();
        }
      }

      // Smooth translation between t=5s and t=17s
      if (st.selected && st.origPos && elapsed >= 5.0 && elapsed <= 17.0) {
        const intEnt = orbit.nodeEntities.get('integration');
        if (intEnt?.object3D) {
          const transP = (elapsed - 5.0) / 12.0;
          const arc = Math.sin(transP * Math.PI);
          intEnt.object3D.position.x = st.origPos.x + 0.28 * arc;
          intEnt.object3D.position.z = st.origPos.z + 0.18 * arc;
          intEnt.object3D.position.y = st.origPos.y + 0.06 * arc;
        }
      }
      if (st.selected && st.origPos && elapsed > 17.0) {
        const intEnt = orbit.nodeEntities.get('integration');
        if (intEnt?.object3D) {
          intEnt.object3D.position.copy(st.origPos);
        }
      }
    }
  ));

  // ================= SCENE 4 =================
  results.push(await recordScene(
    SCENE_DEFS[3],
    () => {
      const orbit = window.__ORBIT__;
      orbit.deselect();
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        cam.position.set(0.0, 1.42, 0.85);
        cam.rotation.set(-0.1, 0, 0);
      }
      window.__SCENE4_STATE__ = { draft1: false, reject1: false, draft2: false, confirm2: false };
    },
    ({ elapsed }) => {
      const orbit = window.__ORBIT__;
      const st = window.__SCENE4_STATE__;

      // t=2s: Start draft connection from architecture
      if (elapsed >= 2.0 && !st.draft1) {
        orbit.startDraftConnection('architecture');
        st.draft1 = true;
      }

      // t=6s: Attempt invalid self-loop connection (architecture -> architecture)
      if (elapsed >= 6.0 && !st.reject1) {
        orbit.completeDraftConnection('architecture');
        st.reject1 = true;
      }

      // t=11s: Start valid draft connection from architecture
      if (elapsed >= 11.0 && !st.draft2) {
        orbit.startDraftConnection('architecture');
        st.draft2 = true;
      }

      // t=15s: Complete valid connection to testing
      if (elapsed >= 15.0 && !st.confirm2) {
        orbit.completeDraftConnection('testing');
        st.confirm2 = true;
      }
    }
  ));

  // ================= SCENE 5 =================
  results.push(await recordScene(
    SCENE_DEFS[4],
    () => {
      const orbit = window.__ORBIT__;
      orbit.deselect();
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        cam.position.set(0.25, 1.45, 0.88);
        cam.rotation.set(-0.1, -0.2, 0);
      }
      window.__SCENE5_STATE__ = { highlighted: false };
    },
    ({ elapsed }) => {
      const orbit = window.__ORBIT__;
      const st = window.__SCENE5_STATE__;

      // t=4s: Trigger Highlight 3D on Navigator recommendation
      if (elapsed >= 4.0 && !st.highlighted) {
        orbit.toggleActiveRecommendationHighlight();
        st.highlighted = true;
      }

      // Smooth camera glide to view both Navigator HUD and pulsing 3D card
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam && elapsed >= 6.0) {
        const p = Math.min(1.0, (elapsed - 6.0) / 10.0);
        cam.position.x = 0.25 - 0.2 * p;
        cam.rotation.y = -0.2 + 0.15 * p;
      }
    }
  ));

  // ================= SCENE 6 =================
  results.push(await recordScene(
    SCENE_DEFS[5],
    () => {
      const orbit = window.__ORBIT__;
      orbit.clearSpatialHighlights();
      orbit.selectNode('integration');
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        cam.position.set(-0.24, 1.45, 0.86);
        cam.rotation.set(-0.1, 0.12, 0);
      }
      window.__SCENE6_STATE__ = { stepped: false };
    },
    ({ elapsed }) => {
      const orbit = window.__ORBIT__;
      const st = window.__SCENE6_STATE__;

      // t=4s: Click -1d stepper on integration (4d -> 3d)
      if (elapsed >= 4.0 && !st.stepped) {
        orbit.adjustProposedDuration(-1);
        st.stepped = true;
      }

      // Slight head tracking drift
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        cam.position.y = 1.45 + 0.015 * Math.sin(elapsed * 0.4);
      }
    }
  ));

  // ================= SCENE 7 =================
  results.push(await recordScene(
    SCENE_DEFS[6],
    () => {
      const orbit = window.__ORBIT__;
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        cam.position.set(-0.24, 1.45, 0.86);
        cam.rotation.set(-0.1, 0.12, 0);
      }
      window.__SCENE7_STATE__ = { applied: false, reset: false };
    },
    ({ elapsed }) => {
      const orbit = window.__ORBIT__;
      const st = window.__SCENE7_STATE__;

      // t=2s: Apply scenario changes to baseline
      if (elapsed >= 2.0 && !st.applied) {
        orbit.applyCurrentScenario();
        st.applied = true;
      }

      // t=6s: Reset demo back to baseline
      if (elapsed >= 6.0 && !st.reset) {
        orbit.resetSampleWorkspace();
        orbit.deselect();
        st.reset = true;
      }

      // t=8s to 18s: Camera glides back to wide establishing shot
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam && elapsed >= 8.0) {
        const p = Math.min(1.0, (elapsed - 8.0) / 10.0);
        cam.position.x = -0.24 + 0.24 * p;
        cam.position.y = 1.45 + 0.1 * p;
        cam.position.z = 0.86 + 0.28 * p;
        cam.rotation.y = 0.12 - 0.12 * p;
      }
    }
  ));

  console.log('\n=== ALL 7 SCENES SUCCESSFULLY RECORDED ===');
  for (const r of results) {
    console.log(`  Scene ${r.id}: ${r.frameIndex} frames (${r.size} bytes)`);
  }

  return { ok: true, results };
}

