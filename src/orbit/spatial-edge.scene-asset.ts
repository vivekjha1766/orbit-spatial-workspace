/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * 3D Spatial Dependency Edge Procedural Mesh & Arrow Generator.
 * Built strictly with exports from @iwsdk/core.
 */

import {
  CatmullRomCurve3,
  ConeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  TubeGeometry,
  Vector3,
} from '@iwsdk/core';

export interface SpatialEdgeMeshResult {
  readonly group: Group;
  readonly updateGeometry: (start: Vector3, end: Vector3) => void;
  readonly setCritical: (isCritical: boolean) => void;
  readonly setHighlighted: (highlighted: boolean, colorHex?: string) => void;
  readonly dispose: () => void;
}

/**
 * Creates a 3D curved spline tube with a directional arrow head connecting two spatial nodes.
 */
export function createSpatialEdgeMesh(
  start: Vector3,
  end: Vector3,
  initialCritical: boolean,
): SpatialEdgeMeshResult {
  const group = new Group();

  let isCritical = initialCritical;
  let isHighlighted = false;
  let highlightColor = '#f5a623';
  let lastStart = start.clone();
  let lastEnd = end.clone();

  const criticalMaterial = new MeshStandardMaterial({
    color: '#f5a623', // Gold amber
    emissive: '#f5a623',
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.6,
  });

  const normalMaterial = new MeshStandardMaterial({
    color: '#5a6478', // Steel slate
    emissive: '#00e5ff',
    emissiveIntensity: 0.12,
    roughness: 0.4,
    metalness: 0.3,
    transparent: true,
    opacity: 0.8,
  });

  const highlightMaterial = new MeshStandardMaterial({
    color: '#f5a623',
    emissive: '#f5a623',
    emissiveIntensity: 0.95,
    roughness: 0.2,
    metalness: 0.7,
  });

  let tubeMesh: Mesh<TubeGeometry, MeshStandardMaterial> | undefined;
  let coneMesh: Mesh<ConeGeometry, MeshStandardMaterial> | undefined;

  const rebuild = (pStart: Vector3, pEnd: Vector3): void => {
    lastStart.copy(pStart);
    lastEnd.copy(pEnd);

    const tubeRadius = isHighlighted ? 0.006 : isCritical ? 0.005 : 0.0028;
    const coneRadius = isHighlighted ? 0.018 : isCritical ? 0.016 : 0.011;
    const coneHeight = isHighlighted ? 0.042 : isCritical ? 0.038 : 0.026;
    const currentMaterial = isHighlighted
      ? highlightMaterial
      : isCritical
        ? criticalMaterial
        : normalMaterial;

    const dx = pEnd.x - pStart.x;
    const dy = pEnd.y - pStart.y;
    const dz = pEnd.z - pStart.z;

    const c1 = new Vector3(
      pStart.x + dx * 0.45,
      pStart.y + dy * 0.1,
      pStart.z + dz * 0.2,
    );
    const c2 = new Vector3(
      pEnd.x - dx * 0.45,
      pEnd.y - dy * 0.1,
      pEnd.z - dz * 0.2,
    );

    const curve = new CatmullRomCurve3([pStart, c1, c2, pEnd]);
    const tubeGeometry = new TubeGeometry(curve, 24, tubeRadius, 8, false);

    if (tubeMesh) {
      tubeMesh.geometry.dispose();
      tubeMesh.geometry = tubeGeometry;
      tubeMesh.material = currentMaterial;
    } else {
      tubeMesh = new Mesh(tubeGeometry, currentMaterial);
      group.add(tubeMesh);
    }

    const t = 0.96;
    const arrowPos = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();

    const coneGeometry = new ConeGeometry(coneRadius, coneHeight, 16);
    coneGeometry.rotateX(Math.PI / 2);

    if (coneMesh) {
      coneMesh.geometry.dispose();
      coneMesh.geometry = coneGeometry;
      coneMesh.material = currentMaterial;
    } else {
      coneMesh = new Mesh(coneGeometry, currentMaterial);
      group.add(coneMesh);
    }

    coneMesh.position.copy(arrowPos);
    const forward = new Vector3(0, 0, 1);
    const quat = new Quaternion().setFromUnitVectors(forward, tangent);
    coneMesh.quaternion.copy(quat);
  };

  rebuild(start, end);

  let isDisposed = false;

  return {
    group,
    updateGeometry: rebuild,
    setCritical: (crit: boolean): void => {
      if (isDisposed) return;
      if (isCritical !== crit) {
        isCritical = crit;
        rebuild(lastStart, lastEnd);
      }
    },
    setHighlighted: (highlighted: boolean, colorHex: string = '#f5a623'): void => {
      if (isDisposed) return;
      if (
        isHighlighted !== highlighted ||
        (highlighted && highlightColor !== colorHex)
      ) {
        isHighlighted = highlighted;
        highlightColor = colorHex;
        highlightMaterial.color.set(colorHex);
        highlightMaterial.emissive.set(colorHex);
        rebuild(lastStart, lastEnd);
      }
    },
    dispose: (): void => {
      if (isDisposed) return;
      isDisposed = true;
      if (tubeMesh) {
        tubeMesh.geometry.dispose();
        group.remove(tubeMesh);
        tubeMesh = undefined;
      }
      if (coneMesh) {
        coneMesh.geometry.dispose();
        group.remove(coneMesh);
        coneMesh = undefined;
      }
      criticalMaterial.dispose();
      normalMaterial.dispose();
      highlightMaterial.dispose();
    },
  };
}

