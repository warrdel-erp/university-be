export function timeToMinutes(time) {
  if (!time) {
    return null;
  }

  const text = String(time).replace(/\u202f/g, " ").trim().toLowerCase();
  const [clock, meridiem] = text.split(/\s+/);
  const [hours = 0, minutes = 0] = clock.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  let hour = hours;
  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  }
  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minutes;
}

export function minutesToTime(minutes) {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalizedMinutes / 60)).padStart(2, "0")}:${String(
    normalizedMinutes % 60,
  ).padStart(2, "0")}:00`;
}

export function getTimeSlotRange({ startTime, endTime, duration }) {
  const startMinutes = timeToMinutes(startTime);
  if (startMinutes == null) {
    return null;
  }

  if (endTime) {
    const endMinutes = timeToMinutes(endTime);
    if (endMinutes == null || endMinutes <= startMinutes) {
      return null;
    }
    return { startMinutes, endMinutes };
  }

  const durationMinutes = Number(duration);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return null;
  }

  return { startMinutes, endMinutes: startMinutes + durationMinutes };
}

export function doTimeSlotsOverlap(firstSlot, secondSlot) {
  if (!firstSlot || !secondSlot) {
    return false;
  }

  return firstSlot.endMinutes > secondSlot.startMinutes && firstSlot.startMinutes < secondSlot.endMinutes;
}
