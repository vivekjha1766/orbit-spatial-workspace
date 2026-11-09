export default async function run({ page }) {
  const f0 = page.frames()[0];
  const f1 = page.frames()[1];

  const f0Info = await f0.evaluate(() => {
    return {
      bodyHtml: document.body.innerHTML.slice(0, 500),
      iframes: Array.from(document.querySelectorAll('iframe')).map(i => ({
        src: i.src,
        width: i.offsetWidth,
        height: i.offsetHeight,
        id: i.id,
        className: i.className
      }))
    };
  });

  const f1Info = await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    return {
      hasCanvas: !!document.querySelector('canvas'),
      canvasWidth: document.querySelector('canvas')?.width,
      canvasHeight: document.querySelector('canvas')?.height,
      canvasClientWidth: document.querySelector('canvas')?.clientWidth,
      canvasClientHeight: document.querySelector('canvas')?.clientHeight,
      panels: {
        taskInspector: !!orbit?.taskInspectorPanel,
        navigator: !!orbit?.navigatorPanel,
        scenario: !!orbit?.scenarioPanel,
        onboarding: !!orbit?.onboardingPanel,
      },
      selectedNodeId: orbit?.selectedNodeId,
      scenarioState: orbit?.scenarioManager?.state?.mode,
      activeRec: orbit?.activeRecommendationId
    };
  });

  console.log('f0Info:', JSON.stringify(f0Info, null, 2));
  console.log('f1Info:', JSON.stringify(f1Info, null, 2));
  return { f0Info, f1Info };
}
