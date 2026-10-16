# SpeakEasy

Build your vocabulary and practice spoken answers to interview-style questions.

- **Vocabulary** – AI-generated terms tailored to your level, field, and audience, studied as flashcards with Leitner-style spaced repetition.
- **Practice** – AI-generated questions for a specific audience, plus a recorder with live transcription.
- **Journal** – Save, search, and edit your answers, with a bank of 82 common interview questions.
- **Account** – Sign up, log in, change your password, and edit vocabulary preferences.

Built with Next.js (App Router), TypeScript, Tailwind CSS, SQLite via Prisma, and the Anthropic Claude API.

## Setup

Requirements: Node.js 20.9 or newer.

```bash
cd speakeasy
npm install                      # also generates the Prisma client
cp .env.example .env.local       # then add your ANTHROPIC_API_KEY
npm run setup                    # create the database, apply migrations, seed the demo account
npm run dev                      # http://localhost:3000
```

For a production build: `npm run build && npm start`.

### Environment variables (`.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes, unless mock mode is on | Your Anthropic API key. Used only by server-side route handlers and never sent to the browser. |
| `ANTHROPIC_MODEL` | No | The Claude model for generation. Defaults to `claude-sonnet-5-5`. |
| `DATABASE_URL` | No | SQLite location. Defaults to `file:./dev.db`. |
| `SPEAKEASY_MOCK_AI` | No | Set to `true` to use built-in sample terms and questions instead of calling Claude. Useful for offline demos and testing. |
| `SPEAKEASY_SHOW_DEMO` | No | Set to `false` to hide the "Try the demo account" button on the login page. |

### Demo account

`npm run setup` (or `npm run db:seed`) creates a demo account with preferences, 16 vocabulary terms at different mastery levels, a saved practice audience, and two journal entries:

- **Username:** `demo`
- **Password:** `demo12345`

The login page also has a **Try the demo account** button. Re-running the seed resets the demo account.

### Database commands

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Create and apply a new migration after editing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply existing migrations |
| `npm run db:seed` | Recreate the demo account |
| `npm run db:reset` | Delete all data, re-apply migrations, and re-seed |

## How it works

### Vocabulary and spaced repetition

- **Onboarding:** On the first visit you answer three questions (level, field, audience). Claude then generates about 15 starting terms, each with a definition and an example sentence.
- **Flashcards:** Click or press <kbd>Space</kbd> to reveal a card. Then grade it with ✕ / <kbd>←</kbd> (wrong) or ✓ / <kbd>→</kbd> (right).
- **New terms:** The first time you see a term, you're asked whether to **Keep** or **Remove** it. Grading without choosing counts as Keep. Removed terms are remembered and never generated again.
- **Leitner boxes (0–5):**
  - A right answer moves a term up one box. A wrong answer sends it back to box 0, or to box 1 if it was in box 3 or higher.
  - Cards are picked at random, weighted by box. Box 0 is 16× as likely as box 4.
  - Reaching box 5 **retires** a term. About 1 card in 15 is a review of a retired term. Missing a review puts the term back into rotation.
- **Keeping the set full:** When the active set drops below 13 terms, the app generates replacements in the background to bring it back to 15. Claude is given every term you've ever had, and duplicates are also filtered on the server.
- **Preferences:** The gear button (or the Account page) changes level, field, and audience. Saving adds 10 new terms that match. Existing terms stay.

### Claude API

All AI calls go through `src/lib/ai.ts`, which runs only on the server:

- **Structured output:** Requests use structured JSON output (`output_config.format`), and every response is validated with Zod before anything is saved.
- **Error handling:**
  - Timeouts are 45 seconds, with 2 automatic retries.
  - Rate limits, authentication problems, an unknown model, refusals, and malformed output each map to a friendly message. The UI shows those messages with a **Try again** button.
- **Refusal fallback:** Requests opt into server-side refusal fallback (`fallbacks: "default"`). If the model declines a benign request, the API retries it on its recommended fallback model. On models that don't support fallbacks, the request simply runs as normal.

### Recording and transcription

- Audio is recorded with `MediaRecorder` and kept in memory as a blob URL. It is never uploaded or stored.
- Live transcription uses the browser's Web Speech API (`SpeechRecognition`) and runs at the same time as the recording. This works in Chrome, Edge, and Safari. In other browsers you can still record and replay, and type the transcript yourself.
- The transcript stays editable after you stop recording, so you can fix it before copying it or saving it to the Journal.

### Authentication and security

- **Passwords and sessions:**
  - Passwords are hashed with bcrypt (cost 12).
  - Sessions use a random token in an HTTP-only, SameSite=Lax cookie (Secure in production). Only a SHA-256 hash of the token is stored in the database.
- **Page and API protection:**
  - Every page except login and sign-up requires a session. API routes return 401 without one.
  - Each API route validates its input with Zod and requires a JSON body, which blocks cross-site form posts.
  - All queries are limited to the signed-in user's data.

## Project structure

```
prisma/
  schema.prisma        Data model: User, Session, Term, JournalEntry
  migrations/          SQL migrations
  seed.ts              Demo account
src/
  app/
    (auth)/            Login and sign-up pages
    (app)/             Signed-in pages: vocabulary, practice, journal, account
    api/               Route handlers (auth, preferences, vocab, questions, journal)
  components/          UI: flashcards, recorder, journal, dialogs, shared form controls
  data/questionBank.ts Hard-coded question bank (82 questions, 8 categories)
  lib/
    ai.ts              Claude API calls, validation, and error mapping
    mockAi.ts          Offline sample data for SPEAKEASY_MOCK_AI
    auth.ts            Password hashing and sessions
    vocab.ts           Leitner logic, card selection, and term generation
    validation.ts      Zod schemas for all input and AI output
```
