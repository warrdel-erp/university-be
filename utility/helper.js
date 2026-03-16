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