import { EventEmitter } from 'events';
import type { AgentMessage, AgentType } from '~/types/agents';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('AgentMessageBus');

/**
 * Type-safe message contracts for agent communication
 */
export interface MessageContracts {
  // Project Manager messages
  'pm:task-assigned': { taskId: string; assignedTo: AgentType; description: string };
  'pm:prd-created': { prd: string; requirements: any };

  // Requirement Analyst messages
  'ra:clarification-needed': { round: number; questions: string[] };
  'ra:requirements-complete': { requirements: string; analysis: any };

  // Frontend Dev messages
  'frontend:question': { to: AgentType; question: string };
  'frontend:component-created': { component: string; dependencies: string[] };
  'frontend:complete': { components: string[]; routes: string[] };

  // Backend Dev messages
  'backend:question': { to: AgentType; question: string };
  'backend:api-ready': { endpoints: string[]; schema: any };
  'backend:complete': { apis: string[]; database: any };

  // DevOps messages
  'devops:config-needed': { from: AgentType; configType: string };
  'devops:deployment-ready': { platform: string; url?: string };

  // QA messages
  'qa:issue-found': { severity: string; description: string; location?: string };
  'qa:report-ready': { status: string; issues: any[] };

  // Digi CTO messages
  'cto:recommendation': { category: string; title: string; description: string };
  'cto:analysis-complete': { recommendations: any[] };

  // Generic messages
  'agent:handoff': { from: AgentType; to: AgentType; context: string };
  'agent:broadcast': { from: AgentType; message: string };
}

export type MessageType = keyof MessageContracts;

/**
 * Agent Message Bus - Type-safe pub/sub system for agent communication
 */
export class AgentMessageBus {
  private static instance: AgentMessageBus;
  private emitter: EventEmitter;
  private messageHistory: AgentMessage[] = [];
  private maxHistorySize = 1000;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50); // Support many agents
    logger.debug('AgentMessageBus initialized');
  }

  static getInstance(): AgentMessageBus {
    if (!AgentMessageBus.instance) {
      AgentMessageBus.instance = new AgentMessageBus();
    }

    return AgentMessageBus.instance;
  }

  /**
   * Publish a typed message to the bus
   */
  publish<T extends MessageType>(
    messageType: T,
    data: MessageContracts[T],
    metadata?: {
      from: AgentType;
      to?: AgentType;
    },
  ): void {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      from: metadata?.from || ('system' as AgentType),
      to: metadata?.to,
      timestamp: Date.now(),
      type: this.inferMessageType(messageType),
      content: JSON.stringify(data),
      metadata: {
        messageType,
        ...data,
      },
    };

    // Store in history
    this.addToHistory(message);

    // Emit the event
    this.emitter.emit(messageType, data, message);

    // Also emit to agent-specific channels
    if (metadata?.to) {
      this.emitter.emit(`to:${metadata.to}`, message);
    }

    logger.debug(`Message published: ${messageType}`, {
      from: message.from,
      to: message.to,
    });
  }

  /**
   * Subscribe to a specific message type
   */
  subscribe<T extends MessageType>(
    messageType: T,
    handler: (data: MessageContracts[T], message: AgentMessage) => void,
  ): () => void {
    this.emitter.on(messageType, handler);

    // Return unsubscribe function
    return () => {
      this.emitter.off(messageType, handler);
    };
  }

  /**
   * Subscribe to all messages for a specific agent
   */
  subscribeToAgent(agentType: AgentType, handler: (message: AgentMessage) => void): () => void {
    const channel = `to:${agentType}`;
    this.emitter.on(channel, handler);

    return () => {
      this.emitter.off(channel, handler);
    };
  }

  /**
   * Send a direct message to another agent
   */
  sendDirectMessage(from: AgentType, to: AgentType, content: string, metadata?: Record<string, any>): void {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      from,
      to,
      timestamp: Date.now(),
      type: 'question',
      content,
      metadata,
    };

    this.addToHistory(message);
    this.emitter.emit(`to:${to}`, message);

    logger.debug(`Direct message sent from ${from} to ${to}`);
  }

  /**
   * Broadcast a message to all agents
   */
  broadcast(from: AgentType, content: string, metadata?: Record<string, any>): void {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      from,
      timestamp: Date.now(),
      type: 'notification',
      content,
      metadata,
    };

    this.addToHistory(message);
    this.emitter.emit('agent:broadcast', { from, message: content }, message);

    logger.debug(`Broadcast from ${from}: ${content}`);
  }

  /**
   * Get message history
   */
  getHistory(filter?: { from?: AgentType; to?: AgentType; limit?: number }): AgentMessage[] {
    let filtered = [...this.messageHistory];

    if (filter?.from) {
      filtered = filtered.filter((msg) => msg.from === filter.from);
    }

    if (filter?.to) {
      filtered = filtered.filter((msg) => msg.to === filter.to);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
    logger.debug('Message history cleared');
  }

  /**
   * Get conversation between two agents
   */
  getConversation(agent1: AgentType, agent2: AgentType): AgentMessage[] {
    return this.messageHistory.filter(
      (msg) => (msg.from === agent1 && msg.to === agent2) || (msg.from === agent2 && msg.to === agent1),
    );
  }

  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push(message);

    // Trim history if too large
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private inferMessageType(messageType: MessageType): AgentMessage['type'] {
    if (messageType.includes('question')) {
      return 'question';
    }

    if (messageType.includes('complete') || messageType.includes('ready')) {
      return 'result';
    }

    if (messageType.includes('handoff')) {
      return 'handoff';
    }

    return 'notification';
  }

  /**
   * Reset the message bus (useful for testing)
   */
  reset(): void {
    this.emitter.removeAllListeners();
    this.clearHistory();
    logger.debug('Message bus reset');
  }
}

// Export singleton instance
export const messageBus = AgentMessageBus.getInstance();
