"use client";

import { useEffect, useState } from "react";
import { INTRO_EXIT_EVENT } from "./intro";

/** 인트로가 걷히는 순간 바뀌는 key — 히어로 등장 모션을 사용자가 보는 시점에 다시 재생 */
export function useIntroReplayKey() {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const on = () => setKey((k) => k + 1);
    window.addEventListener(INTRO_EXIT_EVENT, on);
    return () => window.removeEventListener(INTRO_EXIT_EVENT, on);
  }, []);
  return key;
}
