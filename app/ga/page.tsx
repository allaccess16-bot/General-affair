import type { Metadata } from "next";
import { Suspense } from "react";
import { GaApp } from "@/components/ga/ga-app";

export const metadata: Metadata = { title: "총무 업무 지원 · HANA WORKS" };

export default function Page() {
  return (
    <Suspense>
      <GaApp />
    </Suspense>
  );
}
