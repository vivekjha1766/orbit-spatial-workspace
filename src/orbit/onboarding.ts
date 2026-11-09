/**
 * ORBIT — Spatial Intelligence Workspace
 * Meta VR Start Developer Competition 2026
 *
 * Phase 5: Onboarding & Guided Five-Minute Journey Engine
 *
 * Implements a robust deterministic state machine guiding new users
 * through understanding the spatial DAG, inspecting task intelligence,
 * discovering ORBIT Navigator, simulating what-if scenarios, and approving changes.
 */

import type { WorkflowGraph } from './types.js';

export type OnboardingStep =
  | 'NOT_STARTED'
  | 'WELCOME'
  | 'ORIENTATION'
  | 'SELECT_NODE'
  | 'INSPECT_TASK'
  | 'EXPLORE_NAVIGATOR'
  | 'SIMULATE_CHANGE'
  | 'COMPLETE';

export type WorkspaceRegionHighlight =
  | 'none'
  | 'workspace'
  | 'graph'
  | 'navigator'
  | 'details';

export interface OnboardingStepDetails {
  readonly step: OnboardingStep;
  readonly stepNumber: number; // 1-based index (0 for NOT_STARTED, 7 for COMPLETE)
  readonly totalSteps: number; // 6 core interactive steps
  readonly badgeLabel: string;
  readonly title: string;
  readonly description: string;
  readonly actionPrompt: string;
  readonly primaryButtonText: string;
  readonly secondaryButtonText?: string;
  readonly canSkip: boolean;
  readonly highlightRegion: WorkspaceRegionHighlight;
  readonly suggestedNodeId?: string;
}

export const ONBOARDING_STEP_DEFINITIONS: Record<
  OnboardingStep,
  OnboardingStepDetails
> = {
  NOT_STARTED: {
    step: 'NOT_STARTED',
    stepNumber: 0,
    totalSteps: 6,
    badgeLabel: 'ORBIT GUIDE',
    title: 'Ready to Explore?',
    description:
      'Learn how to navigate your spatial workflow graph, analyze bottlenecks, and simulate schedule changes.',
    actionPrompt: 'Click "Start Guide" to begin your 5-minute spatial walkthrough.',
    primaryButtonText: 'Start Guide',
    secondaryButtonText: 'Dismiss',
    canSkip: true,
    highlightRegion: 'none',
  },
  WELCOME: {
    step: 'WELCOME',
    stepNumber: 1,
    totalSteps: 6,
    badgeLabel: 'GUIDE // 1 OF 6',
    title: 'Welcome to ORBIT',
    description:
      'Complex workflows are easier to understand when you can see how everything connects.\n\nExplore your project, discover bottlenecks and make informed decisions in space.',
    actionPrompt: 'Click "Start Exploring" to examine your workspace layout.',
    primaryButtonText: 'Start Exploring',
    secondaryButtonText: 'Skip Introduction',
    canSkip: true,
    highlightRegion: 'workspace',
  },
  ORIENTATION: {
    step: 'ORIENTATION',
    stepNumber: 2,
    totalSteps: 6,
    badgeLabel: 'GUIDE // 2 OF 6',
    title: 'The Spatial Cockpit',
    description:
      'Three integrated regions surround you:\n• Center: Spatial Dependency DAG with gold Critical Path.\n• Left: ORBIT Navigator intelligence engine.\n• Right: Task Details & What-If scenario sandbox.',
    actionPrompt: 'Look around the cockpit, then click "Next" to select a task.',
    primaryButtonText: 'Next: Select Task',
    secondaryButtonText: 'Skip Tour',
    canSkip: true,
    highlightRegion: 'workspace',
  },
  SELECT_NODE: {
    step: 'SELECT_NODE',
    stepNumber: 3,
    totalSteps: 6,
    badgeLabel: 'GUIDE // 3 OF 6',
    title: 'Select a Task Node',
    description:
      'Aim your ray pointer at any task card (such as "End-to-End System Integration") and pinch or trigger to inspect it.\n\nSelected tasks glow with an active cyan halo.',
    actionPrompt: 'Point and select any task card, or click "Next" to advance.',
    primaryButtonText: 'Next: Inspect Task',
    secondaryButtonText: 'Back',
    canSkip: true,
    highlightRegion: 'graph',
    suggestedNodeId: 'integration',
  },
  INSPECT_TASK: {
    step: 'INSPECT_TASK',
    stepNumber: 4,
    totalSteps: 6,
    badgeLabel: 'GUIDE // 4 OF 6',
    title: 'Task Intelligence',
    description:
      'The right Inspector displays deep scheduling metrics:\n• Duration & Criticality (Gold indicates zero float)\n• Earliest / Latest schedule windows\n• Buffer float & downstream dependency blast radius.',
    actionPrompt: 'Review the selected metrics, then click "Next" to discover Navigator.',
    primaryButtonText: 'Next: Discover Navigator',
    secondaryButtonText: 'Back',
    canSkip: true,
    highlightRegion: 'details',
  },
  EXPLORE_NAVIGATOR: {
    step: 'EXPLORE_NAVIGATOR',
    stepNumber: 5,
    totalSteps: 6,
    badgeLabel: 'GUIDE // 5 OF 6',
    title: 'ORBIT Navigator Engine',
    description:
      'On the left panel, ORBIT Navigator continuously evaluates workflow topology to detect convergence bottlenecks, critical risks, and duration compression opportunities with explainable graph evidence.',
    actionPrompt: 'Review the ranked recommendation, then click "Next" to simulate changes.',
    primaryButtonText: 'Next: Simulate Change',
    secondaryButtonText: 'Back',
    canSkip: true,
    highlightRegion: 'navigator',
  },
  SIMULATE_CHANGE: {
    step: 'SIMULATE_CHANGE',
    stepNumber: 6,
    totalSteps: 6,
    badgeLabel: 'GUIDE // 6 OF 6',
    title: 'Simulate What-If Actions',
    description:
      'Click "Simulate Action" on Navigator or adjust durations on the Inspector.\n\nA dry-run CPM forward/backward pass instantly recalculates project delivery and highlights schedule impact before committing.',
    actionPrompt: 'Simulate the action or click "Next" to approve and finish.',
    primaryButtonText: 'Next: Complete',
    secondaryButtonText: 'Back',
    canSkip: true,
    highlightRegion: 'navigator',
  },
  COMPLETE: {
    step: 'COMPLETE',
    stepNumber: 7,
    totalSteps: 6,
    badgeLabel: 'WORKSPACE READY',
    title: 'You are Ready to Orbit',
    description:
      'You have experienced the complete ORBIT spatial workflow:\nUNDERSTAND → MANIPULATE → ANALYZE → SIMULATE → APPROVE.\n\nYour workspace is ready. Manipulate tasks, draft dependencies, and simulate alternative futures.',
    actionPrompt: 'Explore freely or click "Restart Guide" to review anytime.',
    primaryButtonText: 'Continue Exploring',
    secondaryButtonText: 'Restart Guide',
    canSkip: false,
    highlightRegion: 'none',
  },
};

