import type { Metadata } from "next";
import { Suspense } from "react";
import { SealApp } from "@/components/seal/seal-app";

export const metadata: Metadata = { title: "인장 날인 신청 및 관리 · HANA WORKS" };

export default function Page() {
  return (
    <Suspense>
      <SealApp />
    </Suspense>
  );
}
