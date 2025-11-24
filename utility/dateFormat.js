import moment from "moment";

export function parseCustomDate(dateValue) {

  if (!dateValue) return null;

  let formatted;

  if (typeof dateValue === "number") {
    const excelEpoch = new Date(1900, 0, dateValue - 1);
    formatted = moment(excelEpoch);
  } else if (dateValue instanceof Date) {
    formatted = moment(dateValue);
  } else {
    formatted = moment(dateValue, ["DD-MM-YYYY", "YYYY-MM-DD"], true);
  }

  if (!formatted.isValid()) {
    return null;
  }

  //  Log for debugging
  return formatted.format("YYYY-MM-DD");
};