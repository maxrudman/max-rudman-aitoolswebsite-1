import "server-only";
import type { GeneratedTerm, PracticeAudience } from "./validation";
import { normalizeWord } from "./validation";

/**
 * Offline stand-ins for Claude, used only when SPEAKEASY_MOCK_AI=true.
 * They let you demo and test every flow without an API key.
 */

const POOL: GeneratedTerm[] = [
  { term: "articulate", definition: "Able to express ideas clearly and effectively in speech or writing.", example: "She gave an articulate summary of the project's risks." },
  { term: "candid", definition: "Truthful and straightforward, even when the truth is uncomfortable.", example: "I'll be candid: the first launch didn't go as planned." },
  { term: "pragmatic", definition: "Dealing with problems in a sensible, realistic way rather than an idealistic one.", example: "We took a pragmatic approach and shipped the simplest fix first." },
  { term: "meticulous", definition: "Showing great attention to detail; very careful and precise.", example: "His meticulous notes made the handoff easy." },
  { term: "resilient", definition: "Able to recover quickly from setbacks or difficult conditions.", example: "The team stayed resilient through two rounds of budget cuts." },
  { term: "collaborate", definition: "To work jointly with others toward a shared goal.", example: "I collaborated with the design team to simplify the form." },
  { term: "initiative", definition: "The ability to act and make decisions without being told what to do.", example: "She took the initiative to rebuild the onboarding guide." },
  { term: "stakeholder", definition: "A person or group with an interest in, or affected by, a project or decision.", example: "We met with every stakeholder before changing the policy." },
  { term: "prioritize", definition: "To decide the order of importance of tasks and act on the most important first.", example: "I prioritized the client deliverable over internal reports." },
  { term: "facilitate", definition: "To make a process easier or help it move forward.", example: "I facilitated weekly check-ins between the two offices." },
  { term: "nuanced", definition: "Characterized by subtle distinctions or shades of meaning.", example: "The issue is more nuanced than a simple yes or no." },
  { term: "diligent", definition: "Showing steady, careful effort in one's work.", example: "Diligent research helped us catch the error early." },
  { term: "adaptable", definition: "Able to adjust to new conditions or demands.", example: "Being adaptable mattered when the timeline moved up a month." },
  { term: "concise", definition: "Giving a lot of information clearly in few words.", example: "Keep your answer concise and lead with the result." },
  { term: "leverage", definition: "To use something to maximum advantage.", example: "We leveraged existing data instead of running a new survey." },
  { term: "mitigate", definition: "To make something less severe, serious, or painful.", example: "We added a review step to mitigate the risk of errors." },
  { term: "synthesize", definition: "To combine separate pieces of information into a coherent whole.", example: "I synthesized feedback from forty interviews into three themes." },
  { term: "advocate", definition: "To publicly support or argue for a cause or person.", example: "I advocated for clearer guidelines for new volunteers." },
  { term: "accountable", definition: "Responsible for one's actions and expected to explain them.", example: "I hold myself accountable for meeting every deadline I set." },
  { term: "methodical", definition: "Done according to a careful, orderly, step-by-step procedure.", example: "A methodical review of the logs revealed the cause." },
  { term: "persuasive", definition: "Good at convincing someone to do or believe something.", example: "Her persuasive memo changed the committee's vote." },
  { term: "tenacious", definition: "Persistent and determined; not giving up easily.", example: "He was tenacious about tracking down the missing records." },
  { term: "discerning", definition: "Having or showing good judgment.", example: "A discerning reader will notice the gap in the argument." },
  { term: "cohesive", definition: "Forming a united, well-integrated whole.", example: "The new structure made the team far more cohesive." },
  { term: "benchmark", definition: "A standard or point of reference against which things can be compared.", example: "We used last year's results as a benchmark." },
  { term: "streamline", definition: "To make a process simpler or more efficient.", example: "I streamlined the intake form from four pages to one." },
  { term: "consensus", definition: "General agreement among a group.", example: "We reached consensus after hearing every concern." },
  { term: "delegate", definition: "To entrust a task or responsibility to another person.", example: "Learning to delegate freed me to focus on strategy." },
  { term: "empathetic", definition: "Showing an ability to understand and share the feelings of others.", example: "An empathetic response calmed the frustrated client." },
  { term: "foster", definition: "To encourage the development of something.", example: "We fostered a culture where questions were welcome." },
  { term: "integrity", definition: "The quality of being honest and having strong moral principles.", example: "Integrity means reporting the mistake even when no one would notice." },
  { term: "objective", definition: "Not influenced by personal feelings; based on facts.", example: "I tried to stay objective while reviewing both proposals." },
  { term: "proactive", definition: "Acting in advance to deal with an expected difficulty.", example: "Being proactive, I flagged the scheduling conflict a week early." },
  { term: "rapport", definition: "A close, harmonious relationship marked by mutual understanding.", example: "Building rapport with clients made hard conversations easier." },
  { term: "scrutinize", definition: "To examine or inspect closely and thoroughly.", example: "The committee scrutinized every line of the budget." },
  { term: "substantiate", definition: "To provide evidence to support or prove a claim.", example: "Can you substantiate that figure with a source?" },
  { term: "trajectory", definition: "The path or progression of development over time.", example: "My career trajectory has moved steadily toward policy work." },
  { term: "underscore", definition: "To emphasize or show the importance of something.", example: "The results underscore the need for better training." },
  { term: "versatile", definition: "Able to adapt to many different functions or activities.", example: "A versatile writer can switch between memos and speeches." },
  { term: "cultivate", definition: "To try to develop or improve a quality, skill, or relationship.", example: "I've cultivated relationships with local community leaders." },
  { term: "deliberate", definition: "Done consciously and intentionally; carefully considered.", example: "It was a deliberate choice to start with the smallest market." },
  { term: "elucidate", definition: "To make something clear; to explain.", example: "Let me elucidate the reasoning behind that decision." },
  { term: "feasible", definition: "Possible to do easily or conveniently.", example: "The plan is feasible within our current budget." },
  { term: "holistic", definition: "Considering the whole of something rather than just its parts.", example: "We took a holistic view of the student experience." },
  { term: "impartial", definition: "Treating all sides equally; fair and just.", example: "As moderator, I had to remain impartial." },
  { term: "judicious", definition: "Having, showing, or done with good judgment or sense.", example: "A judicious use of resources kept the event under budget." },
  { term: "liaison", definition: "A person who helps two groups communicate and work together.", example: "I served as the liaison between students and administrators." },
  { term: "paradigm", definition: "A typical model or framework of thinking.", example: "Remote work shifted the paradigm for team communication." },
  { term: "quantify", definition: "To express or measure the quantity of something.", example: "I like to quantify impact, such as hours saved per week." },
  { term: "rigorous", definition: "Extremely thorough, exhaustive, or accurate.", example: "Our rigorous testing caught problems before launch." },
  { term: "salient", definition: "Most noticeable or important.", example: "The salient point is that costs fell by twenty percent." },
  { term: "tangible", definition: "Real and concrete enough to be measured or perceived.", example: "The program produced tangible results within a semester." },
  { term: "unprecedented", definition: "Never done or known before.", example: "The turnout was unprecedented for a campus election." },
  { term: "validate", definition: "To check or prove the accuracy or worth of something.", example: "We validated the survey with a small pilot group." },
  { term: "articulate a vision", definition: "To clearly describe a desired future and how to reach it.", example: "A good leader can articulate a vision the whole team understands." },
  { term: "due diligence", definition: "Reasonable steps taken to investigate and avoid harm before a decision.", example: "We did our due diligence before signing the vendor." },
  { term: "root cause", definition: "The fundamental reason a problem occurs.", example: "We fixed the root cause instead of patching the symptom." },
  { term: "trade-off", definition: "A balance achieved between two desirable but incompatible features.", example: "There's a trade-off between speed and thoroughness here." },
  { term: "buy-in", definition: "Agreement and support for a plan from the people involved.", example: "Getting early buy-in from faculty made the rollout smooth." },
  { term: "bandwidth", definition: "The capacity, time, or energy available to take on work.", example: "I didn't have the bandwidth to lead both projects well." },
];

