export default async function run({ page }) {
  console.log('--- AUDITING GRAPH BASELINE & DEPENDENCY CANDIDATES ---');

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

    const g = orbit.graph;
    const nodes = Object.keys(g.nodes);
    const edges = g.edges.map(e => ({ id: e.id, from: e.from, to: e.to }));
    const gm = orbit.graphManager;

    // Check if integration -> testing exists in baseline
    const hasIntToTesting = edges.some(e => e.from === 'integration' && e.to === 'testing');
    const existingIntToTestingEdge = edges.find(e => e.from === 'integration' && e.to === 'testing');

    // Validation checks
    const valIntToTesting = gm.validateEdgeCandidate('integration', 'testing');
    const valArchToReq = gm.validateEdgeCandidate('architecture', 'requirements');
    const valArchToTesting = gm.validateEdgeCandidate('architecture', 'testing');
    const valUiToTesting = gm.validateEdgeCandidate('ui_design', 'testing');

    // Test drafting and completing architecture -> testing
    const countBefore = orbit.graph.edges.length;
    orbit.startDraftConnection('architecture');
    const completeRes = orbit.completeDraftConnection('testing');
    const countAfter = orbit.graph.edges.length;
    const projectDurationAfter = orbit.schedule.projectDuration;

    // Check edges after
    const addedEdge = orbit.graph.edges.find(e => e.from === 'architecture' && e.to === 'testing');

    // Test resetting
    orbit.resetSampleWorkspace();
    const countAfterReset = orbit.graph.edges.length;
    const projectDurationReset = orbit.schedule.projectDuration;

    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      edges,
      hasIntToTesting,
      existingIntToTestingEdge,
      valIntToTesting,
      valArchToReq,
      valArchToTesting,
      valUiToTesting,
      draftExecution: {
        countBefore,
        completeRes,
        countAfter,
        projectDurationAfter,
        addedEdge,
        countAfterReset,
        projectDurationReset
      }
    };
  });

  console.log('AUDIT RESULT:', JSON.stringify(result, null, 2));
  return result;
}

