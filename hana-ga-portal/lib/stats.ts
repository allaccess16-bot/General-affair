import { isActive, MEETING_CONFIG, seoulParts, toMinute, type MeetingReservation, type Room } from "@/lib/meeting";
import { VEHICLES, type VehicleReservation } from "@/lib/vehicle";

/** 회의실별 선택일 업무시간(08–20시) 대비 예약률 */
export function roomUtilization(list: MeetingReservation[], rooms: Room[], date: string) {
  const ds = toMinute(MEETING_CONFIG.businessStart);
  const de = toMinute(MEETING_CONFIG.businessEnd);
  return rooms
    .map((room) => {
      const booked = list
        .filter((r) => r.room_id === room.id && (isActive(r) || r.status === "completed"))
        .map((r) => ({ s: seoulParts(r.start_at), e: seoulParts(r.end_at) }))
        .filter((x) => x.s.date === date)
        .reduce((sum, x) => sum + Math.max(0, Math.min(x.e.minute, de) - Math.max(x.s.minute, ds)), 0);
      return { room, rate: Math.round((booked / (de - ds)) * 100) };
    })
    .sort((a, b) => b.rate - a.rate);
}

/** 차량별 이용 건수(반려 제외)·운행 완료 주행거리 */
export function vehicleUsage(list: VehicleReservation[]) {
  return VEHICLES.map((v) => {
    const mine = list.filter((c) => c.vehicle_number === v.number);
    return {
      vehicle: v.label,
      plate: v.number,
      trips: mine.filter((c) => c.status !== "반려").length,
      km: mine.filter((c) => c.status === "사용완료").reduce((s, c) => s + Number(c.total_distance || 0), 0),
    };
  });
}
