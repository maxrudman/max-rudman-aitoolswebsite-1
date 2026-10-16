import type { Metadata } from "next";
import { AccountClient } from "@/components/AccountClient";
import { requireUser } from "@/lib/auth";
import { getPreferences } from "@/lib/vocab";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return <AccountClient username={user.username} preferences={await getPreferences(user.id)} />;
}
