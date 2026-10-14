import type { Metadata } from "next";
import { Suspense } from "react";
import { ModulePage } from "@/components/modules/module-page";

export const metadata: Metadata = { title: "총무 업무 지원 · HANA WORKS" };

export default function Page() {
  return (
    <Suspense>
      <ModulePage moduleKey="ga" />
    </Suspense>
  );
}