const STEP_TRANSITIONS_FORWARD: Partial<Record<OnboardingStep, OnboardingStep>> = {
  NOT_STARTED: 'WELCOME',
  WELCOME: 'ORIENTATION',
  ORIENTATION: 'SELECT_NODE',
  SELECT_NODE: 'INSPECT_TASK',
  INSPECT_TASK: 'EXPLORE_NAVIGATOR',
  EXPLORE_NAVIGATOR: 'SIMULATE_CHANGE',
  SIMULATE_CHANGE: 'COMPLETE',
  COMPLETE: 'COMPLETE',
};

const STEP_TRANSITIONS_BACKWARD: Partial<Record<OnboardingStep, OnboardingStep>> = {
  WELCOME: 'WELCOME',
  ORIENTATION: 'WELCOME',
  SELECT_NODE: 'ORIENTATION',
  INSPECT_TASK: 'SELECT_NODE',
  EXPLORE_NAVIGATOR: 'INSPECT_TASK',
  SIMULATE_CHANGE: 'EXPLORE_NAVIGATOR',
  COMPLETE: 'SIMULATE_CHANGE',
};

export const ONBOARDING_STORAGE_KEY = 'orbit:onboarding_completed';

/**
 * Safely reads the persistent onboarding completion flag from localStorage.
 * Returns false if unavailable (node, SSR, or storage disabled).
 */
export function getStoredOnboardingCompletion(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    }
  } catch {
    // In restricted sandbox or SSR/node
  }
  return false;
}

/**
 * Safely persists the onboarding completion flag to localStorage.
 */
export function setStoredOnboardingCompletion(completed: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (completed) {
        window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      } else {
        window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }
    }
  } catch {
    // In restricted sandbox or SSR/node
  }
}

/**
 * OnboardingManager manages the guided user experience state machine.
 * Strictly decoupled from workflow graph state — onboarding never mutates the DAG directly.
 */
export class OnboardingManager {
  private currentStep: OnboardingStep;
  private hasSeenOnboarding: boolean;
  private stepHistory: OnboardingStep[];
  private interactionCompletedForStep: Set<OnboardingStep> = new Set();

  constructor(
    initialStep?: OnboardingStep,
    hasSeenOnboarding?: boolean,
  ) {
    const storedCompleted = getStoredOnboardingCompletion();
    const effectiveHasSeen = hasSeenOnboarding ?? storedCompleted;
    const effectiveInitial =
      initialStep ?? (effectiveHasSeen ? 'COMPLETE' : 'WELCOME');

    this.currentStep = effectiveInitial;
    this.hasSeenOnboarding = effectiveHasSeen;
    this.stepHistory = [effectiveInitial];
  }

