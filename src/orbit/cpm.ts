/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * Critical Path Method (CPM) and Topological Scheduling Algorithms.
 */

import type {
  NodeSchedule,
  ScheduleAnalysis,
  WorkflowEdge,
  WorkflowGraph,
} from './types.js';

const EPSILON = 1e-6;

export interface TopologicalSortResult {
  readonly sortedNodeIds: readonly string[];
  readonly hasCycle: boolean;
  readonly cycleNodes?: readonly string[];
}

/**
 * Performs topological sorting using Kahn's algorithm with in-degree counters.
 */
export function topologicalSort(graph: WorkflowGraph): TopologicalSortResult {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const allNodeIds = Object.keys(graph.nodes);

  for (const id of allNodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of graph.edges) {
    if (inDegree.has(edge.to) && inDegree.has(edge.from)) {
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
      adjacency.get(edge.from)?.push(edge.to);
    }
  }

  // Queue nodes with in-degree 0 (entry nodes)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    // Sort queue deterministically by node ID for stable ordering
    queue.sort();
    const u = queue.shift()!;
    sorted.push(u);

    const neighbors = adjacency.get(u) ?? [];
    for (const v of neighbors) {
      const currentDeg = inDegree.get(v) ?? 0;
      const newDeg = currentDeg - 1;
      inDegree.set(v, newDeg);
      if (newDeg === 0) {
        queue.push(v);
      }
    }
  }

  if (sorted.length !== allNodeIds.length) {
    // Cycle present — remaining nodes with in-degree > 0
    const cycleNodes = allNodeIds.filter((id) => (inDegree.get(id) ?? 0) > 0);
    return {
      sortedNodeIds: [],
      hasCycle: true,
      cycleNodes,
    };
  }

  return {
    sortedNodeIds: sorted,
    hasCycle: false,
  };
}

/**
 * Executes full Critical Path Method (CPM) forward and backward passes.
 * Computes Early Start (ES), Early Finish (EF), Late Start (LS), Late Finish (LF),
 * Total Float (Total Slack), Free Float, and the Critical Path sequence.
 */
export function computeSchedule(graph: WorkflowGraph): ScheduleAnalysis {
  const topo = topologicalSort(graph);
  if (topo.hasCycle) {
    throw new Error(
      `Cannot compute schedule: Graph contains circular dependencies amongst nodes [${topo.cycleNodes?.join(', ')}]`,
    );
  }

  const sortedIds = [...topo.sortedNodeIds];
  const nodeCount = sortedIds.length;

  if (nodeCount === 0) {
    return {
      projectDuration: 0,
      criticalPath: [],
      schedules: {},
      topologicalOrder: [],
    };
  }

  // Build incoming and outgoing adjacency maps
  const incoming = new Map<string, WorkflowEdge[]>();
  const outgoing = new Map<string, WorkflowEdge[]>();

  for (const id of sortedIds) {
    incoming.set(id, []);
    outgoing.set(id, []);
  }

  for (const edge of graph.edges) {
    incoming.get(edge.to)?.push(edge);
    outgoing.get(edge.from)?.push(edge);
  }

  // --- FORWARD PASS (Early Start & Early Finish) ---
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();

  for (const nodeId of sortedIds) {
    const node = graph.nodes[nodeId];
    const duration = node ? node.duration : 0;
    const inEdges = incoming.get(nodeId) ?? [];

    let es = 0;
    for (const edge of inEdges) {
      const predEf = earlyFinish.get(edge.from) ?? 0;
      const lag = edge.lag ?? 0;
      const candidateEs = predEf + lag;
      if (candidateEs > es) {
        es = candidateEs;
      }
    }

    const ef = es + duration;
    earlyStart.set(nodeId, es);
    earlyFinish.set(nodeId, ef);
  }

  // Project completion time is the maximum early finish among all nodes
  let projectDuration = 0;
  for (const ef of earlyFinish.values()) {
    if (ef > projectDuration) {
      projectDuration = ef;
    }
  }

  // --- BACKWARD PASS (Late Start & Late Finish) ---
  const lateFinish = new Map<string, number>();
  const lateStart = new Map<string, number>();

  // Iterate in reverse topological order
  for (let i = sortedIds.length - 1; i >= 0; i--) {
    const nodeId = sortedIds[i];
    const node = graph.nodes[nodeId];
    const duration = node ? node.duration : 0;
    const outEdges = outgoing.get(nodeId) ?? [];

    let lf = projectDuration;
    if (outEdges.length > 0) {
      lf = Number.POSITIVE_INFINITY;
      for (const edge of outEdges) {
        const succLs = lateStart.get(edge.to) ?? projectDuration;
        const lag = edge.lag ?? 0;
        const candidateLf = succLs - lag;
        if (candidateLf < lf) {
          lf = candidateLf;
        }
      }
    }

    const ls = lf - duration;
    lateFinish.set(nodeId, lf);
    lateStart.set(nodeId, ls);
  }

  // --- FLOAT / SLACK CALCULATION & SCHEDULE MAPPING ---
  const schedules: Record<string, NodeSchedule> = {};

  for (const nodeId of sortedIds) {
    const node = graph.nodes[nodeId];
    const duration = node ? node.duration : 0;
    const es = earlyStart.get(nodeId) ?? 0;
    const ef = earlyFinish.get(nodeId) ?? 0;
    const ls = lateStart.get(nodeId) ?? 0;
    const lf = lateFinish.get(nodeId) ?? 0;

    const totalFloat = Math.max(0, ls - es);

    // Free float: min(succ.es - lag) - this.ef
    const outEdges = outgoing.get(nodeId) ?? [];
    let freeFloat = totalFloat;
    if (outEdges.length > 0) {
      let minSuccStart = Number.POSITIVE_INFINITY;
      for (const edge of outEdges) {
        const succEs = earlyStart.get(edge.to) ?? projectDuration;
        const lag = edge.lag ?? 0;
        const constraint = succEs - lag;
        if (constraint < minSuccStart) {
          minSuccStart = constraint;
        }
      }
      freeFloat = Math.max(0, minSuccStart - ef);
    }

    const isCritical = totalFloat < EPSILON;

    schedules[nodeId] = {
      nodeId,
      duration,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloat,
      freeFloat,
      isCritical,
    };
  }

  // --- EXTRACT CRITICAL PATH SEQUENCE ---
  const criticalPath: string[] = [];

  // Find all critical entry nodes (in-degree 0 on critical path or minimum ES)
  const criticalEntries = sortedIds.filter(
    (id) =>
      schedules[id].isCritical &&
      ((incoming.get(id) ?? []).length === 0 || schedules[id].earlyStart < EPSILON),
  );

  if (criticalEntries.length > 0) {
    let current: string | undefined = criticalEntries[0];
    const visited = new Set<string>();

    while (current && !visited.has(current)) {
      visited.add(current);
      criticalPath.push(current);

      const outEdges: WorkflowEdge[] = outgoing.get(current) ?? [];
      // Select next critical node where ES(next) == EF(current) + lag
      const currentSchedule = schedules[current];
      let nextNode: string | undefined = undefined;

      for (const edge of outEdges) {
        const succSchedule = schedules[edge.to];
        const lag = edge.lag ?? 0;
        if (
          succSchedule &&
          succSchedule.isCritical &&
          Math.abs(succSchedule.earlyStart - (currentSchedule.earlyFinish + lag)) <
            EPSILON
        ) {
          nextNode = edge.to;
          break;
        }
      }

      current = nextNode;
    }
  }

  return {
    projectDuration,
    criticalPath,
    schedules,
    topologicalOrder: sortedIds,
  };
}