export type DraftSplineState = 'active' | 'valid' | 'invalid';

export interface DraftSplineMeshResult {
  readonly group: Group;
  readonly update: (
    start: Vector3,
    end: Vector3,
    state: DraftSplineState,
  ) => void;
  readonly setVisible: (visible: boolean) => void;
  readonly dispose: () => void;
}

/**
 * Creates a dynamic preview spline for real-time spatial dependency drafting.
 * The endpoint follows the user's hand/pointer in real-time with visual validation feedback.
 */
export function createDraftSplineMesh(): DraftSplineMeshResult {
  const group = new Group();
  group.name = 'draft_preview_spline';
  group.visible = false;

  const activeMaterial = new MeshStandardMaterial({
    color: '#00e5ff',
    emissive: '#00e5ff',
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
    opacity: 0.9,
  });

  const validMaterial = new MeshStandardMaterial({
    color: '#2ecc71',
    emissive: '#2ecc71',
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.6,
  });

  const invalidMaterial = new MeshStandardMaterial({
    color: '#eb5757',
    emissive: '#eb5757',
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.6,
  });

  let tubeMesh: Mesh<TubeGeometry, MeshStandardMaterial> | undefined;
  let coneMesh: Mesh<ConeGeometry, MeshStandardMaterial> | undefined;

  const update = (
    start: Vector3,
    end: Vector3,
    state: DraftSplineState,
  ): void => {
    group.visible = true;
    let mat = activeMaterial;
    if (state === 'valid') mat = validMaterial;
    if (state === 'invalid') mat = invalidMaterial;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;

    const c1 = new Vector3(
      start.x + dx * 0.45,
      start.y + dy * 0.15,
      start.z + dz * 0.25,
    );
    const c2 = new Vector3(
      end.x - dx * 0.45,
      end.y - dy * 0.15,
      end.z - dz * 0.25,
    );

    const curve = new CatmullRomCurve3([start, c1, c2, end]);
    const radius = state === 'active' ? 0.0035 : 0.0048;
    const tubeGeometry = new TubeGeometry(curve, 20, radius, 8, false);

    if (tubeMesh) {
      tubeMesh.geometry.dispose();
      tubeMesh.geometry = tubeGeometry;
      tubeMesh.material = mat;
    } else {
      tubeMesh = new Mesh(tubeGeometry, mat);
      group.add(tubeMesh);
    }

    const t = 0.96;
    const arrowPos = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();

    const coneGeometry = new ConeGeometry(0.014, 0.03, 16);
    coneGeometry.rotateX(Math.PI / 2);

    if (coneMesh) {
      coneMesh.geometry.dispose();
      coneMesh.geometry = coneGeometry;
      coneMesh.material = mat;
    } else {
      coneMesh = new Mesh(coneGeometry, mat);
      group.add(coneMesh);
    }

    coneMesh.position.copy(arrowPos);
    const forward = new Vector3(0, 0, 1);
    const quat = new Quaternion().setFromUnitVectors(forward, tangent);
    coneMesh.quaternion.copy(quat);
  };

  const setVisible = (visible: boolean): void => {
    group.visible = visible;
  };

  let isDisposed = false;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    if (tubeMesh) {
      tubeMesh.geometry.dispose();
      group.remove(tubeMesh);
      tubeMesh = undefined;
    }
    if (coneMesh) {
      coneMesh.geometry.dispose();
      group.remove(coneMesh);
      coneMesh = undefined;
    }
    activeMaterial.dispose();
    validMaterial.dispose();
    invalidMaterial.dispose();
  };

  return {
    group,
    update,
    setVisible,
    dispose,
  };
}
