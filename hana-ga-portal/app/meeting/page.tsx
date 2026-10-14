import type { Metadata } from "next";
import { Suspense } from "react";
import { MeetingApp } from "@/components/meeting/meeting-app";

export const metadata: Metadata = { title: "회의실 예약 · HANA WORKS" };

export default function Page() {
  return (
    <Suspense>
      <MeetingApp />
    </Suspense>
  );
}
