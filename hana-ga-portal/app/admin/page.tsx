import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCenter } from "@/components/admin/admin-center";

export const metadata: Metadata = { title: "통합 관리자 센터 · HANA WORKS" };

export default function Page() {
  return (
    <Suspense>
      <AdminCenter />
    </Suspense>
  );
}
