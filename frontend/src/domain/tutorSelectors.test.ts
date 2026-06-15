import { describe, expect, it } from "vitest";
import { makeSlotAllocationKey } from "./slotAllocation";
import { isSlotAvailable } from "./tutorSelectors";

const TUTOR_PUBKEY = "tutor1";
const BUSY_SLOT = { start: "2026-06-20T10:00:00.000Z", end: "2026-06-20T11:00:00.000Z" };

describe("isSlotAvailable — инвариант: занятый слот не становится доступным при добавлении новых слотов", () => {
  it("возвращает false для занятого слота", () => {
    const busyKey = makeSlotAllocationKey(TUTOR_PUBKEY, BUSY_SLOT);
    const occupiedKeys = new Set([busyKey]);

    expect(isSlotAvailable(BUSY_SLOT, TUTOR_PUBKEY, occupiedKeys)).toBe(false);
  });

  it("возвращает true для нового (незанятого) слота", () => {
    const busyKey = makeSlotAllocationKey(TUTOR_PUBKEY, BUSY_SLOT);
    const occupiedKeys = new Set([busyKey]);

    const newSlot = { start: "2026-06-21T14:00:00.000Z", end: "2026-06-21T15:00:00.000Z" };

    expect(isSlotAvailable(newSlot, TUTOR_PUBKEY, occupiedKeys)).toBe(true);
  });

  it("занятый слот остаётся занятым после добавления новых слотов (симуляция publish)", () => {
    const busyKey = makeSlotAllocationKey(TUTOR_PUBKEY, BUSY_SLOT);
    const occupiedKeys = new Set([busyKey]);

    // Симулируем: тутор опубликовал новое расписание с другими слотами
    const publishedSlots = [
      BUSY_SLOT,
      { start: "2026-06-22T09:00:00.000Z", end: "2026-06-22T10:00:00.000Z" },
    ];

    // Проверяем busy-слот через новые слоты расписания
    for (const slot of publishedSlots) {
      const key = makeSlotAllocationKey(TUTOR_PUBKEY, slot);
      if (key === busyKey) {
        expect(isSlotAvailable(slot, TUTOR_PUBKEY, occupiedKeys)).toBe(false);
      } else {
        expect(isSlotAvailable(slot, TUTOR_PUBKEY, occupiedKeys)).toBe(true);
      }
    }
  });

  it("isSlotAvailable зависит только от occupiedKeys, а не от расписания", () => {
    const busyKey = makeSlotAllocationKey(TUTOR_PUBKEY, BUSY_SLOT);
    const occupiedKeys = new Set([busyKey]);

    // Если убрать слот из occupiedKeys — он становится доступным
    const emptyOccupied = new Set<string>();
    expect(isSlotAvailable(BUSY_SLOT, TUTOR_PUBKEY, emptyOccupied)).toBe(true);

    // Если добавить в occupiedKeys — недоступен
    expect(isSlotAvailable(BUSY_SLOT, TUTOR_PUBKEY, occupiedKeys)).toBe(false);
  });
});
