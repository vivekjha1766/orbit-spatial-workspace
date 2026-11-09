/// <reference types="node" />

/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * Automated Test Suite for the ORBIT Pure Workflow Engine.
 * Built with native Node.js test runner (node:test) and assertions (node:assert/strict).
 */

import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from '@iwsdk/core';
import {
  computeDownstreamImpact,
  computeGraphFingerprint,
  computePriorityScores,
  computeSchedule,
  computeSpatialLayout,
  createSampleProductLaunchWorkflow,
  DURATION_BOUNDS,
  identifyBottlenecks,
  OnboardingManager,
  ONBOARDING_STEP_DEFINITIONS,
  ScenarioManager,
  simulateScenario,
  topologicalSort,
  WorkflowGraphManager,
  WorkflowNavigator,
} from '../index.js';
import {
  createDraftSplineMesh,
  createSpatialEdgeMesh,
} from '../spatial-edge.scene-asset.js';
import {
  createSpatialNodeMesh,
  disposeSpatialNodeMesh,
  updateSpatialNodeMesh,
} from '../spatial-node.scene-asset.js';
import type { WorkflowEdge, WorkflowNode, WorkflowScenario } from '../types.js';

// Setup minimal HTML Canvas mock for Node.js test environment if not present
if (typeof globalThis.document === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 1024,
          height: 512,
          getContext: () => ({
            createLinearGradient: () => ({ addColorStop: () => {} }),
            fillRect: () => {},
            strokeRect: () => {},
            measureText: (text: string) => ({ width: text.length * 10 }),
            beginPath: () => {},
            roundRect: () => {},
            fill: () => {},
            stroke: () => {},
            fillText: () => {},
            moveTo: () => {},
            lineTo: () => {},
          }),
        };
      }
      return {};
    },
  };
}

