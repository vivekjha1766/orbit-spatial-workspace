/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * Dedicated ECS WorkflowGraphSystem.
 * Synchronizes pure graph state with 3D spatial entities, maintains real-time
 * dynamic edge splines, and wires contextual task inspection with direct manipulation,
 * spatial dependency drafting (Phase 3B), and What-If Scenario Sandbox controls (Phase 3C).
 */

import {
  createSystem,
  DistanceGrabbable,
  type Entity,
  Grabbed,
  Group,
  Hovered,
  OneHandGrabbable,
  PokeInteractable,
  Pressed,
  RayInteractable,
  UIKitMLAsset,
  Vector3,
} from '@iwsdk/core';
import {
  computeDownstreamImpact,
  identifyBottlenecks,
} from './analysis.js';
import { computeSchedule } from './cpm.js';
import { WorkflowGraphManager } from './graph.js';
import { computeSpatialLayout } from './layout.js';
import {
  OrbitEdge,
  OrbitNode,
  OrbitPort,
  OrbitWorkspace,
} from './orbit-components.js';
import { createSampleProductLaunchWorkflow } from './sample-workflow.js';
import {
  ScenarioManager,
  type ScenarioSimulationResult,
  type ScenarioState,
} from './scenario.js';
import {
  createDraftSplineMesh,
  createSpatialEdgeMesh,
  type DraftSplineMeshResult,
  type DraftSplineState,
  type SpatialEdgeMeshResult,
} from './spatial-edge.scene-asset.js';
import {
  createSpatialNodeMesh,
  disposeSpatialNodeMesh,
  setNodeGrabFeedback,
  setNodeHighlightFeedback,
  setNodeHoverFeedback,
  setNodeSelectionFeedback,
  setPortVisualFeedback,
  updateSpatialNodeMesh,
} from './spatial-node.scene-asset.js';
import {
  computeGraphFingerprint,
  WorkflowNavigator,
  type WorkflowRecommendation,
} from './navigator.js';
import {
  OnboardingManager,
  type OnboardingStep,
  type OnboardingStepDetails,
  type WorkspaceRegionHighlight,
} from './onboarding.js';
import type { ScheduleAnalysis, WorkflowGraph } from './types.js';

interface EdgeBinding {
  readonly edgeId: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly edgeAsset: SpatialEdgeMeshResult;
  readonly edgeEntity: Entity;
}

