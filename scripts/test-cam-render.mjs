import fs from 'node:fs';

export default async function run({ page }) {
  const f1 = page.frames()[1];

  // Shot 1: default camera
  const shot1 = await page.screenshot({ path: '../temp_inspect/cam_test_1.png' });

  // Move camera
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    const cam = orbit.world.camera || orbit.world.defaultCamera;
    cam.position.x += 0.8;
    cam.position.y += 0.3;
    cam.lookAt(0, 1.4, 0);
  });

  await page.waitForTimeout(500);

  // Shot 2: moved camera
  const shot2 = await page.screenshot({ path: '../temp_inspect/cam_test_2.png' });

  console.log('Saved cam_test_1.png and cam_test_2.png');
}