  public getCurrentStep(): OnboardingStep {
    return this.currentStep;
  }

  public getStepDetails(): OnboardingStepDetails {
    return ONBOARDING_STEP_DEFINITIONS[this.currentStep];
  }

  public isCompleted(): boolean {
    return this.currentStep === 'COMPLETE';
  }

  public hasCompletedPreviously(): boolean {
    return this.hasSeenOnboarding;
  }

  public getHistory(): readonly OnboardingStep[] {
    return this.stepHistory;
  }

  /**
   * Starts or restarts the guided tour from the Welcome step.
   */
  public start(): OnboardingStepDetails {
    this.currentStep = 'WELCOME';
    this.interactionCompletedForStep.clear();
    this.stepHistory.push('WELCOME');
    return this.getStepDetails();
  }

  /**
   * Advances to the next sequential step in the journey.
   */
  public next(): OnboardingStepDetails {
    const nextStep = STEP_TRANSITIONS_FORWARD[this.currentStep];
    if (nextStep && nextStep !== this.currentStep) {
      this.currentStep = nextStep;
      if (nextStep === 'COMPLETE') {
        this.hasSeenOnboarding = true;
        setStoredOnboardingCompletion(true);
      }
      this.stepHistory.push(nextStep);
    }
    return this.getStepDetails();
  }

  /**
   * Navigates back to the preceding step.
   */
  public prev(): OnboardingStepDetails {
    const prevStep = STEP_TRANSITIONS_BACKWARD[this.currentStep];
    if (prevStep && prevStep !== this.currentStep) {
      this.currentStep = prevStep;
      this.stepHistory.push(prevStep);
    }
    return this.getStepDetails();
  }

  /**
   * Skips remaining tutorial steps and concludes onboarding.
   */
  public skip(): OnboardingStepDetails {
    this.currentStep = 'COMPLETE';
    this.hasSeenOnboarding = true;
    setStoredOnboardingCompletion(true);
    this.stepHistory.push('COMPLETE');
    return this.getStepDetails();
  }

  /**
   * Restarts the onboarding experience from the beginning.
   */
  public restart(): OnboardingStepDetails {
    return this.start();
  }

  /**
   * Dismisses the onboarding panel after completion.
   */
  public dismiss(): OnboardingStepDetails {
    this.currentStep = 'COMPLETE';
    this.hasSeenOnboarding = true;
    setStoredOnboardingCompletion(true);
    return this.getStepDetails();
  }

  /**
   * Clears stored persistent completion flag (for test isolation or full demo resets).
   */
  public resetCompletion(): void {
    this.hasSeenOnboarding = false;
    setStoredOnboardingCompletion(false);
  }

  // --- Reactive Interaction Callbacks ---

  /**
   * Called when a node is selected in the spatial graph.
   * If user is on the SELECT_NODE step, advances automatically.
   */
  public onNodeSelected(_nodeId: string): boolean {
    if (this.currentStep === 'SELECT_NODE') {
      this.interactionCompletedForStep.add('SELECT_NODE');
      this.next();
      return true;
    }
    return false;
  }

  /**
   * Called when the user inspects details or views metrics.
   */
  public onTaskDetailsInspected(): boolean {
    if (this.currentStep === 'INSPECT_TASK') {
      this.interactionCompletedForStep.add('INSPECT_TASK');
      return true;
    }
    return false;
  }

  /**
   * Called when the user views or cycles recommendations on Navigator.
   */
  public onNavigatorExplored(): boolean {
    if (this.currentStep === 'EXPLORE_NAVIGATOR') {
      this.interactionCompletedForStep.add('EXPLORE_NAVIGATOR');
      return true;
    }
    return false;
  }

  /**
   * Called when a recommendation or duration scenario is simulated.
   */
  public onScenarioSimulated(): boolean {
    if (this.currentStep === 'SIMULATE_CHANGE') {
      this.interactionCompletedForStep.add('SIMULATE_CHANGE');
      return true;
    }
    return false;
  }

  /**
   * Called when a scenario is applied or discarded by the user.
   */
  public onScenarioAppliedOrDiscarded(): boolean {
    if (this.currentStep === 'SIMULATE_CHANGE') {
      this.interactionCompletedForStep.add('SIMULATE_CHANGE');
      this.next(); // Advances to COMPLETE
      return true;
    }
    return false;
  }

  /**
   * Verifies that the onboarding engine does NOT mutate the workflow graph.
   */
  public verifyGraphPurity(graphBefore: WorkflowGraph, graphAfter: WorkflowGraph): boolean {
    const jsonBefore = JSON.stringify(graphBefore);
    const jsonAfter = JSON.stringify(graphAfter);
    return jsonBefore === jsonAfter;
  }
}

