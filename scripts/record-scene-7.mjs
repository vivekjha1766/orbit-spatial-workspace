import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export default async function run({ page, cdp, workspaceRoot }) {
  console.log('--- Recording Scene 7: Approval, Reset Demo & Closing (20.0s) ---');

  const f1 = page.frames()[1];

  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    const cam = orbit.world?.camera || orbit.world?.defaultCamera;
    if (cam) {
      cam.position.set(0.45, 1.38, -0.7);
      cam.lookAt(1.0, 1.35, -1.6);
    }
    // Dismiss/minimize onboarding panel so it does not obscure the shot
    if (orbit.onboardingPanel) {
      orbit.onboardingPanel.visible = false;
      orbit.onboardingPanel.position.y = -10;
    }
    window.__SCENE7_STATE__ = { applied: false, reset: false };
  });

  await page.waitForTimeout(600);

  const rawDir = path.resolve(workspaceRoot, '..', 'submission', 'final_demo', 'raw_scenes');
  const framesDir = path.join(rawDir, 'frames_07');
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
    await f1.evaluate(({ elapsed }) => {
      const orbit = window.__ORBIT__;
      const st = window.__SCENE7_STATE__;

      // t=2.5s: Click Apply -> commits scenario changes to baseline (26d)
      if (elapsed >= 2.5 && !st.applied) {
        orbit.applyCurrentScenario();
        st.applied = true;
      }

      // t=6.0s: Click Reset Demo -> cleanly restores original 27d baseline
      if (elapsed >= 6.0 && !st.reset) {
        orbit.resetSampleWorkspace();
        orbit.deselect();
        // Immediately dismiss onboarding panel so it does not reappear
        if (orbit.onboardingPanel) {
          orbit.onboardingPanel.visible = false;
          orbit.onboardingPanel.position.y = -10;
        }
        st.reset = true;
      }

      // Ensure onboarding panel remains hidden after reset
      if (st.reset && orbit.onboardingPanel && orbit.onboardingPanel.visible) {
        orbit.onboardingPanel.visible = false;
        orbit.onboardingPanel.position.y = -10;
      }

      // t=7.0s to 15.0s: Camera glides back to wide orbital establishing view
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam && elapsed >= 7.0) {
        const p = Math.min(1.0, (elapsed - 7.0) / 8.0);
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
        cam.position.x = 0.45 - 0.45 * ease;
        cam.position.y = 1.38 + 0.24 * ease;
        cam.position.z = -0.70 + 1.85 * ease;
        cam.lookAt(1.0 - 1.0 * ease, 1.35 + 0.05 * ease, -1.6);
      }
    }, { elapsed });
    await page.waitForTimeout(40);
  }

  await cdp.send('Page.stopScreencast');
  cdp.off('Page.screencastFrame', onFrame);

  console.log(`Captured ${frameIndex} frames for Scene 7.`);
  const outMp4 = path.join(rawDir, 'scene_07.mp4');
  if (fs.existsSync(outMp4)) fs.unlinkSync(outMp4);

  const inputFramerate = (frameIndex / duration).toFixed(3);
  const ffmpegCmd = `ffmpeg -y -framerate ${inputFramerate} -i "${framesDir}\\frame_%06d.jpg" -vf "scale=1920:1080" -c:v libx264 -preset fast -pix_fmt yuv420p -t ${duration} "${outMp4}"`;
  console.log(`Encoding scene_07.mp4 at ${inputFramerate} fps...`);
  execSync(ffmpegCmd);

  const stat = fs.statSync(outMp4);
  console.log(`Scene 7 complete: ${outMp4} (${stat.size} bytes)`);
  return { scene: 7, frames: frameIndex, size: stat.size };
}
