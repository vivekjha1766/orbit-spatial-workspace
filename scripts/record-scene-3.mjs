import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export default async function run({ page, cdp, workspaceRoot }) {
  console.log('--- Recording Scene 3: Direct Task Selection & Spatial Manipulation (25.0s) ---');

  const f1 = page.frames()[1];

  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.deselect();
    orbit.clearSpatialHighlights();
    const cam = orbit.world?.camera || orbit.world?.defaultCamera;
    if (cam) {
      cam.position.set(0.08, 1.40, -0.95);
      cam.lookAt(0.35, 1.35, -1.74);
    }
    window.__SCENE3_STATE__ = {
      selected: false,
      origPos: null,
      translated: false
    };
  });

  await page.waitForTimeout(600);

  const rawDir = path.resolve(workspaceRoot, '..', 'submission', 'final_demo', 'raw_scenes');
  const framesDir = path.join(rawDir, 'frames_03');
  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

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

  const duration = 25.0;
  const durationMs = duration * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < durationMs) {
    const elapsed = (Date.now() - startTime) / 1000.0;
    await f1.evaluate(({ elapsed }) => {
      const orbit = window.__ORBIT__;
      const st = window.__SCENE3_STATE__;

      // t=2.0s: Select integration node -> cyan halo + populates inspector
      if (elapsed >= 2.0 && !st.selected) {
        orbit.selectNode('integration');
        st.selected = true;
        const intEnt = orbit.nodeEntities.get('integration');
        if (intEnt?.object3D) {
          st.origPos = intEnt.object3D.position.clone();
        }
      }

      // t=5.0s to 12.0s: Smooth 3D translation with dynamic spline stretching
      if (st.selected && st.origPos && elapsed >= 5.0 && elapsed <= 12.0) {
        const intEnt = orbit.nodeEntities.get('integration');
        if (intEnt?.object3D) {
          const p = (elapsed - 5.0) / 7.0; // 0 to 1
          // Smooth ease-out curve
          const ease = 1 - Math.pow(1 - p, 3);
          intEnt.object3D.position.x = st.origPos.x + 0.50 * ease;
          intEnt.object3D.position.y = st.origPos.y + 0.20 * ease;
          intEnt.object3D.position.z = st.origPos.z - 0.22 * ease;
        }
      }

      // t=12.0s to 25.0s: HOLD THE DISPLACED POSITION PROMINENTLY
      if (st.selected && st.origPos && elapsed > 12.0) {
        const intEnt = orbit.nodeEntities.get('integration');
        if (intEnt?.object3D) {
          intEnt.object3D.position.x = st.origPos.x + 0.50;
          intEnt.object3D.position.y = st.origPos.y + 0.20;
          intEnt.object3D.position.z = st.origPos.z - 0.22;
        }
      }

      // Subtle natural camera drift keeping both node and inspector in view
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        cam.position.x = 0.08 + 0.02 * Math.sin(elapsed * 0.4);
        cam.position.y = 1.40 + 0.015 * Math.sin(elapsed * 0.5);
      }
    }, { elapsed });
    await page.waitForTimeout(40);
  }

  await cdp.send('Page.stopScreencast');
  cdp.off('Page.screencastFrame', onFrame);

  console.log(`Captured ${frameIndex} frames for Scene 3.`);
  const outMp4 = path.join(rawDir, 'scene_03.mp4');
  if (fs.existsSync(outMp4)) fs.unlinkSync(outMp4);

  const inputFramerate = (frameIndex / duration).toFixed(3);
  const ffmpegCmd = `ffmpeg -y -framerate ${inputFramerate} -i "${framesDir}\\frame_%06d.jpg" -vf "scale=1920:1080" -c:v libx264 -preset fast -pix_fmt yuv420p -t ${duration} "${outMp4}"`;
  console.log(`Encoding scene_03.mp4 at ${inputFramerate} fps...`);
  execSync(ffmpegCmd);

  const stat = fs.statSync(outMp4);
  console.log(`Scene 3 complete: ${outMp4} (${stat.size} bytes)`);
  return { scene: 3, frames: frameIndex, size: stat.size };
}
