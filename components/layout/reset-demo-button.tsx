"use client";

import { RotateCcw } from "lucide-react";
import { useDemo } from "@/components/providers/demo-store";

export function ResetDemoButton() {
  const { resetDemo, notify } = useDemo();
  return (
    <button
      className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 font-semibold text-ink-2 hover:border-brand-200 hover:text-brand-700"
      onClick={() => {
        if (!confirm("이 브라우저에 저장된 데모 데이터를 처음 상태로 되돌릴까요?")) return;
        resetDemo();
        notify("데모 데이터를 초기화했습니다.");
      }}
    >
      <RotateCcw className="size-3" /> 데모 데이터 초기화
    </button>
  );
}