export class WorkflowGraphSystem extends createSystem({
  nodes: { required: [OrbitNode] },
  edges: { required: [OrbitEdge] },
  ports: { required: [OrbitPort] },
  hoveredNodes: { required: [OrbitNode, Hovered] },
  clickedNodes: { required: [OrbitNode, Pressed] },
  grabbedNodes: { required: [OrbitNode, Grabbed] },
  hoveredPorts: { required: [OrbitPort, Hovered] },
  pressedPorts: { required: [OrbitPort, Pressed] },
}) {
  private graphManager!: WorkflowGraphManager;
  private scenarioManager!: ScenarioManager;
  private graph!: WorkflowGraph;
  private schedule!: ScheduleAnalysis;
  private workspaceEntity?: Entity;
  private nodeEntities = new Map<string, Entity>();
  private portEntities: Entity[] = [];
  private edgeBindings: EdgeBinding[] = [];

  private selectedNodeId: string = 'integration';
  private detailsPanel?: UIKitMLAsset;
  private headerPanel?: UIKitMLAsset;
  private navigatorPanel?: UIKitMLAsset;
  private onboardingPanel?: UIKitMLAsset;

  // Onboarding & Guided Five-Minute Journey state (Phase 5)
  private onboardingManager = new OnboardingManager();

  // ORBIT Navigator Intelligence state (Phase 4)
  private navigator = new WorkflowNavigator();
  private currentRecommendations: WorkflowRecommendation[] = [];
  private activeRecommendationIndex = 0;
  private isNavigatorHighlightActive = false;
  private lastAnalyzedFingerprint: string | null = null;

  // Real-time spatial dependency drafting state (Phase 3B)
  private draftSpline?: DraftSplineMeshResult;
  private isDrafting = false;
  private draftSourceNodeId: string | null = null;
  private draftCandidateDestNodeId: string | null = null;
  private draftStatus: DraftSplineState = 'active';
  private draftSourceWorldPos = new Vector3();
  private draftTargetWorldPos = new Vector3();
  private lastValidationError: string | null = null;

  // Cached math scratch vectors to avoid per-frame allocations
  private tempStart = new Vector3();
  private tempEnd = new Vector3();
  private prevPositions = new Map<string, Vector3>();
  private baseLayoutPositions = new Map<string, Vector3>();

  init(): void {
    // 1. Guard against duplicate initialization
    if (this.workspaceEntity) {
      return;
    }

    // 2. Load baseline sample workflow & initialize authoritative manager + scenario manager
    this.graphManager = new WorkflowGraphManager(
      createSampleProductLaunchWorkflow(),
    );
    this.graph = this.graphManager.toGraph();
    this.schedule = computeSchedule(this.graph);
    this.scenarioManager = new ScenarioManager(this.graph);

    // 3. Compute ergonomic 3D layout coordinates
    const layout = computeSpatialLayout(this.graph, this.schedule);

    // 4. Create root workspace entity
    this.workspaceEntity = this.world.createTransformEntity();
    this.workspaceEntity.addComponent(OrbitWorkspace, { active: true });

    // 5. Spawn 3D Spatial Nodes and Interactive Connection Ports
    const criticalSet = new Set(this.schedule.criticalPath);

    for (const [nodeId, node] of Object.entries(this.graph.nodes)) {
      const nodeSched = this.schedule.schedules[nodeId];
      if (!nodeSched) continue;

      const pos = layout[nodeId];
      const nodeGroup = createSpatialNodeMesh(node, nodeSched);

      if (pos) {
        nodeGroup.position.set(pos.x, pos.y, pos.z);
        nodeGroup.rotation.y = pos.rotationY;
        this.baseLayoutPositions.set(
          nodeId,
          new Vector3(pos.x, pos.y, pos.z),
        );
      }

      const entity = this.world.createTransformEntity(nodeGroup, {
        parent: this.workspaceEntity,
      });

      entity.addComponent(OrbitNode, {
        nodeId: node.id,
        duration: node.duration,
        isCritical: nodeSched.isCritical,
        totalFloat: nodeSched.totalFloat,
        status: node.status,
        priority: node.priority,
        risk: node.risk,
      });

      // Enable ray interaction, distance grab, and proximity grab
      entity.addComponent(RayInteractable, {});
      entity.addComponent(DistanceGrabbable, {
        movementMode: 'MoveFromTarget',
        returnToOrigin: false,
      });
      entity.addComponent(OneHandGrabbable, {
        translate: true,
        rotate: true,
      });

      this.nodeEntities.set(nodeId, entity);
      this.prevPositions.set(nodeId, nodeGroup.position.clone());

      // Spawn interactive Port entities as children of nodeEntity
      const outPortMesh = nodeGroup.getObjectByName('outputPort') as Group;
      const inPortMesh = nodeGroup.getObjectByName('inputPort') as Group;

      if (outPortMesh) {
        const outPortEntity = this.world.createTransformEntity(outPortMesh, {
          parent: entity,
        });
        outPortEntity.addComponent(OrbitPort, {
          nodeId: node.id,
          isOutput: true,
        });
        outPortEntity.addComponent(RayInteractable, {});
        outPortEntity.addComponent(PokeInteractable, {});
        this.portEntities.push(outPortEntity);
      }

      if (inPortMesh) {
        const inPortEntity = this.world.createTransformEntity(inPortMesh, {
          parent: entity,
        });
        inPortEntity.addComponent(OrbitPort, {
          nodeId: node.id,
          isOutput: false,
        });
        inPortEntity.addComponent(RayInteractable, {});
        inPortEntity.addComponent(PokeInteractable, {});
        this.portEntities.push(inPortEntity);
      }
    }

    // 6. Spawn 3D Spatial Dependency Edges
    for (const edge of this.graph.edges) {
      const fromPos = layout[edge.from];
      const toPos = layout[edge.to];
      if (!fromPos || !toPos) continue;

      const pStart = new Vector3(fromPos.x, fromPos.y, fromPos.z);
      const pEnd = new Vector3(toPos.x, toPos.y, toPos.z);

      const fromSched = this.schedule.schedules[edge.from];
      const toSched = this.schedule.schedules[edge.to];
      const lag = edge.lag ?? 0;

      const isCriticalEdge =
        criticalSet.has(edge.from) &&
        criticalSet.has(edge.to) &&
        Math.abs(toSched.earlyStart - (fromSched.earlyFinish + lag)) < 1e-5;

      const edgeAsset = createSpatialEdgeMesh(pStart, pEnd, isCriticalEdge);

      const edgeEntity = this.world.createTransformEntity(edgeAsset.group, {
        parent: this.workspaceEntity,
      });

      edgeEntity.addComponent(OrbitEdge, {
        edgeId: edge.id,
        from: edge.from,
        to: edge.to,
        isCritical: isCriticalEdge,
      });

      this.edgeBindings.push({
        edgeId: edge.id,
        fromNodeId: edge.from,
        toNodeId: edge.to,
        edgeAsset,
        edgeEntity,
      });
    }

    // 7. Initialize Dynamic Connection Drafting Spline
    this.draftSpline = createDraftSplineMesh();
    this.world.createTransformEntity(this.draftSpline.group, {
      parent: this.workspaceEntity,
    });

    // 8. Locate UIKitML Workspace Panels
    this.headerPanel =
      this.world.getSceneObject<UIKitMLAsset>('orbit-header');
    this.detailsPanel =
      this.world.getSceneObject<UIKitMLAsset>('orbit-details');
    this.navigatorPanel =
      this.world.getSceneObject<UIKitMLAsset>('orbit-navigator');
    this.onboardingPanel =
      this.world.getSceneObject<UIKitMLAsset>('orbit-onboarding');

    // Populate initial inspector details with integration task
    this.selectNode('integration');
    this.refreshUIPanels();
    this.refreshOnboardingPanel();

    // 9. Wire Interactive Subscriptions for Direct Manipulation
    this.queries.hoveredNodes.subscribe('qualify', (entity) => {
      if (this.isDrafting) return;
      const obj = entity.object3D as Group | undefined;
      if (obj) {
        setNodeHoverFeedback(obj, true);
      }
      const nodeId = entity.getValue(OrbitNode, 'nodeId');
      if (nodeId && nodeId !== this.selectedNodeId) {
        this.updateDetailsInspector(nodeId);
      }
    });

    this.queries.hoveredNodes.subscribe('disqualify', (entity) => {
      if (this.isDrafting) return;
      const obj = entity.object3D as Group | undefined;
      if (obj) {
        setNodeHoverFeedback(obj, false);
      }
      if (this.selectedNodeId) {
        this.updateDetailsInspector(this.selectedNodeId);
      }
    });

    this.queries.clickedNodes.subscribe('qualify', (entity) => {
      if (this.isDrafting) return;
      const nodeId = entity.getValue(OrbitNode, 'nodeId');
      if (nodeId) {
        this.selectNode(nodeId);
      }
    });

    this.queries.grabbedNodes.subscribe('qualify', (entity) => {
      if (this.isDrafting) return;
      const obj = entity.object3D as Group | undefined;
      if (obj) {
        setNodeGrabFeedback(obj, true);
      }
      const nodeId = entity.getValue(OrbitNode, 'nodeId');
      if (nodeId) {
        this.selectNode(nodeId);
      }
    });

    this.queries.grabbedNodes.subscribe('disqualify', (entity) => {
      const obj = entity.object3D as Group | undefined;
      if (obj) {
        setNodeGrabFeedback(obj, false);
      }
    });

    // 10. Wire Interactive Subscriptions for Spatial Dependency Drafting (Phase 3B)
    this.queries.pressedPorts.subscribe('qualify', (entity) => {
      const isOutput = entity.getValue(OrbitPort, 'isOutput');
      const nodeId = entity.getValue(OrbitPort, 'nodeId');
      if (!nodeId) return;

      if (isOutput) {
        this.startDraftConnection(nodeId);
      } else if (this.isDrafting && this.draftSourceNodeId) {
        this.completeDraftConnection(nodeId);
      }
    });

    this.queries.hoveredPorts.subscribe('qualify', (entity) => {
      const isOutput = entity.getValue(OrbitPort, 'isOutput');
      const nodeId = entity.getValue(OrbitPort, 'nodeId');
      if (!nodeId) return;

      const nodeEntity = this.nodeEntities.get(nodeId);
      if (!nodeEntity?.object3D) return;

      if (this.isDrafting && this.draftSourceNodeId) {
        if (!isOutput) {
          // Hovering over candidate destination input port
          this.draftCandidateDestNodeId = nodeId;
          const validation = this.graphManager.validateEdgeCandidate(
            this.draftSourceNodeId,
            nodeId,
          );

          if (validation.valid) {
            this.draftStatus = 'valid';
            setPortVisualFeedback(
              nodeEntity.object3D as Group,
              'input',
              'valid',
            );
            this.updateDraftFeedback(
              'VALID CONNECTION',
              `Connect ${this.draftSourceNodeId} -> ${nodeId}. Release to confirm.`,
              '#2ecc71',
            );
          } else {
            this.draftStatus = 'invalid';
            this.lastValidationError =
              validation.reason ?? 'Invalid connection';
            setPortVisualFeedback(
              nodeEntity.object3D as Group,
              'input',
              'invalid',
            );
            this.updateDraftFeedback(
              'REJECTED',
              validation.reason ?? 'Invalid connection',
              '#eb5757',
            );
          }
        }
      } else {
        setPortVisualFeedback(
          nodeEntity.object3D as Group,
          isOutput ? 'output' : 'input',
          'hover',
        );
      }
    });

    this.queries.hoveredPorts.subscribe('disqualify', (entity) => {
      const isOutput = entity.getValue(OrbitPort, 'isOutput');
      const nodeId = entity.getValue(OrbitPort, 'nodeId');
      if (!nodeId) return;

      const nodeEntity = this.nodeEntities.get(nodeId);
      if (nodeEntity?.object3D) {
        setPortVisualFeedback(
          nodeEntity.object3D as Group,
          isOutput ? 'output' : 'input',
          'idle',
        );
      }

      if (
        this.isDrafting &&
        !isOutput &&
        this.draftCandidateDestNodeId === nodeId
      ) {
        this.draftCandidateDestNodeId = null;
        this.draftStatus = 'active';
        this.updateDraftFeedback(
          'DRAFTING CONNECTION',
          `Aim pointer to target task's input port. Release in empty space to cancel.`,
          '#00e5ff',
        );
      }
    });

    this.queries.pressedPorts.subscribe('disqualify', () => {
      if (this.isDrafting && this.draftCandidateDestNodeId) {
        this.completeDraftConnection(this.draftCandidateDestNodeId);
      }
    });

    // 11. Wire What-If Scenario Sandbox Buttons (Phase 3C)
    if (this.detailsPanel) {
      const decBtn = this.detailsPanel.getElementById('btn-dec-duration');
      const incBtn = this.detailsPanel.getElementById('btn-inc-duration');
      const simBtn = this.detailsPanel.getElementById('btn-simulate-scenario');
      const applyBtn = this.detailsPanel.getElementById('btn-apply-scenario');
      const discardBtn = this.detailsPanel.getElementById('btn-discard-scenario');

      if (decBtn) {
        const onDec = () => this.adjustProposedDuration(-1);
        decBtn.addEventListener('click', onDec);
        this.cleanupFuncs.push(() => decBtn.removeEventListener('click', onDec));
      }
      if (incBtn) {
        const onInc = () => this.adjustProposedDuration(1);
        incBtn.addEventListener('click', onInc);
        this.cleanupFuncs.push(() => incBtn.removeEventListener('click', onInc));
      }
      if (simBtn) {
        const onSim = () => this.simulateCurrentScenario();
        simBtn.addEventListener('click', onSim);
        this.cleanupFuncs.push(() => simBtn.removeEventListener('click', onSim));
      }
      if (applyBtn) {
        const onApply = () => this.applyCurrentScenario();
        applyBtn.addEventListener('click', onApply);
        this.cleanupFuncs.push(() => applyBtn.removeEventListener('click', onApply));
      }
      if (discardBtn) {
        const onDiscard = () => this.discardCurrentScenario();
        discardBtn.addEventListener('click', onDiscard);
        this.cleanupFuncs.push(() => discardBtn.removeEventListener('click', onDiscard));
      }
    }

    // 12. Wire ORBIT Navigator Intelligence Panel Buttons (Phase 4)
    if (this.navigatorPanel) {
      const prevBtn = this.navigatorPanel.getElementById('btn-nav-prev');
      const nextBtn = this.navigatorPanel.getElementById('btn-nav-next');
      const highlightBtn = this.navigatorPanel.getElementById('btn-nav-highlight');
      const simBtn = this.navigatorPanel.getElementById('btn-nav-simulate');
      const applyBtn = this.navigatorPanel.getElementById('btn-nav-apply');

      if (prevBtn) {
        const onPrev = () => this.navigateRecommendation(-1);
        prevBtn.addEventListener('click', onPrev);
        this.cleanupFuncs.push(() => prevBtn.removeEventListener('click', onPrev));
      }
      if (nextBtn) {
        const onNext = () => this.navigateRecommendation(1);
        nextBtn.addEventListener('click', onNext);
        this.cleanupFuncs.push(() => nextBtn.removeEventListener('click', onNext));
      }
      if (highlightBtn) {
        const onHighlight = () => this.toggleActiveRecommendationHighlight();
        highlightBtn.addEventListener('click', onHighlight);
        this.cleanupFuncs.push(() => highlightBtn.removeEventListener('click', onHighlight));
      }
      if (simBtn) {
        const onSim = () => this.simulateActiveRecommendation();
        simBtn.addEventListener('click', onSim);
        this.cleanupFuncs.push(() => simBtn.removeEventListener('click', onSim));
      }
      if (applyBtn) {
        const onApply = () => this.applyActiveRecommendation();
        applyBtn.addEventListener('click', onApply);
        this.cleanupFuncs.push(() => applyBtn.removeEventListener('click', onApply));
      }
    }

    // 13. Wire ORBIT Onboarding Panel Buttons (Phase 5)
    if (this.onboardingPanel) {
      const nextBtn = this.onboardingPanel.getElementById('btn-guide-next');
      const prevBtn = this.onboardingPanel.getElementById('btn-guide-prev');
      const skipBtn = this.onboardingPanel.getElementById('btn-guide-skip');
      const resetBtn = this.onboardingPanel.getElementById('btn-guide-reset');

      if (nextBtn) {
        const onNext = () => this.onboardingNext();
        nextBtn.addEventListener('click', onNext);
        this.cleanupFuncs.push(() => nextBtn.removeEventListener('click', onNext));
      }
      if (prevBtn) {
        const onPrev = () => this.onboardingPrev();
        prevBtn.addEventListener('click', onPrev);
        this.cleanupFuncs.push(() => prevBtn.removeEventListener('click', onPrev));
      }
      if (skipBtn) {
        const onSkip = () => this.onboardingSkip();
        skipBtn.addEventListener('click', onSkip);
        this.cleanupFuncs.push(() => skipBtn.removeEventListener('click', onSkip));
      }
      if (resetBtn) {
        const onReset = () => this.resetSampleWorkspace();
        resetBtn.addEventListener('click', onReset);
        this.cleanupFuncs.push(() => resetBtn.removeEventListener('click', onReset));
      }
    }

    // 14. Wire Header Panel Guide & Reset Buttons (Phase 5)
    if (this.headerPanel) {
      const headerGuideBtn = this.headerPanel.getElementById('btn-header-guide');
      const headerResetBtn = this.headerPanel.getElementById('btn-header-reset');

      if (headerGuideBtn) {
        const onGuide = () => this.onboardingStart();
        headerGuideBtn.addEventListener('click', onGuide);
        this.cleanupFuncs.push(() => headerGuideBtn.removeEventListener('click', onGuide));
      }
      if (headerResetBtn) {
        const onReset = () => this.resetSampleWorkspace();
        headerResetBtn.addEventListener('click', onReset);
        this.cleanupFuncs.push(() => headerResetBtn.removeEventListener('click', onReset));
      }
    }

    // 15. Register cleanup
    this.cleanupFuncs.push(() => {
      for (const entity of this.portEntities) {
        entity.dispose({ disposeResources: true });
      }
      this.portEntities = [];

      for (const entity of this.nodeEntities.values()) {
        if (entity.object3D) {
          disposeSpatialNodeMesh(entity.object3D as Group);
        }
        entity.dispose({ disposeResources: true });
      }
      this.nodeEntities.clear();

      for (const binding of this.edgeBindings) {
        binding.edgeAsset.dispose();
        binding.edgeEntity.dispose({ disposeResources: true });
      }
      this.edgeBindings = [];

      if (this.draftSpline) {
        this.draftSpline.dispose();
        this.draftSpline = undefined;
      }

      if (this.workspaceEntity) {
        this.workspaceEntity.dispose({ disposeResources: true });
        this.workspaceEntity = undefined;
      }
    });

    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__ORBIT__ = this;
      (window as unknown as Record<string, unknown>).__ORBIT_ONBOARDING__ = this.onboardingManager;

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'n' || e.key === 'ArrowRight') {
          this.onboardingNext();
        } else if (e.key === 'p' || e.key === 'ArrowLeft') {
          this.onboardingPrev();
        } else if (e.key === 's') {
          this.onboardingSkip();
        } else if (e.key === 'r') {
          this.resetSampleWorkspace();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      this.cleanupFuncs.push(() => window.removeEventListener('keydown', onKeyDown));
    }
  }

  // --- What-If Scenario Sandbox Operations (Phase 3C) ---

  public getScenarioManager(): ScenarioManager {
    return this.scenarioManager;
  }

  public getScenarioState(): ScenarioState {
    return this.scenarioManager.getState();
  }

  /**
   * Adjusts the proposed duration of the currently selected node.
   * Auto-simulates immediately to provide instantaneous visual feedback.
   */
  public adjustProposedDuration(
    deltaDays: number,
  ): { oldDuration: number; newDuration: number } {
    if (!this.selectedNodeId) {
      return { oldDuration: 0, newDuration: 0 };
    }

    const res = this.scenarioManager.adjustDuration(
      this.selectedNodeId,
      deltaDays,
    );

    // Auto-simulate to immediately preview CPM schedule
    this.simulateCurrentScenario();

    return res;
  }

  /**
   * Simulates the active What-If scenario without mutating the committed baseline.
   * Updates preview highlights on 3D nodes and edges.
   */
  public simulateCurrentScenario(): ScenarioSimulationResult {
    const sim = this.scenarioManager.simulate();

    // Update 3D visual preview for all nodes and edges using simulated schedule
    this.refreshVisualsWithSchedule(
      sim.projectedSchedule,
      new Set(sim.projectedSchedule.criticalPath),
      true,
    );

    // Refresh UI Panels
    this.refreshUIPanels();

    return sim;
  }

  /**
   * Permanently commits the current What-If scenario into the authoritative baseline.
   */
  public applyCurrentScenario(): { success: boolean; message: string } {
    try {
      const result = this.scenarioManager.apply();

      // Update authoritative graph & schedule
      this.graph = result.updatedGraph;
      this.schedule = result.updatedSchedule;
      this.graphManager = new WorkflowGraphManager(this.graph);

      // Permanently update 3D scene visual representations
      this.refreshAllEdgesCriticality();
      this.refreshAllNodesVisuals();
      this.refreshUIPanels();

      if (this.detailsPanel) {
        this.detailsPanel.getElementById('detail-scenario-feedback')?.setProperties({
          text: `Applied scenario "${result.scenario.name}": baseline updated to ${this.schedule.projectDuration} days.`,
          color: '#2ecc71',
        });
      }

      return {
        success: true,
        message: `Successfully committed scenario "${result.scenario.name}"`,
      };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to apply scenario';
      if (this.detailsPanel) {
        this.detailsPanel.getElementById('detail-scenario-feedback')?.setProperties({
          text: errorMsg,
          color: '#eb5757',
        });
      }
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Discards all proposed scenario changes and reverts view to committed baseline.
   */
  public discardCurrentScenario(): void {
    this.scenarioManager.discard();

    // Restore authoritative committed schedule & visuals
    this.schedule = this.scenarioManager.getBaselineSchedule();
    this.refreshAllEdgesCriticality();
    this.refreshAllNodesVisuals();
    this.refreshUIPanels();

    if (this.detailsPanel) {
      this.detailsPanel.getElementById('detail-scenario-feedback')?.setProperties({
        text: 'Scenario discarded: restored committed baseline view.',
        color: '#00e5ff',
      });
    }

    if (this.onboardingManager) {
      this.onboardingManager.onScenarioAppliedOrDiscarded();
      this.refreshOnboardingPanel();
    }
  }

  /**
   * Restores view to the committed baseline.
   */
  public restoreBaseline(): void {
    this.discardCurrentScenario();
  }

  // --- Connection Drafting Operations (Phase 3B) ---

  public startDraftConnection(sourceNodeId: string): boolean {
    if (!this.graphManager.hasNode(sourceNodeId)) {
      return false;
    }

    if (this.isDrafting) {
      this.cancelDraftConnection();
    }

    this.isDrafting = true;
    this.draftSourceNodeId = sourceNodeId;
    this.draftCandidateDestNodeId = null;
    this.draftStatus = 'active';
    this.lastValidationError = null;

    const sourceEntity = this.nodeEntities.get(sourceNodeId);
    if (sourceEntity?.object3D) {
      setPortVisualFeedback(sourceEntity.object3D as Group, 'output', 'active');
    }

    this.updateDraftFeedback(
      'DRAFTING CONNECTION',
      `Connecting from "${sourceNodeId}". Aim at target input port.`,
      '#00e5ff',
    );

    return true;
  }

  public completeDraftConnection(
    targetNodeId: string,
  ): { success: boolean; message: string } {
    if (!this.isDrafting || !this.draftSourceNodeId) {
      return { success: false, message: 'No active connection draft' };
    }

    const fromId = this.draftSourceNodeId;
    const toId = targetNodeId;

    const validation = this.graphManager.validateEdgeCandidate(fromId, toId);
    if (!validation.valid) {
      const errorMsg = validation.reason ?? 'Invalid connection';
      this.showRejectionFeedback(fromId, toId, errorMsg);
      this.cancelDraftConnection(errorMsg);
      return { success: false, message: errorMsg };
    }

    const edgeId = `edge_${fromId}_${toId}_${Date.now()}`;
    this.graphManager.addEdge({
      id: edgeId,
      from: fromId,
      to: toId,
    });

    this.graph = this.graphManager.toGraph();
    this.schedule = computeSchedule(this.graph);

    // Update scenario manager's baseline with the committed topology change
    this.scenarioManager.updateCommittedBaseline(this.graph);

    const fromEntity = this.nodeEntities.get(fromId);
    const toEntity = this.nodeEntities.get(toId);

    if (fromEntity?.object3D && toEntity?.object3D && this.workspaceEntity) {
      const pStart = fromEntity.object3D.position;
      const pEnd = toEntity.object3D.position;

      const criticalSet = new Set(this.schedule.criticalPath);
      const fromSched = this.schedule.schedules[fromId];
      const toSched = this.schedule.schedules[toId];

      const isCriticalEdge =
        criticalSet.has(fromId) &&
        criticalSet.has(toId) &&
        Math.abs(toSched.earlyStart - fromSched.earlyFinish) < 1e-5;

      const edgeAsset = createSpatialEdgeMesh(pStart, pEnd, isCriticalEdge);
      const edgeEntity = this.world.createTransformEntity(edgeAsset.group, {
        parent: this.workspaceEntity,
      });

      edgeEntity.addComponent(OrbitEdge, {
        edgeId,
        from: fromId,
        to: toId,
        isCritical: isCriticalEdge,
      });

      this.edgeBindings.push({
        edgeId,
        fromNodeId: fromId,
        toNodeId: toId,
        edgeAsset,
        edgeEntity,
      });
    }

    this.refreshAllEdgesCriticality();
    this.refreshAllNodesVisuals();
    this.refreshUIPanels();
    this.cancelDraftConnection();

    this.updateDraftFeedback(
      'CONNECTION CREATED',
      `Created dependency: ${fromId} -> ${toId}`,
      '#2ecc71',
    );

    return {
      success: true,
      message: `Successfully connected ${fromId} -> ${toId}`,
    };
  }

  public cancelDraftConnection(reason?: string): void {
    if (this.draftSourceNodeId) {
      const sourceEntity = this.nodeEntities.get(this.draftSourceNodeId);
      if (sourceEntity?.object3D) {
        setPortVisualFeedback(
          sourceEntity.object3D as Group,
          'output',
          'idle',
        );
      }
    }

    if (this.draftCandidateDestNodeId) {
      const destEntity = this.nodeEntities.get(this.draftCandidateDestNodeId);
      if (destEntity?.object3D) {
        setPortVisualFeedback(destEntity.object3D as Group, 'input', 'idle');
      }
    }

    this.isDrafting = false;
    this.draftSourceNodeId = null;
    this.draftCandidateDestNodeId = null;
    this.draftStatus = 'active';

    if (this.draftSpline) {
      this.draftSpline.setVisible(false);
    }

    if (!reason) {
      this.updateDraftFeedback(
        'READY',
        'Pinch output port on right of task to draft new dependency edge.',
        '#00e5ff',
      );
    }
  }

  private showRejectionFeedback(
    fromId: string,
    toId: string,
    reason: string,
  ): void {
    const destEntity = this.nodeEntities.get(toId);
    if (destEntity?.object3D) {
      setPortVisualFeedback(destEntity.object3D as Group, 'input', 'invalid');
      setTimeout(() => {
        if (destEntity.object3D) {
          setPortVisualFeedback(destEntity.object3D as Group, 'input', 'idle');
        }
      }, 1500);
    }

    this.updateDraftFeedback('REJECTED', reason, '#eb5757');
  }

  private updateDraftFeedback(
    status: string,
    desc: string,
    color: string,
  ): void {
    if (!this.detailsPanel) return;

    this.detailsPanel.getElementById('detail-draft-status')?.setProperties({
      text: status,
      color,
    });
    this.detailsPanel.getElementById('detail-draft-desc')?.setProperties({
      text: desc,
    });
  }

  // --- Node & Edge Visual Refresh Operations ---

  private refreshVisualsWithSchedule(
    targetSchedule: ScheduleAnalysis,
    criticalSet: Set<string>,
    isScenarioPreview: boolean,
  ): void {
    // 1. Update edge criticality
    for (const binding of this.edgeBindings) {
      const fromSched = targetSchedule.schedules[binding.fromNodeId];
      const toSched = targetSchedule.schedules[binding.toNodeId];

      const isCriticalEdge =
        Boolean(fromSched && toSched) &&
        criticalSet.has(binding.fromNodeId) &&
        criticalSet.has(binding.toNodeId) &&
        Math.abs(toSched.earlyStart - fromSched.earlyFinish) < 1e-5;

      binding.edgeAsset.setCritical(isCriticalEdge);
      binding.edgeEntity.setValue(OrbitEdge, 'isCritical', isCriticalEdge);
    }

    // 2. Update node meshes with scenario durations and float values
    for (const [nodeId, entity] of this.nodeEntities.entries()) {
      const baseNode = this.graph.nodes[nodeId];
      const sched = targetSchedule.schedules[nodeId];
      if (!baseNode || !sched || !entity.object3D) continue;

      const duration = isScenarioPreview
        ? this.scenarioManager.getDraftDuration(nodeId)
        : baseNode.duration;

      const effectiveNode = {
        ...baseNode,
        duration,
      };

      updateSpatialNodeMesh(entity.object3D as Group, effectiveNode, sched);
      entity.setValue(OrbitNode, 'duration', duration);
      entity.setValue(OrbitNode, 'isCritical', criticalSet.has(nodeId));
      entity.setValue(OrbitNode, 'totalFloat', sched.totalFloat);
    }
  }

  private refreshAllEdgesCriticality(): void {
    const criticalSet = new Set(this.schedule.criticalPath);

    for (const binding of this.edgeBindings) {
      const fromSched = this.schedule.schedules[binding.fromNodeId];
      const toSched = this.schedule.schedules[binding.toNodeId];

      const isCriticalEdge =
        Boolean(fromSched && toSched) &&
        criticalSet.has(binding.fromNodeId) &&
        criticalSet.has(binding.toNodeId) &&
        Math.abs(toSched.earlyStart - fromSched.earlyFinish) < 1e-5;

      binding.edgeAsset.setCritical(isCriticalEdge);
      binding.edgeEntity.setValue(OrbitEdge, 'isCritical', isCriticalEdge);
    }
  }

  private refreshAllNodesVisuals(): void {
    const criticalSet = new Set(this.schedule.criticalPath);

    for (const [nodeId, entity] of this.nodeEntities.entries()) {
      const node = this.graph.nodes[nodeId];
      const sched = this.schedule.schedules[nodeId];
      if (!node || !sched || !entity.object3D) continue;

      updateSpatialNodeMesh(entity.object3D as Group, node, sched);
      entity.setValue(OrbitNode, 'duration', node.duration);
      entity.setValue(OrbitNode, 'isCritical', criticalSet.has(nodeId));
      entity.setValue(OrbitNode, 'totalFloat', sched.totalFloat);
    }
  }

  private refreshUIPanels(): void {
    const sim = this.scenarioManager.getSimulationResult();
    const effectiveSchedule = sim ? sim.projectedSchedule : this.schedule;
    const effectiveDelta = sim ? sim.durationDelta : 0;
    const isScenarioActive = Boolean(sim);

    // Update Header Panel
    if (this.headerPanel) {
      const durText = isScenarioActive
        ? `${effectiveSchedule.projectDuration} Days (${effectiveDelta >= 0 ? '+' : ''}${effectiveDelta.toFixed(1)}d vs Baseline)`
        : `${this.schedule.projectDuration} Days`;

      this.headerPanel.getElementById('metric-duration')?.setProperties({
        text: durText,
      });
      this.headerPanel.getElementById('metric-critical')?.setProperties({
        text: `${effectiveSchedule.criticalPath.length} Tasks (${effectiveSchedule.projectDuration}d total)`,
      });
      this.headerPanel.getElementById('metric-edges')?.setProperties({
        text: `${this.graph.edges.length} Constraints`,
      });

      const bottlenecks = identifyBottlenecks(this.graph, effectiveSchedule);
      if (bottlenecks.length > 0) {
        const top = bottlenecks[0];
        const topNode = this.graph.nodes[top.nodeId];
        this.headerPanel.getElementById('metric-bottleneck')?.setProperties({
          text: `${topNode?.title ?? top.nodeId} (${top.bottleneckScore}/100)`,
        });
      }
    }

    if (this.selectedNodeId) {
      this.updateDetailsInspector(this.selectedNodeId);
    }

    this.refreshNavigatorPanel();
  }

  public selectNode(nodeId: string): void {
    if (this.selectedNodeId && this.selectedNodeId !== nodeId) {
      const prevEntity = this.nodeEntities.get(this.selectedNodeId);
      if (prevEntity?.object3D) {
        setNodeSelectionFeedback(prevEntity.object3D as Group, false);
      }
    }

    this.selectedNodeId = nodeId;
    const newEntity = this.nodeEntities.get(nodeId);
    if (newEntity?.object3D) {
      setNodeSelectionFeedback(newEntity.object3D as Group, true);
    }

    this.updateDetailsInspector(nodeId);

    // Notify onboarding state machine (Phase 5)
    if (this.onboardingManager) {
      const advanced = this.onboardingManager.onNodeSelected(nodeId);
      if (advanced) {
        this.refreshOnboardingPanel();
      }
    }
  }

  public deselect(): void {
    if (this.selectedNodeId) {
      const prevEntity = this.nodeEntities.get(this.selectedNodeId);
      if (prevEntity?.object3D) {
        setNodeSelectionFeedback(prevEntity.object3D as Group, false);
      }
      this.selectedNodeId = '';
    }
  }

  public resetNodePosition(nodeId: string): void {
    const entity = this.nodeEntities.get(nodeId);
    const base = this.baseLayoutPositions.get(nodeId);
    if (entity?.object3D && base) {
      entity.object3D.position.copy(base);
    }
  }

  private updateDetailsInspector(nodeId: string): void {
    const node = this.graph?.nodes[nodeId];
    if (!node || !this.detailsPanel) {
      return;
    }

    const sim = this.scenarioManager.getSimulationResult();
    const activeSchedule = sim ? sim.projectedSchedule : this.schedule;
    const sched = activeSchedule.schedules[nodeId];
    if (!sched) return;

    const impact = computeDownstreamImpact(this.graph, nodeId, activeSchedule);
    const bottlenecks = identifyBottlenecks(this.graph, activeSchedule);
    const bNode = bottlenecks.find((b) => b.nodeId === nodeId);

    // 1. Task Metadata
    this.detailsPanel.getElementById('detail-node-id')?.setProperties({
      text: node.id,
    });
    this.detailsPanel.getElementById('detail-title')?.setProperties({
      text: node.title,
    });
    this.detailsPanel.getElementById('detail-desc')?.setProperties({
      text: node.description ?? 'No description provided.',
    });
    this.detailsPanel.getElementById('detail-duration')?.setProperties({
      text: `${this.scenarioManager.getCommittedDuration(nodeId)} Days`,
    });
    this.detailsPanel.getElementById('detail-critical')?.setProperties({
      text: sched.isCritical ? 'YES (Zero Slack)' : 'NO (Flexible)',
      color: sched.isCritical ? '#f5a623' : '#00e5ff',
    });
    this.detailsPanel.getElementById('detail-slack')?.setProperties({
      text: `${sched.totalFloat.toFixed(1)} Days (Free: ${sched.freeFloat.toFixed(1)}d)`,
      color: sched.isCritical ? '#f5a623' : '#00e5ff',
    });
    this.detailsPanel.getElementById('detail-status')?.setProperties({
      text: `${node.status.toUpperCase()} // ${node.priority.toUpperCase()}`,
    });
    this.detailsPanel.getElementById('detail-downstream')?.setProperties({
      text: `${impact.transitiveSuccessorIds.length} Tasks Blocked (${impact.impactedCriticalPathNodes.length} Critical)`,
    });
    this.detailsPanel.getElementById('detail-bottleneck')?.setProperties({
      text: bNode
        ? `${bNode.bottleneckScore} / 100 (${bNode.reasons[0] ?? 'Standard'})`
        : 'N/A',
    });
    this.detailsPanel.getElementById('detail-assignee')?.setProperties({
      text: node.assignee ?? 'Unassigned',
    });

    // 2. What-If Scenario Sandbox State & Controls
    const state = this.scenarioManager.getState();
    const proposedDuration = this.scenarioManager.getDraftDuration(nodeId);
    const durationDelta = sim ? sim.durationDelta : 0;

    let deltaColor = '#00e5ff';
    let deltaText = '0.0 Days (Baseline)';

    if (durationDelta < 0) {
      deltaColor = '#2ecc71'; // Green: Project accelerated
      deltaText = `${durationDelta.toFixed(1)} Days (Accelerated)`;
    } else if (durationDelta > 0) {
      deltaColor = '#eb5757'; // Red: Project delayed
      deltaText = `+${durationDelta.toFixed(1)} Days (Delayed)`;
    } else if (sim) {
      deltaColor = '#f5a623'; // Amber: Neutral trade-off / slack shifted
      deltaText = '0.0 Days (Buffer Shifted)';
    }

    this.detailsPanel.getElementById('detail-scenario-mode')?.setProperties({
      text: state,
      color:
        state === 'SIMULATED'
          ? '#2ecc71'
          : state === 'EDITING'
            ? '#f5a623'
            : '#00e5ff',
    });
    this.detailsPanel.getElementById('detail-proposed-duration')?.setProperties({
      text: `${proposedDuration} Days`,
    });
    this.detailsPanel.getElementById('detail-projected-duration')?.setProperties({
      text: `${activeSchedule.projectDuration} Days`,
    });
    this.detailsPanel.getElementById('detail-schedule-delta')?.setProperties({
      text: deltaText,
      color: deltaColor,
    });
    this.detailsPanel.getElementById('detail-path-shifted')?.setProperties({
      text: sim?.criticalPathChanged ? 'YES (Shifted)' : 'NO (Intact)',
      color: sim?.criticalPathChanged ? '#f5a623' : '#fafaf7',
    });

    if (sim?.recommendation) {
      this.detailsPanel.getElementById('detail-scenario-feedback')?.setProperties({
        text: sim.recommendation.explanation,
        color: deltaColor,
      });
    }
  }

  // --- ORBIT Navigator Operations (Phase 4) ---

  public navigateRecommendation(direction: number): void {
    if (this.currentRecommendations.length === 0) return;

    // Discard any active uncommitted scenario when switching recommendations
    // to prevent simulated state from leaking into other recommendations
    if (
      this.scenarioManager.hasDraftChanges() ||
      this.scenarioManager.getState() === 'SIMULATED' ||
      this.scenarioManager.getState() === 'EDITING'
    ) {
      this.discardCurrentScenario();
    }

    this.activeRecommendationIndex =
      (this.activeRecommendationIndex +
        direction +
        this.currentRecommendations.length) %
      this.currentRecommendations.length;

    this.refreshNavigatorPanel();

    if (this.isNavigatorHighlightActive) {
      const rec = this.currentRecommendations[this.activeRecommendationIndex];
      if (rec) {
        this.applySpatialHighlights(rec.affectedNodeIds);
      }
    } else {
      this.clearSpatialHighlights();
    }

    if (this.onboardingManager) {
      this.onboardingManager.onNavigatorExplored();
      this.refreshOnboardingPanel();
    }
  }

  public toggleActiveRecommendationHighlight(): void {
    if (this.currentRecommendations.length === 0) return;
    const rec = this.currentRecommendations[this.activeRecommendationIndex];
    if (!rec) return;

    this.isNavigatorHighlightActive = !this.isNavigatorHighlightActive;

    if (this.isNavigatorHighlightActive) {
      this.applySpatialHighlights(rec.affectedNodeIds);
      this.navigatorPanel?.getElementById('nav-feedback')?.setProperties({
        text: `Highlighting 3D affected tasks: [${rec.affectedNodeIds.join(', ')}].`,
        color: '#f5a623',
      });
    } else {
      this.clearSpatialHighlights();
      this.navigatorPanel?.getElementById('nav-feedback')?.setProperties({
        text: '3D spatial highlight cleared.',
        color: '#8c92a2',
      });
    }

    if (this.onboardingManager) {
      this.onboardingManager.onNavigatorExplored();
      this.refreshOnboardingPanel();
    }
  }

  public simulateActiveRecommendation(): void {
    if (this.currentRecommendations.length === 0) return;
    const rec = this.currentRecommendations[this.activeRecommendationIndex];
    if (!rec) return;

    // Validate recommendation freshness before simulating
    const validation = this.navigator.validateRecommendation(rec, this.graph);
    if (!validation.valid) {
      this.navigatorPanel?.getElementById('nav-feedback')?.setProperties({
        text: `Cannot simulate: ${validation.reason ?? 'Recommendation is stale.'}`,
        color: '#eb5757',
      });
      return;
    }

    if (!rec.canSimulate || !rec.proposedAction) {
      this.navigatorPanel?.getElementById('nav-feedback')?.setProperties({
        text: 'Recommendation is advisory only and has no direct simulation action.',
        color: '#a259ff',
      });
      return;
    }

    // Always clear prior scenario state so only the selected recommendation is simulated
    this.scenarioManager.discard();

    if (rec.proposedAction.type === 'adjust_duration') {
      const currentDur = this.scenarioManager.getCommittedDuration(
        rec.proposedAction.nodeId,
      );
      const delta = rec.proposedAction.newDuration - currentDur;
      this.scenarioManager.adjustDuration(rec.proposedAction.nodeId, delta);
      const sim = this.scenarioManager.simulate();

      this.selectNode(rec.proposedAction.nodeId);
      this.isNavigatorHighlightActive = true;
      this.applySpatialHighlights(rec.affectedNodeIds);
      this.refreshUIPanels();

      const deltaStr = `${sim.durationDelta >= 0 ? '+' : ''}${sim.durationDelta.toFixed(1)}d`;
      this.navigatorPanel?.getElementById('nav-feedback')?.setProperties({
        text: `Simulated recommendation: ${deltaStr} project duration impact. Click Apply to commit.`,
        color: '#00e5ff',
      });

      if (this.onboardingManager) {
        this.onboardingManager.onScenarioSimulated();
        this.refreshOnboardingPanel();
      }
    }
  }

  public applyActiveRecommendation(): void {
    if (this.currentRecommendations.length === 0) return;
    const rec = this.currentRecommendations[this.activeRecommendationIndex];
    if (!rec) return;

    const sim = this.scenarioManager.getSimulationResult();
    const state = this.scenarioManager.getState();

    // Enforce requirement: Apply is ONLY possible after a valid simulation
    if (!sim || state !== 'SIMULATED') {
      this.navigatorPanel?.getElementById('nav-feedback')?.setProperties({
        text: 'Cannot apply: please click "Simulate Action" first to evaluate schedule impact.',
        color: '#f5a623',
      });
      return;
    }

    // Enforce requirement: Proposed action is revalidated immediately before application
    const validation = this.navigator.validateRecommendation(rec, this.graph);
    if (!validation.valid) {
      this.discardCurrentScenario();
      this.navigatorPanel?.getElementById('nav-feedback')?.setProperties({
        text: `Cannot apply: ${validation.reason ?? 'Recommendation is stale.'}`,
        color: '#eb5757',
      });
      return;
    }

    const res = this.applyCurrentScenario();
    if (res.success) {
      this.clearSpatialHighlights();
      this.navigatorPanel?.getElementById('nav-feedback')?.setProperties({
        text: `Applied recommendation to baseline: ${this.schedule.projectDuration} days total.`,
        color: '#2ecc71',
      });

      if (this.onboardingManager) {
        this.onboardingManager.onScenarioAppliedOrDiscarded();
        this.refreshOnboardingPanel();
      }
    } else {
      this.navigatorPanel?.getElementById('nav-feedback')?.setProperties({
        text: res.message,
        color: '#eb5757',
      });
    }
  }

  private refreshNavigatorPanel(): void {
    if (!this.navigatorPanel) return;

    // Performance optimization: memoize recommendation analysis by graph fingerprint + schedule duration
    const currentFingerprint = `${computeGraphFingerprint(this.graph)}_${this.schedule.projectDuration}`;
    if (
      this.lastAnalyzedFingerprint !== currentFingerprint ||
      this.currentRecommendations.length === 0
    ) {
      this.currentRecommendations = this.navigator.analyzeWorkflow(
        this.graph,
        this.schedule,
      );
      this.lastAnalyzedFingerprint = currentFingerprint;
    }

    const total = this.currentRecommendations.length;
    if (total === 0) {
      this.navigatorPanel
        .getElementById('nav-rec-index')
        ?.setProperties({ text: '0 / 0' });
      this.navigatorPanel
        .getElementById('nav-rec-title')
        ?.setProperties({ text: 'Workflow fully optimized' });
      this.navigatorPanel
        .getElementById('nav-rec-explanation')
        ?.setProperties({
          text: 'No critical bottlenecks or schedule risks detected.',
        });
      return;
    }

    if (this.activeRecommendationIndex >= total) {
      this.activeRecommendationIndex = 0;
    }

    let critCount = 0;
    let highCount = 0;
    let medCount = 0;
    for (const r of this.currentRecommendations) {
      if (r.severity === 'CRITICAL') critCount++;
      else if (r.severity === 'HIGH') highCount++;
      else if (r.severity === 'MEDIUM') medCount++;
    }

    this.navigatorPanel
      .getElementById('badge-crit-text')
      ?.setProperties({ text: `${critCount} CRITICAL` });
    this.navigatorPanel
      .getElementById('badge-high-text')
      ?.setProperties({ text: `${highCount} HIGH` });
    this.navigatorPanel
      .getElementById('badge-med-text')
      ?.setProperties({ text: `${medCount} MEDIUM` });

    this.navigatorPanel.getElementById('nav-rec-index')?.setProperties({
      text: `${this.activeRecommendationIndex + 1} / ${total}`,
    });

    const rec = this.currentRecommendations[this.activeRecommendationIndex];
    if (rec) {
      this.navigatorPanel
        .getElementById('nav-rec-category')
        ?.setProperties({ text: rec.category });
      this.navigatorPanel
        .getElementById('nav-rec-severity')
        ?.setProperties({
          text: rec.severity,
          color:
            rec.severity === 'CRITICAL'
              ? '#eb5757'
              : rec.severity === 'HIGH'
                ? '#f5a623'
                : '#a259ff',
        });
      this.navigatorPanel
        .getElementById('nav-rec-title')
        ?.setProperties({ text: rec.title });
      this.navigatorPanel
        .getElementById('nav-rec-explanation')
        ?.setProperties({ text: rec.explanation });

      this.navigatorPanel.getElementById('nav-evidence-1')?.setProperties({
        text: rec.evidence[0] ? `- ${rec.evidence[0]}` : '',
      });
      this.navigatorPanel.getElementById('nav-evidence-2')?.setProperties({
        text: rec.evidence[1] ? `- ${rec.evidence[1]}` : '',
      });
      this.navigatorPanel.getElementById('nav-evidence-3')?.setProperties({
        text: rec.evidence[2] ? `- ${rec.evidence[2]}` : '',
      });

      this.navigatorPanel.getElementById('nav-impact-text')?.setProperties({
        text: rec.expectedImpact
          ? `Impact: ${rec.expectedImpact}`
          : 'Advisory recommendation: monitor progress.',
      });
    }
  }

  private applySpatialHighlights(
    nodeIds: readonly string[],
    colorHex: string = '#f5a623',
  ): void {
    const highlightSet = new Set(nodeIds);

    for (const [nodeId, entity] of this.nodeEntities.entries()) {
      if (entity.object3D) {
        setNodeHighlightFeedback(
          entity.object3D as Group,
          highlightSet.has(nodeId),
          colorHex,
        );
      }
    }

    // Highlight incident edges
    for (const binding of this.edgeBindings) {
      const isIncident =
        highlightSet.has(binding.fromNodeId) &&
        highlightSet.has(binding.toNodeId);
      if (isIncident) {
        binding.edgeAsset.setHighlighted(true, colorHex);
      } else {
        binding.edgeAsset.setHighlighted(false);
      }
    }
  }

  private clearSpatialHighlights(): void {
    this.isNavigatorHighlightActive = false;
    for (const entity of this.nodeEntities.values()) {
      if (entity.object3D) {
        setNodeHighlightFeedback(entity.object3D as Group, false);
      }
    }
    for (const binding of this.edgeBindings) {
      binding.edgeAsset.setHighlighted(false);
    }
  }

  // --- ORBIT Onboarding & Guided Experience Operations (Phase 5) ---

  public getOnboardingManager(): OnboardingManager {
    return this.onboardingManager;
  }

  public onboardingStart(): void {
    this.onboardingManager.start();
    this.refreshOnboardingPanel();
  }

  public onboardingNext(): void {
    this.onboardingManager.next();
    this.refreshOnboardingPanel();
  }

  public onboardingPrev(): void {
    this.onboardingManager.prev();
    this.refreshOnboardingPanel();
  }

  public onboardingSkip(): void {
    this.onboardingManager.skip();
    this.refreshOnboardingPanel();
  }

  public refreshOnboardingPanel(): void {
    if (!this.onboardingPanel) return;

    const details = this.onboardingManager.getStepDetails();

    this.onboardingPanel.getElementById('guide-badge')?.setProperties({
      text: details.badgeLabel,
    });
    this.onboardingPanel.getElementById('guide-step-name')?.setProperties({
      text:
        details.stepNumber > 0 && details.stepNumber <= details.totalSteps
          ? `STEP ${details.stepNumber}: ${details.step}`
          : details.step,
    });
    this.onboardingPanel.getElementById('guide-title')?.setProperties({
      text: details.title,
    });
    this.onboardingPanel.getElementById('guide-desc')?.setProperties({
      text: details.description,
    });
    this.onboardingPanel.getElementById('guide-prompt')?.setProperties({
      text: details.actionPrompt,
    });

    this.onboardingPanel.getElementById('btn-guide-next-label')?.setProperties({
      text: details.primaryButtonText,
    });
    this.onboardingPanel.getElementById('btn-guide-skip-label')?.setProperties({
      text: details.secondaryButtonText ?? 'Skip',
    });

    this.applyOnboardingRegionHighlight(details.highlightRegion);
  }

  private applyOnboardingRegionHighlight(
    region: WorkspaceRegionHighlight,
  ): void {
    if (this.isNavigatorHighlightActive) return;

    if (region === 'graph') {
      this.applySpatialHighlights(['integration'], '#00e5ff');
    } else if (region === 'navigator') {
      const topRec =
        this.currentRecommendations[this.activeRecommendationIndex];
      if (topRec) {
        this.applySpatialHighlights(topRec.affectedNodeIds, '#f5a623');
      }
    } else if (region === 'details') {
      if (this.selectedNodeId) {
        this.applySpatialHighlights([this.selectedNodeId], '#00e5ff');
      }
    } else if (region === 'workspace') {
      this.applySpatialHighlights(['integration'], '#00e5ff');
    } else {
      this.clearSpatialHighlights();
    }
  }

  /**
   * Authoritatively resets the entire sample workspace back to its clean baseline.
   * Disposes entities without leaking GPU resources, resets schedule and graph to
   * initial state (9 tasks, 12 dependencies, 27 days), and recalculates CPM.
   */
  public resetSampleWorkspace(): { success: boolean; message: string } {
    try {
      // 1. Cancel any in-progress connection drafting
      this.cancelDraftConnection('Resetting workspace');

      // 2. Discard scenario drafts and reset What-If engine
      this.scenarioManager.discard();

      // 3. Clear spatial highlights & active selection
      this.clearSpatialHighlights();
      this.isNavigatorHighlightActive = false;
      this.activeRecommendationIndex = 0;
      if (this.selectedNodeId) {
        const prevEntity = this.nodeEntities.get(this.selectedNodeId);
        if (prevEntity?.object3D) {
          setNodeSelectionFeedback(prevEntity.object3D as Group, false);
        }
        this.selectedNodeId = 'integration';
      }

      // 4. Dispose existing 3D edge entities and procedural edge assets
      for (const binding of this.edgeBindings) {
        binding.edgeAsset.dispose();
        binding.edgeEntity.dispose({ disposeResources: true });
      }
      this.edgeBindings = [];

      // 5. Dispose existing port and node entities, meshes, and CanvasTextures
      for (const entity of this.portEntities) {
        entity.dispose({ disposeResources: true });
      }
      this.portEntities = [];

      for (const entity of this.nodeEntities.values()) {
        if (entity.object3D) {
          disposeSpatialNodeMesh(entity.object3D as Group);
        }
        entity.dispose({ disposeResources: true });
      }
      this.nodeEntities.clear();
      this.prevPositions.clear();
      this.lastAnalyzedFingerprint = null;

      // 6. Reconstruct pristine sample workflow graph & recalculate CPM
      this.graphManager = new WorkflowGraphManager(
        createSampleProductLaunchWorkflow(),
      );
      this.graph = this.graphManager.toGraph();
      this.schedule = computeSchedule(this.graph);
      this.scenarioManager = new ScenarioManager(this.graph);

      // Validate pristine graph integrity
      const integrity = this.graphManager.validateIntegrity();
      if (!integrity.valid) {
        throw new Error(`Graph integrity check failed: ${integrity.errors.join(', ')}`);
      }

      // 7. Compute deterministic base spatial layout coordinates
      const layout = computeSpatialLayout(this.graph, this.schedule);

      // 8. Recreate all 9 3D spatial node meshes and interactive port entities
      for (const [nodeId, node] of Object.entries(this.graph.nodes)) {
        const nodeSched = this.schedule.schedules[nodeId];
        if (!nodeSched) continue;

        const pos = layout[nodeId];
        const nodeGroup = createSpatialNodeMesh(node, nodeSched);

        if (pos) {
          nodeGroup.position.set(pos.x, pos.y, pos.z);
          nodeGroup.rotation.y = pos.rotationY;
          this.baseLayoutPositions.set(
            nodeId,
            new Vector3(pos.x, pos.y, pos.z),
          );
        }

        const entity = this.world.createTransformEntity(nodeGroup, {
          parent: this.workspaceEntity,
        });

        entity.addComponent(OrbitNode, {
          nodeId: node.id,
          duration: node.duration,
          isCritical: nodeSched.isCritical,
          totalFloat: nodeSched.totalFloat,
          status: node.status,
          priority: node.priority,
          risk: node.risk,
        });

        entity.addComponent(RayInteractable, {});
        entity.addComponent(DistanceGrabbable, {
          movementMode: 'MoveFromTarget',
          returnToOrigin: false,
        });
        entity.addComponent(OneHandGrabbable, {
          translate: true,
          rotate: true,
        });

        this.nodeEntities.set(nodeId, entity);
        this.prevPositions.set(nodeId, nodeGroup.position.clone());

        const outPortMesh = nodeGroup.getObjectByName('outputPort') as Group;
        const inPortMesh = nodeGroup.getObjectByName('inputPort') as Group;

        if (outPortMesh) {
          const outPortEntity = this.world.createTransformEntity(outPortMesh, {
            parent: entity,
          });
          outPortEntity.addComponent(OrbitPort, {
            nodeId: node.id,
            isOutput: true,
          });
          outPortEntity.addComponent(RayInteractable, {});
          outPortEntity.addComponent(PokeInteractable, {});
          this.portEntities.push(outPortEntity);
        }

        if (inPortMesh) {
          const inPortEntity = this.world.createTransformEntity(inPortMesh, {
            parent: entity,
          });
          inPortEntity.addComponent(OrbitPort, {
            nodeId: node.id,
            isOutput: false,
          });
          inPortEntity.addComponent(RayInteractable, {});
          inPortEntity.addComponent(PokeInteractable, {});
          this.portEntities.push(inPortEntity);
        }
      }

      // 9. Recreate all 12 3D spatial spline edges
      const criticalSet = new Set(this.schedule.criticalPath);
      for (const edge of this.graph.edges) {
        const fromPos = layout[edge.from];
        const toPos = layout[edge.to];
        if (!fromPos || !toPos) continue;

        const pStart = new Vector3(fromPos.x, fromPos.y, fromPos.z);
        const pEnd = new Vector3(toPos.x, toPos.y, toPos.z);

        const fromSched = this.schedule.schedules[edge.from];
        const toSched = this.schedule.schedules[edge.to];
        const lag = edge.lag ?? 0;

        const isCriticalEdge =
          criticalSet.has(edge.from) &&
          criticalSet.has(edge.to) &&
          Math.abs(toSched.earlyStart - (fromSched.earlyFinish + lag)) < 1e-5;

        const edgeAsset = createSpatialEdgeMesh(pStart, pEnd, isCriticalEdge);
        const edgeEntity = this.world.createTransformEntity(edgeAsset.group, {
          parent: this.workspaceEntity,
        });

        edgeEntity.addComponent(OrbitEdge, {
          edgeId: edge.id,
          from: edge.from,
          to: edge.to,
          isCritical: isCriticalEdge,
        });

        this.edgeBindings.push({
          edgeId: edge.id,
          fromNodeId: edge.from,
          toNodeId: edge.to,
          edgeAsset,
          edgeEntity,
        });
      }

      // 10. Select default node and refresh all UI panels
      this.selectNode('integration');
      this.refreshUIPanels();

      // 11. Refresh Navigator panel to clear stale recommendation / feedback
      if (this.navigatorPanel) {
        this.navigatorPanel.getElementById('nav-feedback')?.setProperties({
          text: 'Select a recommendation to simulate or explore.',
          color: '#8c92a2',
        });
      }
      this.refreshNavigatorPanel();

      // 12. Refresh Onboarding panel
      if (this.onboardingPanel) {
        this.refreshOnboardingPanel();
      }

      return {
        success: true,
        message:
          'Workspace reset to baseline: 9 Tasks, 12 Dependencies, 27 Days total.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown reset error';
      return { success: false, message: `Failed to reset workspace: ${msg}` };
    }
  }

  // --- Real-Time Update Loop ---

  update(): void {
    // A. Handle active connection drafting preview spline (Phase 3B)
    if (this.isDrafting && this.draftSourceNodeId && this.draftSpline) {
      const sourceEntity = this.nodeEntities.get(this.draftSourceNodeId);
      if (sourceEntity?.object3D) {
        const outPort = sourceEntity.object3D.getObjectByName('outputPort');
        if (outPort) {
          outPort.getWorldPosition(this.draftSourceWorldPos);
        } else {
          this.draftSourceWorldPos.copy(sourceEntity.object3D.position);
        }

        if (this.draftCandidateDestNodeId) {
          const destEntity = this.nodeEntities.get(
            this.draftCandidateDestNodeId,
          );
          if (destEntity?.object3D) {
            const inPort = destEntity.object3D.getObjectByName('inputPort');
            if (inPort) {
              inPort.getWorldPosition(this.draftTargetWorldPos);
            } else {
              this.draftTargetWorldPos.copy(destEntity.object3D.position);
            }
          }
        } else {
          const rightRay = this.player?.raySpaces?.right;
          const leftRay = this.player?.raySpaces?.left;
          const activeRay = rightRay ?? leftRay;

          if (activeRay) {
            activeRay.getWorldPosition(this.draftTargetWorldPos);
            const forward = new Vector3(0, 0, -0.4).applyQuaternion(
              activeRay.quaternion,
            );
            this.draftTargetWorldPos.add(forward);
          } else {
            this.draftTargetWorldPos
              .copy(this.draftSourceWorldPos)
              .add(new Vector3(0.2, 0, 0));
          }
        }

        this.draftSpline.update(
          this.draftSourceWorldPos,
          this.draftTargetWorldPos,
          this.draftStatus,
        );
      }
      return;
    }

    // B. Handle direct manipulation node dragging and dynamic edge splines (Phase 3A)
    const movedNodeIds = new Set<string>();

    for (const [nodeId, entity] of this.nodeEntities.entries()) {
      const obj = entity.object3D;
      const prev = this.prevPositions.get(nodeId);
      if (obj && prev) {
        if (obj.position.distanceToSquared(prev) > 1e-5) {
          prev.copy(obj.position);
          movedNodeIds.add(nodeId);
        }
      }
    }

    if (movedNodeIds.size === 0) {
      return;
    }

    // Performance optimization: only rebuild edge splines incident to the nodes that actually moved
    for (const binding of this.edgeBindings) {
      if (
        movedNodeIds.has(binding.fromNodeId) ||
        movedNodeIds.has(binding.toNodeId)
      ) {
        const fromEntity = this.nodeEntities.get(binding.fromNodeId);
        const toEntity = this.nodeEntities.get(binding.toNodeId);

        if (fromEntity?.object3D && toEntity?.object3D) {
          this.tempStart.copy(fromEntity.object3D.position);
          this.tempEnd.copy(toEntity.object3D.position);
          binding.edgeAsset.updateGeometry(this.tempStart, this.tempEnd);
        }
      }
    }
  }
}
