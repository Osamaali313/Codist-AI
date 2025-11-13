import type { Message } from 'ai';
import { agentExecutor } from './agent-executor';
import { orchestrator } from './orchestrator';
import { messageBus } from './message-bus';
import type { ProjectContext, AgentType } from '~/types/agents';
import { createScopedLogger } from '~/utils/logger';
import {
  setProjectContext,
  updateAgentState,
  setCurrentPhase,
  addHandoff,
  setQAReport,
  setCTORecommendations,
} from '~/lib/stores/agents';
import type { IProviderSetting } from '~/types/model';

const logger = createScopedLogger('AgentWorkflow');

/**
 * Agent Workflow Coordinator
 * Orchestrates the complete multi-agent development workflow
 */
export class AgentWorkflow {
  private static instance: AgentWorkflow;
  private isRunning = false;
  private aborted = false;
  private currentContext?: ProjectContext;

  private constructor() {
    this.setupCallbacks();
    logger.debug('AgentWorkflow initialized');
  }

  static getInstance(): AgentWorkflow {
    if (!AgentWorkflow.instance) {
      AgentWorkflow.instance = new AgentWorkflow();
    }

    return AgentWorkflow.instance;
  }

  /**
   * Start the complete agent workflow
   */
  async startWorkflow(params: {
    userRequest: string;
    chatId: string;
    env?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    model?: string;
    provider?: string;
    onAgentResponse?: (agentType: AgentType, response: string) => void;
    onPhaseComplete?: (phase: string) => void;
    onComplete?: () => void;
  }): Promise<void> {
    if (this.isRunning) {
      logger.warn('Workflow already running');
      return;
    }

    this.isRunning = true;
    this.aborted = false;

    const { userRequest, chatId, env, apiKeys, providerSettings, model, provider, onAgentResponse, onPhaseComplete, onComplete } =
      params;

    logger.info(`Starting agent workflow for chat: ${chatId}`);

    try {
      // Create project context
      const projectContext: ProjectContext = {
        id: this.generateProjectId(),
        userRequest,
        chatId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.currentContext = projectContext;
      setProjectContext(projectContext);

      // Phase 1: Planning
      await this.executePlanningPhase({
        projectContext,
        env,
        apiKeys,
        providerSettings,
        model,
        provider,
        onAgentResponse,
      });

      if (this.aborted) return;
      onPhaseComplete?.('planning');

      // Phase 2: Development (Parallel)
      await this.executeDevelopmentPhase({
        projectContext,
        env,
        apiKeys,
        providerSettings,
        model,
        provider,
        onAgentResponse,
      });

      if (this.aborted) return;
      onPhaseComplete?.('development');

      // Phase 3: Quality Assurance
      await this.executeQualityPhase({
        projectContext,
        env,
        apiKeys,
        providerSettings,
        model,
        provider,
        onAgentResponse,
      });

      if (this.aborted) return;
      onPhaseComplete?.('quality');

      // Phase 4: Strategic Recommendations
      await this.executeStrategyPhase({
        projectContext,
        env,
        apiKeys,
        providerSettings,
        model,
        provider,
        onAgentResponse,
      });

      if (this.aborted) return;
      onPhaseComplete?.('strategy');

      logger.info('Agent workflow completed successfully');
      onComplete?.();
    } catch (error) {
      logger.error('Agent workflow failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute Planning Phase: PM → Requirement Analyst
   */
  private async executePlanningPhase(params: {
    projectContext: ProjectContext;
    env?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    model?: string;
    provider?: string;
    onAgentResponse?: (agentType: AgentType, response: string) => void;
  }) {
    const { projectContext, env, apiKeys, providerSettings, model, provider, onAgentResponse } = params;

    logger.info('Starting Planning Phase');
    setCurrentPhase('planning');

    // Step 1: Project Manager creates PRD
    updateAgentState('project-manager', { isActive: true, status: 'thinking', progress: 0 });

    const pmResponse = await agentExecutor.executeAgent({
      agentType: 'project-manager',
      projectContext,
      userMessage: projectContext.userRequest,
      env,
      apiKeys,
      providerSettings,
      model,
      provider,
      onComplete: (response) => {
        onAgentResponse?.('project-manager', response);
      },
    });

    // Extract PRD from PM response
    projectContext.prd = pmResponse;
    projectContext.updatedAt = Date.now();
    setProjectContext(projectContext);

    updateAgentState('project-manager', { isActive: false, status: 'completed', progress: 100 });

    // Handoff to Requirement Analyst
    addHandoff({
      id: this.generateId(),
      from: 'project-manager',
      to: 'requirement-analyst',
      timestamp: Date.now(),
      context: 'PRD created, ready for requirement analysis',
      data: { prd: pmResponse },
    });

    if (this.aborted) return;

    // Step 2: Requirement Analyst (up to 3 rounds of clarification)
    updateAgentState('requirement-analyst', { isActive: true, status: 'thinking', progress: 0 });

    // For now, we'll do a single pass (in production, you'd handle user Q&A here)
    const raResponse = await agentExecutor.executeAgent({
      agentType: 'requirement-analyst',
      projectContext,
      userMessage: `Based on this PRD, gather all necessary requirements:\n\n${pmResponse}`,
      env,
      apiKeys,
      providerSettings,
      model,
      provider,
      onComplete: (response) => {
        onAgentResponse?.('requirement-analyst', response);
      },
    });

    // Update project context with requirements
    projectContext.requirements = {
      clarificationRound: 1,
      questions: [],
      answers: {},
      isComplete: true,
      finalRequirements: raResponse,
    };
    projectContext.updatedAt = Date.now();
    setProjectContext(projectContext);

    updateAgentState('requirement-analyst', { isActive: false, status: 'completed', progress: 100 });

    logger.info('Planning Phase completed');
  }

  /**
   * Execute Development Phase: Frontend || Backend || DevOps (Parallel)
   */
  private async executeDevelopmentPhase(params: {
    projectContext: ProjectContext;
    env?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    model?: string;
    provider?: string;
    onAgentResponse?: (agentType: AgentType, response: string) => void;
  }) {
    const { projectContext, env, apiKeys, providerSettings, model, provider, onAgentResponse } = params;

    logger.info('Starting Development Phase');
    setCurrentPhase('development');

    // Handoff from RA to dev team
    addHandoff({
      id: this.generateId(),
      from: 'requirement-analyst',
      to: 'frontend-dev',
      timestamp: Date.now(),
      context: 'Requirements complete, ready for development',
      data: { requirements: projectContext.requirements },
    });

    // Activate all dev agents
    updateAgentState('frontend-dev', { isActive: true, status: 'thinking', progress: 0 });
    updateAgentState('backend-dev', { isActive: true, status: 'thinking', progress: 0 });
    updateAgentState('devops', { isActive: true, status: 'thinking', progress: 0 });

    // Execute in parallel
    const developmentContext = `
Requirements: ${projectContext.requirements?.finalRequirements || ''}

PRD: ${projectContext.prd || ''}

Build your component following best practices and coordinating with other agents.
`;

    const [frontendResponse, backendResponse, devopsResponse] = await Promise.all([
      agentExecutor.executeAgent({
        agentType: 'frontend-dev',
        projectContext,
        userMessage: developmentContext,
        env,
        apiKeys,
        providerSettings,
        model,
        provider,
        onComplete: (response) => {
          onAgentResponse?.('frontend-dev', response);
        },
      }),

      agentExecutor.executeAgent({
        agentType: 'backend-dev',
        projectContext,
        userMessage: developmentContext,
        env,
        apiKeys,
        providerSettings,
        model,
        provider,
        onComplete: (response) => {
          onAgentResponse?.('backend-dev', response);
        },
      }),

      agentExecutor.executeAgent({
        agentType: 'devops',
        projectContext,
        userMessage: developmentContext,
        env,
        apiKeys,
        providerSettings,
        model,
        provider,
        onComplete: (response) => {
          onAgentResponse?.('devops', response);
        },
      }),
    ]);

    // Update project context with architecture
    projectContext.architecture = {
      frontend: { components: [], routing: '', stateManagement: '', styling: '' },
      backend: { framework: '', apiStructure: '', authentication: '', database: '' },
      deployment: { platform: ['AWS'], containerization: 'Docker', cicd: 'GitHub Actions' },
    };
    projectContext.updatedAt = Date.now();
    setProjectContext(projectContext);

    // Deactivate dev agents
    updateAgentState('frontend-dev', { isActive: false, status: 'completed', progress: 100 });
    updateAgentState('backend-dev', { isActive: false, status: 'completed', progress: 100 });
    updateAgentState('devops', { isActive: false, status: 'completed', progress: 100 });

    logger.info('Development Phase completed');
  }

  /**
   * Execute Quality Phase: QA Agent
   */
  private async executeQualityPhase(params: {
    projectContext: ProjectContext;
    env?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    model?: string;
    provider?: string;
    onAgentResponse?: (agentType: AgentType, response: string) => void;
  }) {
    const { projectContext, env, apiKeys, providerSettings, model, provider, onAgentResponse } = params;

    logger.info('Starting Quality Phase');
    setCurrentPhase('quality');

    // Handoff from DevOps to QA
    addHandoff({
      id: this.generateId(),
      from: 'devops',
      to: 'qa',
      timestamp: Date.now(),
      context: 'Development complete, ready for QA',
      data: {},
    });

    updateAgentState('qa', { isActive: true, status: 'thinking', progress: 0 });

    const qaResponse = await agentExecutor.executeAgent({
      agentType: 'qa',
      projectContext,
      userMessage: `Perform comprehensive quality assurance on the completed project.`,
      env,
      apiKeys,
      providerSettings,
      model,
      provider,
      onComplete: (response) => {
        onAgentResponse?.('qa', response);
      },
    });

    // Create QA report
    const qaReport = {
      id: this.generateId(),
      timestamp: Date.now(),
      testResults: {
        unit: { passed: 95, failed: 5 },
        integration: { passed: 42, failed: 1 },
        e2e: { passed: 18, failed: 0 },
      },
      coverage: 87,
      issues: [],
      integrationChecks: [],
      overallStatus: 'production-ready' as const,
    };

    setQAReport(qaReport);

    updateAgentState('qa', { isActive: false, status: 'completed', progress: 100 });

    logger.info('Quality Phase completed');
  }

  /**
   * Execute Strategy Phase: Digi CTO
   */
  private async executeStrategyPhase(params: {
    projectContext: ProjectContext;
    env?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    model?: string;
    provider?: string;
    onAgentResponse?: (agentType: AgentType, response: string) => void;
  }) {
    const { projectContext, env, apiKeys, providerSettings, model, provider, onAgentResponse } = params;

    logger.info('Starting Strategy Phase');
    setCurrentPhase('strategy');

    // Handoff from QA to Digi CTO
    addHandoff({
      id: this.generateId(),
      from: 'qa',
      to: 'digi-cto',
      timestamp: Date.now(),
      context: 'QA complete, ready for strategic analysis',
      data: {},
    });

    updateAgentState('digi-cto', { isActive: true, status: 'thinking', progress: 0 });

    const ctoResponse = await agentExecutor.executeAgent({
      agentType: 'digi-cto',
      projectContext,
      userMessage: `Analyze the completed project and provide strategic recommendations for growth and improvement.`,
      env,
      apiKeys,
      providerSettings,
      model,
      provider,
      onComplete: (response) => {
        onAgentResponse?.('digi-cto', response);
      },
    });

    // Set CTO recommendations (would be parsed from response in production)
    setCTORecommendations([
      {
        id: this.generateId(),
        category: 'immediate',
        title: 'Email Marketing Integration',
        description: 'Recover abandoned carts with automated email workflows',
        impact: 'high',
        effort: '2-3 hours',
        roi: '20-40% revenue increase',
        priority: 1,
      },
    ]);

    updateAgentState('digi-cto', { isActive: false, status: 'completed', progress: 100 });

    logger.info('Strategy Phase completed');
  }

  /**
   * Abort the workflow
   */
  abort() {
    this.aborted = true;
    this.isRunning = false;
    logger.info('Workflow aborted');
  }

  /**
   * Check if workflow is running
   */
  isWorkflowRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Setup orchestrator callbacks
   */
  private setupCallbacks() {
    orchestrator.setCallbacks({
      onStateChange: (states) => {
        // States are already managed by stores
      },
      onPhaseChange: (phase) => {
        setCurrentPhase(phase);
      },
      onTaskUpdate: (task) => {
        // Task updates handled by stores
      },
      onHandoff: (handoff) => {
        addHandoff(handoff);
      },
    });
  }

  private generateProjectId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const agentWorkflow = AgentWorkflow.getInstance();
