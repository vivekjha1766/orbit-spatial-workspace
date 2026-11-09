/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * Workflow Graph Operations, Mutations, and Integrity Validation.
 */

import type {
  WorkflowAction,
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
} from './types.js';

export interface GraphValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface CycleDetectionResult {
  readonly hasCycle: boolean;
  readonly cyclePath?: readonly string[];
}

/**
 * Manages an ORBIT workflow graph, guaranteeing referential integrity,
 * DAG acyclicity, and safe transactional mutations.
 */
export class WorkflowGraphManager {
  private id: string;
  private name: string;
  private description?: string;
  private nodesMap: Map<string, WorkflowNode> = new Map();
  private edgesMap: Map<string, WorkflowEdge> = new Map();
  private metadata?: Record<string, unknown>;

  constructor(graph?: WorkflowGraph) {
    if (graph) {
      this.id = graph.id;
      this.name = graph.name;
      this.description = graph.description;
      this.metadata = graph.metadata ? { ...graph.metadata } : undefined;
      for (const [key, node] of Object.entries(graph.nodes)) {
        this.nodesMap.set(key, { ...node });
      }
      for (const edge of graph.edges) {
        this.edgesMap.set(edge.id, { ...edge });
      }
    } else {
      this.id = `graph_${Date.now()}`;
      this.name = 'New Workflow';
    }
  }

  // --- Read Operations ---

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getDescription(): string | undefined {
    return this.description;
  }

  public getNode(nodeId: string): WorkflowNode | undefined {
    return this.nodesMap.get(nodeId);
  }

  public hasNode(nodeId: string): boolean {
    return this.nodesMap.has(nodeId);
  }

  public getNodes(): WorkflowNode[] {
    return Array.from(this.nodesMap.values());
  }

  public getNodeCount(): number {
    return this.nodesMap.size;
  }

  public getEdge(edgeId: string): WorkflowEdge | undefined {
    return this.edgesMap.get(edgeId);
  }

  public hasEdge(edgeId: string): boolean {
    return this.edgesMap.has(edgeId);
  }

  public getEdges(): WorkflowEdge[] {
    return Array.from(this.edgesMap.values());
  }

  public getEdgeCount(): number {
    return this.edgesMap.size;
  }

  public getIncomingEdges(nodeId: string): WorkflowEdge[] {
    const result: WorkflowEdge[] = [];
    for (const edge of this.edgesMap.values()) {
      if (edge.to === nodeId) {
        result.push(edge);
      }
    }
    return result;
  }

  public getOutgoingEdges(nodeId: string): WorkflowEdge[] {
    const result: WorkflowEdge[] = [];
    for (const edge of this.edgesMap.values()) {
      if (edge.from === nodeId) {
        result.push(edge);
      }
    }
    return result;
  }

  public getPredecessors(nodeId: string): WorkflowNode[] {
    const predecessors: WorkflowNode[] = [];
    for (const edge of this.getIncomingEdges(nodeId)) {
      const pred = this.nodesMap.get(edge.from);
      if (pred) {
        predecessors.push(pred);
      }
    }
    return predecessors;
  }

  public getSuccessors(nodeId: string): WorkflowNode[] {
    const successors: WorkflowNode[] = [];
    for (const edge of this.getOutgoingEdges(nodeId)) {
      const succ = this.nodesMap.get(edge.to);
      if (succ) {
        successors.push(succ);
      }
    }
    return successors;
  }

  // --- Mutation Operations ---

  /**
   * Adds a new task node to the graph.
   * Throws if the ID already exists or duration is invalid.
   */
  public addNode(node: WorkflowNode): void {
    if (!node.id || node.id.trim() === '') {
      throw new Error('Node ID cannot be empty');
    }
    if (this.nodesMap.has(node.id)) {
      throw new Error(`Node with id "${node.id}" already exists`);
    }
    if (node.duration < 0) {
      throw new Error(`Node duration cannot be negative: ${node.duration}`);
    }
    this.nodesMap.set(node.id, { ...node });
  }

