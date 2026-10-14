"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { SAMPLE_REQUESTS, TODAY, type WorkRequest } from "@/lib/data";
import type { ModuleKey } from "@/lib/modules";
import { RequestModal } from "@/components/modules/request-modal";

type NewRequest = Pick<WorkRequest, "module" | "title" | "dept" | "scheduledAt" | "urgent">;

type Ctx = {
  requests: WorkRequest[];
  addRequest: (r: NewRequest) => WorkRequest;
  openRequest: (module?: ModuleKey) => void;
};

const RequestsContext = createContext<Ctx | null>(null);

const PREFIX: Record<ModuleKey, string> = { ga: "GA", vehicle: "VH", meeting: "MR", seal: "SEAL" };

/**
 * 데모용 신청 저장소 — 브라우저 메모리에만 반영됩니다(새로고침 시 초기화).
 * 실서비스에서는 Supabase 등 서버 API 호출로 교체합니다.
 */
export function RequestsProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<WorkRequest[]>(SAMPLE_REQUESTS);
  const [modal, setModal] = useState<{ open: boolean; module?: ModuleKey }>({ open: false });

  const seqRef = useRef(0);

  const addRequest = useCallback((r: NewRequest) => {
    seqRef.current += 1;
    const created: WorkRequest = {
      ...r,
      id: `new-${Date.now()}`,
      no: `${PREFIX[r.module]}-202610-${String(900 + seqRef.current).padStart(4, "0")}`,
      requester: "홍길동",
      requestedAt: TODAY,
      status: r.module === "seal" ? "승인대기" : "접수",
    };
    setRequests((prev) => [created, ...prev]);
    return created;
  }, []);

  const openRequest = useCallback((module?: ModuleKey) => setModal({ open: true, module }), []);
  const closeRequest = useCallback(() => setModal({ open: false }), []);

  const value = useMemo(() => ({ requests, addRequest, openRequest }), [requests, addRequest, openRequest]);

  return (
    <RequestsContext.Provider value={value}>
      {children}
      <RequestModal
        open={modal.open}
        initialModule={modal.module}
        onClose={closeRequest}
        onSubmit={addRequest}
      />
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error("useRequests must be used within RequestsProvider");
  return ctx;
}
