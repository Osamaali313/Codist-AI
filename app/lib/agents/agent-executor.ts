import { streamText as _streamText } from 'ai';
import type { AgentType, ProjectContext } from '~/types/agents';
import { getAgentPrompt } from '~/lib/common/prompts/agent-prompts';
import { messageBus } from './message-bus';
import { orchestrator } from './orchestrator';
import { createScopedLogger } from '~/utils/logger';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { IProviderSetting } from '~/types/model';

const logger = createScopedLogger('AgentExecutor');

/**
 * Agent Executor - Runs individual agents with LLM integration
 */
export class AgentExecutor {
  private static instance: AgentExecutor;

  private constructor() {
    logger.debug('AgentExecutor initialized');
  }

  static getInstance(): AgentExecutor {
    if (!AgentExecutor.instance) {
      AgentExecutor.instance = new AgentExecutor();
    }

    return AgentExecutor.instance;
  }

  /**
   * Execute an agent with a specific task
   */
  async executeAgent(params: {
    agentType: AgentType;
    projectContext: ProjectContext;
    userMessage?: string;
    previousMessages?: any[];
    env?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    model?: string;
    provider?: string;
    onChunk?: (chunk: string) => void;
    onComplete?: (result: string) => void;
  }): Promise<string> {
    const {
      agentType,
      projectContext,
      userMessage,
      previousMessages = [],
      env,
      apiKeys,
      providerSettings,
      model,
      provider,
      onChunk,
      onComplete,
    } = params;

    logger.info(`Executing agent: ${agentType}`);

    // Update agent state to "thinking"
    orchestrator.updateAgentState(agentType, {
      status: 'thinking',
      progress: 10,
      message: 'Analyzing requirements...',
    });

    try {
      // Get agent-specific prompt
      const agentPrompt = getAgentPrompt(agentType, {
        userRequest: projectContext.userRequest,
        prd: projectContext.prd,
        requirements: projectContext.requirements,
        techStack: projectContext.techStack,
        architecture: projectContext.architecture,
      });

      // Build messages for LLM
      const messages = this.buildMessages(agentPrompt, userMessage, previousMessages);

      // Update agent state to "working"
      orchestrator.updateAgentState(agentType, {
        status: 'working',
        progress: 30,
        message: 'Generating response...',
      });

      // Stream response from LLM
      let fullResponse = '';

      const llmManager = LLMManager.getInstance();
      const selectedModel = model || 'claude-3-5-sonnet-20241022';
      const selectedProvider = provider || 'Anthropic';

      const providerInstance = llmManager.getProvider(selectedProvider);

      if (!providerInstance) {
        throw new Error(`Provider not found: ${selectedProvider}`);
      }

      const modelInstance = providerInstance.getModelInstance({
        model: selectedModel,
        serverEnv: env,
        apiKeys,
        providerSettings,
      });

      const result = await _streamText({
        model: modelInstance,
        messages,
        temperature: 0.7,
        maxTokens: 4096,
      });

      // Process stream
      for await (const chunk of result.textStream) {
        fullResponse += chunk;
        onChunk?.(chunk);

        // Update progress based on response length
        const progress = Math.min(30 + fullResponse.length / 100, 90);
        orchestrator.updateAgentState(agentType, {
          progress,
        });
      }

      // Parse agent response and extract key information
      const parsedResponse = this.parseAgentResponse(agentType, fullResponse);

      // Update agent state to "completed"
      orchestrator.updateAgentState(agentType, {
        status: 'completed',
        progress: 100,
        message: 'Task completed',
      });

      // Publish completion message
      this.publishCompletion(agentType, parsedResponse);

      onComplete?.(fullResponse);

      logger.info(`Agent ${agentType} completed successfully`);

      return fullResponse;
    } catch (error) {
      logger.error(`Agent ${agentType} failed:`, error);

      orchestrator.updateAgentState(agentType, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Build message array for LLM
   */
  private buildMessages(systemPrompt: string, userMessage?: string, previousMessages: any[] = []) {
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...previousMessages,
    ];

    if (userMessage) {
      messages.push({
        role: 'user' as const,
        content: userMessage,
      });
    }

    return messages;
  }

  /**
   * Parse agent response and extract structured data
   */
  private parseAgentResponse(agentType: AgentType, response: string): any {
    const parsed: any = {
      rawResponse: response,
      type: agentType,
    };

    // Extract different types of information based on agent type
    switch (agentType) {
      case 'project-manager':
        parsed.prd = this.extractSection(response, 'PROJECT:', 'AGENT ASSIGNMENTS:');
        parsed.tasks = this.extractTasks(response);
        break;

      case 'requirement-analyst':
        parsed.questions = this.extractQuestions(response);
        parsed.requirements = this.extractSection(response, 'CONFIRMED REQUIREMENTS', 'ASSUMED DEFAULTS');
        break;

      case 'frontend-dev':
        parsed.components = this.extractComponents(response);
        parsed.techStack = this.extractSection(response, 'TECH STACK', 'COMPONENTS');
        break;

      case 'backend-dev':
        parsed.endpoints = this.extractEndpoints(response);
        parsed.schema = this.extractSection(response, 'DATABASE SCHEMA', 'SECURITY');
        break;

      case 'devops':
        parsed.infrastructure = this.extractSection(response, 'AWS INFRASTRUCTURE', 'INFRASTRUCTURE AS CODE');
        parsed.docker = this.extractSection(response, 'DOCKER', 'AWS');
        break;

      case 'qa':
        parsed.issues = this.extractIssues(response);
        parsed.status = this.extractQAStatus(response);
        break;

      case 'digi-cto':
        parsed.recommendations = this.extractRecommendations(response);
        break;
    }

    return parsed;
  }

  /**
   * Publish agent completion message
   */
  private publishCompletion(agentType: AgentType, parsedResponse: any) {
    switch (agentType) {
      case 'project-manager':
        messageBus.publish(
          'pm:prd-created',
          {
            prd: parsedResponse.prd || parsedResponse.rawResponse,
            requirements: parsedResponse.tasks,
          },
          { from: agentType },
        );
        break;

      case 'requirement-analyst':
        messageBus.publish(
          'ra:requirements-complete',
          {
            requirements: parsedResponse.requirements || parsedResponse.rawResponse,
            analysis: parsedResponse,
          },
          { from: agentType },
        );
        break;

      case 'frontend-dev':
        messageBus.publish(
          'frontend:complete',
          {
            components: parsedResponse.components || [],
            routes: [],
          },
          { from: agentType },
        );
        break;

      case 'backend-dev':
        messageBus.publish(
          'backend:complete',
          {
            apis: parsedResponse.endpoints || [],
            database: parsedResponse.schema,
          },
          { from: agentType },
        );
        break;

      case 'devops':
        messageBus.publish(
          'devops:deployment-ready',
          {
            platform: 'AWS',
            url: undefined,
          },
          { from: agentType },
        );
        break;

      case 'qa':
        messageBus.publish(
          'qa:report-ready',
          {
            status: parsedResponse.status || 'complete',
            issues: parsedResponse.issues || [],
          },
          { from: agentType },
        );
        break;

      case 'digi-cto':
        messageBus.publish(
          'cto:analysis-complete',
          {
            recommendations: parsedResponse.recommendations || [],
          },
          { from: agentType },
        );
        break;
    }
  }

  // Helper methods for parsing
  private extractSection(text: string, startMarker: string, endMarker: string): string | undefined {
    const startIndex = text.indexOf(startMarker);

    if (startIndex === -1) {
      return undefined;
    }

    const endIndex = text.indexOf(endMarker, startIndex);
    const section = endIndex === -1 ? text.substring(startIndex) : text.substring(startIndex, endIndex);

    return section.trim();
  }

  private extractTasks(text: string): string[] {
    const tasks: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.match(/^\d+\.\s+/) || line.match(/^-\s+/)) {
        tasks.push(
          line
            .replace(/^\d+\.\s+/, '')
            .replace(/^-\s+/, '')
            .trim(),
        );
      }
    }

    return tasks;
  }

