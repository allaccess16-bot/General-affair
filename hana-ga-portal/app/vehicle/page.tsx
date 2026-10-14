import type { Metadata } from "next";
import { Suspense } from "react";
import { VehicleApp } from "@/components/vehicle/vehicle-app";

export const metadata: Metadata = { title: "법인차량 이용 · HANA WORKS" };

export default function Page() {
  return (
    <Suspense>
      <VehicleApp />
    </Suspense>
  );
}
