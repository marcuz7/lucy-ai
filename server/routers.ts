import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getTwilioCredentialStatus, saveTwilioCredentials, testTwilioCredentials } from "./lucy/credentials";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  twilio: router({
    status: adminProcedure.query(({ ctx }) => getTwilioCredentialStatus(ctx.user.id)),
    test: adminProcedure.mutation(({ ctx }) => testTwilioCredentials(ctx.user.id)),
    save: adminProcedure.input(z.object({
      accountSid: z.string().min(10).max(64),
      authToken: z.string().min(8).max(256),
      phoneNumber: z.string().regex(/^\\+[1-9]\\d{7,14}$/, "Use E.164 format, for example +15551234567"),
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
