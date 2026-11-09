/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * Custom ECS Components for Spatial Workflow Graph Entities.
 * Declared in a system-free module and exported to src/components.ts.
 */

import { createComponent, Types } from '@iwsdk/core';

/**
 * ECS component representing a 3D spatial task node in the ORBIT workspace.
 */
export const OrbitNode = createComponent('OrbitNode', {
  nodeId: { type: Types.String, default: '' },
  duration: { type: Types.Float32, default: 0 },
  isCritical: { type: Types.Boolean, default: false },
  totalFloat: { type: Types.Float32, default: 0 },
  status: { type: Types.String, default: 'not_started' },
  priority: { type: Types.String, default: 'medium' },
  risk: { type: Types.String, default: 'low' },
});

/**
 * ECS component representing a 3D directional dependency connection between two nodes.
 */
export const OrbitEdge = createComponent('OrbitEdge', {
  edgeId: { type: Types.String, default: '' },
  from: { type: Types.String, default: '' },
  to: { type: Types.String, default: '' },
  isCritical: { type: Types.Boolean, default: false },
});

/**
 * ECS component marking the root spatial container of the ORBIT workspace.
 */
export const OrbitWorkspace = createComponent('OrbitWorkspace', {
  active: { type: Types.Boolean, default: true },
});

/**
 * ECS component representing an interactive connection port on a workflow node.
 * Used for spatial dependency drafting (output port -> input port).
 */
export const OrbitPort = createComponent('OrbitPort', {
  nodeId: { type: Types.String, default: '' },
  isOutput: { type: Types.Boolean, default: true },
});

