import type { Message } from 'ai';

/**
 * Agent Types for Codist AI Multi-Agent System
 */

export type AgentType =
  | 'project-manager'
  | 'requirement-analyst'
  | 'frontend-dev'
  | 'backend-dev'
  | 'devops'
  | 'qa'
  | 'digi-cto';

export type AgentStatus = 'idle' | 'thinking' | 'working' | 'waiting' | 'completed' | 'error';

export type AgentPhase = 'planning' | 'development' | 'quality' | 'strategy';

export interface AgentIdentity {
  type: AgentType;
  name: string;
  emoji: string;
  color: string;
  role: string;
  personality: string;
}

export interface AgentMessage {
  id: string;
  from: AgentType;
  to?: AgentType; // If undefined, broadcast to all agents
  timestamp: number;
  type: 'question' | 'answer' | 'notification' | 'handoff' | 'result';
  content: string;
  metadata?: Record<string, any>;
}

export interface AgentDecision {
  id: string;
  agentType: AgentType;
  timestamp: number;
  decision: string;
  reasoning: string;
  affectedComponents: string[];
}

export interface AgentTask {
  id: string;
  assignedTo: AgentType;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  dependencies: string[]; // Task IDs this task depends on
  result?: string;
  artifacts?: string[]; // File paths created/modified
  createdAt: number;
  completedAt?: number;
}

export interface AgentState {
  type: AgentType;
  status: AgentStatus;
  currentTask?: AgentTask;
  progress: number; // 0-100
  message?: string;
  isActive: boolean;
}

export interface ProjectContext {
  id: string;
  userRequest: string;
  prd?: string; // Product Requirements Document from PM
  requirements?: RequirementAnalysis;
  techStack?: TechStack;
  architecture?: Architecture;
  chatId: string;
  createdAt: number;
  updatedAt: number;
}

export interface RequirementAnalysis {
  clarificationRound: number; // 1-3
  questions: string[];
  answers: Record<string, string>;
  isComplete: boolean;
  finalRequirements?: string;
}

export interface TechStack {
  frontend: string[];
  backend: string[];
  database: string[];
  deployment: string[];
  testing: string[];
  other: string[];
}

export interface Architecture {
  frontend?: {
    components: string[];
    routing: string;
    stateManagement: string;
    styling: string;
  };
  backend?: {
    framework: string;
    apiStructure: string;
    authentication: string;
    database: string;
  };
  deployment?: {
    platform: string[];
    containerization: string;
    cicd: string;
  };
}

export interface AgentConversation {
  id: string;
  projectId: string;
  messages: AgentMessage[];
  createdAt: number;
}

export interface AgentHandoff {
  id: string;
  from: AgentType;
  to: AgentType;
  timestamp: number;
  context: string;
  data: Record<string, any>;
}

export interface DigiCTORecommendation {
  id: string;
  category: 'immediate' | 'growth' | 'scale';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: string; // e.g., "2-3 hours"
  roi?: string;
  implementation?: string[];
  priority: number;
  approved?: boolean;
}

export interface QAReport {
  id: string;
  timestamp: number;
  testResults: {
    unit: { passed: number; failed: number };
    integration: { passed: number; failed: number };
    e2e: { passed: number; failed: number };
  };
  coverage: number;
  issues: QAIssue[];
  integrationChecks: IntegrationCheck[];
  overallStatus: 'production-ready' | 'needs-fixes' | 'critical-issues';
}

export interface QAIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  type: 'bug' | 'edge-case' | 'ux' | 'performance' | 'security';
  description: string;
  location?: string;
  recommendation?: string;
}

export interface IntegrationCheck {
  name: string;
  status: 'passed' | 'warning' | 'failed';
  details: string;
  recommendation?: string;
}

/**
 * Agent Identity Definitions
 */
export const AGENT_IDENTITIES: Record<AgentType, AgentIdentity> = {
  'project-manager': {
    type: 'project-manager',
    name: 'Alex PM',
    emoji: '🎯',
    color: '#3B82F6',
    role: 'Orchestrator & Strategist',
    personality: 'professional, organized, goal-oriented',
  },
  'requirement-analyst': {
    type: 'requirement-analyst',
    name: 'Sam Analyst',
    emoji: '📋',
    color: '#8B5CF6',
    role: 'Requirements Specialist',
    personality: 'inquisitive, detail-oriented, empathetic',
  },
  'frontend-dev': {
    type: 'frontend-dev',
    name: 'Jordan UI',
    emoji: '🎨',
    color: '#EC4899',
    role: 'Frontend Engineer',
    personality: 'creative, ux-focused, modern',
  },
  'backend-dev': {
    type: 'backend-dev',
    name: 'Taylor API',
    emoji: '⚙️',
    color: '#10B981',
    role: 'Backend Engineer',
    personality: 'pragmatic, security-conscious, performance-oriented',
  },
  'devops': {
    type: 'devops',
    name: 'Casey DevOps',
    emoji: '🚀',
    color: '#F59E0B',
    role: 'DevOps Engineer',
    personality: 'automation-focused, reliability-expert, efficient',
  },
  'qa': {
    type: 'qa',
    name: 'Morgan QA',
    emoji: '✅',
    color: '#06B6D4',
    role: 'Quality Assurance',
    personality: 'meticulous, detail-oriented, constructive',
  },
  'digi-cto': {
    type: 'digi-cto',
    name: 'Dr. Codist',
    emoji: '👔',
    color: '#EF4444',
    role: 'Digital CTO',
    personality: 'strategic, visionary, business-focused',
  },
};

/**
 * Agent Workflow Phases
 */
export const AGENT_WORKFLOW: Record<AgentPhase, AgentType[]> = {
  planning: ['project-manager', 'requirement-analyst'],
  development: ['frontend-dev', 'backend-dev', 'devops'],
  quality: ['qa'],
  strategy: ['digi-cto'],
};
