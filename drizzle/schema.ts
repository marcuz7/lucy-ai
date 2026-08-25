import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, index } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const lucyTwilioCredentials = mysqlTable("lucy_twilio_credentials", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("owner_user_id").notNull().unique(),
  accountSid: varchar("account_sid", { length: 64 }).notNull(),
  authTokenEncrypted: text("auth_token_encrypted").notNull(),
  phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
  allowedSenders: text("allowed_senders"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const lucyAndroidGatewayCredentials = mysqlTable("lucy_android_gateway_credentials", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("owner_user_id").notNull().unique(),
  apiUrl: varchar("api_url", { length: 1024 }).notNull(),
  usernameEncrypted: text("username_encrypted").notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  webhookTokenEncrypted: text("webhook_token_encrypted").notNull(),
  phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
  allowedSenders: text("allowed_senders"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const lucyTelnyxCredentials = mysqlTable("lucy_telnyx_credentials", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("owner_user_id").notNull().unique(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  publicKey: text("public_key").notNull(),
  phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
  allowedSenders: text("allowed_senders"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const lucyLlmCredentials = mysqlTable("lucy_llm_credentials", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("owner_user_id").notNull().unique(),
  provider: varchar("provider", { length: 32 }).notNull().default("openai-compatible"),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  baseUrl: varchar("base_url", { length: 512 }).notNull(),
  model: varchar("model", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const lucySearchCredentials = mysqlTable("lucy_search_credentials", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("owner_user_id").notNull().unique(),
  provider: varchar("provider", { length: 32 }).notNull().default("tavily"),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const lucyRedisCredentials = mysqlTable("lucy_redis_credentials", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("owner_user_id").notNull().unique(),
  redisUrlEncrypted: text("redis_url_encrypted").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const lucyConversationEvents = mysqlTable("lucy_conversation_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  chatId: varchar("chat_id", { length: 191 }).notNull(),
  messageId: varchar("message_id", { length: 191 }),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lucyMessages = mysqlTable("lucy_messages", {
  id: varchar("id", { length: 191 }).primaryKey(),
  channel: varchar("channel", { length: 32 }).notNull(),
  senderId: varchar("sender_id", { length: 191 }).notNull(),
  chatId: varchar("chat_id", { length: 191 }).notNull(),
  text: text("text").notNull(),
  mediaCount: int("media_count").default(0).notNull(),
  mediaJson: text("media_json"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

export const lucyAgentRuns = mysqlTable("lucy_agent_runs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  messageId: varchar("message_id", { length: 191 }).notNull().unique(),
  chatId: varchar("chat_id", { length: 191 }).notNull(),
  senderId: varchar("sender_id", { length: 191 }).notNull(),
  provider: varchar("provider", { length: 32 }).default("managed").notNull(),
  status: mysqlEnum("status", ["queued", "planning", "running", "awaiting_approval", "completed", "failed", "cancelled", "limit_reached"]).default("queued").notNull(),
  requestText: text("request_text").notNull(),
  resultText: text("result_text"),
  currentStep: int("current_step").default(0).notNull(),
  maxSteps: int("max_steps").default(6).notNull(),
  toolCallsUsed: int("tool_calls_used").default(0).notNull(),
  maxToolCalls: int("max_tool_calls").default(8).notNull(),
  costUnitsUsed: int("cost_units_used").default(0).notNull(),
  maxCostUnits: int("max_cost_units").default(20).notNull(),
  cancelRequestedAt: timestamp("cancel_requested_at"),
  progressSentAt: timestamp("progress_sent_at"),
  deadlineAt: timestamp("deadline_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => ({
  statusCreatedIdx: index("idx_lucy_agent_runs_status_created").on(table.status, table.createdAt),
  chatCreatedIdx: index("idx_lucy_agent_runs_chat_created").on(table.chatId, table.createdAt),
}));

export const lucyAgentToolCalls = mysqlTable("lucy_agent_tool_calls", {
  id: varchar("id", { length: 36 }).primaryKey(),
  runId: varchar("run_id", { length: 36 }).notNull(),
  sequence: int("sequence").notNull(),
  toolName: varchar("tool_name", { length: 64 }).notNull(),
  arguments: json("arguments").notNull(),
  status: mysqlEnum("status", ["requested", "running", "succeeded", "failed", "denied"]).default("requested").notNull(),
  output: text("output"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => ({
  runSequenceIdx: index("idx_lucy_agent_tool_calls_run_sequence").on(table.runId, table.sequence),
}));

export const lucyAgentApprovals = mysqlTable("lucy_agent_approvals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  runId: varchar("run_id", { length: 36 }).notNull(),
  toolCallId: varchar("tool_call_id", { length: 36 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "approved", "denied", "expired"]).default("pending").notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"),
} , table => ({
  runStatusIdx: index("idx_lucy_agent_approvals_run_status").on(table.runId, table.status),
}));

export const lucyJobs = mysqlTable("lucy_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  messageId: varchar("message_id", { length: 191 }).notNull().unique(),
  chatId: varchar("chat_id", { length: 191 }).notNull(),
  payload: json("payload").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "dead_letter"]).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
  availableAt: timestamp("available_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => ({
  statusAvailableIdx: index("idx_lucy_jobs_status_available").on(table.status, table.availableAt),
  chatCreatedIdx: index("idx_lucy_jobs_chat_created").on(table.chatId, table.createdAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LucyConversationEvent = typeof lucyConversationEvents.$inferSelect;
export type InsertLucyConversationEvent = typeof lucyConversationEvents.$inferInsert;
export type LucyMessage = typeof lucyMessages.$inferSelect;
export type InsertLucyMessage = typeof lucyMessages.$inferInsert;
export type LucyTwilioCredentials = typeof lucyTwilioCredentials.$inferSelect;
export type InsertLucyTwilioCredentials = typeof lucyTwilioCredentials.$inferInsert;
export type LucyAndroidGatewayCredentials = typeof lucyAndroidGatewayCredentials.$inferSelect;
export type InsertLucyAndroidGatewayCredentials = typeof lucyAndroidGatewayCredentials.$inferInsert;
export type LucyTelnyxCredentials = typeof lucyTelnyxCredentials.$inferSelect;
export type InsertLucyTelnyxCredentials = typeof lucyTelnyxCredentials.$inferInsert;
export type LucyLlmCredentials = typeof lucyLlmCredentials.$inferSelect;
export type InsertLucyLlmCredentials = typeof lucyLlmCredentials.$inferInsert;
export type LucySearchCredentials = typeof lucySearchCredentials.$inferSelect;
export type InsertLucySearchCredentials = typeof lucySearchCredentials.$inferInsert;
export type LucyRedisCredentials = typeof lucyRedisCredentials.$inferSelect;
export type InsertLucyRedisCredentials = typeof lucyRedisCredentials.$inferInsert;
export type LucyJob = typeof lucyJobs.$inferSelect;
export type InsertLucyJob = typeof lucyJobs.$inferInsert;
export type LucyAgentRun = typeof lucyAgentRuns.$inferSelect;
export type InsertLucyAgentRun = typeof lucyAgentRuns.$inferInsert;
export type LucyAgentToolCall = typeof lucyAgentToolCalls.$inferSelect;
export type InsertLucyAgentToolCall = typeof lucyAgentToolCalls.$inferInsert;
export type LucyAgentApproval = typeof lucyAgentApprovals.$inferSelect;
export type InsertLucyAgentApproval = typeof lucyAgentApprovals.$inferInsert;
