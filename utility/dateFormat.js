import moment from "moment";

const STANDARD_DATE_FORMATS = [
  "DD-MM-YYYY",
  "D-M-YYYY",
  "DD/MM/YYYY",
  "D/M/YYYY",
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "MM/DD/YYYY",
  "M/D/YYYY",
  "DD-MM-YY",
  "D-M-YY",
  "DD/MM/YY",
  "D/M/YY",
  "MMM D, YYYY",
  "D MMM YYYY",
  "MMMM D, YYYY",
];

export function parseCustomDate(dateValue) {
  if (dateValue === undefined || dateValue === null || dateValue === "") {
    return null;
  }

  let formatted;

  if (typeof dateValue === "number") {
    const excelEpoch = new Date(1900, 0, dateValue - 1);
    formatted = moment(excelEpoch);
  } else if (dateValue instanceof Date) {
    formatted = moment(dateValue);
  } else {
    const text = String(dateValue).trim();
    formatted = moment(text, STANDARD_DATE_FORMATS, true);
    if (!formatted.isValid()) {
      formatted = moment(text);
    }
  }

  if (!formatted.isValid()) {
    return null;
  }

  return formatted.format("YYYY-MM-DD");
}