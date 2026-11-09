import fs from 'node:fs';
import path from 'node:path';

export default async function run({ page, workspaceRoot }) {
  const f1 = page.frames()[1];

  const inspectDir = path.resolve(workspaceRoot, '..', 'temp_inspect', 'scene_tests');
  if (fs.existsSync(inspectDir)) fs.rmSync(inspectDir, { recursive: true, force: true });
  fs.mkdirSync(inspectDir, { recursive: true });

  const setCam = async (px, py, pz, lx, ly, lz) => {
    await f1.evaluate(({ px, py, pz, lx, ly, lz }) => {
      const orbit = window.__ORBIT__;
      const cam = orbit.world.camera || orbit.world.defaultCamera;
      cam.position.set(px, py, pz);
      cam.lookAt(lx, ly, lz);
    }, { px, py, pz, lx, ly, lz });
    await page.waitForTimeout(300);
  };

  // --- SCENE 1: Wide Establishing ---
  console.log('Testing Scene 1 setup...');
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.selectNode('integration');
  });
  await setCam(0, 1.55, 0.95, 0, 1.4, -1.6);
  await page.screenshot({ path: path.join(inspectDir, 's1_wide.png') });

  // --- SCENE 2: CPM Tour Sweep ---
  console.log('Testing Scene 2 sweep...');
  await setCam(-0.55, 1.45, 0.25, -0.3, 1.35, -1.65);
  await page.screenshot({ path: path.join(inspectDir, 's2_left.png') });
  await setCam(0.55, 1.45, 0.25, 0.3, 1.35, -1.65);
  await page.screenshot({ path: path.join(inspectDir, 's2_right.png') });

  // --- SCENE 3: Direct Spatial Manipulation ---
  console.log('Testing Scene 3 manipulation...');
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.selectNode('integration');
  });
  await setCam(0.12, 1.4, -0.65, 0.25, 1.35, -1.74);
  await page.screenshot({ path: path.join(inspectDir, 's3_before_move.png') });

  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    const ent = orbit.nodeEntities.get('integration');
    if (ent?.object3D) {
      ent.object3D.position.x += 0.38;
      ent.object3D.position.y += 0.14;
      ent.object3D.position.z -= 0.18;
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(inspectDir, 's3_after_move.png') });

  // --- SCENE 4: Dependency Validation & Cycle Detection ---
  console.log('Testing Scene 4 drafting...');
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.deselect();
    orbit.startDraftConnection('architecture');
  });
  await setCam(-0.4, 1.35, -0.65, -0.2, 1.35, -1.65);

  // Show invalid cycle to requirements (coral red)
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.draftCandidateDestNodeId = 'requirements';
    orbit.draftStatus = 'invalid';
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(inspectDir, 's4_invalid_red.png') });

  // Show valid connection to testing (emerald green)
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.draftCandidateDestNodeId = 'testing';
    orbit.draftStatus = 'valid';
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(inspectDir, 's4_valid_green.png') });

  // Complete connection
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.completeDraftConnection('testing');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(inspectDir, 's4_completed.png') });

  // --- SCENE 5: Navigator & Highlight ---
  console.log('Testing Scene 5 Navigator...');
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.deselect();
  });
  // Focus on Navigator panel on left
  await setCam(-0.65, 1.35, -0.6, -1.32, 1.35, -1.6);
  await page.screenshot({ path: path.join(inspectDir, 's5_nav_panel.png') });

  // Trigger Highlight 3D and pan camera toward integration
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.toggleActiveRecommendationHighlight();
  });
  await setCam(-0.35, 1.38, -0.6, -0.1, 1.35, -1.65);
  await page.screenshot({ path: path.join(inspectDir, 's5_nav_highlight.png') });

  // --- SCENE 6: Scenario Sandbox Stepper ---
  console.log('Testing Scene 6 Scenario Sandbox...');
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.selectNode('integration');
  });
  // Focus on details / scenario panel on right
  await setCam(0.65, 1.35, -0.6, 1.32, 1.35, -1.6);
  await page.screenshot({ path: path.join(inspectDir, 's6_scenario_before.png') });

  // Step -1d
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.adjustProposedDuration(-1);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(inspectDir, 's6_scenario_after.png') });

  // --- SCENE 7: Apply & Reset ---
  console.log('Testing Scene 7 Apply & Reset...');
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.applyCurrentScenario();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(inspectDir, 's7_applied.png') });

  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.deselect();
  });
  await setCam(0, 1.55, 0.95, 0, 1.4, -1.6);
  await page.screenshot({ path: path.join(inspectDir, 's7_reset_wide.png') });

  console.log('All scene tests completed successfully!');
}

