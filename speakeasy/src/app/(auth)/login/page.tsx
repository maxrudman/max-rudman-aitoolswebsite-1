import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/vocabulary");
  return <AuthForm mode="login" showDemo={process.env.SPEAKEASY_SHOW_DEMO !== "false"} />;
}