  private extractQuestions(text: string): string[] {
    const questions: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.includes('?')) {
        questions.push(line.trim());
      }
    }

    return questions;
  }

  private extractComponents(text: string): string[] {
    const components: string[] = [];
    const componentRegex = /(?:component|page|layout):\s*([A-Za-z0-9_-]+)/gi;
    let match;

    while ((match = componentRegex.exec(text)) !== null) {
      components.push(match[1]);
    }

    return components;
  }

  private extractEndpoints(text: string): string[] {
    const endpoints: string[] = [];
    const endpointRegex = /(GET|POST|PUT|DELETE|PATCH)\s+\/[\w/-]+/g;
    let match;

    while ((match = endpointRegex.exec(text)) !== null) {
      endpoints.push(match[0]);
    }

    return endpoints;
  }

  private extractIssues(text: string): Array<{ severity: string; description: string }> {
    const issues: Array<{ severity: string; description: string }> = [];
    const lines = text.split('\n');
    let currentSeverity = 'minor';

    for (const line of lines) {
      if (line.includes('CRITICAL')) {
        currentSeverity = 'critical';
      } else if (line.includes('MAJOR')) {
        currentSeverity = 'major';
      } else if (line.includes('MINOR')) {
        currentSeverity = 'minor';
      }

      if (line.match(/^\d+\.\s+/)) {
        issues.push({
          severity: currentSeverity,
          description: line.replace(/^\d+\.\s+/, '').trim(),
        });
      }
    }

    return issues;
  }

  private extractQAStatus(text: string): string {
    if (text.toLowerCase().includes('production-ready')) {
      return 'production-ready';
    }

    if (text.toLowerCase().includes('critical')) {
      return 'critical-issues';
    }

    if (text.toLowerCase().includes('needs fixes')) {
      return 'needs-fixes';
    }

    return 'complete';
  }

  private extractRecommendations(text: string): Array<{ title: string; category: string; description: string }> {
    const recommendations: Array<{ title: string; category: string; description: string }> = [];
    const sections = text.split(/\*\*\d+\.\s+/);
    let currentCategory = 'immediate';

    for (const section of sections) {
      if (section.includes('IMMEDIATE VALUE-ADDS')) {
        currentCategory = 'immediate';
      } else if (section.includes('GROWTH ENABLERS')) {
        currentCategory = 'growth';
      } else if (section.includes('SCALE PREPAREDNESS')) {
        currentCategory = 'scale';
      }

      const titleMatch = section.match(/\*\*([^*]+)\*\*/);

      if (titleMatch) {
        recommendations.push({
          title: titleMatch[1],
          category: currentCategory,
          description: section.substring(titleMatch[0].length).trim(),
        });
      }
    }

    return recommendations;
  }
}

// Export singleton instance
export const agentExecutor = AgentExecutor.getInstance();
