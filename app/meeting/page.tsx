import type { Metadata } from "next";
import { Suspense } from "react";
import { ModulePage } from "@/components/modules/module-page";

export const metadata: Metadata = { title: "회의실 예약 · HANA WORKS" };

export default function Page() {
  return (
    <Suspense>
      <ModulePage moduleKey="meeting" />
    </Suspense>
  );
}
