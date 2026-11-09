export default async function run({ page }) {
  let appTarget = null;
  for (const f of page.frames()) {
    try {
      const hasOrbit = await f.evaluate(() => typeof window.__ORBIT__ !== 'undefined');
      if (hasOrbit) {
        appTarget = f;
        break;
      }
    } catch {}
  }
  if (!appTarget) {
    const hasOrbit = await page.evaluate(() => typeof window.__ORBIT__ !== 'undefined');
    if (hasOrbit) appTarget = page;
  }

  const result = await appTarget.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.selectNode('integration');
    orbit.adjustProposedDuration(-1);

    const sm = orbit.scenarioManager;
    const sim = sm.getSimulationResult();

    return {
      state: sm.getState(),
      draftDuration: sm.getDraftDuration('integration'),
      baselineDuration: orbit.graph.nodes['integration'].duration,
      projectedProjectDuration: sim?.projectedSchedule.projectDuration,
      baselineProjectDuration: orbit.schedule.projectDuration,
      durationDelta: sim?.durationDelta,
      isImprovement: sim?.isImprovement,
      criticalPath: sim?.projectedSchedule.criticalPath,
    };
  });

  console.log('--- WHAT-IF SCENARIO EXACT VALUES ---');
  console.log(result);
  return result;
}