export function mockTerms(count: number, exclude: Set<string>): GeneratedTerm[] {
  const fresh = POOL.filter((t) => !exclude.has(normalizeWord(t.term)));
  const picked = fresh.slice(0, count);
  // Once the pool runs dry, invent numbered placeholder terms so flows keep working.
  for (let i = 1; picked.length < count; i++) {
    const term = `practice term ${exclude.size + i}`;
    if (exclude.has(term)) continue;
    picked.push({
      term,
      definition: "A placeholder term from offline demo mode (SPEAKEASY_MOCK_AI).",
      example: "Add an Anthropic API key to get real, tailored vocabulary.",
    });
  }
  return picked;
}

const QUESTION_TEMPLATES = [
  "Walk me through your background and why it prepares you to be a {role}.",
  "Why are you interested in working as a {role}?",
  "Tell me about a time you had to learn something quickly. How did you approach it?",
  "Describe a situation where you had to manage several deadlines at once.",
  "What would your previous supervisor say is your greatest strength?",
  "Tell me about a mistake you made and what you learned from it.",
  "How do you handle feedback you disagree with?",
  "Describe a time you had to explain a complex idea to someone without your background.",
  "What do you expect the hardest part of being a {role} to be?",
  "Tell me about a time you worked with a difficult teammate.",
  "How do you stay organized when details really matter?",
  "Give an example of a time you went beyond what was asked of you.",
  "Where do you see yourself in five years, and how does this role fit in?",
  "Tell me about a time you had to make a decision with incomplete information.",
  "What's something you've done that shows attention to detail?",
  "How would you handle a request from a senior colleague that you thought was a mistake?",
  "Describe a project you're proud of and your specific contribution.",
  "What questions do you have for us about the {role} position?",
  "Tell me about a time you had to persuade someone to see things your way.",
  "How do you keep confidential information secure in your day-to-day work?",
];

let questionCursor = 0;
export function mockQuestions(audience: PracticeAudience, count: number): string[] {
  const role = audience.role.trim() || "member of the team";
  const used = new Set(audience.exclude.map((q) => q.toLowerCase().trim()));
  const out: string[] = [];
  for (let i = 0; out.length < count && i < QUESTION_TEMPLATES.length * 3; i++) {
    const template = QUESTION_TEMPLATES[(questionCursor + i) % QUESTION_TEMPLATES.length];
    const round = Math.floor((questionCursor + i) / QUESTION_TEMPLATES.length);
    const q = template.replaceAll("{role}", role) + (round > 0 ? ` (follow-up ${round})` : "");
    if (!used.has(q.toLowerCase())) {
      used.add(q.toLowerCase());
      out.push(q);
    }
  }
  questionCursor += count;
  return out;
}
