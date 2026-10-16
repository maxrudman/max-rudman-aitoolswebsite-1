// Seeds a demo account so you can try every page right away.
//   username: demo    password: demo12345
// Safe to re-run: the demo account is recreated from scratch each time.
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });
config();

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }) });

const TERMS: [string, string, string][] = [
  ["due diligence", "Careful investigation of facts before making a decision or signing an agreement.", "We completed due diligence on the vendor before recommending the contract."],
  ["precedent", "An earlier decision or event used as an example or rule for similar later cases.", "That ruling set a precedent the firm still cites today."],
  ["stipulate", "To specify a requirement clearly as part of an agreement.", "The lease stipulates that repairs over $500 need written approval."],
  ["mitigate", "To make something less severe or serious.", "I added a second review step to mitigate the risk of filing errors."],
  ["substantiate", "To provide evidence that proves something is true.", "Can you substantiate that claim with the original invoice?"],
  ["discretion", "The freedom to decide what should be done, or the quality of acting carefully with sensitive information.", "Clients trusted me because I handled their files with discretion."],
  ["meticulous", "Showing great attention to detail; very careful and precise.", "My meticulous notes made the case handoff seamless."],
  ["liaison", "A person who helps two groups communicate and work together.", "I served as the liaison between students and the dean's office."],
  ["concise", "Expressing a lot clearly in few words.", "Keep the summary concise; the partner reads it between meetings."],
  ["pragmatic", "Dealing with problems in a sensible, realistic way.", "We took a pragmatic approach and fixed the deadline issue first."],
  ["stakeholder", "A person or group with an interest in a decision or project.", "I met with each stakeholder before proposing the reform."],
  ["advocate", "To publicly support or argue for a cause, policy, or person.", "I advocated for clearer guidelines for new delegates."],
  ["compliance", "The act of following rules, laws, or standards.", "The checklist keeps every filing in compliance with court rules."],
  ["articulate", "Able to express ideas clearly and effectively.", "She gave an articulate explanation of a complicated statute."],
  ["impartial", "Treating all sides fairly; not biased.", "As moderator, I had to stay impartial during the debate."],
];

async function main() {
  await prisma.user.deleteMany({ where: { username: "demo" } });
  const user = await prisma.user.create({
    data: {
      username: "demo",
      passwordHash: await bcrypt.hash("demo12345", 12),
      vocabLevel: "Advanced",
      vocabField: "corporate law",
      vocabAudience: "hiring managers",
      onboarded: true,
      practicePurpose: "Job interview for a college senior",
      practiceRole: "Paralegal at a corporate firm",
      practiceSpecs: "Medium difficulty; focus on how my background is relevant to the job",
    },
  });

  // A few terms already partway through the Leitner boxes, so the stats line has something to show.
  const boxes = [0, 0, 0, 1, 1, 2, 2, 3, 0, 0, 1, 0, 4, 0, 0];
  await prisma.term.createMany({
    data: TERMS.map(([word, definition, example], i) => ({
      userId: user.id,
      word,
      wordKey: word.toLowerCase(),
      definition,
      example,
      box: boxes[i],
      seen: boxes[i] > 0,
    })),
  });
  // One mastered (retired) term to show the review flow.
  await prisma.term.create({
    data: {
      userId: user.id,
      word: "fiduciary",
      wordKey: "fiduciary",
      definition: "Involving a legal duty to act in another person's best interest.",
      example: "Trustees have a fiduciary duty to the beneficiaries.",
      box: 5,
      retired: true,
      seen: true,
    },
  });

  await prisma.journalEntry.createMany({
    data: [
      {
        userId: user.id,
        prompt: "Tell me about a time you struggled.",
        response:
          "During my first semester leading a committee, I tried to do everything myself and fell behind. I learned to delegate by matching tasks to people's strengths, and we finished the report a week early.",
        createdAt: new Date(Date.now() - 3 * 86400000),
      },
      {
        userId: user.id,
        prompt: "Why are you interested in working as a paralegal at a corporate firm?",
        response:
          "I like work where details matter and where clear writing helps people make good decisions. A corporate paralegal role lets me build those skills while learning how the law works in practice before law school.",
        createdAt: new Date(Date.now() - 86400000),
      },
    ],
  });
  console.log("Seeded demo account → username: demo, password: demo12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
