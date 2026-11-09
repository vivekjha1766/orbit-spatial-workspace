import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export default async function run({ page, cdp, workspaceRoot }) {
  console.log('--- Recording Scene 2: Spatial Workflow Overview & Critical Path (20.0s) ---');

  const f1 = page.frames()[1];

  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.deselect();
    orbit.clearSpatialHighlights();
    const cam = orbit.world?.camera || orbit.world?.defaultCamera;
    if (cam) {
      cam.position.set(-0.65, 1.45, 0.45);
      cam.lookAt(-0.25, 1.35, -1.65);
    }
  });

  await page.waitForTimeout(600);

  const rawDir = path.resolve(workspaceRoot, '..', 'submission', 'final_demo', 'raw_scenes');
  const framesDir = path.join(rawDir, 'frames_02');
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
      const cam = orbit.world?.camera || orbit.world?.defaultCamera;
      if (cam) {
        const p = Math.min(1.0, elapsed / duration);
        // Continuous smooth arc sweep from left tasks to right tasks across golden Critical Path
        cam.position.x = -0.65 + 1.30 * p;
        cam.position.y = 1.45 + 0.04 * Math.sin(p * Math.PI);
        cam.position.z = 0.45 - 0.08 * Math.sin(p * Math.PI);
        cam.lookAt(-0.25 + 0.60 * p, 1.35, -1.65);
      }
    }, { elapsed, duration });
    await page.waitForTimeout(40);
  }

  await cdp.send('Page.stopScreencast');
  cdp.off('Page.screencastFrame', onFrame);

  console.log(`Captured ${frameIndex} frames for Scene 2.`);
  const outMp4 = path.join(rawDir, 'scene_02.mp4');
  if (fs.existsSync(outMp4)) fs.unlinkSync(outMp4);

  const inputFramerate = (frameIndex / duration).toFixed(3);
  const ffmpegCmd = `ffmpeg -y -framerate ${inputFramerate} -i "${framesDir}\\frame_%06d.jpg" -vf "scale=1920:1080" -c:v libx264 -preset fast -pix_fmt yuv420p -t ${duration} "${outMp4}"`;
  console.log(`Encoding scene_02.mp4 at ${inputFramerate} fps...`);
  execSync(ffmpegCmd);

  const stat = fs.statSync(outMp4);
  console.log(`Scene 2 complete: ${outMp4} (${stat.size} bytes)`);
  return { scene: 2, frames: frameIndex, size: stat.size };
}
