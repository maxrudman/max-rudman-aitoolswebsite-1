import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  generatedQuestionsSchema,
  generatedTermsSchema,
  normalizeWord,
  type GeneratedTerm,
  type PracticeAudience,
  type Preferences,
} from "./validation";
import { mockQuestions, mockTerms } from "./mockAi";

/** An error safe to show the user, with a hint whether retrying could help. */
export class AIError extends Error {
  constructor(
    message: string,
    public status = 502,
    public retryable = true,
  ) {
    super(message);
    this.name = "AIError";
  }
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const useMock = () => process.env.SPEAKEASY_MOCK_AI === "true";

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AIError(
      "AI generation isn't set up yet. Add ANTHROPIC_API_KEY to .env.local (or set SPEAKEASY_MOCK_AI=true) and restart the server.",
      503,
      false,
    );
  }
  // 45s per attempt; the SDK retries rate limits, 5xx, and connection errors twice.
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 2 });
  return client;
}

/** Ask Claude for JSON matching `schema` and return the parsed (not yet validated) object. */
async function generateJson(system: string, prompt: string, schema: Record<string, unknown>): Promise<unknown> {
  let response;
  try {
    response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: prompt }],
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      // If the model declines a benign request, let the API retry on its recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (err) {
    throw toAIError(err);
  }

  if (response.stop_reason === "refusal") {
    throw new AIError("The AI declined this request. Try rewording your field or audience.", 422, false);
  }
  if (response.stop_reason === "max_tokens") {
    throw new AIError("The AI's response was cut off. Please try again.");
  }
  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  try {
    return JSON.parse(text);
  } catch {
    throw new AIError("The AI returned something we couldn't read. Please try again.");
  }
}

function toAIError(err: unknown): AIError {
  if (err instanceof AIError) return err;
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return new AIError("The AI took too long to respond. Please try again.", 504);
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AIError("We couldn't reach the AI service. Check your connection and try again.", 503);
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new AIError("The AI service rejected the API key. Check ANTHROPIC_API_KEY in .env.local.", 503, false);
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new AIError(`The AI model "${MODEL}" wasn't found. Check ANTHROPIC_MODEL in .env.local.`, 503, false);
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AIError("The AI service is busy right now. Wait a moment and try again.", 429);
  }
  if (err instanceof Anthropic.BadRequestError) {
    console.error("Claude API bad request:", err.message);
    return new AIError("The AI couldn't process this request. Please try again.", 502);
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`Claude API error ${err.status}:`, err.message);
    return new AIError("The AI service had a problem. Please try again in a moment.", 502);
  }
  console.error("Unexpected AI error:", err);
  return new AIError("Something went wrong while generating. Please try again.", 500);
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

const TERMS_JSON_SCHEMA = {
  type: "object",
  properties: {
    terms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string", description: "The word or short phrase" },
          definition: { type: "string", description: "A clear one-sentence definition" },
          example: { type: "string", description: "One natural example sentence using the term" },
        },
        required: ["term", "definition", "example"],
        additionalProperties: false,
      },
    },
  },
  required: ["terms"],
  additionalProperties: false,
};

/**
 * Generate `count` vocabulary terms tailored to the user's preferences.
 * `exclude` lists every term the user has ever had, so nothing repeats.
 */
export async function generateTerms(prefs: Preferences, count: number, exclude: string[]): Promise<GeneratedTerm[]> {
  const excluded = new Set(exclude.map(normalizeWord));
  let raw: unknown;

  if (useMock()) {
    raw = { terms: mockTerms(count, excluded) };
  } else {
    const avoid = exclude.slice(-400).join(", ") || "(none yet)";
    raw = await generateJson(
      "You create vocabulary lists that help people speak more precisely in professional settings. " +
        "Choose words and short phrases the person would genuinely use when talking with their audience, " +
        "pitched at their stated level. Definitions are one plain-English sentence. Example sentences sound " +
        "like something a person in that field would actually say aloud.",
      `Create ${count} vocabulary terms.\n\n` +
        `Vocabulary level: ${prefs.level}\nField: ${prefs.field}\nAudience: ${prefs.audience}\n\n` +
        `Do not include any of these terms or close variants of them: ${avoid}`,
      TERMS_JSON_SCHEMA,
    );
  }

  const parsed = generatedTermsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AIError("The AI returned vocabulary in an unexpected format. Please try again.");
  }
  // Drop duplicates (against history and within the batch) after validation.
  const out: GeneratedTerm[] = [];
  for (const t of parsed.data.terms) {
    const key = normalizeWord(t.term);
    if (!key || excluded.has(key)) continue;
    excluded.add(key);
    out.push(t);
  }
  return out.slice(0, count);
}

// ---------------------------------------------------------------------------
// Practice questions
// ---------------------------------------------------------------------------

const QUESTIONS_JSON_SCHEMA = {
  type: "object",
  properties: { questions: { type: "array", items: { type: "string" } } },
  required: ["questions"],
  additionalProperties: false,
};

export async function generateQuestions(audience: PracticeAudience, count = 10): Promise<string[]> {
  let raw: unknown;
  if (useMock()) {
    raw = { questions: mockQuestions(audience, count) };
  } else {
    const avoid = audience.exclude.length ? audience.exclude.map((q) => `- ${q}`).join("\n") : "(none yet)";
    raw = await generateJson(
      "You write realistic questions that someone might be asked aloud in interviews, presentations, and " +
        "professional conversations. Each question stands on its own, is answerable in one to three minutes " +
        "of speaking, and is phrased the way a real interviewer would say it.",
      `Write ${count} distinct questions for this situation.\n\n` +
        `Purpose: ${audience.purpose}\nRole / subject: ${audience.role}\n` +
        `Specifications: ${audience.specifications || "(none)"}\n\n` +
        `Vary the question types (behavioral, situational, motivational, role-specific). ` +
        `Do not repeat or closely paraphrase these questions:\n${avoid}`,
      QUESTIONS_JSON_SCHEMA,
    );
  }
  const parsed = generatedQuestionsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AIError("The AI returned questions in an unexpected format. Please try again.");
  }
  const seen = new Set(audience.exclude.map((q) => q.toLowerCase().trim()));
  const unique = parsed.data.questions.filter((q) => {
    const key = q.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length === 0) throw new AIError("The AI didn't come up with any new questions. Please try again.");
  return unique.slice(0, count);
}
