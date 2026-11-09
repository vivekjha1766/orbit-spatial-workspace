import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export default async function run({ page, cdp, workspaceRoot }) {
  console.log('--- Recording Scene 6: What-If Scenario Simulation & Schedule Comparison (25.0s) ---');

  const f1 = page.frames()[1];

  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.clearSpatialHighlights();
    orbit.selectNode('integration');
    const cam = orbit.world?.camera || orbit.world?.defaultCamera;
    if (cam) {
      // Direct readable focus on Scenario / Task Inspector panel on the right
      cam.position.set(0.75, 1.35, -0.7);
      cam.lookAt(1.32, 1.35, -1.6);
    }
    window.__SCENE6_STATE__ = { stepped: false };
  });

  await page.waitForTimeout(600);

  const rawDir = path.resolve(workspaceRoot, '..', 'submission', 'final_demo', 'raw_scenes');
  const framesDir = path.join(rawDir, 'frames_06');
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
      const st = window.__SCENE6_STATE__;

      // t=5.0s: Click -1d stepper on integration (4d -> 3d) -> projected 27d -> 26d (-1.0d)
      if (elapsed >= 5.0 && !st.stepped) {
        orbit.adjustProposedDuration(-1);
        st.stepped = true;
      }

      // Subtle breathing camera drift keeping panel 100% sharp and readable
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        cam.position.x = 0.75 + 0.02 * Math.sin(elapsed * 0.4);
        cam.position.y = 1.35 + 0.012 * Math.sin(elapsed * 0.5);
      }
    }, { elapsed });
    await page.waitForTimeout(40);
  }

  await cdp.send('Page.stopScreencast');
  cdp.off('Page.screencastFrame', onFrame);

  console.log(`Captured ${frameIndex} frames for Scene 6.`);
  const outMp4 = path.join(rawDir, 'scene_06.mp4');
  if (fs.existsSync(outMp4)) fs.unlinkSync(outMp4);

  const inputFramerate = (frameIndex / duration).toFixed(3);
  const ffmpegCmd = `ffmpeg -y -framerate ${inputFramerate} -i "${framesDir}\\frame_%06d.jpg" -vf "scale=1920:1080" -c:v libx264 -preset fast -pix_fmt yuv420p -t ${duration} "${outMp4}"`;
  console.log(`Encoding scene_06.mp4 at ${inputFramerate} fps...`);
  execSync(ffmpegCmd);

  const stat = fs.statSync(outMp4);
  console.log(`Scene 6 complete: ${outMp4} (${stat.size} bytes)`);
  return { scene: 6, frames: frameIndex, size: stat.size };
}