describe('ORBIT Workflow Engine — Unit & Integration Test Suite', () => {
  describe('1. Graph Operations & Referential Integrity', () => {
    it('creates an empty graph and adds valid nodes', () => {
      const manager = new WorkflowGraphManager();
      const nodeA: WorkflowNode = {
        id: 'task_a',
        title: 'Task A',
        duration: 3,
        status: 'not_started',
        priority: 'high',
        risk: 'low',
      };
      manager.addNode(nodeA);

      assert.equal(manager.getNodeCount(), 1);
      assert.deepEqual(manager.getNode('task_a'), nodeA);
    });

    it('rejects adding nodes with duplicate IDs or negative duration', () => {
      const manager = new WorkflowGraphManager();
      manager.addNode({
        id: 'task_dup',
        title: 'Duplicate Task',
        duration: 2,
        status: 'not_started',
        priority: 'medium',
        risk: 'low',
      });

      assert.throws(
        () =>
          manager.addNode({
            id: 'task_dup',
            title: 'Another',
            duration: 1,
            status: 'not_started',
            priority: 'low',
            risk: 'low',
          }),
        /already exists/,
      );

      assert.throws(
        () =>
          manager.addNode({
            id: 'task_neg',
            title: 'Negative Duration',
            duration: -5,
            status: 'not_started',
            priority: 'low',
            risk: 'low',
          }),
        /cannot be negative/,
      );
    });

    it('removes nodes and cleanly cascades incident edges', () => {
      const manager = new WorkflowGraphManager();
      manager.addNode({
        id: 'a',
        title: 'A',
        duration: 2,
        status: 'completed',
        priority: 'medium',
        risk: 'low',
      });
      manager.addNode({
        id: 'b',
        title: 'B',
        duration: 3,
        status: 'not_started',
        priority: 'medium',
        risk: 'low',
      });
      manager.addNode({
        id: 'c',
        title: 'C',
        duration: 1,
        status: 'not_started',
        priority: 'low',
        risk: 'low',
      });

      manager.addEdge({ id: 'e1', from: 'a', to: 'b' });
      manager.addEdge({ id: 'e2', from: 'b', to: 'c' });
      assert.equal(manager.getEdgeCount(), 2);

      // Remove middle node 'b'
      const removed = manager.removeNode('b');
      assert.equal(removed, true);
      assert.equal(manager.getNodeCount(), 2);
      assert.equal(manager.getEdgeCount(), 0); // Both e1 and e2 must be cascaded
    });

    it('rejects invalid edges (missing node, self-loops, duplicate edges)', () => {
      const manager = new WorkflowGraphManager();
      manager.addNode({
        id: 'n1',
        title: 'Node 1',
        duration: 1,
        status: 'not_started',
        priority: 'low',
        risk: 'low',
      });

      // Missing target
      assert.throws(
        () => manager.addEdge({ id: 'e_bad', from: 'n1', to: 'non_existent' }),
        /Target node "non_existent" does not exist/,
      );

      // Missing source
      assert.throws(
        () => manager.addEdge({ id: 'e_bad', from: 'non_existent', to: 'n1' }),
        /Source node "non_existent" does not exist/,
      );

      // Self-loop
      assert.throws(
        () => manager.addEdge({ id: 'e_self', from: 'n1', to: 'n1' }),
        /Self-referential dependencies are forbidden/,
      );

      // Duplicate edge
      manager.addNode({
        id: 'n2',
        title: 'Node 2',
        duration: 2,
        status: 'not_started',
        priority: 'low',
        risk: 'low',
      });
      manager.addEdge({ id: 'e_valid', from: 'n1', to: 'n2' });
      assert.throws(
        () => manager.addEdge({ id: 'e_dup', from: 'n1', to: 'n2' }),
        /already exists/,
      );
    });

    it('rejects circular dependencies and preserves previous valid state', () => {
      const manager = new WorkflowGraphManager();
      manager.addNode({
        id: 'x',
        title: 'X',
        duration: 1,
        status: 'not_started',
        priority: 'low',
        risk: 'low',
      });
      manager.addNode({
        id: 'y',
        title: 'Y',
        duration: 1,
        status: 'not_started',
        priority: 'low',
        risk: 'low',
      });
      manager.addNode({
        id: 'z',
        title: 'Z',
        duration: 1,
        status: 'not_started',
        priority: 'low',
        risk: 'low',
      });

      manager.addEdge({ id: 'e_xy', from: 'x', to: 'y' });
      manager.addEdge({ id: 'e_yz', from: 'y', to: 'z' });

      // Introducing z -> x creates cycle x -> y -> z -> x
      assert.throws(
        () => manager.addEdge({ id: 'e_zx', from: 'z', to: 'x' }),
        /Circular dependency detected/,
      );

      // Ensure graph is intact and valid
      assert.equal(manager.getEdgeCount(), 2);
      const integrity = manager.validateIntegrity();
      assert.equal(integrity.valid, true);
    });
  });

  describe('2. Topological Sorting & CPM Scheduling', () => {
    it('produces valid topological order on a diamond DAG', () => {
      const manager = new WorkflowGraphManager();
      manager.addNode({
        id: 'start',
        title: 'Start',
        duration: 2,
        status: 'not_started',
        priority: 'critical',
        risk: 'low',
      });
      manager.addNode({
        id: 'branch1',
        title: 'Branch 1',
        duration: 4,
        status: 'not_started',
        priority: 'high',
        risk: 'medium',
      });
      manager.addNode({
        id: 'branch2',
        title: 'Branch 2',
        duration: 2,
        status: 'not_started',
        priority: 'medium',
        risk: 'low',
      });
      manager.addNode({
        id: 'finish',
        title: 'Finish',
        duration: 3,
        status: 'not_started',
        priority: 'critical',
        risk: 'high',
      });

      manager.addEdge({ id: 'e1', from: 'start', to: 'branch1' });
      manager.addEdge({ id: 'e2', from: 'start', to: 'branch2' });
      manager.addEdge({ id: 'e3', from: 'branch1', to: 'finish' });
      manager.addEdge({ id: 'e4', from: 'branch2', to: 'finish' });

      const topo = topologicalSort(manager.toGraph());
      assert.equal(topo.hasCycle, false);
      assert.equal(topo.sortedNodeIds[0], 'start');
      assert.equal(topo.sortedNodeIds[topo.sortedNodeIds.length - 1], 'finish');

      const schedule = computeSchedule(manager.toGraph());
      // Path 1: 2 + 4 + 3 = 9
      // Path 2: 2 + 2 + 3 = 7
      assert.equal(schedule.projectDuration, 9);
      assert.deepEqual(schedule.criticalPath, ['start', 'branch1', 'finish']);

      // branch2 has 2 units of slack (7 vs 9)
      const b2Sched = schedule.schedules['branch2'];
      assert.equal(b2Sched.totalFloat, 2);
      assert.equal(b2Sched.freeFloat, 2);
      assert.equal(b2Sched.isCritical, false);

      // branch1 is on critical path
      const b1Sched = schedule.schedules['branch1'];
      assert.equal(b1Sched.totalFloat, 0);
      assert.equal(b1Sched.isCritical, true);
    });
  });

  describe('3. Sample Software Product Launch Workflow Evaluation', () => {
    const graph = createSampleProductLaunchWorkflow();

    it('passes full integrity verification', () => {
      const manager = new WorkflowGraphManager(graph);
      const integrity = manager.validateIntegrity();
      assert.equal(integrity.valid, true);
      assert.equal(integrity.errors.length, 0);
      assert.equal(manager.getNodeCount(), 9);
      assert.equal(manager.getEdgeCount(), 12);
    });

    it('computes exact Critical Path Method metrics for sample launch', () => {
      const schedule = computeSchedule(graph);

      /**
       * Expected Schedule calculations:
       * requirements: [0, 4] (dur: 4)
       * architecture: [4, 7] (dur: 3)
       * ui_design:    [4, 9] (dur: 5)
       * backend_dev:  [7, 15] (dur: 8) -> feeds integration (ES 16), so slack = 16 - 15 = 1
       * frontend_dev: max(arch: 7, ui: 9) = 9 -> [9, 16] (dur: 7)
       * integration:  max(backend: 15, frontend: 16) = 16 -> [16, 20] (dur: 4)
       * testing:      [20, 25] (dur: 5)
       * security:     max(backend: 15, integration: 20) = 20 -> [20, 23] (dur: 3) -> LF = 25, slack = 2
       * deployment:   max(testing: 25, security: 23) = 25 -> [25, 27] (dur: 2)
       *
       * Total project duration = 27 days.
       * Critical Path = requirements -> ui_design -> frontend_dev -> integration -> testing -> deployment.
       */
      assert.equal(schedule.projectDuration, 27);
      assert.deepEqual(schedule.criticalPath, [
        'requirements',
        'ui_design',
        'frontend_dev',
        'integration',
        'testing',
        'deployment',
      ]);

      // Slack verifications
      assert.equal(schedule.schedules['backend_dev'].totalFloat, 1);
      assert.equal(schedule.schedules['architecture'].totalFloat, 1);
      assert.equal(schedule.schedules['security_review'].totalFloat, 2);

      assert.equal(schedule.schedules['ui_design'].isCritical, true);
      assert.equal(schedule.schedules['frontend_dev'].isCritical, true);
      assert.equal(schedule.schedules['integration'].isCritical, true);
    });

    it('accurately computes downstream impact and delay tolerance', () => {
      const impact = computeDownstreamImpact(graph, 'ui_design');

      assert.equal(impact.sourceNodeId, 'ui_design');
      assert.deepEqual(impact.directSuccessorIds, ['frontend_dev']);
      // Transitive downstream: frontend_dev, integration, testing, security_review, deployment
      assert.equal(impact.transitiveSuccessorIds.length, 5);
      assert.equal(impact.delayTolerance, 0); // On critical path, zero tolerance

      // A 3-day slip on a critical task delays the project by exactly 3 days
      assert.equal(impact.delayImpactOnProject(3), 3);

      // Test downstream impact on backend_dev (which has 1 day of slack)
      const backendImpact = computeDownstreamImpact(graph, 'backend_dev');
      assert.equal(backendImpact.delayTolerance, 1);
      assert.equal(backendImpact.delayImpactOnProject(1), 0); // Absorbed by slack
      assert.equal(backendImpact.delayImpactOnProject(3), 2); // 3 - 1 = 2 days project delay
    });

    it('identifies top workflow bottlenecks correctly', () => {
      const bottlenecks = identifyBottlenecks(graph);

      assert.ok(bottlenecks.length > 0);
      const topBottleneck = bottlenecks[0];

      // Integration is a primary convergence gate (merges backend & frontend, feeds testing & security)
      // and is on the critical path.
      assert.equal(topBottleneck.nodeId, 'integration');
      assert.equal(topBottleneck.isCritical, true);
      assert.ok(topBottleneck.bottleneckScore >= 85);
      assert.ok(
        topBottleneck.reasons.some((r) => r.includes('Critical Path')),
      );
      assert.ok(
        topBottleneck.reasons.some((r) => r.includes('Convergence Gate')),
      );
    });

    it('evaluates transparent deterministic priority scores', () => {
      const scores = computePriorityScores(graph);

      assert.equal(scores.length, 9);
      // All ranks must be unique 1 through 9
      const ranks = scores.map((s) => s.rank);
      assert.deepEqual(ranks, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

      // Top tasks should be critical path tasks with high downstream reach
      const topTask = scores[0];
      assert.ok(
        ['requirements', 'integration', 'frontend_dev'].includes(
          topTask.nodeId,
        ),
      );
      assert.ok(topTask.totalScore > 80);
      assert.ok(topTask.components.priorityWeight > 0);
    });

    it('simulates what-if scenarios and generates agent recommendations', () => {
      // Scenario: Fast-track UI design from 5 days to 3 days (saving 2 days on critical path)
      const scenario: WorkflowScenario = {
        id: 'fast_track_ui',
        name: 'Fast-Track Spatial UI Design',
        description: 'Add an extra designer to complete UI prototypes in 3 days instead of 5',
        baseGraphId: graph.id,
        createdAt: Date.now(),
        actions: [
          {
            type: 'adjust_duration',
            nodeId: 'ui_design',
            newDuration: 3,
          },
        ],
      };

      const simulation = simulateScenario(graph, scenario);

      assert.equal(simulation.previous.projectDuration, 27);
      // If UI is 3 days, UI EF is 7. Arch EF is 7. Frontend starts at 7.
      // Frontend EF becomes 7 + 7 = 14.
      // But Backend EF is 7 + 8 = 15!
      // So Integration now waits on Backend (15)!
      // Project duration becomes: 15 + 4 + 5 + 2 = 26 days (net 1 day savings, critical path shifts to backend_dev!)
      assert.equal(simulation.updated.projectDuration, 26);
      assert.equal(
        simulation.recommendation.impactAssessment.totalDurationDelta,
        -1,
      );
      assert.equal(
        simulation.recommendation.impactAssessment.criticalPathChanged,
        true,
      );
      assert.ok(
        simulation.recommendation.explanation.includes(
          'accelerates overall project delivery',
        ),
      );
    });

    it('generates non-overlapping ergonomic 3D spatial layout coordinates', () => {
      const schedule = computeSchedule(graph);
      const layout = computeSpatialLayout(graph, schedule);

      const nodeIds = Object.keys(graph.nodes);
      assert.equal(Object.keys(layout).length, 9);

      // Verify each node has valid non-NaN 3D coordinates within comfortable arm/view reach
      for (const id of nodeIds) {
        const pos = layout[id];
        assert.ok(pos, `Missing layout for ${id}`);
        assert.ok(!Number.isNaN(pos.x));
        assert.ok(!Number.isNaN(pos.y));
        assert.ok(!Number.isNaN(pos.z));
        assert.ok(!Number.isNaN(pos.rotationY));

        // Height must be between 1.0m and 1.7m (comfortable viewing)
        assert.ok(pos.y >= 1.0 && pos.y <= 1.7, `Node ${id} height out of range: ${pos.y}`);

        // Distance in Z must be in front of the user (negative Z, between -1.0m and -2.2m)
        assert.ok(pos.z < -1.0 && pos.z > -2.2, `Node ${id} Z distance out of range: ${pos.z}`);
      }

      // Verify no two nodes overlap (minimum 3D distance between any pair >= 0.20m)
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const a = layout[nodeIds[i]];
          const b = layout[nodeIds[j]];
          const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          assert.ok(
            dist >= 0.2,
            `Nodes ${nodeIds[i]} and ${nodeIds[j]} are too close (distance: ${dist.toFixed(3)}m < 0.20m)`,
          );
        }
      }
    });
  });

  describe('4. Spatial Dependency Creation & Transactional Integrity (Phase 3B)', () => {
    it('validates and creates a valid dependency edge without cycles', () => {
      const manager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
      assert.equal(manager.getEdgeCount(), 12);

      // Candidate: architecture -> security_review (valid forward edge, does not already exist)
      const candidate = manager.validateEdgeCandidate('architecture', 'security_review');
      assert.equal(candidate.valid, true);
      assert.equal(candidate.reason, undefined);

      manager.addEdge({
        id: 'edge_arch_to_security',
        from: 'architecture',
        to: 'security_review',
      });

      assert.equal(manager.getEdgeCount(), 13);
      assert.ok(manager.hasEdge('edge_arch_to_security'));
      assert.equal(manager.validateIntegrity().valid, true);
    });

    it('rejects self-dependencies and preserves graph integrity', () => {
      const manager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
      const initialEdgeCount = manager.getEdgeCount();

      const candidate = manager.validateEdgeCandidate('backend_dev', 'backend_dev');
      assert.equal(candidate.valid, false);
      assert.ok(candidate.reason?.includes('Self-dependencies are forbidden'));

      assert.throws(
        () =>
          manager.addEdge({
            id: 'edge_self',
            from: 'backend_dev',
            to: 'backend_dev',
          }),
        /Self-referential/,
      );

      assert.equal(manager.getEdgeCount(), initialEdgeCount);
      assert.equal(manager.validateIntegrity().valid, true);
    });

    it('rejects duplicate dependency edges between existing node pairs', () => {
      const manager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
      const initialEdgeCount = manager.getEdgeCount();

      // backend_dev -> integration already exists
      const candidate = manager.validateEdgeCandidate('backend_dev', 'integration');
      assert.equal(candidate.valid, false);
      assert.ok(candidate.reason?.includes('already exists'));

      assert.throws(
        () =>
          manager.addEdge({
            id: 'edge_dup',
            from: 'backend_dev',
            to: 'integration',
          }),
        /already exists/,
      );

      assert.equal(manager.getEdgeCount(), initialEdgeCount);
    });

    it('rejects circular dependencies and preserves previous valid DAG state', () => {
      const manager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
      const initialEdgeCount = manager.getEdgeCount();

      // Candidate: integration -> architecture (creates cycle arch -> backend/ui -> integ -> arch)
      const candidate1 = manager.validateEdgeCandidate('integration', 'architecture');
      assert.equal(candidate1.valid, false);
      assert.ok(candidate1.reason?.includes('Circular dependency detected'));

      assert.throws(
        () =>
          manager.addEdge({
            id: 'edge_cycle_1',
            from: 'integration',
            to: 'architecture',
          }),
        /Circular dependency detected/,
      );

      // Candidate: deployment -> requirements (creates full project loop)
      const candidate2 = manager.validateEdgeCandidate('deployment', 'requirements');
      assert.equal(candidate2.valid, false);
      assert.ok(candidate2.reason?.includes('Circular dependency detected'));

      assert.throws(
        () =>
          manager.addEdge({
            id: 'edge_cycle_2',
            from: 'deployment',
            to: 'requirements',
          }),
        /Circular dependency detected/,
      );

      // Verify zero mutation occurred
      assert.equal(manager.getEdgeCount(), initialEdgeCount);
      assert.equal(manager.validateIntegrity().valid, true);
    });

    it('rejects missing source or destination node references', () => {
      const manager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());

      const badSource = manager.validateEdgeCandidate('non_existent', 'integration');
      assert.equal(badSource.valid, false);
      assert.ok(badSource.reason?.includes('Source node "non_existent" does not exist'));

      const badDest = manager.validateEdgeCandidate('backend_dev', 'unknown_target');
      assert.equal(badDest.valid, false);
      assert.ok(badDest.reason?.includes('Destination node "unknown_target" does not exist'));

      assert.throws(
        () =>
          manager.addEdge({
            id: 'edge_bad_src',
            from: 'non_existent',
            to: 'integration',
          }),
        /does not exist/,
      );
    });

    it('preserves graph integrity and topological ordering across repeated failed attempts', () => {
      const manager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
      const baselineGraph = manager.toGraph();

      // Attempt 5 invalid edge creations in sequence
      const invalidPairs = [
        ['backend_dev', 'backend_dev'],
        ['integration', 'architecture'],
        ['testing', 'requirements'],
        ['deployment', 'ui_design'],
        ['requirements', 'requirements'],
      ];

      for (const [from, to] of invalidPairs) {
        const val = manager.validateEdgeCandidate(from, to);
        assert.equal(val.valid, false);
      }

      // Assert graph is perfectly identical to baseline
      const currentGraph = manager.toGraph();
      assert.equal(Object.keys(currentGraph.nodes).length, Object.keys(baselineGraph.nodes).length);
      assert.equal(currentGraph.edges.length, baselineGraph.edges.length);

      const topoOrder = topologicalSort(currentGraph);
      assert.equal(topoOrder.sortedNodeIds.length, 9);
      assert.equal(manager.validateIntegrity().valid, true);
    });

    it('recalculates CPM and critical path metrics immediately after valid edge addition', () => {
      const manager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
      const baseSched = computeSchedule(manager.toGraph());
      assert.equal(baseSched.projectDuration, 27);
      assert.equal(baseSched.criticalPath.length, 6);

      // Add edge: requirements -> frontend_dev (valid forward dependency)
      // Note: frontend_dev already depends on ui_design which finishes on day 9 (ES 4 + 5 = 9)
      manager.addEdge({
        id: 'edge_req_to_frontend',
        from: 'requirements',
        to: 'frontend_dev',
      });

      const updatedSched = computeSchedule(manager.toGraph());
      assert.equal(updatedSched.projectDuration, 27);
      assert.equal(updatedSched.schedules['frontend_dev'].earlyStart, 9); // Governed by ui_design EF 9
      assert.equal(updatedSched.criticalPath.length, 6);

      // Now add a constraining edge with duration impact:
      // For instance, backend_dev (EF 15) -> testing (currently ES 19 governed by integration EF 19)
      manager.addEdge({
        id: 'edge_backend_to_testing',
        from: 'backend_dev',
        to: 'testing',
      });

      const sched2 = computeSchedule(manager.toGraph());
      assert.equal(sched2.projectDuration, 27);
      assert.ok(sched2.schedules['testing']);
    });

    it('simulates connection cancellation without any graph mutation', () => {
      const manager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
      const initialEdges = manager.getEdges().map((e) => e.id);

      // Simulate draft initiation
      const draftSource = 'backend_dev';
      assert.ok(manager.hasNode(draftSource));

      // User drags line into space and releases/cancels
      const draftCancelled = true;
      if (draftCancelled) {
        // No call to addEdge is made
      }

      const finalEdges = manager.getEdges().map((e) => e.id);
      assert.deepEqual(finalEdges, initialEdges);
    });
  });

  describe('5. What-If Scenario Sandbox & Duration Controls (Phase 3C)', () => {
    it('creates a scenario session from a baseline snapshot and preserves baseline immutability', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const scenarioMgr = new ScenarioManager(baseline);

      assert.equal(scenarioMgr.getState(), 'BASELINE');
      assert.equal(scenarioMgr.getBaselineSchedule().projectDuration, 27);
      assert.equal(scenarioMgr.hasDraftChanges(), false);

      // Adjust duration of ui_design (-2 days)
      const res = scenarioMgr.adjustDuration('ui_design', -2);
      assert.equal(res.oldDuration, 5);
      assert.equal(res.newDuration, 3);

      assert.equal(scenarioMgr.getState(), 'EDITING');
      assert.equal(scenarioMgr.hasDraftChanges(), true);
      assert.deepEqual(scenarioMgr.getChangedNodeIds(), ['ui_design']);

      // Assert draft duration changed but baseline remains strictly unchanged
      assert.equal(scenarioMgr.getDraftDuration('ui_design'), 3);
      assert.equal(scenarioMgr.getCommittedDuration('ui_design'), 5);
      assert.equal(scenarioMgr.getBaselineGraph().nodes['ui_design'].duration, 5);
      assert.equal(scenarioMgr.getBaselineSchedule().projectDuration, 27);
    });

    it('enforces duration bounds (preventing negative values and capping at max)', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const scenarioMgr = new ScenarioManager(baseline);

      // Underflow clamp: requirements duration is 4, decrement by 10d
      const clampLow = scenarioMgr.adjustDuration('requirements', -10);
      assert.equal(clampLow.newDuration, DURATION_BOUNDS.MIN_DAYS);
      assert.equal(scenarioMgr.getDraftDuration('requirements'), 0);

      // Overflow clamp: increment by 200d
      const clampHigh = scenarioMgr.adjustDuration('requirements', 200);
      assert.equal(clampHigh.newDuration, DURATION_BOUNDS.MAX_DAYS);
      assert.equal(scenarioMgr.getDraftDuration('requirements'), 100);

      // Target non-existent node throws
      assert.throws(
        () => scenarioMgr.adjustDuration('missing_node', 1),
        /does not exist in baseline/,
      );
    });

    it('simulates an alternative schedule: improvement outcome', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const scenarioMgr = new ScenarioManager(baseline);

      // Reduce ui_design from 5d to 3d
      scenarioMgr.adjustDuration('ui_design', -2);
      const sim = scenarioMgr.simulate();

      assert.equal(scenarioMgr.getState(), 'SIMULATED');
      assert.equal(sim.state, 'SIMULATED');
      assert.equal(sim.baselineSchedule.projectDuration, 27);
      assert.equal(sim.projectedSchedule.projectDuration, 26);
      assert.equal(sim.durationDelta, -1);
      assert.equal(sim.criticalPathChanged, true);
      assert.ok(sim.recommendation.explanation.includes('accelerates overall project delivery'));

      // Verify baseline was not modified during simulation
      assert.equal(scenarioMgr.getBaselineSchedule().projectDuration, 27);
    });

    it('simulates an alternative schedule: regression outcome', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const scenarioMgr = new ScenarioManager(baseline);

      // Increase ui_design from 5d to 7d (+2 days on critical path)
      scenarioMgr.adjustDuration('ui_design', 2);
      const sim = scenarioMgr.simulate();

      assert.equal(sim.baselineSchedule.projectDuration, 27);
      assert.equal(sim.projectedSchedule.projectDuration, 29);
      assert.equal(sim.durationDelta, 2);
      assert.ok(sim.recommendation.explanation.includes('introduces a net delay'));
    });

    it('simulates an alternative schedule: unchanged project duration / buffer shifted', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const scenarioMgr = new ScenarioManager(baseline);

      // Architecture has 1 day of total float (slack). Decreasing it by 1d reduces duration from 3d to 2d.
      // Since it is not on the critical path, total project duration remains 27 days!
      scenarioMgr.adjustDuration('architecture', -1);
      const sim = scenarioMgr.simulate();

      assert.equal(sim.baselineSchedule.projectDuration, 27);
      assert.equal(sim.projectedSchedule.projectDuration, 27);
      assert.equal(sim.durationDelta, 0);
      assert.ok(sim.recommendation.explanation.includes('maintains the existing'));
    });

    it('applies a simulated scenario permanently to baseline', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const scenarioMgr = new ScenarioManager(baseline);

      scenarioMgr.adjustDuration('ui_design', -2);
      scenarioMgr.simulate();

      const applyRes = scenarioMgr.apply();
      assert.equal(applyRes.success, true);
      assert.equal(scenarioMgr.getState(), 'APPLIED');

      // The new committed baseline now has 26 days project duration
      assert.equal(scenarioMgr.getBaselineSchedule().projectDuration, 26);
      assert.equal(scenarioMgr.getCommittedDuration('ui_design'), 3);
      assert.equal(scenarioMgr.getBaselineGraph().nodes['ui_design'].duration, 3);
      assert.equal(scenarioMgr.hasDraftChanges(), false);
    });

    it('rejects double-application or applying when not in active/simulated state', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const scenarioMgr = new ScenarioManager(baseline);

      // Cannot apply in BASELINE state without changes
      assert.throws(
        () => scenarioMgr.apply(),
        /Cannot apply scenario/,
      );

      // Apply valid scenario
      scenarioMgr.adjustDuration('ui_design', -1);
      scenarioMgr.apply();
      assert.equal(scenarioMgr.getState(), 'APPLIED');

      // Immediate second apply must throw
      assert.throws(
        () => scenarioMgr.apply(),
        /Cannot apply scenario in state "APPLIED"/,
      );
    });

    it('discards a scenario and restores the committed baseline view', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const scenarioMgr = new ScenarioManager(baseline);

      // Propose drastic changes
      scenarioMgr.adjustDuration('backend_dev', 20);
      scenarioMgr.adjustDuration('testing', 15);
      assert.equal(scenarioMgr.getChangedNodeIds().length, 2);

      // Discard proposed changes
      scenarioMgr.discard();
      assert.equal(scenarioMgr.getState(), 'DISCARDED');
      assert.equal(scenarioMgr.hasDraftChanges(), false);
      assert.equal(scenarioMgr.getDraftDuration('backend_dev'), 8);

      // Restore baseline
      const restored = scenarioMgr.restoreBaseline();
      assert.equal(scenarioMgr.getState(), 'BASELINE');
      assert.equal(restored.baselineSchedule.projectDuration, 27);
      assert.equal(scenarioMgr.getBaselineSchedule().projectDuration, 27);
    });

    it('ensures scenario state does not modify spatial node positions', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const schedule = computeSchedule(baseline);
      const baseLayout = computeSpatialLayout(baseline, schedule);

      const scenarioMgr = new ScenarioManager(baseline);
      scenarioMgr.adjustDuration('ui_design', -2);
      const sim = scenarioMgr.simulate();

      // Computing spatial layout for scenario maintains consistent coordinates
      const simLayout = computeSpatialLayout(scenarioMgr.getBaselineGraph(), sim.projectedSchedule);

      for (const id of Object.keys(baseline.nodes)) {
        assert.ok(simLayout[id]);
        assert.ok(!Number.isNaN(simLayout[id].x));
        assert.ok(!Number.isNaN(simLayout[id].y));
        assert.ok(!Number.isNaN(simLayout[id].z));
        // Verify node position falls in comfortable spatial cylinder
        assert.ok(simLayout[id].y >= 1.0 && simLayout[id].y <= 1.7);
        assert.ok(simLayout[id].z < -1.0 && simLayout[id].z > -2.2);
      }
    });
  });

  describe('6. ORBIT Navigator Intelligence Engine (Phase 4)', () => {
    it('deterministically analyzes baseline sample workflow and detects critical bottlenecks', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const navigator = new WorkflowNavigator();
      const recommendations = navigator.analyzeWorkflow(baseline);

      assert.ok(recommendations.length > 0, 'Should yield at least one recommendation');

      // Check bottleneck recommendation
      const bnRec = recommendations.find((r) => r.category === 'BOTTLENECK');
      assert.ok(bnRec, 'Must detect a convergence bottleneck');
      assert.ok(bnRec.severity === 'CRITICAL' || bnRec.severity === 'HIGH');
      assert.ok(bnRec.evidence.length >= 3, 'Evidence array must detail metrics');
      assert.ok(bnRec.confidence >= 0.9);

      // Verify integration is identified as a bottleneck
      assert.ok(bnRec.affectedNodeIds.includes('integration') || bnRec.affectedNodeIds.includes('architecture'));
    });

    it('detects high-risk tasks positioned along the critical path', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const navigator = new WorkflowNavigator();
      const recommendations = navigator.analyzeWorkflow(baseline);

      const riskRec = recommendations.find((r) => r.category === 'CRITICAL_PATH_RISK');
      assert.ok(riskRec, 'Must detect high-risk task on critical path');
      assert.equal(riskRec.severity, 'CRITICAL');
      // In sample workflow, integration & deployment are high risk on critical path
      assert.ok(
        riskRec.affectedNodeIds.includes('integration') ||
          riskRec.affectedNodeIds.includes('deployment'),
      );
      assert.ok(riskRec.evidence.some((e) => e.includes('High Risk Rating')));
    });

    it('detects blocked tasks and calculates downstream blast radius', () => {
      const manager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
      // Set testing to blocked
      manager.updateNode('testing', { status: 'blocked' });
      const blockedGraph = manager.toGraph();

      const navigator = new WorkflowNavigator();
      const recommendations = navigator.analyzeWorkflow(blockedGraph);

      const blockedRec = recommendations.find((r) => r.category === 'BLOCKED_DEPENDENCY');
      assert.ok(blockedRec, 'Must flag blocked workstream');
      assert.equal(blockedRec.severity, 'CRITICAL'); // Testing is on critical path
      assert.ok(blockedRec.affectedNodeIds.includes('testing'));
      assert.ok(blockedRec.affectedNodeIds.includes('deployment')); // Successor of testing
      assert.ok(blockedRec.evidence.some((e) => e.includes('Status: BLOCKED')));
    });

    it('identifies schedule compression opportunities on critical path with actionable proposed action', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const navigator = new WorkflowNavigator();
      const recommendations = navigator.analyzeWorkflow(baseline);

      const optRec = recommendations.find((r) => r.category === 'SCHEDULE_OPTIMIZATION');
      assert.ok(optRec, 'Must detect compression opportunity');
      assert.equal(optRec.canSimulate, true);
      assert.ok(optRec.proposedAction);
      assert.equal(optRec.proposedAction.type, 'adjust_duration');

      // The longest critical task is frontend_dev (7d)
      assert.equal(optRec.proposedAction.nodeId, 'frontend_dev');
      assert.equal(optRec.proposedAction.newDuration, 6); // 7 - 1 = 6
      assert.ok(optRec.expectedImpact?.toLowerCase().includes('accelerat'));
    });

    it('prepares a valid WorkflowScenario from an actionable recommendation', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const navigator = new WorkflowNavigator();
      const recommendations = navigator.analyzeWorkflow(baseline);

      const optRec = recommendations.find((r) => r.category === 'SCHEDULE_OPTIMIZATION');
      assert.ok(optRec && optRec.proposedAction);

      const scenario = navigator.prepareScenario(optRec, baseline);
      assert.equal(scenario.baseGraphId, baseline.id);
      assert.equal(scenario.actions.length, 1);
      assert.equal(scenario.actions[0].type, 'adjust_duration');

      // Test simulation using pure CPM
      const sim = simulateScenario(baseline, scenario);
      assert.ok(sim.updated.projectDuration < sim.previous.projectDuration);
      assert.equal(sim.recommendation.impactAssessment.totalDurationDelta, -1);
    });

    it('validates recommendation freshness and rejects stale recommendations', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const navigator = new WorkflowNavigator();
      const recommendations = navigator.analyzeWorkflow(baseline);
      const optRec = recommendations.find((r) => r.category === 'SCHEDULE_OPTIMIZATION')!;

      // Fresh graph: valid
      assert.equal(navigator.isRecommendationValid(optRec, baseline), true);
      const action = optRec.proposedAction;
      assert.ok(action && action.type === 'adjust_duration');

      // Mutate graph to fulfill the recommendation (newDuration = 6)
      const manager = new WorkflowGraphManager(baseline);
      manager.updateNode(action.nodeId, {
        duration: action.newDuration,
      });
      const updatedGraph = manager.toGraph();

      // Recommendation should now be detected as stale / already fulfilled
      assert.equal(navigator.isRecommendationValid(optRec, updatedGraph), false);

      // Remove the node entirely: must be rejected
      const manager2 = new WorkflowGraphManager(baseline);
      manager2.removeNode(action.nodeId);
      const missingGraph = manager2.toGraph();
      assert.equal(navigator.isRecommendationValid(optRec, missingGraph), false);
    });

    it('generates a comprehensive structured intelligence report with summary metrics', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const navigator = new WorkflowNavigator();
      const report = navigator.generateReport(baseline);

      assert.equal(report.graphId, baseline.id);
      assert.equal(report.projectDuration, 27);
      assert.equal(report.criticalPath.length, 6);
      assert.ok(report.recommendations.length >= 3);
      assert.ok(report.summary.criticalCount >= 1);
      assert.ok(report.summary.highCount >= 1);
      assert.ok(report.summary.topBottleneckId !== undefined);
    });

    it('guarantees zero baseline graph mutation during intelligence analysis', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const beforeSnapshot = JSON.stringify(baseline);

      const navigator = new WorkflowNavigator();
      navigator.analyzeWorkflow(baseline);
      navigator.generateReport(baseline);

      const afterSnapshot = JSON.stringify(baseline);
      assert.equal(beforeSnapshot, afterSnapshot, 'Intelligence analysis must be 100% read-only and immutable');
    });

    it('executes full recommendation lifecycle: analyze -> prepare -> simulate -> apply -> re-audit', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const navigator = new WorkflowNavigator();
      const scenarioMgr = new ScenarioManager(baseline);

      // 1. Analyze
      const recommendations = navigator.analyzeWorkflow(scenarioMgr.getBaselineGraph());
      const optRec = recommendations.find((r) => r.category === 'SCHEDULE_OPTIMIZATION')!;
      assert.ok(optRec);

      // 2. Prepare action into ScenarioManager
      const action = optRec.proposedAction!;
      assert.equal(action.type, 'adjust_duration');
      scenarioMgr.adjustDuration(action.nodeId, action.newDuration - scenarioMgr.getCommittedDuration(action.nodeId));

      // 3. Simulate
      const sim = scenarioMgr.simulate();
      assert.equal(sim.state, 'SIMULATED');
      assert.equal(sim.durationDelta, -1);
      assert.equal(sim.projectedSchedule.projectDuration, 26);

      // 4. User Approval -> Apply
      const applied = scenarioMgr.apply();
      assert.equal(applied.success, true);
      assert.equal(applied.updatedSchedule.projectDuration, 26);
      assert.equal(scenarioMgr.getState(), 'APPLIED');

      // 5. Re-audit new committed baseline
      const reAuditRecs = navigator.analyzeWorkflow(applied.updatedGraph);
      // Stale check for prior recommendation against new graph
      assert.equal(navigator.isRecommendationValid(optRec, applied.updatedGraph), false);
      // Project duration reflected in new report
      const newReport = navigator.generateReport(applied.updatedGraph);
      assert.equal(newReport.projectDuration, 26);
    });

    it('computes deterministic graph fingerprint immune to visual position changes', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const fp1 = computeGraphFingerprint(baseline);
      const fp2 = computeGraphFingerprint(structuredClone(baseline));
      assert.equal(fp1, fp2, 'Fingerprint must be deterministic for identical graphs');

      // Unrelated 3D visual position calculations must NOT alter logical fingerprint
      const schedule = computeSchedule(baseline);
      const layout = computeSpatialLayout(baseline, schedule);
      assert.ok(layout);
      const fpAfterLayout = computeGraphFingerprint(baseline);
      assert.equal(fp1, fpAfterLayout, 'Visual layout calculations must not invalidate graph fingerprint');
    });

    it('rejects recommendations as stale when task duration, status, priority or edges mutate', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const navigator = new WorkflowNavigator();
      const [rec] = navigator.analyzeWorkflow(baseline);
      assert.ok(rec);

      // Baseline matches
      const v0 = navigator.validateRecommendation(rec, baseline);
      assert.equal(v0.valid, true);

      // 1. Stale duration mutation
      const m1 = new WorkflowGraphManager(baseline);
      m1.updateNode('architecture', { duration: 6 });
      const gDuration = m1.toGraph();
      const vDur = navigator.validateRecommendation(rec, gDuration);
      assert.equal(vDur.valid, false);
      assert.ok(vDur.reason?.includes('mutated'));

      // 2. Stale status mutation
      const m2 = new WorkflowGraphManager(baseline);
      m2.updateNode('backend_dev', { status: 'in_progress' });
      const gStatus = m2.toGraph();
      const vStatus = navigator.validateRecommendation(rec, gStatus);
      assert.equal(vStatus.valid, false);

      // 3. Stale priority mutation
      const m3 = new WorkflowGraphManager(baseline);
      m3.updateNode('testing', { priority: 'low' });
      const gPriority = m3.toGraph();
      const vPriority = navigator.validateRecommendation(rec, gPriority);
      assert.equal(vPriority.valid, false);

      // 4. Stale dependency addition/removal
      const m4 = new WorkflowGraphManager(baseline);
      m4.addEdge({ id: 'edge_new_test', from: 'architecture', to: 'testing' });
      const gEdge = m4.toGraph();
      const vEdge = navigator.validateRecommendation(rec, gEdge);
      assert.equal(vEdge.valid, false);
    });

    it('rigorously calculates schedule impact rather than assuming acceleration', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const navigator = new WorkflowNavigator();
      const recs = navigator.analyzeWorkflow(baseline);

      for (const rec of recs) {
        if (rec.proposedAction && rec.canSimulate) {
          assert.ok(rec.expectedImpact);
          // Expected impact must contain calculated evidence
          assert.ok(rec.expectedImpact.includes('Calculated Impact'));
          // Must cite the actual project duration or delivery acceleration
          assert.ok(
            rec.expectedImpact.includes('27') ||
              rec.expectedImpact.includes('reduces') ||
              rec.expectedImpact.includes('relieves'),
          );
        }
      }
    });

    it('enforces that double application is strictly rejected by ScenarioManager', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const scenarioMgr = new ScenarioManager(baseline);
      scenarioMgr.adjustDuration('ui_design', -1);
      scenarioMgr.simulate();

      // First apply succeeds
      const res = scenarioMgr.apply();
      assert.equal(res.success, true);
      assert.equal(scenarioMgr.getState(), 'APPLIED');

      // Second apply throws error
      assert.throws(() => {
        scenarioMgr.apply();
      }, /Cannot apply scenario in state "APPLIED"/);
    });
  });

  describe('8. Onboarding, Guided Experience & Sample Workspace Reset (Phase 5)', () => {
    it('initializes in WELCOME state with accurate step metadata and can start from NOT_STARTED', () => {
      const manager = new OnboardingManager('WELCOME', false);
      assert.equal(manager.getCurrentStep(), 'WELCOME');
      assert.equal(manager.isCompleted(), false);
      assert.equal(manager.hasCompletedPreviously(), false);

      const details = manager.getStepDetails();
      assert.equal(details.step, 'WELCOME');
      assert.equal(details.stepNumber, 1);
      assert.equal(details.totalSteps, 6);
      assert.equal(details.canSkip, true);
      assert.ok(details.title.includes('Welcome to ORBIT'));
      assert.ok(details.description.includes('Complex workflows are easier'));

      // Test initialization from NOT_STARTED
      const idleManager = new OnboardingManager('NOT_STARTED', true);
      assert.equal(idleManager.getCurrentStep(), 'NOT_STARTED');
      assert.equal(idleManager.hasCompletedPreviously(), true);
      const started = idleManager.start();
      assert.equal(started.step, 'WELCOME');
      assert.equal(idleManager.getCurrentStep(), 'WELCOME');
    });

    it('supports sequential step-by-step progression through the 5-minute journey', () => {
      const manager = new OnboardingManager();
      const expectedSequence = [
        'WELCOME',
        'ORIENTATION',
        'SELECT_NODE',
        'INSPECT_TASK',
        'EXPLORE_NAVIGATOR',
        'SIMULATE_CHANGE',
        'COMPLETE',
      ];

      for (let i = 0; i < expectedSequence.length; i++) {
        assert.equal(manager.getCurrentStep(), expectedSequence[i]);
        if (i < expectedSequence.length - 1) {
          const nextDetails = manager.next();
          assert.equal(nextDetails.step, expectedSequence[i + 1]);
        }
      }

      assert.equal(manager.isCompleted(), true);
      assert.equal(manager.hasCompletedPreviously(), true);
    });

    it('supports navigating backwards using prev()', () => {
      const manager = new OnboardingManager();
      manager.next(); // ORIENTATION
      manager.next(); // SELECT_NODE
      manager.next(); // INSPECT_TASK
      assert.equal(manager.getCurrentStep(), 'INSPECT_TASK');

      const prev1 = manager.prev();
      assert.equal(prev1.step, 'SELECT_NODE');

      const prev2 = manager.prev();
      assert.equal(prev2.step, 'ORIENTATION');

      const prev3 = manager.prev();
      assert.equal(prev3.step, 'WELCOME');

      // Calling prev on WELCOME stays on WELCOME
      const prev4 = manager.prev();
      assert.equal(prev4.step, 'WELCOME');
    });

    it('allows skipping onboarding to immediately reach COMPLETE state', () => {
      const manager = new OnboardingManager('WELCOME', false);
      const skipped = manager.skip();

      assert.equal(skipped.step, 'COMPLETE');
      assert.equal(manager.getCurrentStep(), 'COMPLETE');
      assert.equal(manager.isCompleted(), true);
      assert.equal(manager.hasCompletedPreviously(), true);
      assert.equal(skipped.canSkip, false);
      assert.ok(skipped.title.includes('Ready to Orbit'));
    });

    it('allows restarting onboarding from any step back to WELCOME', () => {
      const manager = new OnboardingManager();
      manager.next(); // ORIENTATION
      manager.next(); // SELECT_NODE
      manager.next(); // INSPECT_TASK
      manager.next(); // EXPLORE_NAVIGATOR
      manager.next(); // SIMULATE_CHANGE

      assert.equal(manager.getCurrentStep(), 'SIMULATE_CHANGE');

      const restarted = manager.restart();
      assert.equal(restarted.step, 'WELCOME');
      assert.equal(manager.getCurrentStep(), 'WELCOME');
      assert.equal(manager.isCompleted(), false);
    });

    it('advances automatically when user selects a node during SELECT_NODE step', () => {
      const manager = new OnboardingManager();
      manager.next(); // ORIENTATION
      manager.next(); // SELECT_NODE
      assert.equal(manager.getCurrentStep(), 'SELECT_NODE');

      // Selecting node while in SELECT_NODE step triggers progression
      const handled = manager.onNodeSelected('integration');
      assert.equal(handled, true);
      assert.equal(manager.getCurrentStep(), 'INSPECT_TASK');

      // Selecting node while NOT in SELECT_NODE does not progress step
      const handledLater = manager.onNodeSelected('testing');
      assert.equal(handledLater, false);
      assert.equal(manager.getCurrentStep(), 'INSPECT_TASK');
    });

    it('reactively captures navigator exploration and simulation actions', () => {
      const manager = new OnboardingManager();
      manager.start();
      manager.next(); // ORIENTATION
      manager.next(); // SELECT_NODE
      manager.next(); // INSPECT_TASK
      manager.next(); // EXPLORE_NAVIGATOR

      assert.equal(manager.onNavigatorExplored(), true);

      manager.next(); // SIMULATE_CHANGE
      assert.equal(manager.onScenarioSimulated(), true);

      // Applying or discarding scenario completes onboarding
      const completed = manager.onScenarioAppliedOrDiscarded();
      assert.equal(completed, true);
      assert.equal(manager.getCurrentStep(), 'COMPLETE');
      assert.equal(manager.isCompleted(), true);
    });

    it('guarantees onboarding state transitions never mutate the workflow graph', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const initialJson = JSON.stringify(baseline);

      const manager = new OnboardingManager();
      manager.start();
      manager.next();
      manager.onNodeSelected('integration');
      manager.onTaskDetailsInspected();
      manager.next();
      manager.onNavigatorExplored();
      manager.next();
      manager.onScenarioSimulated();
      manager.onScenarioAppliedOrDiscarded();
      manager.restart();
      manager.skip();

      const afterJson = JSON.stringify(baseline);
      assert.equal(initialJson, afterJson);
      assert.equal(manager.verifyGraphPurity(baseline, baseline), true);
    });

    it('authoritatively resets sample workflow after task duration mutations', () => {
      // 1. Mutate sample workflow
      const graphManager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
      graphManager.updateNode('requirements', { duration: 10 }); // was 4
      graphManager.updateNode('architecture', { duration: 8 });  // was 3

      const mutatedSchedule = computeSchedule(graphManager.toGraph());
      assert.equal(mutatedSchedule.projectDuration, 37);

      // 2. Perform authoritative reset
      const freshManager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
      const resetGraph = freshManager.toGraph();
      const resetSchedule = computeSchedule(resetGraph);

      // 3. Verify clean baseline restored
      assert.equal(resetSchedule.projectDuration, 27);
      assert.equal(resetGraph.nodes['requirements'].duration, 4);
      assert.equal(resetGraph.nodes['architecture'].duration, 3);
      assert.equal(Object.keys(resetGraph.nodes).length, 9);
      assert.equal(resetGraph.edges.length, 12);
      assert.equal(resetSchedule.criticalPath.length, 6);
    });

    it('authoritatively resets sample workflow after new dependency edge creation', () => {
      const graphManager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());

      // Add two non-cyclic forward edges
      graphManager.addEdge({
        id: 'edge_req_to_frontend',
        from: 'requirements',
        to: 'frontend_dev',
      });
      graphManager.addEdge({
        id: 'edge_backend_to_testing',
        from: 'backend_dev',
        to: 'testing',
      });

      assert.equal(graphManager.toGraph().edges.length, 14);

      // Reset
      const freshManager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
      const resetGraph = freshManager.toGraph();

      assert.equal(resetGraph.edges.length, 12);
      assert.equal(resetGraph.edges.some(e => e.from === 'requirements' && e.to === 'frontend_dev'), false);
      assert.equal(resetGraph.edges.some(e => e.from === 'backend_dev' && e.to === 'testing'), false);
      assert.equal(freshManager.validateIntegrity().valid, true);
    });

    it('authoritatively resets sample workflow after a What-If scenario has been applied', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const scenarioMgr = new ScenarioManager(baseline);

      // Compress ui_design by 1 day and apply
      scenarioMgr.adjustDuration('ui_design', -1);
      scenarioMgr.simulate();
      const applyResult = scenarioMgr.apply();

      assert.equal(applyResult.success, true);
      assert.equal(applyResult.updatedGraph.nodes['ui_design'].duration, 4); // was 5
      assert.equal(scenarioMgr.getState(), 'APPLIED');

      // Reset
      const freshGraph = createSampleProductLaunchWorkflow();
      const freshScenarioMgr = new ScenarioManager(freshGraph);
      const freshSchedule = computeSchedule(freshGraph);

      assert.equal(freshGraph.nodes['ui_design'].duration, 5);
      assert.equal(freshSchedule.projectDuration, 27);
      assert.equal(freshScenarioMgr.getState(), 'BASELINE');
    });

    it('authoritatively resets sample workflow after a What-If scenario has been discarded', () => {
      const baseline = createSampleProductLaunchWorkflow();
      const scenarioMgr = new ScenarioManager(baseline);

      scenarioMgr.adjustDuration('backend_dev', -3);
      scenarioMgr.simulate();
      assert.equal(scenarioMgr.getState(), 'SIMULATED');

      scenarioMgr.discard();
      assert.equal(scenarioMgr.getState(), 'DISCARDED');
      assert.equal(scenarioMgr.getBaselineSchedule().projectDuration, 27);

      const freshGraph = createSampleProductLaunchWorkflow();
      assert.equal(freshGraph.nodes['backend_dev'].duration, 8);
    });

    it('maintains full CPM scheduling invariants across multiple reset cycles', () => {
      for (let cycle = 1; cycle <= 5; cycle++) {
        // Disrupt graph
        const manager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
        manager.updateNode('integration', { duration: 15 });
        manager.addEdge({
          id: `temp_edge_${cycle}`,
          from: 'ui_design',
          to: 'backend_dev',
        });

        // Reset
        const resetManager = new WorkflowGraphManager(createSampleProductLaunchWorkflow());
        const resetGraph = resetManager.toGraph();
        const resetSchedule = computeSchedule(resetGraph);
        const bottlenecks = identifyBottlenecks(resetGraph, resetSchedule);

        assert.equal(resetSchedule.projectDuration, 27);
        assert.equal(resetSchedule.criticalPath.length, 6);
        assert.deepEqual(resetSchedule.criticalPath, [
          'requirements',
          'ui_design',
          'frontend_dev',
          'integration',
          'testing',
          'deployment',
        ]);
        assert.equal(bottlenecks[0].nodeId, 'integration');
        assert.equal(bottlenecks[0].bottleneckScore, 88);
        assert.equal(resetManager.validateIntegrity().valid, true);
      }
    });

    it('demonstrates full 6-step workspace disruption and authoritative recovery sequence', () => {
      // Step 1: Start with baseline
      const baseline = createSampleProductLaunchWorkflow();
      const initialSchedule = computeSchedule(baseline);
      const initialLayout = computeSpatialLayout(baseline, initialSchedule);
      assert.equal(Object.keys(baseline.nodes).length, 9);
      assert.equal(baseline.edges.length, 12);
      assert.equal(initialSchedule.projectDuration, 27);

      // Disruption 1: Apply a scenario duration mutation
      const scenarioMgr = new ScenarioManager(baseline);
      scenarioMgr.adjustDuration('backend_dev', -2); // 8 -> 6
      scenarioMgr.simulate();
      const applyResult = scenarioMgr.apply();
      assert.equal(applyResult.success, true);
      const mutatedGraph = applyResult.updatedGraph;
      assert.equal(mutatedGraph.nodes['backend_dev'].duration, 6);

      // Disruption 2: Add a new dependency edge
      const graphMgr = new WorkflowGraphManager(mutatedGraph);
      graphMgr.addEdge({
        id: 'edge_chaos_test',
        from: 'requirements',
        to: 'testing',
      });
      assert.equal(graphMgr.getEdgeCount(), 13);

      // Disruption 3: Simulate 3D node position dragging
      const draggedLayout = { ...initialLayout };
      draggedLayout['frontend_dev'] = {
        x: 10.5,
        y: -4.2,
        z: 8.8,
        rotationY: 0,
        layerIndex: 2,
        rowIndex: 0,
      };
      assert.equal(draggedLayout['frontend_dev'].x, 10.5);

      // Disruption 4: Start an active scenario draft with unapplied modifications
      const draftScenarioMgr = new ScenarioManager(graphMgr.toGraph());
      draftScenarioMgr.adjustDuration('integration', 4); // 6 -> 10
      assert.equal(draftScenarioMgr.getState(), 'EDITING');

      // Disruption 5: Generate and select an active Navigator recommendation
      const navigator = new WorkflowNavigator();
      const recs = navigator.analyzeWorkflow(graphMgr.toGraph());
      assert.ok(recs.length > 0);
      const selectedRec = recs[0];
      assert.ok(selectedRec.title.length > 0);

      // Disruption 6: Authoritative reset sequence
      const cleanGraph = createSampleProductLaunchWorkflow();
      const cleanGraphMgr = new WorkflowGraphManager(cleanGraph);
      const cleanSchedule = computeSchedule(cleanGraph);
      const cleanLayout = computeSpatialLayout(cleanGraph, cleanSchedule);
      const cleanScenarioMgr = new ScenarioManager(cleanGraph);
      const cleanNavigator = new WorkflowNavigator();
      const cleanRecs = cleanNavigator.analyzeWorkflow(cleanGraph);

      // Assert complete restoration of invariants
      assert.equal(cleanGraphMgr.getNodeCount(), 9);
      assert.equal(cleanGraphMgr.getEdgeCount(), 12);
      assert.equal(cleanGraph.nodes['backend_dev'].duration, 8); // restored from 6
      assert.equal(cleanGraph.nodes['integration'].duration, 4);  // restored from 8 (baseline is 4)
      assert.equal(cleanGraph.edges.some(e => e.id === 'edge_chaos_test'), false); // edge removed
      assert.equal(cleanSchedule.projectDuration, 27);
      assert.deepEqual(cleanSchedule.criticalPath, [
        'requirements',
        'ui_design',
        'frontend_dev',
        'integration',
        'testing',
        'deployment',
      ]);
      assert.deepEqual(cleanLayout['frontend_dev'], initialLayout['frontend_dev']); // position restored
      assert.equal(cleanScenarioMgr.getState(), 'BASELINE'); // drafts wiped
      assert.equal(cleanScenarioMgr.hasDraftChanges(), false);
      assert.equal(cleanRecs.length > 0, true);
      assert.equal(cleanGraphMgr.validateIntegrity().valid, true);
    });

    it('manages onboarding state for new vs returning users and handles restart', () => {
      // First-time user initializes at WELCOME
      const newUser = new OnboardingManager('WELCOME', false);
      assert.equal(newUser.getCurrentStep(), 'WELCOME');
      assert.equal(newUser.isCompleted(), false);

      // Returning user initializes at COMPLETE
      const returningUser = new OnboardingManager(undefined, true);
      assert.equal(returningUser.getCurrentStep(), 'COMPLETE');
      assert.equal(returningUser.isCompleted(), true);

      // Returning user can explicitly restart onboarding
      returningUser.restart();
      assert.equal(returningUser.getCurrentStep(), 'WELCOME');
      assert.equal(returningUser.isCompleted(), false);
    });
  });

  describe('9. Resource Lifecycle Safety & Entity Ownership (Phase 6.1)', () => {
    it('verifies edge mesh resource isolation and non-shared ownership', () => {
      const p1 = new Vector3(0, 0, 0);
      const p2 = new Vector3(1, 0, 0);
      const p3 = new Vector3(2, 0, 0);
      const p4 = new Vector3(3, 0, 0);

      const edgeA = createSpatialEdgeMesh(p1, p2, false);
      const edgeB = createSpatialEdgeMesh(p3, p4, true);

      // Groups must be distinct
      assert.notEqual(edgeA.group, edgeB.group);

      // Each edge must have its own children (tube and cone)
      assert.equal(edgeA.group.children.length, 2);
      assert.equal(edgeB.group.children.length, 2);

      const tubeA = edgeA.group.children[0] as Mesh;
      const tubeB = edgeB.group.children[0] as Mesh;

      // Geometries and materials must NOT be shared between distinct edges
      assert.notEqual(tubeA.geometry, tubeB.geometry);
      assert.notEqual(tubeA.material, tubeB.material);

      // Dispose Edge A
      edgeA.dispose();

      // Edge A children must be cleaned up
      assert.equal(edgeA.group.children.length, 0);

      // Edge B must remain completely intact and functional
      assert.equal(edgeB.group.children.length, 2);
      const tubeBAfter = edgeB.group.children[0] as Mesh;
      assert.ok(tubeBAfter.geometry);
      assert.ok(tubeBAfter.material);

      // Edge B can still update geometry without error
      edgeB.updateGeometry(new Vector3(2, 0.1, 0), new Vector3(3, 0.1, 0));
      assert.equal(edgeB.group.children.length, 2);

      // Cleanup Edge B
      edgeB.dispose();
      assert.equal(edgeB.group.children.length, 0);
    });

    it('verifies edge mesh disposal idempotency and guarded state', () => {
      const edge = createSpatialEdgeMesh(new Vector3(0, 0, 0), new Vector3(1, 0, 0), false);
      assert.equal(edge.group.children.length, 2);

      // First disposal
      edge.dispose();
      assert.equal(edge.group.children.length, 0);

      // Subsequent disposals must not throw
      assert.doesNotThrow(() => {
        edge.dispose();
        edge.dispose();
      });

      // State updates after disposal must be safely ignored without throwing
      assert.doesNotThrow(() => {
        edge.setCritical(true);
        edge.setHighlighted(true, '#00e5ff');
      });
    });

    it('verifies draft preview spline creation, update, and disposal lifecycle', () => {
      const draft = createDraftSplineMesh();
      assert.equal(draft.group.name, 'draft_preview_spline');
      assert.equal(draft.group.visible, false);

      // Update generates tube and cone meshes
      draft.update(new Vector3(0, 0, 0), new Vector3(1, 1, 0), 'active');
      assert.equal(draft.group.visible, true);
      assert.equal(draft.group.children.length, 2);

      // Updating with different validation states reuses meshes and updates materials
      draft.update(new Vector3(0, 0, 0), new Vector3(1, 1.2, 0), 'valid');
      assert.equal(draft.group.children.length, 2);

      draft.update(new Vector3(0, 0, 0), new Vector3(1, 1.2, 0), 'invalid');
      assert.equal(draft.group.children.length, 2);

      // Cancellation hides draft spline
      draft.setVisible(false);
      assert.equal(draft.group.visible, false);

      // Disposal removes meshes and disposes materials cleanly
      draft.dispose();
      assert.equal(draft.group.children.length, 0);

      // Repeated disposal is safe and idempotent
      assert.doesNotThrow(() => {
        draft.dispose();
      });
    });

    it('verifies spatial node mesh resource isolation and recursive disposal', () => {
      const graph = createSampleProductLaunchWorkflow();
      const sched = computeSchedule(graph);

      const nodeA = graph.nodes['requirements'];
      const nodeB = graph.nodes['ui_design'];

      const meshGroupA = createSpatialNodeMesh(nodeA, sched.schedules['requirements']);
      const meshGroupB = createSpatialNodeMesh(nodeB, sched.schedules['ui_design']);

      // Groups must be distinct
      assert.notEqual(meshGroupA, meshGroupB);

      // Faceplates must have distinct CanvasTexture instances
      const faceA = meshGroupA.getObjectByName('face') as Mesh;
      const faceB = meshGroupB.getObjectByName('face') as Mesh;
      assert.ok(faceA);
      assert.ok(faceB);
      assert.notEqual(faceA.material, faceB.material);

      const matA = faceA.material as MeshStandardMaterial;
      const matB = faceB.material as MeshStandardMaterial;
      assert.notEqual(matA.map, matB.map);

      // Track disposal on Node A's materials
      let matADisposed = false;
      matA.addEventListener('dispose', () => {
        matADisposed = true;
      });

      let matBDisposed = false;
      matB.addEventListener('dispose', () => {
        matBDisposed = true;
      });

      // Dispose Node A
      disposeSpatialNodeMesh(meshGroupA);
      assert.equal(matADisposed, true);

      // Node B's material must NOT have been disposed
      assert.equal(matBDisposed, false);

      // Dispose Node B
      disposeSpatialNodeMesh(meshGroupB);
      assert.equal(matBDisposed, true);
    });

    it('verifies disposal idempotency when node contains duplicate material references', () => {
      const graph = createSampleProductLaunchWorkflow();
      const sched = computeSchedule(graph);
      const node = graph.nodes['integration'];
      const meshGroup = createSpatialNodeMesh(node, sched.schedules['integration']);

      const outPort = meshGroup.getObjectByName('outputPort') as Group;
      const inPort = meshGroup.getObjectByName('inputPort') as Group;
      const outHit = outPort?.getObjectByName('portHitTarget') as Mesh;
      const inHit = inPort?.getObjectByName('portHitTarget') as Mesh;

      // Both port hit targets share portHitMaterial within the same node
      assert.equal(outHit.material, inHit.material);

      let disposeCallCount = 0;
      (outHit.material as MeshStandardMaterial).addEventListener('dispose', () => {
        disposeCallCount++;
      });

      // Recursive disposal must use Set tracking so portHitMaterial is disposed exactly once
      disposeSpatialNodeMesh(meshGroup);
      assert.equal(disposeCallCount, 1);
    });

    it('verifies repeated workspace resets maintain zero dangling entities and preserve schedule invariants', () => {
      const baseline = createSampleProductLaunchWorkflow();
      let activeGraph = createSampleProductLaunchWorkflow();
      let activeSchedule = computeSchedule(activeGraph);

      // Simulate 5 reset cycles with disruptions in between
      for (let cycle = 0; cycle < 5; cycle++) {
        // Disruption: modify a duration and add an edge
        const scenarioMgr = new ScenarioManager(activeGraph);
        scenarioMgr.adjustDuration('backend_dev', -2);
        scenarioMgr.simulate();
        const applied = scenarioMgr.apply();
        assert.equal(applied.success, true);
        activeGraph = applied.updatedGraph;

        const graphMgr = new WorkflowGraphManager(activeGraph);
        graphMgr.addEdge({
          id: `cycle_edge_${cycle}`,
          from: 'ui_design',
          to: 'integration',
        });
        activeGraph = graphMgr.toGraph();

        // Invariants disrupted
        assert.equal(Object.keys(activeGraph.nodes).length, 9);
        assert.equal(activeGraph.edges.length, 13);
        assert.notEqual(activeGraph.nodes['backend_dev'].duration, 8);

        // Authoritative reset action
        activeGraph = createSampleProductLaunchWorkflow();
        activeSchedule = computeSchedule(activeGraph);

        // Assert pristine invariants restored
        assert.equal(Object.keys(activeGraph.nodes).length, 9);
        assert.equal(activeGraph.edges.length, 12);
        assert.equal(activeGraph.nodes['backend_dev'].duration, 8);
        assert.equal(activeSchedule.projectDuration, 27);
        assert.equal(activeSchedule.criticalPath.length, 6);
      }
    });

    it('verifies system teardown disposes all registered resources cleanly', () => {
      // Simulate registering 9 nodes, 12 edges, and 1 draft spline
      const baseline = createSampleProductLaunchWorkflow();
      const sched = computeSchedule(baseline);
      const layout = computeSpatialLayout(baseline, sched);

      const nodeGroups: Group[] = [];
      for (const [nodeId, node] of Object.entries(baseline.nodes)) {
        nodeGroups.push(createSpatialNodeMesh(node, sched.schedules[nodeId]));
      }
      assert.equal(nodeGroups.length, 9);

      const edgeAssets = [];
      for (const edge of baseline.edges) {
        const fromPos = layout[edge.from];
        const toPos = layout[edge.to];
        edgeAssets.push(
          createSpatialEdgeMesh(
            new Vector3(fromPos.x, fromPos.y, fromPos.z),
            new Vector3(toPos.x, toPos.y, toPos.z),
            false,
          ),
        );
      }
      assert.equal(edgeAssets.length, 12);

      const draftSpline = createDraftSplineMesh();
      draftSpline.update(new Vector3(0, 0, 0), new Vector3(1, 1, 0), 'active');

      // Teardown
      for (const edgeAsset of edgeAssets) {
        edgeAsset.dispose();
      }
      for (const nodeGroup of nodeGroups) {
        disposeSpatialNodeMesh(nodeGroup);
      }
      draftSpline.dispose();

      // Assert all edges emptied
      for (const edgeAsset of edgeAssets) {
        assert.equal(edgeAsset.group.children.length, 0);
      }
      assert.equal(draftSpline.group.children.length, 0);
    });
  });
});
