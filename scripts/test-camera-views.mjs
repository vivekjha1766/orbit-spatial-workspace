export default async function run({ page }) {
  const f1 = page.frames()[1];

  // Helper to set camera
  const setCam = async (px, py, pz, lx, ly, lz) => {
    await f1.evaluate(({ px, py, pz, lx, ly, lz }) => {
      const orbit = window.__ORBIT__;
      const cam = orbit.world.camera || orbit.world.defaultCamera;
      cam.position.set(px, py, pz);
      cam.lookAt(lx, ly, lz);
    }, { px, py, pz, lx, ly, lz });
    await page.waitForTimeout(400);
  };

  // View 1: Wide establishing
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.selectNode('integration');
  });
  await setCam(0, 1.55, 0.9, 0, 1.4, -1.6);
  await page.screenshot({ path: '../temp_inspect/view_01_wide.png' });

  // View 2: Critical Path graph sweep
  await setCam(-0.35, 1.42, 0.2, 0, 1.35, -1.65);
  await page.screenshot({ path: '../temp_inspect/view_02_graph.png' });

  // View 3: Close up on integration & manipulation
  await setCam(0.1, 1.38, -0.6, 0.25, 1.35, -1.74);
  await page.screenshot({ path: '../temp_inspect/view_03_manipulation.png' });

  // View 5: Navigator panel (left)
  await setCam(-0.65, 1.35, -0.6, -1.32, 1.35, -1.6);
  await page.screenshot({ path: '../temp_inspect/view_05_navigator.png' });

  // View 6: Scenario panel (right)
  await setCam(0.65, 1.35, -0.6, 1.32, 1.35, -1.6);
  await page.screenshot({ path: '../temp_inspect/view_06_scenario.png' });

  console.log('Saved view_01, view_02, view_03, view_05, view_06');
}

