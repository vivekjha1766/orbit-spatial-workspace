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
    const recs = orbit.navigator.analyzeWorkflow(orbit.graph);
    const rep = orbit.navigator.generateReport(orbit.graph);
    return {
      graphNodes: Object.keys(orbit.graph.nodes),
      recs: recs.map(r => ({
        id: r.id,
        category: r.category,
        severity: r.severity,
        title: r.title,
        explanation: r.explanation,
        affectedNodeIds: r.affectedNodeIds,
        proposedAction: r.proposedAction,
        evidence: r.evidence,
        canSimulate: r.canSimulate,
      })),
      summary: rep.summary,
    };
  });

  console.log('--- RUNTIME INSPECTION ---');
  console.log('Graph Nodes:', result.graphNodes);
  console.log('Summary:', result.summary);
  console.log('Total Recommendations:', result.recs.length);
  result.recs.forEach((r, idx) => {
    console.log(`\n[${idx + 1}] Category: ${r.category} | Severity: ${r.severity}`);
    console.log(`    Title: ${r.title}`);
    console.log(`    Explanation: ${r.explanation}`);
    console.log(`    Affected Nodes: ${r.affectedNodeIds.join(', ')}`);
    console.log(`    Proposed Action:`, JSON.stringify(r.proposedAction));
    console.log(`    Evidence:`, r.evidence);
  });
  return result;
}

