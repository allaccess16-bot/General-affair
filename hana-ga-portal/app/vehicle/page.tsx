import type { Metadata } from "next";
import { Suspense } from "react";
import { ModulePage } from "@/components/modules/module-page";

export const metadata: Metadata = { title: "법인차량 이용 · HANA WORKS" };

export default function Page() {
  return (
    <Suspense>
      <ModulePage moduleKey="vehicle" />
    </Suspense>
  );
}
