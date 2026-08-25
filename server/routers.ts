import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, isSuperAdminUser, publicProcedure, router, superAdminProcedure } from "./_core/trpc";
import { z } from "zod";
import { getAndroidGatewayCredentialStatus, getLlmCredentialStatus, getPublicTwilioLaunchNumber, getRedisCredentialStatus, getTavilyCredentialStatus, getTelnyxCredentialStatus, getTwilioCredentialStatus, isE164PhoneNumber, saveAndroidGatewayCredentials, saveLlmCredentials, saveRedisCredentials, saveTavilyCredentials, saveTelnyxCredentials, saveTwilioCredentials, testAndroidGatewayCredentials, testLlmCredentials, testRedisCredentials, testTavilyCredentials, testTelnyxCredentials, testTwilioCredentials } from "./lucy/credentials";
import { getAgentRuns, getDashboardSummary, getQueueJobs } from "./lucy/dashboard";
import { requestAgentRunCancellation } from "./lucy/agentPersistence";
import { getMessageDetail } from "./lucy/history";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? { ...opts.ctx.user, isSuperAdmin: isSuperAdminUser(opts.ctx.user) } : null),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  launch: router({
    number: publicProcedure.query(() => getPublicTwilioLaunchNumber()),
  }),

  dashboard: router({
    summary: adminProcedure.query(() => getDashboardSummary()),
    jobs: adminProcedure.query(() => getQueueJobs()),
    agentRuns: adminProcedure.query(() => getAgentRuns()),
    cancelAgentRun: adminProcedure.input(z.object({ runId: z.string().uuid() })).mutation(async ({ input }) => ({ accepted: await requestAgentRunCancellation(input.runId) })),
    messageDetail: adminProcedure.input(z.object({ messageId: z.string().min(1).max(191) })).query(({ input }) => getMessageDetail(input.messageId)),
  }),

  androidGateway: router({
    status: superAdminProcedure.query(({ ctx }) => getAndroidGatewayCredentialStatus(ctx.user.id)),
    test: superAdminProcedure.mutation(({ ctx }) => testAndroidGatewayCredentials(ctx.user.id)),
    save: superAdminProcedure.input(z.object({
      apiUrl: z.string().url().max(1024),
      username: z.string().min(1).max(512),
      password: z.string().min(1).max(512),
      webhookToken: z.string().min(8).max(512),
      phoneNumber: z.string().refine(isE164PhoneNumber, "Use E.164 format, for example +15551234567"),
      allowedSenders: z.array(z.string().refine(isE164PhoneNumber, "Use E.164 format, for example +15551234567")).min(1, "Add at least one allowlisted sender"),
    })).mutation(async ({ ctx, input }) => {
      await saveAndroidGatewayCredentials(ctx.user.id, input);
      return { success: true } as const;
    }),
  }),

  telnyx: router({
    status: superAdminProcedure.query(({ ctx }) => getTelnyxCredentialStatus(ctx.user.id)),
    test: superAdminProcedure.mutation(({ ctx }) => testTelnyxCredentials(ctx.user.id)),
    save: superAdminProcedure.input(z.object({
      apiKey: z.string().min(8).max(512),
      publicKey: z.string().min(16).max(2048),
      phoneNumber: z.string().refine(isE164PhoneNumber, "Use E.164 format, for example +15551234567"),
      allowedSenders: z.array(z.string().refine(isE164PhoneNumber, "Use E.164 format, for example +15551234567")).min(1, "Add at least one allowlisted sender"),
    })).mutation(async ({ ctx, input }) => {
      await saveTelnyxCredentials(ctx.user.id, input);
      return { success: true } as const;
    }),
  }),

  redis: router({
    status: superAdminProcedure.query(({ ctx }) => getRedisCredentialStatus(ctx.user.id)),
    test: superAdminProcedure.mutation(({ ctx }) => testRedisCredentials(ctx.user.id)),
    save: superAdminProcedure.input(z.object({ redisUrl: z.string().min(1).max(1024) })).mutation(async ({ ctx, input }) => {
      await saveRedisCredentials(ctx.user.id, input.redisUrl);
      return { success: true } as const;
    }),
  }),

  search: router({
    status: superAdminProcedure.query(({ ctx }) => getTavilyCredentialStatus(ctx.user.id)),
    test: superAdminProcedure.mutation(({ ctx }) => testTavilyCredentials(ctx.user.id)),
    save: superAdminProcedure.input(z.object({ apiKey: z.string().min(8).max(512) })).mutation(async ({ ctx, input }) => {
      await saveTavilyCredentials(ctx.user.id, input.apiKey);
      return { success: true } as const;
    }),
  }),

  llm: router({
    status: superAdminProcedure.query(({ ctx }) => getLlmCredentialStatus(ctx.user.id)),
    test: superAdminProcedure.mutation(({ ctx }) => testLlmCredentials(ctx.user.id)),
    save: superAdminProcedure.input(z.object({
      provider: z.string().min(1).max(32),
      apiKey: z.string().min(8).max(512),
      baseUrl: z.string().url().max(512),
      model: z.string().min(1).max(128),
    })).mutation(async ({ ctx, input }) => {
      await saveLlmCredentials(ctx.user.id, input);
      return { success: true } as const;
    }),
  }),

  twilio: router({
    status: superAdminProcedure.query(({ ctx }) => getTwilioCredentialStatus(ctx.user.id)),
    test: superAdminProcedure.mutation(({ ctx }) => testTwilioCredentials(ctx.user.id)),
    save: superAdminProcedure.input(z.object({
      accountSid: z.string().min(10).max(64),
      authToken: z.string().min(8).max(256),
      phoneNumber: z.string().refine(isE164PhoneNumber, "Use E.164 format, for example +15551234567"),
      allowedSenders: z.array(z.string().refine(isE164PhoneNumber, "Use E.164 format, for example +15551234567")).min(1, "Add at least one allowlisted sender"),
    })).mutation(async ({ ctx, input }) => {
      await saveTwilioCredentials(ctx.user.id, input);
      return { success: true } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
