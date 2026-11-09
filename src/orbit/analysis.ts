/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * Workflow Analysis: Downstream Impact, Bottleneck Detection,
 * Priority Scoring, and What-If Scenario Simulation.
 */

import { computeSchedule } from './cpm.js';
import { WorkflowGraphManager } from './graph.js';
import type {
  AgentRecommendation,
  BottleneckNode,
  DownstreamImpact,
  PriorityScore,
  ScheduleAnalysis,
  WorkflowGraph,
  WorkflowScenario,
} from './types.js';

/**
 * Weights for the deterministic priority scoring model. Sum equals 1.0.
 */
export const PRIORITY_MODEL_WEIGHTS = {
  inherentPriority: 0.25,
  criticalPathProximity: 0.3,
  downstreamImpact: 0.25,
  risk: 0.1,
  durationFootprint: 0.1,
} as const;

const PRIORITY_VALUE_MAP: Record<string, number> = {
  critical: 1.0,
  high: 0.75,
  medium: 0.5,
  low: 0.25,
};

const RISK_VALUE_MAP: Record<string, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.2,
};

/**
 * Analyzes the downstream dependency blast radius of a specific node.
 */
export function computeDownstreamImpact(
  graph: WorkflowGraph,
  nodeId: string,
  scheduleAnalysis?: ScheduleAnalysis,
): DownstreamImpact {
  if (!graph.nodes[nodeId]) {
    throw new Error(`Node "${nodeId}" does not exist in graph`);
  }

  const schedule = scheduleAnalysis ?? computeSchedule(graph);
  const nodeSchedule = schedule.schedules[nodeId];
  const delayTolerance = nodeSchedule ? nodeSchedule.totalFloat : 0;

  // Build outgoing adjacency
  const outgoing = new Map<string, string[]>();
  for (const id of Object.keys(graph.nodes)) {
    outgoing.set(id, []);
  }
  for (const edge of graph.edges) {
    outgoing.get(edge.from)?.push(edge.to);
  }

  const directSuccessorIds = [...(outgoing.get(nodeId) ?? [])];

  // Compute transitive closure via BFS
  const transitiveSuccessorIds: string[] = [];
  const visited = new Set<string>();
  const queue = [...directSuccessorIds];

  for (const succ of directSuccessorIds) {
    visited.add(succ);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    transitiveSuccessorIds.push(current);

    const nextNeighbors = outgoing.get(current) ?? [];
    for (const next of nextNeighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  // Find all impacted critical path nodes
  const criticalPathSet = new Set(schedule.criticalPath);
  const impactedCriticalPathNodes = transitiveSuccessorIds.filter((id) =>
    criticalPathSet.has(id),
  );

  return {
    sourceNodeId: nodeId,
    directSuccessorIds,
    transitiveSuccessorIds,
    impactedCriticalPathNodes,
    delayTolerance,
    delayImpactOnProject: (slippage: number): number => {
      if (slippage <= delayTolerance) {
        return 0;
      }
      return slippage - delayTolerance;
    },
  };
}

/**
 * Identifies workflow bottlenecks by evaluating topological convergence,
 * fan-out breadth, critical path occupancy, and downstream reach.
 */
export function identifyBottlenecks(
  graph: WorkflowGraph,
  scheduleAnalysis?: ScheduleAnalysis,
): BottleneckNode[] {
  const schedule = scheduleAnalysis ?? computeSchedule(graph);
  const allNodeIds = Object.keys(graph.nodes);
  const totalNodes = allNodeIds.length;

  if (totalNodes === 0) {
    return [];
  }

  // Degree counters
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  for (const id of allNodeIds) {
    inDegree.set(id, 0);
    outDegree.set(id, 0);
  }

  for (const edge of graph.edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
  }

  const maxIn = Math.max(1, ...Array.from(inDegree.values()));
  const maxOut = Math.max(1, ...Array.from(outDegree.values()));

  const bottlenecks: BottleneckNode[] = [];

  for (const nodeId of allNodeIds) {
    const nodeSched = schedule.schedules[nodeId];
    if (!nodeSched) continue;

    const inDeg = inDegree.get(nodeId) ?? 0;
    const outDeg = outDegree.get(nodeId) ?? 0;

    const impact = computeDownstreamImpact(graph, nodeId, schedule);
    const downstreamCount = impact.transitiveSuccessorIds.length;

    const reasons: string[] = [];

    // Criticality component (up to 40 pts)
    let criticalScore = 0;
    if (nodeSched.isCritical) {
      criticalScore = 40;
      reasons.push('On the Critical Path (Zero Slack)');
    } else if (
      schedule.projectDuration > 0 &&
      nodeSched.totalFloat < schedule.projectDuration * 0.15
    ) {
      criticalScore = 20;
      reasons.push(
        `Near-Critical: Total float is only ${nodeSched.totalFloat.toFixed(1)} units`,
      );
    }

    // Convergence component (up to 25 pts)
    const convergenceRatio = inDeg / maxIn;
    const convergenceScore = convergenceRatio * 25;
    if (inDeg >= 2) {
      reasons.push(`Convergence Gate: Merges ${inDeg} upstream workflows`);
    }

    // Fan-out component (up to 15 pts)
    const fanOutRatio = outDeg / maxOut;
    const fanOutScore = fanOutRatio * 15;
    if (outDeg >= 2) {
      reasons.push(`Fan-Out Hub: Unblocks ${outDeg} direct successor tasks`);
    }

    // Downstream blast radius component (up to 20 pts)
    const blastRatio = totalNodes > 1 ? downstreamCount / (totalNodes - 1) : 0;
    const blastScore = blastRatio * 20;
    if (downstreamCount >= 3) {
      reasons.push(
        `Broad Blast Radius: Delays impact ${downstreamCount} downstream tasks`,
      );
    }

    const totalBottleneckScore = Math.min(
      100,
      Math.round(
        criticalScore + convergenceScore + fanOutScore + blastScore,
      ),
    );

    bottlenecks.push({
      nodeId,
      bottleneckScore: totalBottleneckScore,
      inDegree: inDeg,
      outDegree: outDeg,
      transitiveDownstreamCount: downstreamCount,
      isCritical: nodeSched.isCritical,
      totalFloat: nodeSched.totalFloat,
      reasons,
    });
  }

  // Sort descending by bottleneck score
  bottlenecks.sort((a, b) => b.bottleneckScore - a.bottleneckScore);
  return bottlenecks;
}

/**
 * Computes deterministic priority scores for every task node in the graph.
 *
 * Scoring Formula:
 *   Score = 100 * (
 *     0.25 * InherentPriority +
 *     0.30 * CriticalPathProximity +
 *     0.25 * DownstreamImpactRatio +
 *     0.10 * RiskFactor +
 *     0.10 * NormalizedDuration
 *   )
 */
export function computePriorityScores(
  graph: WorkflowGraph,
  scheduleAnalysis?: ScheduleAnalysis,
): PriorityScore[] {
  const schedule = scheduleAnalysis ?? computeSchedule(graph);
  const allNodeIds = Object.keys(graph.nodes);
  const totalNodes = allNodeIds.length;

  if (totalNodes === 0) {
    return [];
  }

  // Maximum duration for normalization
  const maxDuration = Math.max(
    1,
    ...allNodeIds.map((id) => graph.nodes[id]?.duration ?? 0),
  );
  const projectDuration = Math.max(1, schedule.projectDuration);

  const scores: PriorityScore[] = [];

  for (const nodeId of allNodeIds) {
    const node = graph.nodes[nodeId];
    if (!node) continue;

    const nodeSched = schedule.schedules[nodeId];
    const totalFloat = nodeSched ? nodeSched.totalFloat : 0;

    // 1. Inherent Priority [0..1]
    const pWeight = PRIORITY_VALUE_MAP[node.priority] ?? 0.5;

    // 2. Critical Path Proximity [0..1]
    // 1.0 if zero slack, declining as slack approaches total project duration
    const cWeight = Math.max(0, 1 - totalFloat / projectDuration);

    // 3. Downstream Impact Ratio [0..1]
    const impact = computeDownstreamImpact(graph, nodeId, schedule);
    const iWeight =
      totalNodes > 1
        ? impact.transitiveSuccessorIds.length / (totalNodes - 1)
        : 0;

    // 4. Risk Factor [0..1]
    const rWeight = RISK_VALUE_MAP[node.risk] ?? 0.2;

    // 5. Duration Footprint [0..1]
    const dWeight = Math.min(1, node.duration / maxDuration);

    // Composite Score [0..100]
    const rawScore =
      PRIORITY_MODEL_WEIGHTS.inherentPriority * pWeight +
      PRIORITY_MODEL_WEIGHTS.criticalPathProximity * cWeight +
      PRIORITY_MODEL_WEIGHTS.downstreamImpact * iWeight +
      PRIORITY_MODEL_WEIGHTS.risk * rWeight +
      PRIORITY_MODEL_WEIGHTS.durationFootprint * dWeight;

    const totalScore = Math.round(rawScore * 1000) / 10; // 1 decimal place

    const explanation = [
      `Priority: ${node.priority.toUpperCase()} (${(pWeight * 100).toFixed(0)}%)`,
      nodeSched?.isCritical
        ? 'Critical Path (Zero Slack)'
        : `Slack: ${totalFloat.toFixed(1)} units`,
      `Controls ${impact.transitiveSuccessorIds.length} downstream tasks`,
      `Risk: ${node.risk.toUpperCase()}`,
    ].join(' | ');

    scores.push({
      nodeId,
      totalScore,
      rank: 0, // Assigned after sorting
      components: {
        priorityWeight: pWeight,
        criticalPathWeight: cWeight,
        downstreamWeight: iWeight,
        riskWeight: rWeight,
        durationWeight: dWeight,
      },
      explanation,
    });
  }

  // Sort descending by total score
  scores.sort((a, b) => b.totalScore - a.totalScore);

  // Assign 1-based ranks
  return scores.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

/**
 * Simulates a What-If scenario against a baseline workflow graph,
 * producing comparative before-and-after schedule analysis and an AI agent recommendation.
 */
export function simulateScenario(
  baseGraph: WorkflowGraph,
  scenario: WorkflowScenario,
): {
  readonly previous: ScheduleAnalysis;
  readonly updated: ScheduleAnalysis;
  readonly recommendation: AgentRecommendation;
} {
  const previous = computeSchedule(baseGraph);
  const manager = new WorkflowGraphManager(baseGraph);

  for (const action of scenario.actions) {
    manager.applyAction(action);
  }

  const updatedGraph = manager.toGraph();
  const updated = computeSchedule(updatedGraph);

  const durationDelta = updated.projectDuration - previous.projectDuration;
  const criticalPathChanged =
    previous.criticalPath.join(',') !== updated.criticalPath.join(',');

  const slackDeltas: Record<string, number> = {};
  for (const [nodeId, sched] of Object.entries(updated.schedules)) {
    const prevSched = previous.schedules[nodeId];
    if (prevSched) {
      slackDeltas[nodeId] = sched.totalFloat - prevSched.totalFloat;
    }
  }

  const prevBottlenecks = identifyBottlenecks(baseGraph, previous);
  const updatedBottlenecks = identifyBottlenecks(updatedGraph, updated);

  const prevTop = prevBottlenecks[0]?.nodeId;
  const currTop = updatedBottlenecks[0]?.nodeId;

  let explanation = '';
  if (durationDelta < 0) {
    explanation = `Scenario "${scenario.name}" accelerates overall project delivery by ${Math.abs(durationDelta).toFixed(1)} units.`;
  } else if (durationDelta > 0) {
    explanation = `Scenario "${scenario.name}" introduces a net delay of ${durationDelta.toFixed(1)} units to the critical path.`;
  } else {
    explanation = `Scenario "${scenario.name}" maintains the existing ${updated.projectDuration.toFixed(1)} unit timeline while redistributing task buffer slack.`;
  }

  if (criticalPathChanged) {
    explanation += ` Critical path has shifted to: [${updated.criticalPath.join(' -> ')}].`;
  }

  const recommendation: AgentRecommendation = {
    id: `rec_${scenario.id}`,
    title: `Schedule Impact: ${scenario.name}`,
    explanation,
    confidence: 0.95,
    impactAssessment: {
      criticalPathChanged,
      totalDurationDelta: durationDelta,
      slackDeltas,
      bottleneckShift: {
        previous: prevTop,
        current: currTop,
      },
    },
    suggestedActions: scenario.actions,
  };

  return {
    previous,
    updated,
    recommendation,
  };
}

