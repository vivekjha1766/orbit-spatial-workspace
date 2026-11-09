/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * What-If Scenario State Machine & Sandbox Lifecycle Manager (Phase 3C).
 * Enforces baseline immutability, transactional simulation, and explicit commit/discard.
 */

import { computeSchedule } from './cpm.js';
import { WorkflowGraphManager } from './graph.js';
import { simulateScenario } from './analysis.js';
import type {
  AgentRecommendation,
  ScheduleAnalysis,
  WorkflowAction,
  WorkflowGraph,
  WorkflowScenario,
} from './types.js';

export type ScenarioState =
  | 'BASELINE'
  | 'EDITING'
  | 'SIMULATED'
  | 'APPLIED'
  | 'DISCARDED';

export interface ScenarioSimulationResult {
  readonly state: ScenarioState;
  readonly scenario: WorkflowScenario;
  readonly baselineSchedule: ScheduleAnalysis;
  readonly projectedSchedule: ScheduleAnalysis;
  readonly durationDelta: number;
  readonly criticalPathChanged: boolean;
  readonly changedNodeIds: readonly string[];
  readonly recommendation: AgentRecommendation;
}

export const DURATION_BOUNDS = {
  MIN_DAYS: 0,
  MAX_DAYS: 100,
} as const;

/**
 * Manages the explicit What-If scenario lifecycle on top of an immutable committed baseline.
 */
export class ScenarioManager {
  private baselineGraph: WorkflowGraph;
  private baselineSchedule: ScheduleAnalysis;
  private state: ScenarioState = 'BASELINE';
  private currentScenarioName: string = 'Alternative Schedule';
  private draftDurations: Map<string, number> = new Map();
  private simulationResult: ScenarioSimulationResult | null = null;
  private appliedScenariosCount = 0;

  constructor(baselineGraph: WorkflowGraph) {
    this.baselineGraph = structuredClone(baselineGraph);
    this.baselineSchedule = computeSchedule(this.baselineGraph);
  }

  // --- State Query Methods ---

  public getState(): ScenarioState {
    return this.state;
  }

  public getBaselineGraph(): WorkflowGraph {
    return structuredClone(this.baselineGraph);
  }

  public getBaselineSchedule(): ScheduleAnalysis {
    return this.baselineSchedule;
  }

  public getSimulationResult(): ScenarioSimulationResult | null {
    return this.simulationResult;
  }

  public getDraftDuration(nodeId: string): number {
    const draft = this.draftDurations.get(nodeId);
    if (draft !== undefined) {
      return draft;
    }
    return this.baselineGraph.nodes[nodeId]?.duration ?? 0;
  }

  public getCommittedDuration(nodeId: string): number {
    return this.baselineGraph.nodes[nodeId]?.duration ?? 0;
  }

  public hasDraftChanges(): boolean {
    return this.draftDurations.size > 0;
  }

  public getChangedNodeIds(): string[] {
    return Array.from(this.draftDurations.keys());
  }

  // --- Scenario Lifecycle Operations ---

  /**
   * Starts or resumes editing a scenario.
   */
  public startScenario(name?: string): void {
    if (this.state === 'BASELINE' || this.state === 'DISCARDED') {
      this.state = 'EDITING';
      this.currentScenarioName =
        name ?? `Scenario ${this.appliedScenariosCount + 1}`;
      this.simulationResult = null;
    }
  }

  /**
   * Adjusts the proposed duration of a task in the active scenario.
   * Enforces min bounds (0) and max bounds (100 days).
   * Does NOT mutate the baseline graph.
   */
  public adjustDuration(
    nodeId: string,
    deltaDays: number,
  ): { oldDuration: number; newDuration: number } {
    if (!this.baselineGraph.nodes[nodeId]) {
      throw new Error(`Cannot adjust duration: node "${nodeId}" does not exist in baseline`);
    }

    if (this.state !== 'EDITING' && this.state !== 'SIMULATED') {
      this.startScenario();
    }

    const currentDuration = this.getDraftDuration(nodeId);
    const target = Math.max(
      DURATION_BOUNDS.MIN_DAYS,
      Math.min(DURATION_BOUNDS.MAX_DAYS, currentDuration + deltaDays),
    );

    const baselineDuration = this.baselineGraph.nodes[nodeId].duration;

    if (target === baselineDuration) {
      this.draftDurations.delete(nodeId);
    } else {
      this.draftDurations.set(nodeId, target);
    }

    // Changing parameters invalidates prior simulation results
    this.simulationResult = null;
    this.state = this.draftDurations.size > 0 ? 'EDITING' : 'BASELINE';

    return {
      oldDuration: currentDuration,
      newDuration: target,
    };
  }

