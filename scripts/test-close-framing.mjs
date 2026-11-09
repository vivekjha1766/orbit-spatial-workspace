export default async function run({ page }) {
  const f1 = page.frames()[1];

  const setCam = async (px, py, pz, lx, ly, lz) => {
    await f1.evaluate(({ px, py, pz, lx, ly, lz }) => {
      const orbit = window.__ORBIT__;
      const cam = orbit.world.camera || orbit.world.defaultCamera;
      cam.position.set(px, py, pz);
      cam.lookAt(lx, ly, lz);
    }, { px, py, pz, lx, ly, lz });
    await page.waitForTimeout(300);
  };

  // Scene 3 Closer Framing
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.selectNode('integration');
  });
  await setCam(0.05, 1.38, -1.1, 0.35, 1.35, -1.74);
  await page.screenshot({ path: '../temp_inspect/scene_tests/s3_close_before.png' });

  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    const ent = orbit.nodeEntities.get('integration');
    if (ent?.object3D) {
      ent.object3D.position.x += 0.55;
      ent.object3D.position.y += 0.22;
      ent.object3D.position.z -= 0.25;
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '../temp_inspect/scene_tests/s3_close_after.png' });

  // Scene 4 Wide Sweep Framing
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.deselect();
    orbit.startDraftConnection('architecture');
  });
  await setCam(-0.1, 1.35, -1.05, -0.1, 1.35, -1.6);

  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.draftCandidateDestNodeId = 'requirements';
    orbit.draftStatus = 'invalid';
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '../temp_inspect/scene_tests/s4_close_red.png' });

  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.draftCandidateDestNodeId = 'testing';
    orbit.draftStatus = 'valid';
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '../temp_inspect/scene_tests/s4_close_green.png' });

  // Scene 6 Direct Scenario Panel Framing
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.selectNode('integration');
  });
  await setCam(1.15, 1.35, -1.05, 1.32, 1.35, -1.6);
  await page.screenshot({ path: '../temp_inspect/scene_tests/s6_panel_before.png' });

  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.adjustProposedDuration(-1);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '../temp_inspect/scene_tests/s6_panel_after.png' });

  console.log('Saved close framing tests');
}

