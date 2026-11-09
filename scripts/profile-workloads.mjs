import path from 'node:path';

export default async function run({ page }) {
  console.log('Resolving frame containing __ORBIT__...');
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
  if (!appTarget) {
    throw new Error('Could not find frame with window.__ORBIT__');
  }

  console.log('Found frame with window.__ORBIT__. Starting 6-workload performance audit...');

  const benchmarkFunction = async (name, durationMs, setup, tick, teardown) => {
    console.log(`\n--- Running Workload: ${name} (${durationMs} ms) ---`);
    const result = await appTarget.evaluate(
      async ({ name, durationMs, setupCode, tickCode, teardownCode }) => {
        const setupFn = setupCode ? new Function(setupCode) : null;
        const tickFn = tickCode ? new Function('frameIndex', 'elapsed', tickCode) : null;
        const teardownFn = teardownCode ? new Function(teardownCode) : null;

        if (setupFn) setupFn();

        const deltas = [];
        let frameCount = 0;
        let lastTime = performance.now();
        const startTime = lastTime;
        const initialHeap = performance.memory ? performance.memory.usedJSHeapSize : null;

        await new Promise((resolve) => {
          function onFrame(currentTime) {
            const delta = currentTime - lastTime;
            lastTime = currentTime;
            if (frameCount > 0) {
              // Skip first frame delta to avoid setup hitch
              deltas.push(delta);
            }
            frameCount++;

            const elapsed = currentTime - startTime;
            if (tickFn) {
              tickFn(frameCount, elapsed);
            }

            if (elapsed < durationMs) {
              requestAnimationFrame(onFrame);
            } else {
              resolve();
            }
          }
          requestAnimationFrame(onFrame);
        });

        if (teardownFn) teardownFn();

        const finalHeap = performance.memory ? performance.memory.usedJSHeapSize : null;
        const totalTime = performance.now() - startTime;

        // Compute statistics
        deltas.sort((a, b) => a - b);
        const count = deltas.length;
        const getPercentile = (p) => {
          if (count === 0) return 0;
          const idx = Math.min(Math.floor((p / 100) * count), count - 1);
          return deltas[idx];
        };

        const sum = deltas.reduce((acc, v) => acc + v, 0);
        const mean = count > 0 ? sum / count : 0;
        const p50 = getPercentile(50);
        const p75 = getPercentile(75);
        const p90 = getPercentile(90);
        const p95 = getPercentile(95);
        const p99 = getPercentile(99);
        const min = deltas[0] || 0;
        const max = deltas[count - 1] || 0;

        // Long frames exceeding vsync thresholds (at 60Hz: 16.67ms target)
        const framesOver20ms = deltas.filter((d) => d > 20).length;
        const framesOver33ms = deltas.filter((d) => d > 33.3).length; // Missed 1 vsync (<= 30 FPS interval)
        const framesOver50ms = deltas.filter((d) => d > 50).length;   // Missed 2 vsyncs

        const avgFps = count > 0 && totalTime > 0 ? (count / (totalTime / 1000)) : 0;

        return {
          name,
          durationMs: totalTime,
          frameCount: count,
          avgFps,
          p50,
          p75,
          p90,
          p95,
          p99,
          min,
          max,
          mean,
          framesOver20ms,
          framesOver33ms,
          framesOver50ms,
          heapBeforeMb: initialHeap ? initialHeap / (1024 * 1024) : null,
          heapAfterMb: finalHeap ? finalHeap / (1024 * 1024) : null,
          heapDeltaMb: initialHeap && finalHeap ? (finalHeap - initialHeap) / (1024 * 1024) : null,
        };
      },
      {
        name,
        durationMs,
        setupCode: setup,
        tickCode: tick,
        teardownCode: teardown,
      }
    );

    console.log(`Results for ${name}:`);
    console.log(`  Frames: ${result.frameCount}, Avg FPS: ${result.avgFps.toFixed(2)}`);
    console.log(`  p50: ${result.p50.toFixed(2)} ms, p95: ${result.p95.toFixed(2)} ms, max: ${result.max.toFixed(2)} ms`);
    console.log(`  Frames > 20ms: ${result.framesOver20ms} (${((result.framesOver20ms / result.frameCount) * 100).toFixed(1)}%)`);
    console.log(`  Frames > 33.3ms: ${result.framesOver33ms} (${((result.framesOver33ms / result.frameCount) * 100).toFixed(1)}%)`);
    console.log(`  Heap: ${result.heapBeforeMb?.toFixed(1)} MB -> ${result.heapAfterMb?.toFixed(1)} MB (delta: ${result.heapDeltaMb?.toFixed(2)} MB)`);
    return result;
  };

  const results = [];

  // Workload 1: Idle Workspace (5 seconds)
  results.push(await benchmarkFunction(
    '1. Idle Workspace',
    5000,
    `window.__ORBIT__.selectNode('integration');`,
    null,
    null
  ));

  // Workload 2: Node Selection and Dragging (5 seconds)
  results.push(await benchmarkFunction(
    '2. Node Selection and Dragging',
    5000,
    `
      const entity = window.__ORBIT__.nodeEntities.get('integration');
      window._initialPos = entity.object3D.position.clone();
    `,
    `
      const entity = window.__ORBIT__.nodeEntities.get('integration');
      if (entity && entity.object3D && window._initialPos) {
        entity.object3D.position.x = window._initialPos.x + Math.sin(elapsed * 0.005) * 0.12;
        entity.object3D.position.y = window._initialPos.y + Math.cos(elapsed * 0.005) * 0.06;
      }
    `,
    `
      const entity = window.__ORBIT__.nodeEntities.get('integration');
      if (entity && entity.object3D && window._initialPos) {
        entity.object3D.position.copy(window._initialPos);
      }
    `
  ));

  // Workload 3: Dependency Preview & Drafting (5 seconds)
  results.push(await benchmarkFunction(
    '3. Dependency Preview & Drafting',
    5000,
    `
      window.__ORBIT__.startDraftConnection('requirements');
    `,
    `
      // Simulate moving pointer target in space
      if (window.__ORBIT__.draftSpline) {
        const start = window.__ORBIT__.draftSourceWorldPos;
        const target = window.__ORBIT__.draftTargetWorldPos;
        target.set(
          start.x + 0.3 + Math.sin(elapsed * 0.006) * 0.15,
          start.y + Math.cos(elapsed * 0.006) * 0.1,
          start.z
        );
      }
    `,
    `
      window.__ORBIT__.cancelDraftConnection('Benchmark finished');
    `
  ));

  // Workload 4: Navigator Interaction (5 seconds)
  results.push(await benchmarkFunction(
    '4. Navigator Interaction',
    5000,
    `
      window.__ORBIT__.selectNode('integration');
      window._lastToggle = 0;
    `,
    `
      if (elapsed - window._lastToggle > 400) {
        window._lastToggle = elapsed;
        window.__ORBIT__.toggleActiveRecommendationHighlight();
      }
    `,
    `
      window.__ORBIT__.clearSpatialHighlights();
    `
  ));

  // Workload 5: Scenario Simulation and Application (5 seconds)
  results.push(await benchmarkFunction(
    '5. Scenario Simulation and Application',
    5000,
    `
      window.__ORBIT__.selectNode('integration');
      window._lastScenarioAction = 0;
      window._scenarioState = 0;
    `,
    `
      if (elapsed - window._lastScenarioAction > 800) {
        window._lastScenarioAction = elapsed;
        if (window._scenarioState === 0) {
          window.__ORBIT__.adjustProposedDuration(-1);
          window._scenarioState = 1;
        } else if (window._scenarioState === 1) {
          window.__ORBIT__.applyCurrentScenario();
          window._scenarioState = 2;
        } else if (window._scenarioState === 2) {
          window.__ORBIT__.adjustProposedDuration(2);
          window._scenarioState = 3;
        } else {
          window.__ORBIT__.discardCurrentScenario();
          window._scenarioState = 0;
        }
      }
    `,
    `
      window.__ORBIT__.discardCurrentScenario();
    `
  ));

  // Workload 6: Repeated Workspace Resets (10 consecutive cycles)
  console.log('\n--- Running Workload: 6. Repeated Workspace Resets (10 cycles) ---');
  const resetResult = await appTarget.evaluate(async () => {
    const cycles = 10;
    const initialHeap = performance.memory ? performance.memory.usedJSHeapSize : null;
    const resetDurations = [];
    const entityCounts = [];

    for (let i = 0; i < cycles; i++) {
      const t0 = performance.now();
      const res = window.__ORBIT__.resetSampleWorkspace();
      const t1 = performance.now();
      resetDurations.push(t1 - t0);

      // Verify entity count and CPM metrics
      const nodeCount = window.__ORBIT__.nodeEntities.size;
      const edgeCount = window.__ORBIT__.edgeBindings.length;
      const portCount = window.__ORBIT__.portEntities.length;
      const totalDuration = window.__ORBIT__.schedule.totalProjectDuration;

      entityCounts.push({ nodeCount, edgeCount, portCount, totalDuration, success: res.success });

      // Small pause between resets to simulate user interaction
      await new Promise((r) => setTimeout(r, 100));
    }

    const finalHeap = performance.memory ? performance.memory.usedJSHeapSize : null;
    return {
      cycles,
      resetDurations,
      avgResetDurationMs: resetDurations.reduce((a, b) => a + b, 0) / cycles,
      minResetDurationMs: Math.min(...resetDurations),
      maxResetDurationMs: Math.max(...resetDurations),
      entityCounts,
      heapBeforeMb: initialHeap ? initialHeap / (1024 * 1024) : null,
      heapAfterMb: finalHeap ? finalHeap / (1024 * 1024) : null,
      heapDeltaMb: initialHeap && finalHeap ? (finalHeap - initialHeap) / (1024 * 1024) : null,
    };
  });

  console.log(`Results for 6. Repeated Workspace Resets:`);
  console.log(`  Cycles: ${resetResult.cycles}, Avg Reset Duration: ${resetResult.avgResetDurationMs.toFixed(2)} ms`);
  console.log(`  Min Reset Duration: ${resetResult.minResetDurationMs.toFixed(2)} ms, Max: ${resetResult.maxResetDurationMs.toFixed(2)} ms`);
  console.log(`  Invariants preserved on all 10 resets: ${resetResult.entityCounts.every(c => c.nodeCount === 9 && c.edgeCount === 12 && c.portCount === 18 && c.totalDuration === 27)}`);
  console.log(`  Heap: ${resetResult.heapBeforeMb?.toFixed(1)} MB -> ${resetResult.heapAfterMb?.toFixed(1)} MB (delta: ${resetResult.heapDeltaMb?.toFixed(2)} MB)`);

  return {
    workloads: results,
    repeatedResets: resetResult,
  };
}

