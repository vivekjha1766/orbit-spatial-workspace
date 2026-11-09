/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * ORBIT Navigator: Deterministic Workflow Intelligence & Recommendation Engine.
 * Analyzes topological bottlenecks, critical path risks, blocked workstreams,
 * and schedule compression opportunities without external LLM dependencies.
 */

import { computeSchedule } from './cpm.js';
import {
  computeDownstreamImpact,
  computePriorityScores,
  identifyBottlenecks,
  simulateScenario,
} from './analysis.js';
import type {
  ScheduleAnalysis,
  WorkflowAction,
  WorkflowGraph,
  WorkflowScenario,
} from './types.js';

export type RecommendationCategory =
  | 'BOTTLENECK'
  | 'CRITICAL_PATH_RISK'
  | 'BLOCKED_DEPENDENCY'
  | 'PRIORITY'
  | 'SCHEDULE_OPTIMIZATION'
  | 'DEPENDENCY_CONFLICT';

export type RecommendationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Computes a deterministic 32-bit FNV-1a hex fingerprint representing the
 * structural and stateful contents of the workflow graph (nodes, durations,
 * statuses, priorities, risks, and dependency edges).
 * Unrelated visual position changes do not alter this fingerprint.
 */
export function computeGraphFingerprint(graph: WorkflowGraph): string {
  const nodeKeys = Object.keys(graph.nodes).sort();
  const nodeParts = nodeKeys.map((id) => {
    const n = graph.nodes[id];
    return `${id}:${n.duration}:${n.status}:${n.priority}:${n.risk}`;
  });
  const edgeParts = [...graph.edges]
    .map((e) => `${e.from}->${e.to}:${e.type ?? 'finish_to_start'}:${e.lag ?? 0}`)
    .sort();

  let hash = 0x811c9dc5;
  const str = `${nodeParts.join('|')}#${edgeParts.join('|')}`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * A typed, explainable recommendation produced by the ORBIT Navigator.
 */
export interface WorkflowRecommendation {
  readonly id: string;
  readonly category: RecommendationCategory;
  readonly severity: RecommendationSeverity;
  readonly title: string;
  readonly explanation: string;
  readonly affectedNodeIds: readonly string[];
  readonly proposedAction?: WorkflowAction;
  readonly expectedImpact?: string;
  readonly evidence: readonly string[];
  readonly confidence: number;
  readonly canSimulate: boolean;
  /** Structural fingerprint of the baseline graph at analysis time. */
  readonly graphFingerprint: string;
}

/**
 * Detailed validation result for recommendation freshness.
 */
export interface RecommendationValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Full intelligence audit report of a workflow graph.
 */
export interface WorkflowIntelligenceReport {
  readonly timestamp: number;
  readonly graphId: string;
  readonly projectDuration: number;
  readonly criticalPath: readonly string[];
  readonly recommendations: readonly WorkflowRecommendation[];
  readonly summary: {
    readonly criticalCount: number;
    readonly highCount: number;
    readonly mediumCount: number;
    readonly topBottleneckId?: string;
  };
}

const SEVERITY_WEIGHT: Record<RecommendationSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * Deterministic intelligence engine analyzing workflow graphs.
 */
export class WorkflowNavigator {
  /**
   * Performs a comprehensive multi-criteria audit of the workflow graph
   * and produces a prioritized, explainable list of recommendations.
   */
  public analyzeWorkflow(
    graph: WorkflowGraph,
    scheduleAnalysis?: ScheduleAnalysis,
  ): WorkflowRecommendation[] {
    const schedule = scheduleAnalysis ?? computeSchedule(graph);
    const recommendations: WorkflowRecommendation[] = [];
    const graphFingerprint = computeGraphFingerprint(graph);

    const bottlenecks = identifyBottlenecks(graph, schedule);
    const priorityScores = computePriorityScores(graph, schedule);
    const priorityMap = new Map(priorityScores.map((p) => [p.nodeId, p]));
    const criticalPathSet = new Set(schedule.criticalPath);

    // 1. Bottleneck Analysis
    for (const bn of bottlenecks) {
      if (bn.bottleneckScore >= 70 || (bn.inDegree >= 2 && bn.isCritical)) {
        const node = graph.nodes[bn.nodeId];
        if (!node) continue;

        const isSuperCritical = bn.isCritical && bn.bottleneckScore >= 80;
        const severity: RecommendationSeverity = isSuperCritical
          ? 'CRITICAL'
          : bn.bottleneckScore >= 75
            ? 'HIGH'
            : 'MEDIUM';

        const evidence: string[] = [
          `Bottleneck Score: ${bn.bottleneckScore}/100`,
          `Upstream Convergence: Merges ${bn.inDegree} incoming workflows`,
          `Downstream Blast Radius: ${bn.transitiveDownstreamCount} tasks dependent`,
          bn.isCritical
            ? 'Critical Path: Zero float (0.0 days)'
            : `Float: ${bn.totalFloat.toFixed(1)} days`,
        ];

        let proposedAction: WorkflowAction | undefined;
        let expectedImpact: string | undefined;

        if (bn.isCritical && node.duration > 1) {
          const targetDuration = Math.max(1, node.duration - 1);
          proposedAction = {
            type: 'adjust_duration',
            nodeId: node.id,
            newDuration: targetDuration,
          };

          // Calculate exact CPM impact of the proposed duration adjustment
          const trialScenario: WorkflowScenario = {
            id: `trial_${node.id}`,
            name: 'Trial Impact',
            baseGraphId: graph.id,
            actions: [proposedAction],
            createdAt: Date.now(),
          };
          const trialSim = simulateScenario(graph, trialScenario);
          const delta =
            trialSim.recommendation.impactAssessment.totalDurationDelta;

          if (delta < 0) {
            expectedImpact = `Calculated Impact: Compressing "${node.title}" by 1d reduces project duration by ${Math.abs(delta).toFixed(1)}d (${schedule.projectDuration}d -> ${trialSim.updated.projectDuration}d).`;
          } else {
            expectedImpact = `Calculated Impact: Compressing "${node.title}" relieves convergence buffer but delivery remains governed at ${schedule.projectDuration}d by parallel paths.`;
          }
        }

        recommendations.push({
          id: `rec_bn_${node.id}`,
          category: 'BOTTLENECK',
          severity,
          title: `Convergence Bottleneck: ${node.title}`,
          explanation: `Task "${node.title}" is a primary convergence gateway with score ${bn.bottleneckScore}/100. It coordinates ${bn.inDegree} upstream workstreams and unblocks ${bn.outDegree} successors.`,
          affectedNodeIds: [node.id],
          proposedAction,
          expectedImpact,
          evidence,
          confidence: 0.95,
          canSimulate: proposedAction !== undefined,
          graphFingerprint,
        });
      }
    }

    // 2. Critical Path Risk Detection
    for (const nodeId of schedule.criticalPath) {
      const node = graph.nodes[nodeId];
      if (!node) continue;

      if (node.risk === 'high') {
        const impact = computeDownstreamImpact(graph, nodeId, schedule);
        const evidence: string[] = [
          'High Risk Rating on zero-slack Critical Path',
          `Directly threatens ${impact.transitiveSuccessorIds.length} downstream tasks`,
          `Delay tolerance: 0.0 days (Any delay directly extends project duration)`,
        ];

        recommendations.push({
          id: `rec_risk_${node.id}`,
          category: 'CRITICAL_PATH_RISK',
          severity: 'CRITICAL',
          title: `High Risk on Critical Path: ${node.title}`,
          explanation: `Task "${node.title}" has a HIGH risk profile while occupying the Critical Path. Without schedule contingency or acceleration, variance will delay final delivery.`,
          affectedNodeIds: [node.id, ...impact.directSuccessorIds],
          evidence,
          confidence: 0.92,
          canSimulate: false,
          graphFingerprint,
        });
      }
    }

    // 3. Blocked Workstream Detection
    for (const [nodeId, node] of Object.entries(graph.nodes)) {
      if (node.status === 'blocked') {
        const impact = computeDownstreamImpact(graph, nodeId, schedule);
        const isCritical = criticalPathSet.has(nodeId);

        const evidence: string[] = [
          'Node Status: BLOCKED',
          `Direct Successors Blocked: ${impact.directSuccessorIds.length}`,
          `Total Dependent Tasks: ${impact.transitiveSuccessorIds.length}`,
          isCritical
            ? 'Critical Path: Active milestone blockage'
            : `Available Slack: ${impact.delayTolerance.toFixed(1)} days`,
        ];

        const proposedAction: WorkflowAction = {
          type: 'update_node',
          nodeId: node.id,
          changes: { status: 'in_progress' },
        };

        recommendations.push({
          id: `rec_blocked_${node.id}`,
          category: 'BLOCKED_DEPENDENCY',
          severity: isCritical ? 'CRITICAL' : 'HIGH',
          title: `Blocked Workstream: ${node.title}`,
          explanation: `Task "${node.title}" is flagged as BLOCKED, stalling ${impact.directSuccessorIds.length} immediate successor tasks and threatening downstream execution.`,
          affectedNodeIds: [node.id, ...impact.directSuccessorIds],
          proposedAction,
          expectedImpact: `Unblocking "${node.title}" restores flow to ${impact.directSuccessorIds.length} direct dependents.`,
          evidence,
          confidence: 0.98,
          canSimulate: false,
          graphFingerprint,
        });
      }
    }

    // 4. Schedule Compression / Optimization Opportunities
    const optimizableCriticalNodes = schedule.criticalPath
      .map((id) => graph.nodes[id])
      .filter((n): n is NonNullable<typeof n> => n !== undefined && n.duration >= 3)
      .sort((a, b) => b.duration - a.duration);

    if (optimizableCriticalNodes.length > 0) {
      const targetNode = optimizableCriticalNodes[0];
      const targetNodeSched = schedule.schedules[targetNode.id];
      const targetDuration = Math.max(1, targetNode.duration - 1);

      const proposedAction: WorkflowAction = {
        type: 'adjust_duration',
        nodeId: targetNode.id,
        newDuration: targetDuration,
      };

      // Calculate exact CPM impact of the proposed compression
      const trialScenario: WorkflowScenario = {
        id: `trial_opt_${targetNode.id}`,
        name: 'Trial Optimization',
        baseGraphId: graph.id,
        actions: [proposedAction],
        createdAt: Date.now(),
      };
      const trialSim = simulateScenario(graph, trialScenario);
      const delta =
        trialSim.recommendation.impactAssessment.totalDurationDelta;

      let expectedImpact: string;
      if (delta < 0) {
        expectedImpact = `Calculated Impact: Accelerates project delivery by ${Math.abs(delta).toFixed(1)}d (${schedule.projectDuration}d -> ${trialSim.updated.projectDuration}d).`;
      } else {
        expectedImpact = `Calculated Impact: Duration reduced to ${targetDuration}d; baseline timeline remains ${schedule.projectDuration}d due to parallel critical constraint.`;
      }

      recommendations.push({
        id: `rec_opt_${targetNode.id}`,
        category: 'SCHEDULE_OPTIMIZATION',
        severity: 'HIGH',
        title: `Schedule Compression: ${targetNode.title}`,
        explanation: `Task "${targetNode.title}" represents a high-duration segment (${targetNode.duration}d) along the critical path. Compressing it to ${targetDuration}d yields project delivery acceleration.`,
        affectedNodeIds: [targetNode.id],
        proposedAction,
        expectedImpact,
        evidence: [
          `Current Task Duration: ${targetNode.duration} days`,
          `Critical Path Position (Total Slack: ${targetNodeSched?.totalFloat.toFixed(1) ?? '0.0'}d)`,
          `Target Optimized Duration: ${targetDuration} days`,
          delta < 0
            ? `Calculated Acceleration: ${Math.abs(delta).toFixed(1)} days`
            : 'Buffer Relieved (Delivery Governed by Parallel Path)',
        ],
        confidence: 0.9,
        canSimulate: true,
        graphFingerprint,
      });
    }

    // 5. Priority Alignment & High Priority Near-Critical Tasks
    for (const [nodeId, node] of Object.entries(graph.nodes)) {
      const pScore = priorityMap.get(nodeId);
      const nodeSched = schedule.schedules[nodeId];

      if (
        pScore &&
        pScore.totalScore >= 75 &&
        !criticalPathSet.has(nodeId) &&
        nodeSched &&
        nodeSched.totalFloat <= 5
      ) {
        recommendations.push({
          id: `rec_prio_${node.id}`,
          category: 'PRIORITY',
          severity: 'MEDIUM',
          title: `Near-Critical Priority Watch: ${node.title}`,
          explanation: `Task "${node.title}" holds a high composite priority score (${pScore.totalScore}/100, Rank #${pScore.rank}) and only ${nodeSched.totalFloat.toFixed(1)} days of slack before joining the Critical Path.`,
          affectedNodeIds: [node.id],
          evidence: [
            `Composite Priority Score: ${pScore.totalScore}/100`,
            `Remaining Slack: ${nodeSched.totalFloat.toFixed(1)} days`,
            `Inherent Priority: ${node.priority.toUpperCase()}`,
          ],
          confidence: 0.88,
          canSimulate: false,
          graphFingerprint,
        });
      }
    }

    // Sort deterministically: Severity (CRITICAL > HIGH > MEDIUM > LOW) -> Confidence -> Title
    recommendations.sort((a, b) => {
      const diffSeverity =
        SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
      if (diffSeverity !== 0) return diffSeverity;
      const diffConf = b.confidence - a.confidence;
      if (diffConf !== 0) return diffConf;
      return a.title.localeCompare(b.title);
    });

    return recommendations;
  }

  /**
   * Generates a complete structured intelligence audit report.
   */
  public generateReport(
    graph: WorkflowGraph,
    scheduleAnalysis?: ScheduleAnalysis,
  ): WorkflowIntelligenceReport {
    const schedule = scheduleAnalysis ?? computeSchedule(graph);
    const recommendations = this.analyzeWorkflow(graph, schedule);
    const bottlenecks = identifyBottlenecks(graph, schedule);

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    for (const rec of recommendations) {
      if (rec.severity === 'CRITICAL') criticalCount++;
      else if (rec.severity === 'HIGH') highCount++;
      else if (rec.severity === 'MEDIUM') mediumCount++;
    }

    return {
      timestamp: Date.now(),
      graphId: graph.id,
      projectDuration: schedule.projectDuration,
      criticalPath: schedule.criticalPath,
      recommendations,
      summary: {
        criticalCount,
        highCount,
        mediumCount,
        topBottleneckId: bottlenecks[0]?.nodeId,
      },
    };
  }

  /**
   * Converts a recommendation with a proposed action into a typed WorkflowScenario
   * suitable for execution via ScenarioManager.
   */
  public prepareScenario(
    recommendation: WorkflowRecommendation,
    baseGraph: WorkflowGraph,
  ): WorkflowScenario {
    const actions: WorkflowAction[] = recommendation.proposedAction
      ? [recommendation.proposedAction]
      : [];

    return {
      id: `scenario_rec_${recommendation.id}`,
      name: `Recommendation: ${recommendation.title}`,
      description: recommendation.explanation,
      baseGraphId: baseGraph.id,
      actions,
      createdAt: Date.now(),
    };
  }

  /**
   * Validates whether a recommendation is still applicable to the current graph,
   * rejecting stale recommendations whose underlying state has mutated or already been applied.
   */
  public validateRecommendation(
    recommendation: WorkflowRecommendation,
    graph: WorkflowGraph,
  ): RecommendationValidationResult {
    // 1. All affected nodes must exist
    for (const nodeId of recommendation.affectedNodeIds) {
      if (!graph.nodes[nodeId]) {
        return {
          valid: false,
          reason: `Affected task "${nodeId}" no longer exists in workflow.`,
        };
      }
    }

    // 2. Validate proposed action preconditions
    if (recommendation.proposedAction) {
      const action = recommendation.proposedAction;
      if (action.type === 'adjust_duration') {
        const node = graph.nodes[action.nodeId];
        if (!node) {
          return {
            valid: false,
            reason: `Target task "${action.nodeId}" no longer exists in workflow.`,
          };
        }
        if (node.duration === action.newDuration) {
          return {
            valid: false,
            reason: `Target task "${node.title}" duration is already at proposed value (${action.newDuration}d).`,
          };
        }
      } else if (action.type === 'update_node') {
        const node = graph.nodes[action.nodeId];
        if (!node) {
          return {
            valid: false,
            reason: `Target task "${action.nodeId}" no longer exists in workflow.`,
          };
        }
        if (action.changes.status && node.status === action.changes.status) {
          return {
            valid: false,
            reason: `Target task "${node.title}" status is already "${action.changes.status}".`,
          };
        }
      }
    }

    // 3. Structural graph fingerprint check
    const currentFingerprint = computeGraphFingerprint(graph);
    if (
      recommendation.graphFingerprint &&
      recommendation.graphFingerprint !== currentFingerprint
    ) {
      return {
        valid: false,
        reason:
          'Workflow graph structure or state has mutated since this recommendation was generated.',
      };
    }

    return { valid: true };
  }

  /**
   * Boolean check for backward compatibility.
   */
  public isRecommendationValid(
    recommendation: WorkflowRecommendation,
    graph: WorkflowGraph,
  ): boolean {
    return this.validateRecommendation(recommendation, graph).valid;
  }
}
