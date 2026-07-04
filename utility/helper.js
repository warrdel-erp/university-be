 function excelDateToJSDate(value) {
  if (!value) return null;

  // If already a Date object
  if (value instanceof Date) return value;

  // If it's a number → treat as Excel serial date
  if (!isNaN(value)) {
    try {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30)); 
      return new Date(excelEpoch.getTime() + value * 86400000);
    } catch (error) {
      console.error("Error converting excel serial date:", value, error);
      return null;
    }
  }

  // If it's a string → try parsing directly
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    } else {
      console.error("Invalid date string:", value);
      return null;
    }
  }

  return null;
};

 function parseStudentString(studentString) {
  if (!studentString) return null;

  try {
    const [namePart, idsPart] = studentString.split("$");
    const [studentId, classSectionsId, timeTableMappingId] = idsPart
      .replace(/\s+/g, "") // remove spaces if any
      .split(/[%&]/);

    return {
      studentName: namePart,
      studentId: parseInt(studentId, 10),
      classSectionsId: parseInt(classSectionsId, 10),
      timeTableMappingId: parseInt(timeTableMappingId, 10),
    };
  } catch (error) {
    console.error("Error parsing student string:", studentString, error);
    return null;
  }
};

export function countWeekdayInRange(startDateStr, endDateStr, dayOfWeekStr) {
  const daysOfWeek = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  const targetDay = daysOfWeek[dayOfWeekStr];
  if (targetDay === undefined) return 0;

  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);

  if (start > end) return 0;

  let current = new Date(start);
  while (current.getDay() !== targetDay && current <= end) {
    current.setDate(current.getDate() + 1);
  }

  if (current > end) return 0;

  const diffTime = end.getTime() - current.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

export function getDatesForDayInRange(startDate, endDate, targetDay) {
  const dates = [];
  const daysOfWeek = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };
  
  const targetDayNum = daysOfWeek[targetDay.toLowerCase()];
  if (targetDayNum === undefined) return [];

  let current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // Move to first occurrence of target day
  while (current <= end && current.getDay() !== targetDayNum) {
    current.setDate(current.getDate() + 1);
  }

  // Collect all occurrences
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return dates;
}

/** YYYY-MM-DD for dashboard overview from optional calendar year/month (day = today, clamped to month end). */
export function resolveOverviewDateFromMonthYear({ year, month } = {}) {
  const now = new Date();
  const selectedYear = year ?? now.getFullYear();
  const selectedMonth = month ?? now.getMonth() + 1;
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const day = Math.min(now.getDate(), lastDayOfMonth);
  const monthPart = String(selectedMonth).padStart(2, "0");
  const dayPart = String(day).padStart(2, "0");
  return `${selectedYear}-${monthPart}-${dayPart}`;
}

/** YYYY-MM-DD in server local timezone; avoids UTC shift from toISOString(). */
export function formatQueryDate(dateInput) {
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }

  const date = dateInput ? new Date(dateInput) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Weekday name from YYYY-MM-DD without UTC date-string parsing shift. */
export function dayNameFromQueryDate(dateInput) {
  const formatted = formatQueryDate(dateInput);
  const [year, month, day] = formatted.split("-").map(Number);
  return DAY_NAMES[new Date(year, month - 1, day).getDay()];
}

/** Local midnight Date from YYYY-MM-DD or Date — avoids UTC shift from date-only strings. */
export function parseLocalDateOnly(dateInput) {
  const formatted = formatQueryDate(dateInput);
  const [year, month, day] = formatted.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}