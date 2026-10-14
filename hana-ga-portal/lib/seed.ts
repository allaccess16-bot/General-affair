/**
 * 데모용 초기 데이터 — 기존 시스템의 테이블 구조와 동일한 필드를 사용합니다.
 * 실제 운영 데이터가 아니며, 오늘 날짜를 기준으로 생성됩니다.
 */
import type { GaRequest } from "@/lib/ga";
import { localIso, ROOMS, type MeetingReservation, type Room } from "@/lib/meeting";
import { addDays, todayStr } from "@/lib/shared";
import type { VehicleReservation } from "@/lib/vehicle";

const iso = (date: string, time = "09:00") => new Date(`${date}T${time}:00+09:00`).toISOString();

export function seedGa(today = todayStr()): GaRequest[] {
  const rows: [number, string, string, string, string, string, string, string, string, GaRequest["status"], string?, string?][] = [
    [0, "12층 회의실 12-3 프로젝터 램프 교체", "화면이 어둡고 깜빡입니다. 오후 회의 전 교체 부탁드립니다.", "김서윤", "ICT전략부", "내선 2231", "12층 회의실 12-3", "시설/비품", "긴급", "접수"],
    [0, "신규 입사자 사무용품 세트 지급 (5명)", "다음 주 월요일 입사자 5명분 기본 사무용품 세트 요청합니다.", "정유나", "경영지원부", "내선 1102", "13층 경영지원부", "시설/비품", "보통", "검토중", "송현우"],
    [-1, "출입증 재발급 요청", "출입증 분실로 재발급 요청드립니다.", "한지우", "손님지원센터", "내선 3310", "1층 안내데스크", "출입증/보안", "보통", "진행중", "장민준", "사진 접수 완료, 발급 대기 중입니다."],
    [-1, "좌석 이동 지원 (3석)", "조직 개편으로 3명 좌석 이동이 필요합니다.", "문태오", "상품부", "내선 2410", "12층 상품부", "좌석/이전", "보통", "접수"],
    [-2, "5층 탕비실 정수기 점검", "정수기에서 물이 새고 있습니다.", "장민준", "경영지원부", "내선 1105", "5층 탕비실", "시설/비품", "긴급", "완료", "장민준", "필터 교체 및 누수 조치 완료"],
    [-3, "법인 인감증명서 발급 요청", "은행 제출용 인감증명서 2부 요청드립니다.", "백승호", "재무기획부", "내선 1420", "본사", "문서/행정", "보통", "완료", "송현우", "2부 발급 후 전달 완료"],
    [-3, "복합기 토너 교체", "13층 복합기 토너 부족 알림이 떴습니다.", "오시우", "AI전략부", "내선 2550", "13층 복합기", "시설/비품", "낮음", "진행중", "김하늘"],
    [-5, "명함 제작 요청 (200매)", "직급 변경으로 명함 재제작 요청합니다.", "조아인", "영업기획부", "내선 3021", "-", "계약/구매", "보통", "반려", "송현우", "명함 신청 양식 누락 — 양식 첨부 후 재요청 부탁드립니다."],
    [-6, "건강검진 일정 안내 요청", "부서 단체 건강검진 일정 조율 요청드립니다.", "강예린", "리스크관리부", "내선 1880", "-", "복리후생", "낮음", "완료", "김하늘", "부서별 일정표 메일 발송"],
  ];
  return rows.map(([d, title, description, requester_name, department, contact, location, category, urgency, status, assignee, memo], i) => {
    const date = addDays(today, d);
    return {
      id: `ga-${i + 1}`,
      request_date: date,
      title,
      description,
      requester_name,
      department,
      contact,
      edit_password: "1234",
      location,
      category,
      urgency,
      status,
      assignee: assignee ?? null,
      admin_memo: memo ?? null,
      completed_at: status === "완료" ? iso(addDays(date, 1)) : null,
      created_at: iso(date, `${String(9 + (i % 7)).padStart(2, "0")}:12`),
      updated_at: iso(date, "15:00"),
    };
  });
}

