import { useStore } from '@nanostores/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  agentStatesStore,
  currentPhaseStore,
  projectContextStore,
  tasksStore,
  handoffsStore,
  qaReportStore,
  ctoRecommendationsStore,
  showAgentDashboardStore,
} from '~/lib/stores/agents';
import { AGENT_IDENTITIES, type AgentType, type AgentHandoff, type AgentTask } from '~/types/agents';
import { memo, useState } from 'react';
import { IconButton } from '~/components/ui/IconButton';

/**
 * Project Dashboard - Comprehensive view of agent activities
 */
export const ProjectDashboard = memo(() => {
  const showDashboard = useStore(showAgentDashboardStore);
  const projectContext = useStore(projectContextStore);
  const currentPhase = useStore(currentPhaseStore);
  const tasks = useStore(tasksStore);
  const handoffs = useStore(handoffsStore);
  const qaReport = useStore(qaReportStore);
  const ctoRecommendations = useStore(ctoRecommendationsStore);
  const agentStates = useStore(agentStatesStore);

  const [activeTab, setActiveTab] = useState<'timeline' | 'tasks' | 'insights'>('timeline');

  if (!showDashboard || !projectContext) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 bottom-0 w-[400px] bg-bolt-elements-background-depth-2 border-l border-bolt-elements-borderColor shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-bolt-elements-borderColor bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
              🚀
            </div>
            <div>
              <h2 className="text-lg font-bold text-bolt-elements-textPrimary">Project Dashboard</h2>
              <p className="text-xs text-bolt-elements-textSecondary">Real-time agent activity</p>
            </div>
          </div>
          <IconButton
            icon="i-ph:x"
            onClick={() => showAgentDashboardStore.set(false)}
            className="hover:bg-bolt-elements-background-depth-3"
          />
        </div>

        {/* Phase Indicator */}
        <PhaseProgress phase={currentPhase} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-1">
        <TabButton
          active={activeTab === 'timeline'}
          onClick={() => setActiveTab('timeline')}
          icon="i-ph:timeline"
          label="Timeline"
        />
        <TabButton
          active={activeTab === 'tasks'}
          onClick={() => setActiveTab('tasks')}
          icon="i-ph:list-checks"
          label="Tasks"
        />
        <TabButton
          active={activeTab === 'insights'}
          onClick={() => setActiveTab('insights')}
          icon="i-ph:lightbulb"
          label="Insights"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'timeline' && <TimelineView key="timeline" handoffs={handoffs} agentStates={agentStates} />}
          {activeTab === 'tasks' && <TasksView key="tasks" tasks={Object.values(tasks)} />}
          {activeTab === 'insights' && (
            <InsightsView key="insights" qaReport={qaReport} recommendations={ctoRecommendations} />
          )}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <DashboardFooter tasks={Object.values(tasks)} handoffs={handoffs} />
    </motion.div>
  );
});

/**
 * Phase Progress Indicator
 */
