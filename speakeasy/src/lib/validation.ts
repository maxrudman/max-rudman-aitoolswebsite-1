import { z } from "zod";

export const VOCAB_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;

const trimmed = (max: number, label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const usernameSchema = z
  .string({ error: "Username is required." })
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Use only letters, numbers, dots, dashes, and underscores.");

export const passwordSchema = z
  .string({ error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.");

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const preferencesSchema = z.object({
  level: z.enum(VOCAB_LEVELS, { error: "Choose a vocabulary level." }),
  field: trimmed(100, "Field"),
  audience: trimmed(100, "Audience"),
});
export type Preferences = z.infer<typeof preferencesSchema>;

export const gradeSchema = z.object({
  termId: z.string().min(1),
  correct: z.boolean(),
});

export const termIdSchema = z.object({ termId: z.string().min(1) });

export const practiceAudienceSchema = z.object({
  purpose: trimmed(200, "Purpose"),
  role: trimmed(200, "Role / subject"),
  specifications: z.string().trim().max(500, "Specifications must be 500 characters or fewer.").default(""),
  exclude: z.array(z.string().max(500)).max(200).default([]),
});
export type PracticeAudience = z.infer<typeof practiceAudienceSchema>;

export const journalEntrySchema = z.object({
  prompt: trimmed(1000, "Prompt"),
  response: z.string().trim().max(20000, "Response is too long.").default(""),
});

// ---- Shapes returned by Claude, validated before anything is saved ----

export const generatedTermSchema = z.object({
  term: z.string().trim().min(1).max(60),
  definition: z.string().trim().min(5).max(500),
  example: z.string().trim().min(5).max(500),
});
export const generatedTermsSchema = z.object({ terms: z.array(generatedTermSchema).min(1).max(40) });
export type GeneratedTerm = z.infer<typeof generatedTermSchema>;

export const generatedQuestionsSchema = z.object({
  questions: z.array(z.string().trim().min(5).max(500)).min(1).max(30),
});

/** Turn a ZodError into a single readable message plus per-field errors. */
export function formatZodError(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: error.issues[0]?.message ?? "Invalid input.", fieldErrors };
}

/** Normalize a word for duplicate checks: lowercase, trimmed, single spaces, no trailing punctuation. */
export function normalizeWord(word: string) {
  return word.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,;:!?]+$/, "");
}
