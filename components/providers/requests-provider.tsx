"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { RequestModal } from "@/components/modules/request-modal";
import type { WorkRequest } from "@/lib/data";
import { MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { fromGa, fromMeeting, fromSeal, fromVehicle } from "@/lib/portal";
import { useDemo } from "./demo-store";

type Ctx = {
  /** 4개 모듈의 신청·예약을 공통 형식으로 합친 목록 (신청일 최신순) */
  requests: WorkRequest[];
  /** 모듈을 지정하면 해당 신청서로 이동, 지정하지 않으면 업무 선택 창 */
  openRequest: (module?: ModuleKey) => void;
};

const RequestsContext = createContext<Ctx | null>(null);

export function RequestsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ga, vehicles, meeting, seal } = useDemo();
  const [picker, setPicker] = useState(false);

  const requests = useMemo(
    () => [...ga.map(fromGa), ...vehicles.map(fromVehicle), ...fromMeeting(meeting), ...seal.map(fromSeal)].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    [ga, vehicles, meeting, seal],
  );

  const goModuleForm = useCallback((module: ModuleKey) => router.push(`${MODULE_MAP[module].href}?new=${Date.now()}`), [router]);
  const openRequest = useCallback((module?: ModuleKey) => (module ? goModuleForm(module) : setPicker(true)), [goModuleForm]);
  const close = useCallback(() => setPicker(false), []);
  const value = useMemo(() => ({ requests, openRequest }), [requests, openRequest]);

  return (
    <RequestsContext.Provider value={value}>
      {children}
      <RequestModal
        open={picker}
        onClose={close}
        onNavigate={(m) => {
          close();
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