const PhaseProgress = memo(({ phase }: { phase: string }) => {
  const phases = [
    { id: 'planning', label: 'Planning', color: '#8B5CF6' },
    { id: 'development', label: 'Development', color: '#10B981' },
    { id: 'quality', label: 'Quality', color: '#06B6D4' },
    { id: 'strategy', label: 'Strategy', color: '#EF4444' },
  ];

  const currentIndex = phases.findIndex((p) => p.id === phase);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        {phases.map((p, index) => (
          <div key={p.id} className="flex flex-col items-center flex-1">
            <div
              className={`h-2 w-2 rounded-full transition-all ${
                index <= currentIndex ? 'scale-100 opacity-100' : 'scale-75 opacity-30'
              }`}
              style={{ backgroundColor: index <= currentIndex ? p.color : '#666' }}
            />
            <span
              className={`text-xs mt-1 transition-opacity ${
                index === currentIndex ? 'opacity-100 font-semibold' : 'opacity-50'
              }`}
              style={{ color: index === currentIndex ? p.color : 'inherit' }}
            >
              {p.label}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1 bg-bolt-elements-background-depth-3 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentIndex + 1) / phases.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
});

/**
 * Tab Button
 */
const TabButton = memo(
  ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 transition-all ${
        active
          ? 'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-b-2 border-blue-500'
          : 'text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-2'
      }`}
    >
      <div className={icon} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  ),
);

/**
 * Timeline View - Shows agent handoffs and activities
 */
const TimelineView = memo(({ handoffs, agentStates: _agentStates }: { handoffs: any[]; agentStates: Record<AgentType, any> }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <h3 className="text-sm font-semibold text-bolt-elements-textPrimary mb-4">Agent Activity Timeline</h3>

      {handoffs.length === 0 ? (
        <div className="text-center py-8 text-bolt-elements-textSecondary">
          <div className="i-ph:timeline text-4xl mb-2 opacity-50" />
          <p className="text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-bolt-elements-borderColor" />

          {/* Handoff items */}
          {handoffs.map((handoff: AgentHandoff, index) => {
            const fromIdentity = AGENT_IDENTITIES[handoff.from];
            const toIdentity = AGENT_IDENTITIES[handoff.to];

            return (
              <motion.div
                key={handoff.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-12 pb-6"
              >
                {/* Timeline dot */}
                <div
                  className="absolute left-3 top-2 h-3 w-3 rounded-full border-2 border-bolt-elements-background-depth-2"
                  style={{ backgroundColor: fromIdentity.color }}
                />

                <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3 border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{fromIdentity.emoji}</span>
                    <div className="i-ph:arrow-right text-xs text-bolt-elements-textSecondary" />
                    <span className="text-lg">{toIdentity.emoji}</span>
                    <span className="text-xs text-bolt-elements-textSecondary ml-auto">
                      {new Date(handoff.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-bolt-elements-textPrimary font-medium">
                    {fromIdentity.name} → {toIdentity.name}
                  </p>
                  <p className="text-xs text-bolt-elements-textSecondary mt-1">{handoff.context}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
});

/**
 * Tasks View - Shows all tasks and their status
 */
const TasksView = memo(({ tasks }: { tasks: any[] }) => {
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in-progress');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-bolt-elements-textPrimary">Tasks</h3>
        <div className="text-xs text-bolt-elements-textSecondary">
          {completedTasks.length}/{tasks.length} completed
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-bolt-elements-textSecondary">
          <div className="i-ph:list-checks text-4xl mb-2 opacity-50" />
          <p className="text-sm">No tasks yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending tasks */}
          {pendingTasks.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-bolt-elements-textSecondary mb-2">In Progress</h4>
              {pendingTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-bolt-elements-textSecondary mb-2">Completed</h4>
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
});

/**
 * Task Card
 */
const TaskCard = memo(({ task }: { task: AgentTask }) => {
  const identity = AGENT_IDENTITIES[task.assignedTo];

  return (
    <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3 border border-bolt-elements-borderColor mb-2">
      <div className="flex items-start gap-2">
        <div
          className={`mt-0.5 ${
            task.status === 'completed'
              ? 'i-ph:check-circle-fill text-green-500'
              : task.status === 'in-progress'
                ? 'i-ph:spinner text-blue-500 animate-spin'
                : 'i-ph:circle text-bolt-elements-textSecondary'
          }`}
        />
        <div className="flex-1">
          <p
            className={`text-sm ${
              task.status === 'completed'
                ? 'line-through text-bolt-elements-textSecondary'
                : 'text-bolt-elements-textPrimary'
            }`}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: identity.color }}>
              {identity.emoji} {identity.name}
            </span>
            {task.completedAt && (
              <span className="text-xs text-bolt-elements-textSecondary">
                • Completed {new Date(task.completedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Insights View - Shows QA report and CTO recommendations
 */
const InsightsView = memo(({ qaReport, recommendations }: { qaReport: any; recommendations: any[] }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <h3 className="text-sm font-semibold text-bolt-elements-textPrimary mb-4">Strategic Insights</h3>

      {/* QA Report */}
      {qaReport && (
        <div className="bg-bolt-elements-background-depth-1 rounded-lg p-4 border border-bolt-elements-borderColor">
          <div className="flex items-center gap-2 mb-3">
            <div className="i-ph:check-circle text-lg text-green-500" />
            <h4 className="text-sm font-semibold text-bolt-elements-textPrimary">Quality Report</h4>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-bolt-elements-textSecondary">Code Coverage</span>
              <span className="text-bolt-elements-textPrimary font-medium">{qaReport.coverage}%</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-bolt-elements-background-depth-2 rounded p-2 text-center">
                <div className="text-lg font-bold text-green-500">{qaReport.testResults.unit.passed}</div>
                <div className="text-xs text-bolt-elements-textSecondary">Unit Tests</div>
              </div>
              <div className="bg-bolt-elements-background-depth-2 rounded p-2 text-center">
                <div className="text-lg font-bold text-green-500">{qaReport.testResults.integration.passed}</div>
                <div className="text-xs text-bolt-elements-textSecondary">Integration</div>
              </div>
              <div className="bg-bolt-elements-background-depth-2 rounded p-2 text-center">
                <div className="text-lg font-bold text-green-500">{qaReport.testResults.e2e.passed}</div>
                <div className="text-xs text-bolt-elements-textSecondary">E2E Tests</div>
              </div>
            </div>

            <div className="pt-2 border-t border-bolt-elements-borderColor">
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  qaReport.overallStatus === 'production-ready'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-yellow-500/10 text-yellow-500'
                }`}
              >
                <div className="i-ph:check-circle-fill" />
                {qaReport.overallStatus === 'production-ready' ? 'Production Ready' : 'Needs Fixes'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CTO Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="i-ph:lightbulb text-lg text-yellow-500" />
            <h4 className="text-sm font-semibold text-bolt-elements-textPrimary">CTO Recommendations</h4>
          </div>

          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-bolt-elements-background-depth-1 rounded-lg p-3 border border-bolt-elements-borderColor hover:border-blue-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="text-sm font-medium text-bolt-elements-textPrimary">{rec.title}</h5>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      rec.impact === 'high'
                        ? 'bg-red-500/10 text-red-500'
                        : rec.impact === 'medium'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {rec.impact} impact
                  </span>
                </div>
                <p className="text-xs text-bolt-elements-textSecondary mb-2">{rec.description.slice(0, 100)}...</p>
                <div className="flex items-center gap-4 text-xs text-bolt-elements-textSecondary">
                  <span>⏱️ {rec.effort}</span>
                  {rec.roi && <span>📈 {rec.roi}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!qaReport && recommendations.length === 0 && (
        <div className="text-center py-8 text-bolt-elements-textSecondary">
          <div className="i-ph:lightbulb text-4xl mb-2 opacity-50" />
          <p className="text-sm">Insights will appear here after analysis</p>
        </div>
      )}
    </motion.div>
  );
});

/**
 * Dashboard Footer - Stats summary
 */
const DashboardFooter = memo(({ tasks, handoffs }: { tasks: any[]; handoffs: any[] }) => {
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="p-4 border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-1">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-bolt-elements-textPrimary">{tasks.length}</div>
          <div className="text-xs text-bolt-elements-textSecondary">Total Tasks</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-500">{completedTasks}</div>
          <div className="text-xs text-bolt-elements-textSecondary">Completed</div>
        </div>
        <div>
          <div className="text-lg font-bold text-blue-500">{handoffs.length}</div>
          <div className="text-xs text-bolt-elements-textSecondary">Handoffs</div>
        </div>
      </div>
    </div>
  );
});
