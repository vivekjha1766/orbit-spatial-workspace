export default async function run({ page }) {
  const f1 = page.frames()[1];

  const beforeShot = await page.screenshot({ path: '../temp_inspect/drag_before.png' });

  const moveRes = await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.selectNode('integration');
    const ent = orbit.nodeEntities.get('integration');
    const initialPos = ent.object3D.position.toArray();

    // Position camera to frame integration closely and prominently
    const cam = orbit.world.camera || orbit.world.defaultCamera;
    cam.position.set(-0.15, 1.45, 0.65);
    cam.lookAt(ent.object3D.position.x, ent.object3D.position.y, ent.object3D.position.z);

    // Translate node by (0.35, 0.12, -0.15)
    ent.object3D.position.x += 0.35;
    ent.object3D.position.y += 0.12;
    ent.object3D.position.z -= 0.15;

    const afterPos = ent.object3D.position.toArray();
    return { initialPos, afterPos };
  });

  await page.waitForTimeout(600);
  const afterShot = await page.screenshot({ path: '../temp_inspect/drag_after.png' });

  console.log('Move res:', JSON.stringify(moveRes, null, 2));
}