  /**
   * Simulates the alternative schedule using pure CPM forward/backward passes.
   * Compares the projection against the committed baseline without mutating it.
   */
  public simulate(): ScenarioSimulationResult {
    const actions: WorkflowAction[] = Array.from(
      this.draftDurations.entries(),
    ).map(([nodeId, newDuration]) => ({
      type: 'adjust_duration',
      nodeId,
      newDuration,
    }));

    const scenario: WorkflowScenario = {
      id: `scenario_${Date.now()}`,
      name: this.currentScenarioName,
      baseGraphId: this.baselineGraph.id,
      actions,
      createdAt: Date.now(),
    };

    const sim = simulateScenario(this.baselineGraph, scenario);

    this.simulationResult = {
      state: 'SIMULATED',
      scenario,
      baselineSchedule: sim.previous,
      projectedSchedule: sim.updated,
      durationDelta: sim.recommendation.impactAssessment.totalDurationDelta,
      criticalPathChanged:
        sim.recommendation.impactAssessment.criticalPathChanged,
      changedNodeIds: Array.from(this.draftDurations.keys()),
      recommendation: sim.recommendation,
    };

    this.state = 'SIMULATED';
    return this.simulationResult;
  }

  /**
   * Applies and permanently commits the simulated scenario to the baseline.
   * Gated by authoritative validation. Prevents double-application.
   */
  public apply(): {
    success: boolean;
    updatedGraph: WorkflowGraph;
    updatedSchedule: ScheduleAnalysis;
    scenario: WorkflowScenario;
  } {
    if (this.state !== 'SIMULATED' && this.state !== 'EDITING') {
      throw new Error(
        `Cannot apply scenario in state "${this.state}". Must be in EDITING or SIMULATED state.`,
      );
    }

    if (this.draftDurations.size === 0) {
      throw new Error('Cannot apply scenario: no duration changes to commit');
    }

    // Auto-simulate if not already done
    const sim = this.simulationResult ?? this.simulate();

    // Commit through authoritative WorkflowGraphManager
    const manager = new WorkflowGraphManager(this.baselineGraph);
    for (const action of sim.scenario.actions) {
      manager.applyAction(action);
    }

    // Validate integrity of new committed graph
    const integrity = manager.validateIntegrity();
    if (!integrity.valid) {
      throw new Error(
        `Integrity failure applying scenario: ${integrity.errors.join(', ')}`,
      );
    }

    // Commit new baseline state
    this.baselineGraph = manager.toGraph();
    this.baselineSchedule = computeSchedule(this.baselineGraph);
    this.appliedScenariosCount++;

    const appliedScenario = sim.scenario;
    this.draftDurations.clear();
    this.simulationResult = null;
    this.state = 'APPLIED';

    return {
      success: true,
      updatedGraph: structuredClone(this.baselineGraph),
      updatedSchedule: this.baselineSchedule,
      scenario: appliedScenario,
    };
  }

  /**
   * Discards all proposed scenario changes and clears draft state.
   */
  public discard(): void {
    this.draftDurations.clear();
    this.simulationResult = null;
    this.state = 'DISCARDED';
  }

  /**
   * Restores view to the committed baseline state.
   */
  public restoreBaseline(): {
    baselineGraph: WorkflowGraph;
    baselineSchedule: ScheduleAnalysis;
  } {
    this.discard();
    this.state = 'BASELINE';
    return {
      baselineGraph: structuredClone(this.baselineGraph),
      baselineSchedule: this.baselineSchedule,
    };
  }

  /**
   * Updates the baseline graph when an external committed mutation occurs
   * (e.g. edge creation in Phase 3B).
   */
  public updateCommittedBaseline(newGraph: WorkflowGraph): void {
    this.baselineGraph = structuredClone(newGraph);
    this.baselineSchedule = computeSchedule(this.baselineGraph);
    this.draftDurations.clear();
    this.simulationResult = null;
    this.state = 'BASELINE';
  }
}

