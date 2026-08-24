type ExportMessage = {
  channel: string;
  mediaCount: number;
  receivedAt: Date | number | string;
};

type ExportEvent = { role: string; text: string; createdAt: Date | number | string };
type ExportJob = { status: string; attempts: number; createdAt: Date | number | string; completedAt?: Date | number | string | null; lastError?: string | null };
type ExportAgent = { run: { provider: string; status: string; currentStep: number; maxSteps: number; createdAt: Date | number | string; completedAt?: Date | number | string | null; lastError?: string | null; resultText?: string | null }; toolCalls: Array<{ sequence: number; toolName: string; status: string; output?: string | null; error?: string | null }> };

export function redactText(value: string) {
  return value.replace(/[+\d][\d\s().-]{6,}/g, "[redacted]");
}

export function buildSafeConversationExport(message: ExportMessage, events: ExportEvent[], jobs: ExportJob[], agent: ExportAgent | null = null) {
  return {
    exportedAt: new Date().toISOString(),
    message: {
      channel: message.channel,
      mediaCount: message.mediaCount,
      receivedAt: message.receivedAt,
    },
    events: events.map(event => ({
      role: event.role,
      text: redactText(event.text),
      createdAt: event.createdAt,
    })),
    jobs: jobs.map(job => ({
      status: job.status,
      attempts: job.attempts,
      createdAt: job.createdAt,
      completedAt: job.completedAt ?? null,
      errorPresent: Boolean(job.lastError),
    })),
    agent: agent ? {
      provider: agent.run.provider,
      status: agent.run.status,
      currentStep: agent.run.currentStep,
      maxSteps: agent.run.maxSteps,
      createdAt: agent.run.createdAt,
      completedAt: agent.run.completedAt ?? null,
      errorPresent: Boolean(agent.run.lastError),
      result: agent.run.resultText ? redactText(agent.run.resultText) : null,
      toolCalls: agent.toolCalls.map(call => ({ sequence: call.sequence, toolName: call.toolName, status: call.status, output: call.output ? redactText(call.output) : null, errorPresent: Boolean(call.error) })),
    } : null,
  };
}
