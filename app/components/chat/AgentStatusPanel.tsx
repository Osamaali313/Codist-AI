import { useStore } from '@nanostores/react';
import { motion, AnimatePresence } from 'framer-motion';
import { agentStatesStore, currentPhaseStore, showAgentStatusStore } from '~/lib/stores/agents';
import { AGENT_IDENTITIES, type AgentType, type AgentPhase } from '~/types/agents';
import { memo } from 'react';

/**
 * Agent Status Panel - Shows active agents and their progress
 */
export const AgentStatusPanel = memo(() => {
  const agentStates = useStore(agentStatesStore);
  const currentPhase = useStore(currentPhaseStore);
  const showStatus = useStore(showAgentStatusStore);

  if (!showStatus) {
    return null;
  }

  // Get active agents
  const activeAgents = Object.values(agentStates).filter((agent) => agent.isActive);

  if (activeAgents.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 shadow-lg backdrop-blur-sm"
      >
        {/* Header */}
        <div className="border-b border-bolt-elements-borderColor p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <h3 className="text-sm font-semibold text-bolt-elements-textPrimary">Agent Team Active</h3>
            </div>
            <PhaseIndicator phase={currentPhase} />
          </div>
        </div>

        {/* Active Agents */}
        <div className="max-h-96 overflow-y-auto p-2">
          <AnimatePresence mode="popLayout">
            {activeAgents.map((agent) => (
              <AgentCard key={agent.type} agent={agent} />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
});

/**
 * Individual Agent Card
 */
interface AgentCardProps {
  agent: {
    type: AgentType;
    status: string;
    progress: number;
    message?: string;
  };
}

const AgentCard = memo(({ agent }: AgentCardProps) => {
  const identity = AGENT_IDENTITIES[agent.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="mb-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 p-3 transition-all hover:border-bolt-elements-borderColorActive"
    >
      <div className="flex items-start gap-3">
        {/* Agent Avatar */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl"
          style={{ backgroundColor: `${identity.color}20`, color: identity.color }}
        >
          {identity.emoji}
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-bolt-elements-textPrimary truncate">{identity.name}</h4>
            <StatusBadge status={agent.status} />
          </div>

          <p className="text-xs text-bolt-elements-textSecondary mt-1">{identity.role}</p>

          {agent.message && <p className="text-xs text-bolt-elements-textSecondary mt-2 italic">{agent.message}</p>}

          {/* Progress Bar */}
          {agent.progress > 0 && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bolt-elements-background-depth-2">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: identity.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${agent.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

/**
 * Status Badge
 */
const StatusBadge = memo(({ status }: { status: string }) => {
  const statusConfig = {
    idle: { label: 'Idle', color: 'gray' },
    thinking: { label: 'Thinking', color: 'blue' },
    working: { label: 'Working', color: 'green' },
    waiting: { label: 'Waiting', color: 'yellow' },
    completed: { label: 'Done', color: 'green' },
    error: { label: 'Error', color: 'red' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.idle;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-${config.color}-500/10 text-${config.color}-500`}
    >
      {status === 'working' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {config.label}
    </span>
  );
});

/**
 * Phase Indicator
 */
const PhaseIndicator = memo(({ phase }: { phase: AgentPhase }) => {
  const phaseConfig: Record<AgentPhase, { label: string; color: string }> = {
    planning: { label: 'Planning', color: '#8B5CF6' },
    development: { label: 'Development', color: '#10B981' },
    quality: { label: 'Quality Check', color: '#06B6D4' },
    strategy: { label: 'Strategy', color: '#EF4444' },
  };

  const config = phaseConfig[phase];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-bolt-elements-textSecondary">{config.label}</span>
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
    </div>
  );
});
