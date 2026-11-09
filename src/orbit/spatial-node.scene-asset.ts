/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * 3D Spatial Workflow Node Procedural Mesh & Dynamic Canvas Generator.
 * Built strictly with exports from @iwsdk/core.
 */

import {
  CanvasTexture,
  createScenePrimitiveObject,
  Group,
  LinearMipmapLinearFilter,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
} from '@iwsdk/core';
import type { NodeSchedule, WorkflowNode } from './types.js';

export interface SpatialNodeStyle {
  readonly statusColor: string;
  readonly borderColor: string;
  readonly emissiveColor: string;
  readonly emissiveIntensity: number;
}

export function getSpatialNodeStyle(
  node: WorkflowNode,
  schedule: NodeSchedule,
): SpatialNodeStyle {
  let statusColor = '#718096';
  let emissiveColor = '#1a202c';
  let emissiveIntensity = 0.15;

  switch (node.status) {
    case 'completed':
      statusColor = '#27ae60'; // Emerald green
      emissiveColor = '#27ae60';
      emissiveIntensity = 0.3;
      break;
    case 'in_progress':
      statusColor = '#00e5ff'; // Cyan
      emissiveColor = '#00e5ff';
      emissiveIntensity = 0.35;
      break;
    case 'blocked':
      statusColor = '#eb5757'; // Coral red
      emissiveColor = '#eb5757';
      emissiveIntensity = 0.45;
      break;
    case 'not_started':
    default:
      statusColor = '#718096'; // Slate
      emissiveColor = '#718096';
      emissiveIntensity = 0.15;
      break;
  }

  // Critical path nodes maintain the authoritative gold amber border and rim glow
  const borderColor = schedule.isCritical ? '#f5a623' : statusColor;
  if (schedule.isCritical) {
    emissiveColor = '#f5a623';
    emissiveIntensity = Math.max(emissiveIntensity, 0.45);
  }

  return {
    statusColor,
    borderColor,
    emissiveColor,
    emissiveIntensity,
  };
}

/**
 * Creates a high-resolution, anti-aliased canvas texture rendering the task's face plate.
 */