export function seedVehicles(today = todayStr()): VehicleReservation[] {
  type Row = [string, number, string, number, string, string, string, string, string, string, VehicleReservation["status"], [number, number, number, number]?];
  const rows: Row[] = [
    ["191호8366", 0, "09:00", 0, "13:00", "최하준", "상품부", "고객사 방문", "판교 협력사", "내선 2412", "승인"],
    ["146호9979", 0, "13:30", 0, "16:00", "윤채원", "리스크관리부", "감독기관 서류 제출", "여의도 금융감독원", "내선 1882", "승인"],
    ["191호8367", 1, "08:30", 2, "18:00", "송현우", "경영지원부", "청라 연수원 행사 지원", "인천 청라", "내선 1103", "신청"],
    ["191호8366", 2, "10:00", 2, "12:00", "임서준", "GA사업부", "GA 지점 방문", "서울 강남구", "내선 3105", "신청"],
    ["146호9979", 3, "09:00", 3, "18:00", "서지아", "금융기관제휴사업부", "제휴 은행 미팅", "서울 중구", "내선 3220", "승인"],
    ["191호8366", -1, "09:00", -1, "17:30", "박지민", "재무기획부", "외부 감사 대응", "서울 종로구", "내선 1421", "사용완료", [48210, 48296, 32000, 6000]],
    ["191호8367", -2, "13:00", -2, "18:00", "한지우", "손님지원센터", "고객 방문 상담", "경기 부천", "내선 3311", "사용완료", [31540, 31612, 0, 4000]],
    ["146호9979", -3, "08:00", -3, "12:00", "강예린", "리스크관리부", "현장 점검", "경기 성남", "내선 1880", "사용완료", [22870, 22931, 25000, 0]],
    ["191호8366", -4, "14:00", -4, "16:00", "조아인", "영업기획부", "판촉물 수령", "서울 마포구", "내선 3021", "반려"],
  ];
  return rows.map(([vehicle_number, sd, st, ed, et, applicant, department, purpose, destination, contact, status, done], i) => {
    const start_date = addDays(today, sd);
    const end_date = addDays(today, ed);
    const [ob, oa, fuel, parking] = done ?? [];
    return {
      id: `vh-${i + 1}`,
      vehicle_name: "K5",
      vehicle_number,
      use_date: start_date,
      start_date,
      start_time: st,
      end_date,
      end_time: et,
      applicant,
      department,
      contact,
      driver: applicant,
      reservation_password: "1234",
      purpose,
      destination,
      status,
      complete_department: done ? department : null,
      complete_name: done ? applicant : null,
      odometer_before: ob ?? null,
      odometer_after: oa ?? null,
      total_distance: done ? oa! - ob! : null,
      fuel_cost: fuel ?? 0,
      parking_cost: parking ?? 0,
      etc_cost: 0,
      complete_memo: done ? "이상 없음" : null,
      completed_at: done ? iso(end_date, "18:10") : null,
      created_at: iso(addDays(start_date, -2), "10:00"),
      updated_at: iso(addDays(start_date, -1), "10:00"),
    };
  });
}

export const seedRooms = (): Room[] => ROOMS.map((r) => ({ ...r }));

