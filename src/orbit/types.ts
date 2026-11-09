/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * Domain types for the ORBIT pure TypeScript workflow engine.
 * Pure logic — completely decoupled from WebXR, Three.js, and ECS.
 */

export type WorkflowNodeStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'blocked';

export type WorkflowNodePriority = 'low' | 'medium' | 'high' | 'critical';

export type WorkflowNodeRisk = 'low' | 'medium' | 'high';

export type WorkflowEdgeType =
  | 'finish_to_start'
  | 'start_to_start'
  | 'finish_to_finish';

/**
 * A discrete unit of work within an ORBIT spatial dependency graph.
 */
export interface WorkflowNode {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  /** Estimated duration (e.g. days or hours). Must be non-negative. */
  readonly duration: number;
  readonly status: WorkflowNodeStatus;
  readonly priority: WorkflowNodePriority;
  readonly risk: WorkflowNodeRisk;
  readonly assignee?: string;
  readonly tags?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * A dependency edge establishing an execution constraint between two nodes.
 */
export interface WorkflowEdge {
  readonly id: string;
  /** Predecessor node ID. */
  readonly from: string;
  /** Successor node ID. */
  readonly to: string;
  /** Dependency constraint type (defaults to finish_to_start). */
  readonly type?: WorkflowEdgeType;
  /** Lead (negative) or lag (positive) time duration offset. Default 0. */
  readonly lag?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * A workflow graph representation containing nodes and directed dependency edges.
 */
export interface WorkflowGraph {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly nodes: Readonly<Record<string, WorkflowNode>>;
  readonly edges: readonly WorkflowEdge[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Granular mutation action on a workflow graph, supporting undo/redo,
 * scenario simulation, and AI planning recommendations.
 */
export type WorkflowAction =
  | { readonly type: 'add_node'; readonly node: WorkflowNode }
  | { readonly type: 'remove_node'; readonly nodeId: string }
  | {
      readonly type: 'update_node';
      readonly nodeId: string;
      readonly changes: Partial<Omit<WorkflowNode, 'id'>>;
    }
  | { readonly type: 'add_edge'; readonly edge: WorkflowEdge }
  | { readonly type: 'remove_edge'; readonly edgeId: string }
  | {
      readonly type: 'adjust_duration';
      readonly nodeId: string;
      readonly newDuration: number;
    };

/**
 * What-if scenario modeling applied on top of a baseline workflow graph.
 */
export interface WorkflowScenario {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly baseGraphId: string;
  readonly actions: readonly WorkflowAction[];
  readonly createdAt: number;
}

/**
 * Critical Path Method (CPM) schedule calculations for an individual node.
 */
export interface NodeSchedule {
  readonly nodeId: string;
  readonly duration: number;
  /** Earliest Start time. */
  readonly earlyStart: number;
  /** Earliest Finish time. */
  readonly earlyFinish: number;
  /** Latest Start time without delaying project completion. */
  readonly lateStart: number;
  /** Latest Finish time without delaying project completion. */
  readonly lateFinish: number;
  /** Total Float (Total Slack) = lateStart - earlyStart. */
  readonly totalFloat: number;
  /** Free Float = min(ES of successors) - earlyFinish. */
  readonly freeFloat: number;
  /** True if totalFloat is zero (on critical path). */
  readonly isCritical: boolean;
}

/**
 * Complete schedule analysis of a workflow graph.
 */
export interface ScheduleAnalysis {
  readonly projectDuration: number;
  /** Node IDs forming the critical path sequence. */
  readonly criticalPath: readonly string[];
  readonly schedules: Readonly<Record<string, NodeSchedule>>;
  readonly topologicalOrder: readonly string[];
}

/**
 * Downstream dependency impact analysis for a specific task.
 */
export interface DownstreamImpact {
  readonly sourceNodeId: string;
  readonly directSuccessorIds: readonly string[];
  readonly transitiveSuccessorIds: readonly string[];
  readonly impactedCriticalPathNodes: readonly string[];
  /** How much the node can slip before delaying the entire project (equal to totalFloat). */
  readonly delayTolerance: number;
  /** Computes the resulting project delay given an injected slippage. */
  readonly delayImpactOnProject: (slippage: number) => number;
}

/**
 * Identification metrics for a workflow bottleneck.
 */
export interface BottleneckNode {
  readonly nodeId: string;
  /** Normalized bottleneck score from 0 to 100. */
  readonly bottleneckScore: number;
  readonly inDegree: number;
  readonly outDegree: number;
  readonly transitiveDownstreamCount: number;
  readonly isCritical: boolean;
  readonly totalFloat: number;
  readonly reasons: readonly string[];
}

/**
 * Deterministic priority score and component breakdown for a task.
 */
export interface PriorityScore {
  readonly nodeId: string;
  /** Normalized composite priority score from 0 to 100. */
  readonly totalScore: number;
  readonly rank: number;
  readonly components: {
    readonly priorityWeight: number; // Inherent task priority [0..1]
    readonly criticalPathWeight: number; // Critical path proximity [0..1]
    readonly downstreamWeight: number; // Downstream reach ratio [0..1]
    readonly riskWeight: number; // Risk level [0..1]
    readonly durationWeight: number; // Normalized duration [0..1]
  };
  readonly explanation: string;
}

/**
 * Actionable planning recommendation generated for the user.
 */
export interface AgentRecommendation {
  readonly id: string;
  readonly title: string;
  readonly explanation: string;
  readonly confidence: number;
  readonly impactAssessment: {
    readonly criticalPathChanged: boolean;
    readonly totalDurationDelta: number;
    readonly slackDeltas: Readonly<Record<string, number>>;
    readonly bottleneckShift?: {
      readonly previous?: string;
      readonly current?: string;
    };
  };
  readonly suggestedActions: readonly WorkflowAction[];
}

