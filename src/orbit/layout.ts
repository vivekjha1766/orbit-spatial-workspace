/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * Ergonomic 3D Spatial Layout Engine.
 * Arranges workflow DAG nodes along a comfortable spherical/cylindrical arc
 * in front of the Meta Quest 3 player rig.
 */

import type { ScheduleAnalysis, WorkflowGraph } from './types.js';

export interface NodeSpatialPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Yaw rotation in radians so the node faces the player origin. */
  readonly rotationY: number;
  /** Topological column layer index. */
  readonly layerIndex: number;
  /** Row index within the column layer. */
  readonly rowIndex: number;
}

export interface SpatialLayoutConfig {
  /** Distance from the user in meters (default 1.75m). */
  readonly radius: number;
  /** Eye-level vertical center in meters (default 1.35m). */
  readonly centerY: number;
  /** Total horizontal angular span in radians (default ~75 degrees = 1.3 rad). */
  readonly angularSpan: number;
  /** Vertical gap between nodes in the same layer in meters (default 0.38m). */
  readonly verticalSpacing: number;
}

export const DEFAULT_LAYOUT_CONFIG: SpatialLayoutConfig = {
  radius: 1.75,
  centerY: 1.35,
  angularSpan: 1.3,
  verticalSpacing: 0.38,
};

/**
 * Computes ergonomic 3D spatial coordinates for all nodes in a workflow graph.
 */
export function computeSpatialLayout(
  graph: WorkflowGraph,
  schedule: ScheduleAnalysis,
  config: SpatialLayoutConfig = DEFAULT_LAYOUT_CONFIG,
): Record<string, NodeSpatialPosition> {
  const nodeIds = Object.keys(graph.nodes);
  if (nodeIds.length === 0) {
    return {};
  }

  // 1. Compute topological layer / depth for each node
  // Depth(v) = 0 for entry nodes; Depth(v) = max(Depth(u)) + 1 for edges (u, v)
  const depthMap = new Map<string, number>();
  for (const id of schedule.topologicalOrder) {
    depthMap.set(id, 0);
  }

  for (const id of schedule.topologicalOrder) {
    const currentDepth = depthMap.get(id) ?? 0;
    for (const edge of graph.edges) {
      if (edge.from === id) {
        const targetDepth = depthMap.get(edge.to) ?? 0;
        if (currentDepth + 1 > targetDepth) {
          depthMap.set(edge.to, currentDepth + 1);
        }
      }
    }
  }

  // 2. Group nodes into discrete column layers
  const maxDepth = Math.max(0, ...Array.from(depthMap.values()));
  const layers: string[][] = Array.from({ length: maxDepth + 1 }, () => []);

  for (const id of schedule.topologicalOrder) {
    const depth = depthMap.get(id) ?? 0;
    layers[depth].push(id);
  }

  const layout: Record<string, NodeSpatialPosition> = {};

  // 3. Project each layer onto the cylindrical arc
  const layerCount = layers.length;
  const startAngle = -config.angularSpan / 2;
  const angleStep =
    layerCount > 1 ? config.angularSpan / (layerCount - 1) : 0;

  for (let l = 0; l < layerCount; l++) {
    const nodesInLayer = layers[l];
    const angle =
      layerCount === 1 ? 0 : startAngle + l * angleStep;

    // Sort nodes in layer so critical path nodes stay near vertical center
    nodesInLayer.sort((a, b) => {
      const aCrit = schedule.schedules[a]?.isCritical ? 1 : 0;
      const bCrit = schedule.schedules[b]?.isCritical ? 1 : 0;
      return bCrit - aCrit;
    });

    const rowCount = nodesInLayer.length;
    const startY =
      config.centerY + ((rowCount - 1) * config.verticalSpacing) / 2;

    for (let r = 0; r < rowCount; r++) {
      const nodeId = nodesInLayer[r];
      const y = startY - r * config.verticalSpacing;

      // Arc position: x = R * sin(angle), z = -R * cos(angle)
      const x = config.radius * Math.sin(angle);
      const z = -config.radius * Math.cos(angle);

      // Yaw rotation to directly face viewer at origin (0, y, 0)
      const rotationY = Math.atan2(x, z) + Math.PI;

      layout[nodeId] = {
        x,
        y,
        z,
        rotationY,
        layerIndex: l,
        rowIndex: r,
      };
    }
  }

  return layout;
}

