/** 웰컴 인트로가 걷히기 시작할 때 보내는 신호 */
export const INTRO_EXIT_EVENT = "hw:intro-exit";
export const INTRO_SEEN_KEY = "hw-intro-seen";

/**
 * <head>에서 첫 페인트 전에 실행 — 홈 첫 방문(세션당 1회)일 때만 인트로 재생.
 * 모션 줄이기 설정 사용자는 인트로를 건너뜀.
 */
export const INTRO_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{var play=location.pathname==='/'&&!sessionStorage.getItem('${INTRO_SEEN_KEY}')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;d.dataset.intro=play?'play':'skip'}catch(e){d.dataset.intro='skip'}})();`;
