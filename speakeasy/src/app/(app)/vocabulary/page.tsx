import type { Metadata } from "next";
import { VocabularyClient } from "@/components/VocabularyClient";

export const metadata: Metadata = { title: "Vocabulary" };

export default function VocabularyPage() {
  return <VocabularyClient />;
}
