import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Entrar" };
export const instant = false;

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<LoginForm next="/admin" />}>
      <LoginWithNext searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginWithNext({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={next ?? "/admin"} />;
}