  /**
   * Updates an existing node's fields.
   */
  public updateNode(
    nodeId: string,
    changes: Partial<Omit<WorkflowNode, 'id'>>,
  ): void {
    const existing = this.nodesMap.get(nodeId);
    if (!existing) {
      throw new Error(`Cannot update non-existent node "${nodeId}"`);
    }
    if (changes.duration !== undefined && changes.duration < 0) {
      throw new Error(`Node duration cannot be negative: ${changes.duration}`);
    }
    this.nodesMap.set(nodeId, {
      ...existing,
      ...changes,
      id: nodeId, // guarantee ID immutability
    });
  }

  /**
   * Removes a node and cascades removal of all associated incoming and outgoing edges.
   */
  public removeNode(nodeId: string): boolean {
    if (!this.nodesMap.has(nodeId)) {
      return false;
    }
    // Cascade removal of connected edges
    const edgesToRemove: string[] = [];
    for (const [edgeId, edge] of this.edgesMap.entries()) {
      if (edge.from === nodeId || edge.to === nodeId) {
        edgesToRemove.push(edgeId);
      }
    }
    for (const edgeId of edgesToRemove) {
      this.edgesMap.delete(edgeId);
    }
    this.nodesMap.delete(nodeId);
    return true;
  }

  /**
   * Adds a dependency edge between two existing nodes.
   * Enforces referential integrity, prevents self-loops, duplicate edges, and circular dependencies.
   */
  public addEdge(edge: WorkflowEdge): void {
    if (!edge.id || edge.id.trim() === '') {
      throw new Error('Edge ID cannot be empty');
    }
    if (this.edgesMap.has(edge.id)) {
      throw new Error(`Edge with id "${edge.id}" already exists`);
    }
    if (!this.nodesMap.has(edge.from)) {
      throw new Error(`Source node "${edge.from}" does not exist`);
    }
    if (!this.nodesMap.has(edge.to)) {
      throw new Error(`Target node "${edge.to}" does not exist`);
    }
    if (edge.from === edge.to) {
      throw new Error(
        `Self-referential dependencies are forbidden: "${edge.from}" -> "${edge.to}"`,
      );
    }

    // Check duplicate edge between the same pair
    for (const existing of this.edgesMap.values()) {
      if (existing.from === edge.from && existing.to === edge.to) {
        throw new Error(
          `Dependency edge between "${edge.from}" and "${edge.to}" already exists (id: ${existing.id})`,
        );
      }
    }

    // Tentatively insert and check for cycles
    this.edgesMap.set(edge.id, { ...edge });
    const cycle = this.detectCycles();
    if (cycle.hasCycle) {
      // Rollback mutation
      this.edgesMap.delete(edge.id);
      throw new Error(
        `Circular dependency detected: edge "${edge.from}" -> "${edge.to}" creates cycle [${cycle.cyclePath?.join(' -> ')}]`,
      );
    }
  }

  /**
   * Pre-validates whether adding a dependency edge between two nodes would succeed,
   * without mutating the graph or throwing an exception.
   */
  public validateEdgeCandidate(
    fromId: string,
    toId: string,
  ): { valid: boolean; reason?: string } {
    if (!fromId || !this.nodesMap.has(fromId)) {
      return { valid: false, reason: `Source node "${fromId}" does not exist` };
    }
    if (!toId || !this.nodesMap.has(toId)) {
      return { valid: false, reason: `Destination node "${toId}" does not exist` };
    }
    if (fromId === toId) {
      return {
        valid: false,
        reason: `Self-dependencies are forbidden: cannot connect "${fromId}" to itself`,
      };
    }
    for (const edge of this.edgesMap.values()) {
      if (edge.from === fromId && edge.to === toId) {
        return {
          valid: false,
          reason: `Dependency "${fromId}" -> "${toId}" already exists`,
        };
      }
    }

    // Tentatively test for cycle without mutating state
    const probeId = `__probe_${Date.now()}`;
    this.edgesMap.set(probeId, { id: probeId, from: fromId, to: toId });
    const cycle = this.detectCycles();
    this.edgesMap.delete(probeId);

    if (cycle.hasCycle) {
      return {
        valid: false,
        reason: `Circular dependency detected: [${cycle.cyclePath?.join(' -> ')}]`,
      };
    }

    return { valid: true };
  }

  /**
   * Removes a dependency edge.
   */
  public removeEdge(edgeId: string): boolean {
    return this.edgesMap.delete(edgeId);
  }

