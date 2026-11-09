import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export default async function run({ page, cdp, workspaceRoot }) {
  console.log('--- Recording Scene 1: Opening & Problem Statement (20.0s) ---');

  const f1 = page.frames()[1];

  // Initialize scene state
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.deselect();
    orbit.clearSpatialHighlights();
    // Dismiss/minimize onboarding panel to provide an unobstructed establishing view
    if (orbit.onboardingPanel) {
      orbit.onboardingPanel.visible = false;
      orbit.onboardingPanel.position.y = -10;
    }
    const cam = orbit.world?.camera || orbit.world?.defaultCamera;
    if (cam) {
      cam.position.set(0.0, 1.62, 1.15);
      cam.lookAt(0, 1.4, -1.6);
    }
  });

  await page.waitForTimeout(600);

  const rawDir = path.resolve(workspaceRoot, '..', 'submission', 'final_demo', 'raw_scenes');
  const framesDir = path.join(rawDir, 'frames_01');
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

  const duration = 20.0;
  const durationMs = duration * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < durationMs) {
    const elapsed = (Date.now() - startTime) / 1000.0;
    await f1.evaluate(({ elapsed, duration }) => {
      const orbit = window.__ORBIT__;
      if (orbit.onboardingPanel && orbit.onboardingPanel.visible) {
        orbit.onboardingPanel.visible = false;
        orbit.onboardingPanel.position.y = -10;
      }
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        const p = Math.min(1.0, elapsed / duration);
        // Smooth camera glide forward into the workspace
        cam.position.z = 1.15 - 0.27 * p;
        cam.position.y = 1.62 - 0.07 * p + 0.015 * Math.sin(p * Math.PI * 2);
        cam.position.x = 0.03 * Math.sin(p * Math.PI);
        cam.lookAt(0, 1.4 - 0.04 * p, -1.6);
      }
    }, { elapsed, duration });
    await page.waitForTimeout(40);
  }

  await cdp.send('Page.stopScreencast');
  cdp.off('Page.screencastFrame', onFrame);

  console.log(`Captured ${frameIndex} frames for Scene 1.`);
  const outMp4 = path.join(rawDir, 'scene_01.mp4');
  if (fs.existsSync(outMp4)) fs.unlinkSync(outMp4);

  const inputFramerate = (frameIndex / duration).toFixed(3);
  const ffmpegCmd = `ffmpeg -y -framerate ${inputFramerate} -i "${framesDir}\\frame_%06d.jpg" -vf "scale=1920:1080" -c:v libx264 -preset fast -pix_fmt yuv420p -t ${duration} "${outMp4}"`;
  console.log(`Encoding scene_01.mp4 at ${inputFramerate} fps...`);
  execSync(ffmpegCmd);

  const stat = fs.statSync(outMp4);
  console.log(`Scene 1 complete: ${outMp4} (${stat.size} bytes)`);
  return { scene: 1, frames: frameIndex, size: stat.size };
}
