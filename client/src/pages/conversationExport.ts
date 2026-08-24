type ExportMessage = {
  channel: string;
  mediaCount: number;
  receivedAt: Date | number | string;
};

type ExportEvent = { role: string; text: string; createdAt: Date | number | string };
type ExportJob = { status: string; attempts: number; createdAt: Date | number | string; completedAt?: Date | number | string | null; lastError?: string | null };

export function redactText(value: string) {
  return value.replace(/[+\d][\d\s().-]{6,}/g, "[redacted]");
}

export function buildSafeConversationExport(message: ExportMessage, events: ExportEvent[], jobs: ExportJob[]) {
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
  };
}
