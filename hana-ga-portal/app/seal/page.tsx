import type { Metadata } from "next";
import { Suspense } from "react";
import { ModulePage } from "@/components/modules/module-page";

export const metadata: Metadata = { title: "인장 날인 신청 및 관리 · HANA WORKS" };

export default function Page() {
  return (
    <Suspense>
      <ModulePage moduleKey="seal" />
    </Suspense>
  );
}
