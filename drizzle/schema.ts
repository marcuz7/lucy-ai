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
export type LucyJob = typeof lucyJobs.$inferSelect;
export type InsertLucyJob = typeof lucyJobs.$inferInsert;
