import type {
  AgentType,
  AgentPhase,
  AgentState,
  AgentTask,
  ProjectContext,
  AgentHandoff,
  QAReport,
  DigiCTORecommendation,
} from '~/types/agents';
import { AGENT_WORKFLOW, AGENT_IDENTITIES } from '~/types/agents';
import { messageBus } from './message-bus';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('AgentOrchestrator');

/**
 * Agent Orchestrator - Manages the multi-agent workflow
 *
 * Workflow:
 * 1. Planning Phase (Sequential):
 *    - Project Manager creates PRD and delegates tasks
 *    - Requirement Analyst gathers requirements (max 3 rounds)
 *
 * 2. Development Phase (Parallel):
 *    - Frontend Dev, Backend Dev, DevOps work in parallel
 *    - Agents communicate via message bus
 *
 * 3. Quality Phase (Sequential):
 *    - QA Agent validates integration and quality
 *
 * 4. Strategy Phase (Sequential):
 *    - Digi CTO provides strategic recommendations
 */
export class AgentOrchestrator {
  private static instance: AgentOrchestrator;

  private currentPhase: AgentPhase = 'planning';
  private agentStates: Map<AgentType, AgentState> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private projectContext?: ProjectContext;
  private handoffs: AgentHandoff[] = [];
  private isRunning = false;

  // Callbacks for UI updates
  private onStateChange?: (states: Map<AgentType, AgentState>) => void;
  private onPhaseChange?: (phase: AgentPhase) => void;
  private onTaskUpdate?: (task: AgentTask) => void;
  private onHandoff?: (handoff: AgentHandoff) => void;

  private constructor() {
    this.initializeAgentStates();
    this.setupMessageBusListeners();
    logger.debug('AgentOrchestrator initialized');
  }

