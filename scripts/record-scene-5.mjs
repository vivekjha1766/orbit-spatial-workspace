import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export default async function run({ page, cdp, workspaceRoot }) {
  console.log('--- Recording Scene 5: ORBIT Navigator & Bottleneck Intelligence (25.0s) ---');

  const f1 = page.frames()[1];

  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.deselect();
    orbit.clearSpatialHighlights();
    const cam = orbit.world?.camera || orbit.world?.defaultCamera;
    if (cam) {
      // Direct focus on Navigator Panel
      cam.position.set(-0.75, 1.35, -0.7);
      cam.lookAt(-1.32, 1.35, -1.6);
    }
    window.__SCENE5_STATE__ = { highlighted: false };
  });

  await page.waitForTimeout(600);

  const rawDir = path.resolve(workspaceRoot, '..', 'submission', 'final_demo', 'raw_scenes');
  const framesDir = path.join(rawDir, 'frames_05');
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
      const st = window.__SCENE5_STATE__;

      // t=11.0s: Trigger Highlight 3D on Navigator recommendation
      if (elapsed >= 11.0 && !st.highlighted) {
        orbit.toggleActiveRecommendationHighlight();
        st.highlighted = true;
      }

      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        if (elapsed < 11.0) {
          // Direct readable focus on Navigator panel
          cam.position.set(-0.75, 1.35, -0.7);
          cam.lookAt(-1.32, 1.35, -1.6);
        } else if (elapsed >= 11.0 && elapsed < 20.0) {
          // Smoothly pan camera from Navigator panel to include pulsing 3D card
          const p = (elapsed - 11.0) / 9.0;
          const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
          cam.position.x = -0.75 + 0.40 * ease;
          cam.position.y = 1.35 + 0.03 * ease;
          cam.position.z = -0.70;
          cam.lookAt(-1.32 + 1.22 * ease, 1.35, -1.65);
        } else {
          // Hold both Navigator and pulsing 3D card in view
          cam.position.set(-0.35, 1.38, -0.70);
          cam.lookAt(-0.10, 1.35, -1.65);
        }
      }
    }, { elapsed });
    await page.waitForTimeout(40);
  }

  await cdp.send('Page.stopScreencast');
  cdp.off('Page.screencastFrame', onFrame);

  console.log(`Captured ${frameIndex} frames for Scene 5.`);
  const outMp4 = path.join(rawDir, 'scene_05.mp4');
  if (fs.existsSync(outMp4)) fs.unlinkSync(outMp4);

  const inputFramerate = (frameIndex / duration).toFixed(3);
  const ffmpegCmd = `ffmpeg -y -framerate ${inputFramerate} -i "${framesDir}\\frame_%06d.jpg" -vf "scale=1920:1080" -c:v libx264 -preset fast -pix_fmt yuv420p -t ${duration} "${outMp4}"`;
  console.log(`Encoding scene_05.mp4 at ${inputFramerate} fps...`);
  execSync(ffmpegCmd);

  const stat = fs.statSync(outMp4);
  console.log(`Scene 5 complete: ${outMp4} (${stat.size} bytes)`);
  return { scene: 5, frames: frameIndex, size: stat.size };
}
