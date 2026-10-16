import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { getCurrentUser, type CurrentUser } from "./auth";
import { formatZodError } from "./validation";
import { AIError } from "./ai";

export const json = <T>(data: T, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

/**
 * Read and validate a JSON body. Requiring application/json also blocks
 * cross-site form posts (they can't set this content type without CORS).
 */
export async function readJson<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ data: z.infer<S> } | { response: NextResponse }> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return { response: fail("Expected a JSON request.", 415) };
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { response: fail("The request body isn't valid JSON.") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const { error, fieldErrors } = formatZodError(parsed.error);
    return { response: fail(error, 400, { fieldErrors }) };
  }
  return { data: parsed.data };
}

type Handler<C> = (user: CurrentUser, req: Request, ctx: C) => Promise<Response>;

/** Wrap a route handler: require a session and turn thrown errors into friendly JSON. */
export function withUser<C = unknown>(handler: Handler<C>) {
  return async (req: Request, ctx: C) => {
    const user = await getCurrentUser();
    if (!user) return fail("Please log in to continue.", 401);
    try {
      return await handler(user, req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof AIError) {
    return fail(err.message, err.status, { retryable: err.retryable });
  }
  console.error(err);
  return fail("Something went wrong on our end. Please try again.", 500, { retryable: true });
}