function createNodeCanvasTexture(
  node: WorkflowNode,
  schedule: NodeSchedule,
  style: SpatialNodeStyle,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Dark graphite card background with subtle gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#1a1c22');
  bgGrad.addColorStop(1, '#111216');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // 2. Outer border and inner accent line
  ctx.strokeStyle = style.borderColor;
  ctx.lineWidth = schedule.isCritical ? 10 : 6;
  ctx.strokeRect(10, 10, 1004, 492);

  // Left status accent stripe
  ctx.fillStyle = style.statusColor;
  ctx.fillRect(10, 10, 24, 492);

  // 3. Top Badges Row
  let currentX = 54;
  const topY = 44;

  // Status Badge
  const statusText = node.status.replace('_', ' ').toUpperCase();
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  const statusWidth = ctx.measureText(statusText).width + 32;

  ctx.fillStyle = style.statusColor;
  ctx.beginPath();
  ctx.roundRect(currentX, topY, statusWidth, 42, 10);
  ctx.fill();

  ctx.fillStyle = '#0b0d11';
  ctx.fillText(statusText, currentX + 16, topY + 28);
  currentX += statusWidth + 16;

  // Priority Badge
  const priorityText = `PRIORITY: ${node.priority.toUpperCase()}`;
  const priorityWidth = ctx.measureText(priorityText).width + 30;

  ctx.fillStyle = '#262933';
  ctx.beginPath();
  ctx.roundRect(currentX, topY, priorityWidth, 42, 10);
  ctx.fill();

  ctx.strokeStyle = '#3d4251';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = node.priority === 'critical' ? '#f5a623' : '#a259ff';
  ctx.fillText(priorityText, currentX + 15, topY + 28);

  // Duration Badge (right-aligned)
  const durationText = `${node.duration} DAYS`;
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  const durWidth = ctx.measureText(durationText).width + 32;
  const durX = 990 - durWidth;

  ctx.fillStyle = '#21242d';
  ctx.beginPath();
  ctx.roundRect(durX, topY, durWidth, 42, 10);
  ctx.fill();

  ctx.fillStyle = '#00e5ff';
  ctx.fillText(durationText, durX + 16, topY + 29);

  // 4. Task Title
  ctx.fillStyle = '#fafaf7';
  ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
  ctx.fillText(node.title, 54, 160);

  // 5. Description
  if (node.description) {
    ctx.fillStyle = '#a2a7b5';
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.fillText(node.description, 54, 215, 900);
  }

  // Divider line
  ctx.strokeStyle = '#272a34';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(54, 260);
  ctx.lineTo(970, 260);
  ctx.stroke();

  // 6. Metrics Grid / Schedule Details
  ctx.font = '24px system-ui, -apple-system, sans-serif';

  // Early Dates
  ctx.fillStyle = '#7a8194';
  ctx.fillText('Early Window:', 54, 310);
  ctx.fillStyle = '#fafaf7';
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Day ${schedule.earlyStart} -> Day ${schedule.earlyFinish}`, 54, 345);

  // Slack / Float
  ctx.font = '24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#7a8194';
  ctx.fillText('Float / Slack:', 420, 310);

  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  if (schedule.isCritical) {
    ctx.fillStyle = '#f5a623';
    ctx.fillText('0.0d (ZERO SLACK)', 420, 345);
  } else {
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`${schedule.totalFloat.toFixed(1)}d Buffer`, 420, 345);
  }

  // Assignee
  ctx.font = '24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#7a8194';
  ctx.fillText('Assignee:', 740, 310);
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#a259ff';
  ctx.fillText(node.assignee ?? 'Unassigned', 740, 345);

  // 7. Critical Path Footer Banner
  if (schedule.isCritical) {
    ctx.fillStyle = '#2b210e';
    ctx.beginPath();
    ctx.roundRect(54, 400, 916, 68, 12);
    ctx.fill();

    ctx.strokeStyle = '#f5a623';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f5a623';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText('★ CRITICAL PATH TASK — Direct Impact on Project Delivery Date', 76, 442);
  } else {
    ctx.fillStyle = '#1e212b';
    ctx.beginPath();
    ctx.roundRect(54, 400, 916, 68, 12);
    ctx.fill();

    ctx.fillStyle = '#8c94a6';
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `✓ Flexible Timeline: Can absorb up to ${schedule.totalFloat} days of delay before slipping release`,
      76,
      442,
    );
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Constructs the composite 3D spatial node mesh:
 * Base rounded graphite plinth + status bevel rim + high-DPI front canvas plate + selection halo.
 */
export function createSpatialNodeMesh(
  node: WorkflowNode,
  schedule: NodeSchedule,
): Group {
  const group = new Group();
  group.name = `node_${node.id}`;

  const style = getSpatialNodeStyle(node, schedule);

  const width = 0.36;
  const height = 0.20;
  const depth = 0.024;

  // 1. Dark graphite plinth body
  const bodyMaterial = new MeshStandardMaterial({
    color: '#1a1c22',
    roughness: 0.4,
    metalness: 0.25,
  });

  const body = createScenePrimitiveObject(
    {
      geometry: {
        type: 'roundedBox',
        size: [width, height, depth],
        radius: 0.016,
        segments: 4,
      },
    },
    bodyMaterial,
  );
  body.name = 'body';
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 2. Beveled status/critical rim
  const rimMaterial = new MeshStandardMaterial({
    color: style.borderColor,
    emissive: style.emissiveColor,
    emissiveIntensity: style.emissiveIntensity,
    roughness: 0.2,
    metalness: 0.5,
  });

  const rim = createScenePrimitiveObject(
    {
      geometry: {
        type: 'roundedBox',
        size: [width + 0.006, height + 0.006, depth * 0.4],
        radius: 0.018,
        segments: 3,
      },
    },
    rimMaterial,
  );
  rim.name = 'rim';
  rim.position.z = -0.002;
  group.add(rim);

  // 3. Front Face Canvas Plate
  const texture = createNodeCanvasTexture(node, schedule, style);
  const faceMaterial = new MeshStandardMaterial({
    map: texture,
    roughness: 0.6,
    metalness: 0.05,
  });

  const faceGeometry = new PlaneGeometry(width - 0.01, height - 0.01);
  const faceMesh = new Mesh(faceGeometry, faceMaterial);
  faceMesh.name = 'face';
  faceMesh.position.z = depth / 2 + 0.001; // Sits flush on front face
  group.add(faceMesh);

  // 4. Selection Halo (glowing outer perimeter, hidden by default)
  const haloMaterial = new MeshStandardMaterial({
    color: '#00e5ff',
    emissive: '#00e5ff',
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.7,
  });

  const halo = createScenePrimitiveObject(
    {
      geometry: {
        type: 'roundedBox',
        size: [width + 0.022, height + 0.022, depth * 0.25],
        radius: 0.022,
        segments: 3,
      },
    },
    haloMaterial,
  );
  halo.name = 'selectionHalo';
  halo.position.z = -0.006;
  halo.visible = false;
  group.add(halo);

  // 5. Interactive Output Port (Right side of card, +X)
  const portRadius = 0.015;
  const outPortGroup = new Group();
  outPortGroup.name = 'outputPort';
  outPortGroup.position.set(width / 2 + 0.016, 0, 0.004);

  // Ergonomic hit target: generous invisible collider to avoid requiring millimeter-precision hand aiming
  const portHitMaterial = new MeshStandardMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const outHitMesh = new Mesh(
    new SphereGeometry(0.035, 12, 12),
    portHitMaterial,
  );
  outHitMesh.name = 'portHitTarget';
  outPortGroup.add(outHitMesh);

  const outRingMat = new MeshStandardMaterial({
    color: '#00e5ff',
    emissive: '#00e5ff',
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.7,
  });
  const outRingMesh = new Mesh(
    new TorusGeometry(0.019, 0.003, 8, 24),
    outRingMat,
  );
  outRingMesh.name = 'portRing';
  outPortGroup.add(outRingMesh);

  const outCoreMat = new MeshStandardMaterial({
    color: '#00e5ff',
    emissive: '#00e5ff',
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.5,
  });
  const outCoreMesh = new Mesh(
    new SphereGeometry(portRadius, 16, 16),
    outCoreMat,
  );
  outCoreMesh.name = 'portCore';
  outPortGroup.add(outCoreMesh);
  group.add(outPortGroup);

  // 6. Interactive Input Port (Left side of card, -X)
  const inPortGroup = new Group();
  inPortGroup.name = 'inputPort';
  inPortGroup.position.set(-width / 2 - 0.016, 0, 0.004);

  const inHitMesh = new Mesh(
    new SphereGeometry(0.035, 12, 12),
    portHitMaterial,
  );
  inHitMesh.name = 'portHitTarget';
  inPortGroup.add(inHitMesh);

  const inRingMat = new MeshStandardMaterial({
    color: '#a259ff',
    emissive: '#a259ff',
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.7,
  });
  const inRingMesh = new Mesh(
    new TorusGeometry(0.019, 0.003, 8, 24),
    inRingMat,
  );
  inRingMesh.name = 'portRing';
  inPortGroup.add(inRingMesh);

  const inCoreMat = new MeshStandardMaterial({
    color: '#a259ff',
    emissive: '#a259ff',
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.5,
  });
  const inCoreMesh = new Mesh(
    new SphereGeometry(portRadius, 16, 16),
    inCoreMat,
  );
  inCoreMesh.name = 'portCore';
  inPortGroup.add(inCoreMesh);
  group.add(inPortGroup);

  return group;
}

/**
 * Updates an existing 3D spatial node mesh's texture and rim styling in place
 * when schedules, slack, or task durations change during What-If simulation.
 */
export function updateSpatialNodeMesh(
  group: Group,
  node: WorkflowNode,
  schedule: NodeSchedule,
): void {
  const style = getSpatialNodeStyle(node, schedule);

  // 1. Update rim (child 'rim')
  const rim = group.getObjectByName('rim') as
    | Mesh
    | undefined;
  if (rim && rim.material instanceof MeshStandardMaterial) {
    rim.material.color.set(style.borderColor);
    rim.material.emissive.set(style.emissiveColor);
    rim.material.emissiveIntensity = style.emissiveIntensity;
  }

  // 2. Update face plate texture (child 'face')
  const faceMesh = group.getObjectByName('face') as
    | Mesh<PlaneGeometry, MeshStandardMaterial>
    | undefined;
  if (faceMesh && faceMesh.material) {
    const oldTexture = faceMesh.material.map;
    const newTexture = createNodeCanvasTexture(node, schedule, style);
    faceMesh.material.map = newTexture;
    faceMesh.material.needsUpdate = true;
    if (oldTexture) {
      oldTexture.dispose();
    }
  }
}

/**
 * Applies hover feedback to a spatial node mesh.
 */
export function setNodeHoverFeedback(group: Group, hovered: boolean): void {
  const rim = group.getObjectByName('rim') as Mesh | undefined;
  if (rim && rim.material instanceof MeshStandardMaterial) {
    rim.material.emissiveIntensity = hovered ? 0.9 : 0.45;
  }
  const scale = hovered ? 1.03 : 1.0;
  group.scale.set(scale, scale, scale);
}

/**
 * Applies selection halo feedback to a spatial node mesh.
 */
export function setNodeSelectionFeedback(
  group: Group,
  selected: boolean,
): void {
  const halo = group.getObjectByName('selectionHalo') as Mesh | undefined;
  if (halo) {
    halo.visible = selected;
    if (halo.material instanceof MeshStandardMaterial && selected) {
      halo.material.color.set('#00e5ff');
      halo.material.emissive.set('#00e5ff');
    }
  }
}

/**
 * Applies spatial highlight feedback for intelligence recommendations (Phase 4).
 * Highlights affected nodes with an attention-grabbing glow and halo.
 */
export function setNodeHighlightFeedback(
  group: Group,
  highlighted: boolean,
  colorHex: string = '#f5a623',
): void {
  const halo = group.getObjectByName('selectionHalo') as Mesh | undefined;
  if (halo) {
    halo.visible = highlighted;
    if (halo.material instanceof MeshStandardMaterial && highlighted) {
      halo.material.color.set(colorHex);
      halo.material.emissive.set(colorHex);
    }
  }
  const rim = group.getObjectByName('rim') as Mesh | undefined;
  if (rim && rim.material instanceof MeshStandardMaterial) {
    rim.material.emissiveIntensity = highlighted ? 1.1 : 0.45;
  }
  const scale = highlighted ? 1.04 : 1.0;
  group.scale.set(scale, scale, scale);
}

/**
 * Applies active grab/drag feedback to a spatial node mesh.
 */
export function setNodeGrabFeedback(group: Group, grabbed: boolean): void {
  const rim = group.getObjectByName('rim') as Mesh | undefined;
  if (rim && rim.material instanceof MeshStandardMaterial) {
    rim.material.emissiveIntensity = grabbed ? 1.2 : 0.45;
  }
  const scale = grabbed ? 1.05 : 1.0;
  group.scale.set(scale, scale, scale);
}

export type PortVisualState = 'idle' | 'hover' | 'active' | 'valid' | 'invalid';

/**
 * Applies visual feedback to a connection port (input or output).
 */
export function setPortVisualFeedback(
  group: Group,
  portKind: 'input' | 'output',
  state: PortVisualState,
): void {
  const portGroup = group.getObjectByName(
    portKind === 'output' ? 'outputPort' : 'inputPort',
  );
  if (!portGroup) return;

  const core = portGroup.getObjectByName('portCore') as Mesh | undefined;
  const ring = portGroup.getObjectByName('portRing') as Mesh | undefined;

  let color = portKind === 'output' ? '#00e5ff' : '#a259ff';
  let emissive = color;
  let intensity = 0.8;
  let scale = 1.0;

  switch (state) {
    case 'hover':
      scale = 1.35;
      intensity = 1.3;
      break;
    case 'active':
      scale = 1.45;
      color = '#00e5ff';
      emissive = '#00e5ff';
      intensity = 1.8;
      break;
    case 'valid':
      scale = 1.4;
      color = '#2ecc71';
      emissive = '#2ecc71';
      intensity = 1.8;
      break;
    case 'invalid':
      scale = 1.4;
      color = '#eb5757';
      emissive = '#eb5757';
      intensity = 1.8;
      break;
    case 'idle':
    default:
      scale = 1.0;
      intensity = 0.8;
      break;
  }

  portGroup.scale.set(scale, scale, scale);

  if (core && core.material instanceof MeshStandardMaterial) {
    core.material.color.set(color);
    core.material.emissive.set(emissive);
    core.material.emissiveIntensity = intensity;
  }
  if (ring && ring.material instanceof MeshStandardMaterial) {
    ring.material.color.set(color);
    ring.material.emissive.set(emissive);
    ring.material.emissiveIntensity = intensity * 0.8;
  }
}

/**
 * Recursively disposes all geometries, materials, and textures
 * belonging to a spatial node group, preventing GPU memory leaks across resets.
 * Tracks disposed instances with Sets to guarantee strict idempotency even when
 * materials (such as port hit colliders) are referenced by multiple meshes within the node.
 */
export function disposeSpatialNodeMesh(group: Group): void {
  const disposedGeometries = new Set<unknown>();
  const disposedMaterials = new Set<unknown>();
  const disposedTextures = new Set<unknown>();

  group.traverse((obj) => {
    if (obj instanceof Mesh) {
      if (obj.geometry && !disposedGeometries.has(obj.geometry)) {
        disposedGeometries.add(obj.geometry);
        obj.geometry.dispose();
      }
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (!disposedMaterials.has(mat)) {
            disposedMaterials.add(mat);
            if ('map' in mat && mat.map && !disposedTextures.has(mat.map)) {
              disposedTextures.add(mat.map);
              mat.map.dispose();
            }
            mat.dispose();
          }
        }
      }
    }
  });
}