  static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }

    return AgentOrchestrator.instance;
  }

  /**
   * Start the agent workflow with user request
   */
  async start(userRequest: string, chatId: string): Promise<void> {
    if (this.isRunning) {
      logger.warn('Orchestrator already running');
      return;
    }

    this.isRunning = true;
    this.reset();

    logger.info(`Starting agent workflow for chat: ${chatId}`);

    // Create project context
    this.projectContext = {
      id: this.generateProjectId(),
      userRequest,
      chatId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      // Phase 1: Planning (Sequential)
      await this.executePlanningPhase();

      // Phase 2: Development (Parallel)
      await this.executeDevelopmentPhase();

      // Phase 3: Quality (Sequential)
      await this.executeQualityPhase();

      // Phase 4: Strategy (Sequential)
      await this.executeStrategyPhase();

      logger.info('Agent workflow completed successfully');
    } catch (error) {
      logger.error('Agent workflow failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute Planning Phase (PM → RA)
   */
  private async executePlanningPhase(): Promise<void> {
    this.setPhase('planning');
    logger.info('Starting Planning Phase');

    // Step 1: Project Manager creates PRD
    await this.activateAgent('project-manager');
    const pmComplete = await this.waitForMessage('pm:prd-created');

    if (pmComplete && this.projectContext) {
      this.projectContext.prd = pmComplete.metadata?.prd;
      this.projectContext.updatedAt = Date.now();
    }

    await this.deactivateAgent('project-manager');

    // Step 2: Requirement Analyst gathers requirements
    await this.activateAgent('requirement-analyst');
    const raComplete = await this.waitForMessage('ra:requirements-complete');

    if (raComplete && this.projectContext) {
      this.projectContext.requirements = raComplete.metadata?.analysis;
      this.projectContext.updatedAt = Date.now();
    }

    await this.deactivateAgent('requirement-analyst');

    // Handoff to development phase
    this.createHandoff('requirement-analyst', 'frontend-dev', 'Requirements analysis complete. Beginning development.');

    logger.info('Planning Phase completed');
  }

  /**
   * Execute Development Phase (Parallel: FE, BE, DevOps)
   */
  private async executeDevelopmentPhase(): Promise<void> {
    this.setPhase('development');
    logger.info('Starting Development Phase');

    // Activate all dev agents in parallel
    const devAgents: AgentType[] = ['frontend-dev', 'backend-dev', 'devops'];

    await Promise.all(devAgents.map((agent) => this.activateAgent(agent)));

    // Wait for all agents to complete
    await Promise.all([
      this.waitForMessage('frontend:complete'),
      this.waitForMessage('backend:complete'),
      this.waitForMessage('devops:deployment-ready'),
    ]);

    // Deactivate all dev agents
    await Promise.all(devAgents.map((agent) => this.deactivateAgent(agent)));

    // Handoff to QA
    this.createHandoff('devops', 'qa', 'Development complete. Ready for quality assurance.');

    logger.info('Development Phase completed');
  }

  /**
   * Execute Quality Phase (QA)
   */
  private async executeQualityPhase(): Promise<void> {
    this.setPhase('quality');
    logger.info('Starting Quality Phase');

    await this.activateAgent('qa');
    const qaReport = await this.waitForMessage('qa:report-ready');

    if (qaReport) {
      logger.info('QA Report received:', qaReport.metadata);
    }

    await this.deactivateAgent('qa');

    // Handoff to Digi CTO
    this.createHandoff('qa', 'digi-cto', 'Quality assurance complete. Ready for strategic analysis.');

    logger.info('Quality Phase completed');
  }

  /**
   * Execute Strategy Phase (Digi CTO)
   */
  private async executeStrategyPhase(): Promise<void> {
    this.setPhase('strategy');
    logger.info('Starting Strategy Phase');

    await this.activateAgent('digi-cto');
    const ctoAnalysis = await this.waitForMessage('cto:analysis-complete');

    if (ctoAnalysis) {
      logger.info('Digi CTO recommendations received:', ctoAnalysis.metadata);
    }

    await this.deactivateAgent('digi-cto');

    logger.info('Strategy Phase completed');
  }

  /**
   * Activate an agent
   */
  private async activateAgent(agentType: AgentType): Promise<void> {
    const state = this.agentStates.get(agentType);

    if (state) {
      state.isActive = true;
      state.status = 'thinking';
      state.progress = 0;
      state.message = `${AGENT_IDENTITIES[agentType].name} is starting...`;

      this.agentStates.set(agentType, state);
      this.notifyStateChange();

      logger.debug(`Agent activated: ${agentType}`);
    }
  }

  /**
   * Deactivate an agent
   */
  private async deactivateAgent(agentType: AgentType): Promise<void> {
    const state = this.agentStates.get(agentType);

    if (state) {
      state.isActive = false;
      state.status = 'completed';
      state.progress = 100;
      state.message = undefined;

      this.agentStates.set(agentType, state);
      this.notifyStateChange();

      logger.debug(`Agent deactivated: ${agentType}`);
    }
  }

  /**
   * Update agent state
   */
  updateAgentState(agentType: AgentType, updates: Partial<AgentState>): void {
    const state = this.agentStates.get(agentType);

    if (state) {
      Object.assign(state, updates);
      this.agentStates.set(agentType, state);
      this.notifyStateChange();
    }
  }

  /**
   * Create a task for an agent
   */
  createTask(task: Omit<AgentTask, 'id' | 'createdAt'>): string {
    const taskId = this.generateTaskId();

    const fullTask: AgentTask = {
      ...task,
      id: taskId,
      createdAt: Date.now(),
    };

    this.tasks.set(taskId, fullTask);

    // Notify via message bus
    messageBus.publish('pm:task-assigned', {
      taskId,
      assignedTo: task.assignedTo,
      description: task.description,
    }, {
      from: 'project-manager',
      to: task.assignedTo,
    });

    this.onTaskUpdate?.(fullTask);

    return taskId;
  }

  /**
   * Update a task
   */
  updateTask(taskId: string, updates: Partial<AgentTask>): void {
    const task = this.tasks.get(taskId);

    if (task) {
      Object.assign(task, updates);

      if (updates.status === 'completed') {
        task.completedAt = Date.now();
      }

      this.tasks.set(taskId, task);
      this.onTaskUpdate?.(task);
    }
  }

  /**
   * Create handoff between agents
   */
  private createHandoff(from: AgentType, to: AgentType, context: string, data: Record<string, any> = {}): void {
    const handoff: AgentHandoff = {
      id: this.generateHandoffId(),
      from,
      to,
      timestamp: Date.now(),
      context,
      data,
    };

    this.handoffs.push(handoff);

    messageBus.publish('agent:handoff', { from, to, context }, { from, to });

    this.onHandoff?.(handoff);

    logger.debug(`Handoff: ${from} → ${to}: ${context}`);
  }

  /**
   * Wait for a specific message type
   */
  private waitForMessage(messageType: string, timeout = 300000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for message: ${messageType}`));
      }, timeout);

      const unsubscribe = messageBus.subscribe(messageType as any, (data, message) => {
        clearTimeout(timer);
        unsubscribe();
        resolve(message);
      });
    });
  }

  /**
   * Set current phase
   */
  private setPhase(phase: AgentPhase): void {
    this.currentPhase = phase;
    this.onPhaseChange?.(phase);
    logger.info(`Phase changed to: ${phase}`);
  }

  /**
   * Initialize agent states
   */
  private initializeAgentStates(): void {
    const allAgents: AgentType[] = [
      'project-manager',
      'requirement-analyst',
      'frontend-dev',
      'backend-dev',
      'devops',
      'qa',
      'digi-cto',
    ];

    allAgents.forEach((agentType) => {
      this.agentStates.set(agentType, {
        type: agentType,
        status: 'idle',
        progress: 0,
        isActive: false,
      });
    });
  }

  /**
   * Setup message bus listeners
   */
  private setupMessageBusListeners(): void {
    // Listen for agent questions/notifications
    messageBus.subscribe('frontend:question', (data) => {
      logger.debug('Frontend question:', data);
    });

    messageBus.subscribe('backend:question', (data) => {
      logger.debug('Backend question:', data);
    });

    messageBus.subscribe('qa:issue-found', (data) => {
      logger.warn('QA issue found:', data);
    });
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChange(): void {
    this.onStateChange?.(new Map(this.agentStates));
  }

  /**
   * Register callbacks
   */
  setCallbacks(callbacks: {
    onStateChange?: (states: Map<AgentType, AgentState>) => void;
    onPhaseChange?: (phase: AgentPhase) => void;
    onTaskUpdate?: (task: AgentTask) => void;
    onHandoff?: (handoff: AgentHandoff) => void;
  }): void {
    this.onStateChange = callbacks.onStateChange;
    this.onPhaseChange = callbacks.onPhaseChange;
    this.onTaskUpdate = callbacks.onTaskUpdate;
    this.onHandoff = callbacks.onHandoff;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      phase: this.currentPhase,
      agents: new Map(this.agentStates),
      tasks: new Map(this.tasks),
      projectContext: this.projectContext,
      handoffs: [...this.handoffs],
      isRunning: this.isRunning,
    };
  }

  /**
   * Reset orchestrator state
   */
  private reset(): void {
    this.currentPhase = 'planning';
    this.tasks.clear();
    this.handoffs = [];
    this.projectContext = undefined;
    this.initializeAgentStates();
    messageBus.clearHistory();

    logger.debug('Orchestrator reset');
  }

  private generateProjectId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateHandoffId(): string {
    return `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const orchestrator = AgentOrchestrator.getInstance();
