"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { RequestModal } from "@/components/modules/request-modal";
import { SAMPLE_REQUESTS, TODAY, type WorkRequest } from "@/lib/data";
import { MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { fromGa, fromMeeting, fromVehicle } from "@/lib/portal";
import { useDemo } from "./demo-store";

type NewRequest = Pick<WorkRequest, "module" | "title" | "dept" | "scheduledAt" | "urgent">;

type Ctx = {
  /** 4개 모듈의 신청·예약을 공통 형식으로 합친 목록 (신청일 최신순) */
  requests: WorkRequest[];
  addRequest: (r: NewRequest) => WorkRequest;
  /** 총무·차량·회의실은 각 모듈의 실제 신청서로 이동, 인장은 공통 신청 모달 */
  openRequest: (module?: ModuleKey) => void;
};

const RequestsContext = createContext<Ctx | null>(null);

export function RequestsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ga, vehicles, meeting } = useDemo();
  const [seal, setSeal] = useState<WorkRequest[]>(SAMPLE_REQUESTS);
  const [modal, setModal] = useState<{ open: boolean; module?: ModuleKey }>({ open: false });
  const seqRef = useRef(0);

  const requests = useMemo(
    () => [...ga.map(fromGa), ...vehicles.map(fromVehicle), ...fromMeeting(meeting), ...seal].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    [ga, vehicles, meeting, seal],
  );

  // 인장 날인은 신규 모듈 — 데모 신청은 브라우저 메모리에만 반영
  const addRequest = useCallback((r: NewRequest) => {
    seqRef.current += 1;
    const created: WorkRequest = {
      ...r,
      id: `new-${Date.now()}`,
      no: `SEAL-202610-${String(900 + seqRef.current).padStart(4, "0")}`,
      requester: "홍길동",
      requestedAt: TODAY,
      status: "승인대기",
    };
    setSeal((prev) => [created, ...prev]);
    return created;
  }, []);

  const goModuleForm = useCallback((module: ModuleKey) => router.push(`${MODULE_MAP[module].href}?new=${Date.now()}`), [router]);

  const openRequest = useCallback(
    (module?: ModuleKey) => {
      if (module && module !== "seal") return goModuleForm(module);
      setModal({ open: true, module });
    },
    [goModuleForm],
  );
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
        onNavigate={(m) => {
          closeRequest();
          goModuleForm(m);
        }}
      />
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error("useRequests must be used within RequestsProvider");
  return ctx;
}