  /**
   * Applies a discrete workflow mutation action transactionally.
   */
  public applyAction(action: WorkflowAction): void {
    switch (action.type) {
      case 'add_node':
        this.addNode(action.node);
        break;
      case 'remove_node':
        this.removeNode(action.nodeId);
        break;
      case 'update_node':
        this.updateNode(action.nodeId, action.changes);
        break;
      case 'add_edge':
        this.addEdge(action.edge);
        break;
      case 'remove_edge':
        this.removeEdge(action.edgeId);
        break;
      case 'adjust_duration':
        this.updateNode(action.nodeId, { duration: action.newDuration });
        break;
      default:
        throw new Error(
          `Unknown action type: ${(action as { type: string }).type}`,
        );
    }
  }

  // --- Integrity & Graph Checks ---

  /**
   * Performs complete referential integrity and constraint validation on the graph.
   */
  public validateIntegrity(): GraphValidationResult {
    const errors: string[] = [];

    for (const edge of this.edgesMap.values()) {
      if (!this.nodesMap.has(edge.from)) {
        errors.push(
          `Edge "${edge.id}" references non-existent source node "${edge.from}"`,
        );
      }
      if (!this.nodesMap.has(edge.to)) {
        errors.push(
          `Edge "${edge.id}" references non-existent target node "${edge.to}"`,
        );
      }
      if (edge.from === edge.to) {
        errors.push(`Edge "${edge.id}" is a forbidden self-loop on "${edge.from}"`);
      }
    }

    for (const node of this.nodesMap.values()) {
      if (node.duration < 0) {
        errors.push(
          `Node "${node.id}" has invalid negative duration: ${node.duration}`,
        );
      }
    }

    const cycleCheck = this.detectCycles();
    if (cycleCheck.hasCycle) {
      errors.push(
        `Graph contains circular dependencies: ${cycleCheck.cyclePath?.join(' -> ')}`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detects cycles in the directed graph using Tarjan's or 3-color DFS.
   */
  public detectCycles(): CycleDetectionResult {
    // 0 = unvisited, 1 = visiting (in active call stack), 2 = visited
    const state = new Map<string, number>();
    const parent = new Map<string, string>();
    const nodeIds = Array.from(this.nodesMap.keys());

    for (const id of nodeIds) {
      state.set(id, 0);
    }

    let cycleFound: string[] | null = null;

    const dfs = (u: string, path: string[]): boolean => {
      state.set(u, 1);
      path.push(u);

      const outgoing = this.getOutgoingEdges(u);
      for (const edge of outgoing) {
        const v = edge.to;
        if (!this.nodesMap.has(v)) {
          continue;
        }

        const vState = state.get(v) ?? 0;
        if (vState === 1) {
          // Cycle found! Extract the cycle path
          const startIndex = path.indexOf(v);
          cycleFound = path.slice(startIndex).concat([v]);
          return true;
        } else if (vState === 0) {
          parent.set(v, u);
          if (dfs(v, path)) {
            return true;
          }
        }
      }

      path.pop();
      state.set(u, 2);
      return false;
    };

    for (const id of nodeIds) {
      if ((state.get(id) ?? 0) === 0) {
        if (dfs(id, [])) {
          return {
            hasCycle: true,
            cyclePath: cycleFound ?? undefined,
          };
        }
      }
    }

    return { hasCycle: false };
  }

  /**
   * Clones the current manager into a separate, independent deep instance.
   */
  public clone(): WorkflowGraphManager {
    return new WorkflowGraphManager(this.toGraph());
  }

  /**
   * Serializes the manager into an immutable WorkflowGraph value object.
   */
  public toGraph(): WorkflowGraph {
    const nodes: Record<string, WorkflowNode> = {};
    for (const [key, value] of this.nodesMap.entries()) {
      nodes[key] = {
        ...value,
        tags: value.tags ? [...value.tags] : undefined,
        metadata: value.metadata ? { ...value.metadata } : undefined,
      };
    }

    const edges: WorkflowEdge[] = Array.from(this.edgesMap.values()).map(
      (edge) => ({
        ...edge,
        metadata: edge.metadata ? { ...edge.metadata } : undefined,
      }),
    );

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      nodes,
      edges,
      metadata: this.metadata ? { ...this.metadata } : undefined,
    };
  }
}