/** 회의실 예약 — 오늘을 기준으로 과거·현재·미래 예약과 반복예약 1건 생성 */
export function seedMeeting(now = new Date()): { list: MeetingReservation[]; mine: { id: string; code: string }[] } {
  const today = todayStr(now);
  const created = now.toISOString();
  const list: MeetingReservation[] = [];
  const mine: { id: string; code: string }[] = [];
  let n = 0;
  const add = (room: string, date: string, s: string, e: string, title: string, name: string, dept: string, count: number, status: MeetingReservation["status"] = "reserved", extra: Partial<MeetingReservation> = {}) => {
    const id = `mr-${++n}`;
    const madeAt = new Date(Math.min(+new Date(localIso(addDays(date, -2), "10:00")), now.getTime())).toISOString();
    list.push({ id, room_id: room, title, organizer_name: name, department: dept, attendee_count: count, start_at: localIso(date, s), end_at: localIso(date, e), status, series_id: null, recurrence_label: null, created_at: madeAt, updated_at: madeAt, _code: `DEMO${String(n).padStart(4, "0")}`, ...extra });
    return id;
  };

  const plan: [string, number, string, string, string, string, string, number][] = [
    ["13-L", 0, "09:00", "11:00", "월간 경영회의", "김경영", "경영지원부", 24],
    ["13-L", 0, "14:00", "16:00", "분기 실적 보고", "이도현", "영업기획부", 20],
    ["13-4", 0, "10:00", "11:30", "상품 개발 리뷰", "문태오", "상품부", 10],
    ["13-4", 0, "15:00", "17:00", "리스크 위원회", "강예린", "리스크관리부", 9],
    ["12-3", 0, "09:30", "10:30", "주간 실무회의", "박지민", "재무기획부", 6],
    ["12-3", 0, "13:00", "14:30", "외부 감사 대응", "백승호", "재무기획부", 5],
    ["12-1", 0, "11:00", "12:00", "1:1 면담", "정유나", "경영지원부", 2],
    ["12-2", 0, "16:00", "17:00", "계약 검토", "임서준", "GA사업부", 3],
    ["13-1", 0, "10:00", "11:00", "민원 상담", "한지우", "손님지원센터", 3],
    ["13-2", 0, "14:00", "15:00", "고충 상담", "정유나", "경영지원부", 2],
    ["12-6", 1, "10:00", "12:00", "AI 과제 회의", "오시우", "AI전략부", 5],
    ["13-L", 1, "13:00", "18:00", "신입사원 교육", "정유나", "경영지원부", 28],
    ["13-4", 1, "09:00", "10:00", "투자 심사", "최하준", "투자심사부", 8],
    ["12-3", 2, "14:00", "16:00", "계리 검토", "서지아", "계리부", 7],
    ["13-3", 2, "10:00", "11:00", "QA 점검", "조아인", "계약심사부", 4],
    ["12-4", 3, "15:00", "16:00", "보안 점검", "윤채원", "정보보호지원팀", 3],
    ["13-L", -1, "10:00", "12:00", "임원 회의", "김경영", "경영지원부", 18],
    ["12-3", -1, "14:00", "15:00", "주간 실무회의", "박지민", "재무기획부", 6],
    ["13-4", -2, "13:00", "15:00", "상품 전략", "문태오", "상품부", 11],
  ];
  const nowMs = now.getTime();
  plan.forEach(([room, d, s, e, title, name, dept, count]) => {
    const date = addDays(today, d);
    const started = new Date(localIso(date, s)).getTime() <= nowMs;
    // 이미 시작한 예약은 입실확인을 마친 것으로 생성 (종료 시각이 지나면 sweep에서 사용 완료 처리)
    add(room, date, s, e, title, name, dept, count, started ? "checked_in" : "reserved", started ? { checked_in_at: localIso(date, s) } : {});
  });
  // 미입실 자동취소 예시 1건 (어제)
  add("12-4", addDays(today, -1), "16:00", "17:00", "협력사 미팅", "조아인", "영업기획부", 3, "no_show", { cancel_reason: "no_show" });

  // 지금 진행 중인 회의 (사용 중)
  const m = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(now).replace(":", ""));
  const hh = Math.floor(m / 100);
  if (hh >= 8 && hh < 19) {
    const s = `${String(hh).padStart(2, "0")}:00`;
    const e = `${String(hh + 1).padStart(2, "0")}:00`;
    add("12-5", today, s, e, "긴급 이슈 대응", "장민준", "경영지원부", 4, "checked_in", { checked_in_at: created });
    // 내 예약: 2분 전에 시작해 입실확인(10분 이내)이 가능한 단일 예약
    const hm = (t: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t));
    const id = add("13-5", today, hm(now.getTime() - 2 * 60000), hm(now.getTime() + 58 * 60000), "프로젝트 킥오프", "홍길동", "경영지원부", 4);
    mine.push({ id, code: list.find((r) => r.id === id)!._code });
  }

  // 내 단일 예약 (내일)
  const myId = add("12-1", addDays(today, 1), "15:00", "16:00", "총무 업무 점검", "홍길동", "경영지원부", 3);
  mine.push({ id: myId, code: list.find((r) => r.id === myId)!._code });

  // 반복예약: 매주 같은 요일 8회 (내 예약)
  const seriesId = "series-demo-1";
  const seriesCode = "SERIES01";
  const startDate = addDays(today, -14);
  const endDate = addDays(today, 35);
  for (let i = 0; i < 8; i++) {
    const date = addDays(startDate, i * 7);
    const id = add("12-6", date, "08:30", "09:00", "주간 스크럼 (반복)", "홍길동", "경영지원부", 5, "reserved", {
      series_id: seriesId,
      recurrence_label: `${startDate} ~ ${endDate}`,
      _code: seriesCode,
    });
    mine.push({ id, code: seriesCode });
  }
  return { list, mine };
}
