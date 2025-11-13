import { atom, map, type MapStore, type WritableAtom } from 'nanostores';
import type {
  AgentType,
  AgentState,
  AgentPhase,
  AgentTask,
  AgentHandoff,
  ProjectContext,
  DigiCTORecommendation,
  QAReport,
} from '~/types/agents';
import { AGENT_IDENTITIES } from '~/types/agents';

/**
 * Agent State Management using Nanostores
 */

// Current active phase
export const currentPhaseStore = atom<AgentPhase>('planning');

// Individual agent states
export const agentStatesStore = map<Record<AgentType, AgentState>>({
  'project-manager': {
    type: 'project-manager',
    status: 'idle',
    progress: 0,
    isActive: false,
  },
  'requirement-analyst': {
    type: 'requirement-analyst',
    status: 'idle',
    progress: 0,
    isActive: false,
  },
  'frontend-dev': {
    type: 'frontend-dev',
    status: 'idle',
    progress: 0,
    isActive: false,
  },
  'backend-dev': {
    type: 'backend-dev',
    status: 'idle',
    progress: 0,
    isActive: false,
  },
  devops: {
    type: 'devops',
    status: 'idle',
    progress: 0,
    isActive: false,
  },
  qa: {
    type: 'qa',
    status: 'idle',
    progress: 0,
    isActive: false,
  },
  'digi-cto': {
    type: 'digi-cto',
    status: 'idle',
    progress: 0,
    isActive: false,
  },
});

// Project context
export const projectContextStore = atom<ProjectContext | undefined>(undefined);

// Active tasks
export const tasksStore = map<Record<string, AgentTask>>({});

// Handoffs between agents
export const handoffsStore = atom<AgentHandoff[]>([]);

// QA Report
export const qaReportStore = atom<QAReport | undefined>(undefined);

// Digi CTO Recommendations
export const ctoRecommendationsStore = atom<DigiCTORecommendation[]>([]);

// Agent workflow enabled/disabled
export const agentWorkflowEnabledStore = atom<boolean>(true);

// Show agent dashboard
export const showAgentDashboardStore = atom<boolean>(true);

// Show agent status panel
export const showAgentStatusStore = atom<boolean>(true);

/**
 * Actions
 */

export function updateAgentState(agentType: AgentType, updates: Partial<AgentState>) {
  const currentStates = agentStatesStore.get();
  const currentState = currentStates[agentType];

  if (currentState) {
    agentStatesStore.setKey(agentType, {
      ...currentState,
      ...updates,
    });
  }
}

export function setCurrentPhase(phase: AgentPhase) {
  currentPhaseStore.set(phase);
}

export function setProjectContext(context: ProjectContext) {
  projectContextStore.set(context);
}

export function addTask(task: AgentTask) {
  tasksStore.setKey(task.id, task);
}

export function updateTask(taskId: string, updates: Partial<AgentTask>) {
  const currentTasks = tasksStore.get();
  const task = currentTasks[taskId];

  if (task) {
    tasksStore.setKey(taskId, {
      ...task,
      ...updates,
    });
  }
}

export function addHandoff(handoff: AgentHandoff) {
  const currentHandoffs = handoffsStore.get();
  handoffsStore.set([...currentHandoffs, handoff]);
}

export function setQAReport(report: QAReport) {
  qaReportStore.set(report);
}

export function setCTORecommendations(recommendations: DigiCTORecommendation[]) {
  ctoRecommendationsStore.set(recommendations);
}

export function toggleAgentWorkflow() {
  agentWorkflowEnabledStore.set(!agentWorkflowEnabledStore.get());
}

export function toggleAgentDashboard() {
  showAgentDashboardStore.set(!showAgentDashboardStore.get());
}

export function toggleAgentStatus() {
  showAgentStatusStore.set(!showAgentStatusStore.get());
}

export function resetAgentStores() {
  currentPhaseStore.set('planning');
  projectContextStore.set(undefined);
  tasksStore.set({});
  handoffsStore.set([]);
  qaReportStore.set(undefined);
  ctoRecommendationsStore.set([]);

  // Reset all agent states
  const resetStates: Record<AgentType, AgentState> = {
    'project-manager': {
      type: 'project-manager',
      status: 'idle',
      progress: 0,
      isActive: false,
    },
    'requirement-analyst': {
      type: 'requirement-analyst',
      status: 'idle',
      progress: 0,
      isActive: false,
    },
    'frontend-dev': {
      type: 'frontend-dev',
      status: 'idle',
      progress: 0,
      isActive: false,
    },
    'backend-dev': {
      type: 'backend-dev',
      status: 'idle',
      progress: 0,
      isActive: false,
    },
    devops: {
      type: 'devops',
      status: 'idle',
      progress: 0,
      isActive: false,
    },
    qa: {
      type: 'qa',
      status: 'idle',
      progress: 0,
      isActive: false,
    },
    'digi-cto': {
      type: 'digi-cto',
      status: 'idle',
      progress: 0,
      isActive: false,
    },
  };

  agentStatesStore.set(resetStates);
}

/**
 * Selectors
 */

export function getActiveAgents(): AgentType[] {
  const states = agentStatesStore.get();
  return Object.entries(states)
    .filter(([_, state]) => state.isActive)
    .map(([type, _]) => type as AgentType);
}

export function getAgentsByPhase(phase: AgentPhase): AgentType[] {
  const phaseAgents: Record<AgentPhase, AgentType[]> = {
    planning: ['project-manager', 'requirement-analyst'],
    development: ['frontend-dev', 'backend-dev', 'devops'],
    quality: ['qa'],
    strategy: ['digi-cto'],
  };

  return phaseAgents[phase] || [];
}

export function getTasksByAgent(agentType: AgentType): AgentTask[] {
  const tasks = tasksStore.get();
  return Object.values(tasks).filter((task) => task.assignedTo === agentType);
}

export function getCompletedTasks(): AgentTask[] {
  const tasks = tasksStore.get();
  return Object.values(tasks).filter((task) => task.status === 'completed');
}

export function getPendingTasks(): AgentTask[] {
  const tasks = tasksStore.get();
  return Object.values(tasks).filter((task) => task.status === 'pending' || task.status === 'in-progress');
}
