/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * Sample Software Product Launch Workflow.
 * Realistic dependency graph modeling a multi-disciplinary software release.
 */

import type { WorkflowGraph } from './types.js';

/**
 * Creates a realistic Software Product Launch workflow graph.
 *
 * Task Topology:
 *
 *              ┌─> [ui_design] (5d) ───────┐
 *              │                           ▼
 *  [requirements] (4d) ──> [architecture] (3d) ──> [frontend_dev] (7d) ──┐
 *              │                  │                                     │
 *              │                  ▼                                     ▼
 *              └──────────> [backend_dev] (8d) ───────────────────> [integration] (4d)
 *                                 │                                     │
 *                                 │            ┌────────────────────────┼─────────────────────┐
 *                                 │            ▼                        ▼                     │
 *                                 └────> [security_review] (3d)   [testing] (5d)              │
 *                                              │                        │                     │
 *                                              └───────────────┬────────┘                     │
 *                                                              ▼                              ▼
 *                                                        [deployment] (2d)
 */
export function createSampleProductLaunchWorkflow(): WorkflowGraph {
  return {
    id: 'orbit_product_launch_v1',
    name: 'Software Product Launch Workflow',
    description:
      'Realistic cross-functional release roadmap encompassing requirements, architecture, parallel engineering streams, security, and launch operations.',
    metadata: {
      category: 'Product Engineering',
      timeUnit: 'days',
      targetRelease: 'v1.0.0',
    },
    nodes: {
      requirements: {
        id: 'requirements',
        title: 'Requirements & PRD Specification',
        description:
          'Define product specifications, user stories, and acceptance criteria.',
        duration: 4,
        status: 'completed',
        priority: 'critical',
        risk: 'low',
        assignee: 'Product Lead',
        tags: ['product', 'planning'],
      },
      architecture: {
        id: 'architecture',
        title: 'System Architecture & Interface Design',
        description:
          'Design distributed service contracts, data schemas, and spatial network protocols.',
        duration: 3,
        status: 'in_progress',
        priority: 'critical',
        risk: 'medium',
        assignee: 'Principal Architect',
        tags: ['architecture', 'backend'],
      },
      ui_design: {
        id: 'ui_design',
        title: 'Spatial UI & Interaction Design',
        description:
          'Create Horizon UI design tokens, spatial layout templates, and hand interaction ergonomics.',
        duration: 5,
        status: 'in_progress',
        priority: 'high',
        risk: 'low',
        assignee: 'Spatial Designer',
        tags: ['design', 'ui'],
      },
      backend_dev: {
        id: 'backend_dev',
        title: 'Backend Services & Database Engineering',
        description:
          'Implement core REST/WebSocket APIs, persistence layers, and cloud infrastructure.',
        duration: 8,
        status: 'not_started',
        priority: 'high',
        risk: 'high',
        assignee: 'Backend Engineer',
        tags: ['backend', 'database'],
      },
      frontend_dev: {
        id: 'frontend_dev',
        title: 'Frontend Spatial Client Engineering',
        description:
          'Develop WebXR spatial scene components, UIKitML views, and gesture handlers.',
        duration: 7,
        status: 'not_started',
        priority: 'high',
        risk: 'medium',
        assignee: 'WebXR Engineer',
        tags: ['frontend', 'webxr'],
      },
      integration: {
        id: 'integration',
        title: 'End-to-End System Integration',
        description:
          'Connect spatial front-end clients with backend services and telemetry pipelines.',
        duration: 4,
        status: 'not_started',
        priority: 'critical',
        risk: 'high',
        assignee: 'Systems Lead',
        tags: ['integration', 'devops'],
      },
      testing: {
        id: 'testing',
        title: 'Multi-Device QA & Usability Testing',
        description:
          'Conduct Quest 3 hardware testing, latency stress profiling, and usability verifications.',
        duration: 5,
        status: 'not_started',
        priority: 'high',
        risk: 'medium',
        assignee: 'QA Lead',
        tags: ['qa', 'validation'],
      },
      security_review: {
        id: 'security_review',
        title: 'Security Audit & Compliance Review',
        description:
          'Static code analysis, vulnerability assessments, penetration testing, and auth verification.',
        duration: 3,
        status: 'not_started',
        priority: 'critical',
        risk: 'high',
        assignee: 'Security Auditor',
        tags: ['security', 'compliance'],
      },
      deployment: {
        id: 'deployment',
        title: 'Production Deployment & Public Launch',
        description:
          'Production rollout, DNS/CDN cutover, telemetry monitoring, and store submission.',
        duration: 2,
        status: 'not_started',
        priority: 'critical',
        risk: 'high',
        assignee: 'Release Engineer',
        tags: ['devops', 'release'],
      },
    },
    edges: [
      // Requirements unblocks Architecture and UI Design
      {
        id: 'edge_req_to_arch',
        from: 'requirements',
        to: 'architecture',
      },
      {
        id: 'edge_req_to_ui',
        from: 'requirements',
        to: 'ui_design',
      },
      // Architecture unblocks Backend and Frontend development
      {
        id: 'edge_arch_to_backend',
        from: 'architecture',
        to: 'backend_dev',
      },
      {
        id: 'edge_arch_to_frontend',
        from: 'architecture',
        to: 'frontend_dev',
      },
      // UI Design also unblocks Frontend development
      {
        id: 'edge_ui_to_frontend',
        from: 'ui_design',
        to: 'frontend_dev',
      },
      // Engineering streams converge on Integration
      {
        id: 'edge_backend_to_integration',
        from: 'backend_dev',
        to: 'integration',
      },
      {
        id: 'edge_frontend_to_integration',
        from: 'frontend_dev',
        to: 'integration',
      },
      // Backend is also directly audited in Security Review
      {
        id: 'edge_backend_to_security',
        from: 'backend_dev',
        to: 'security_review',
      },
      // Integration feeds Testing and Security Review
      {
        id: 'edge_integration_to_testing',
        from: 'integration',
        to: 'testing',
      },
      {
        id: 'edge_integration_to_security',
        from: 'integration',
        to: 'security_review',
      },
      // Final convergence on Deployment
      {
        id: 'edge_testing_to_deploy',
        from: 'testing',
        to: 'deployment',
      },
      {
        id: 'edge_security_to_deploy',
        from: 'security_review',
        to: 'deployment',
      },
    ],
  };
}

