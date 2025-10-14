import moment from "moment";

export function parseCustomDate(dateValue) {
  console.log(">>>>>>[parseCustomDate] Input:", dateValue);

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
    console.log(">>>>>>> Invalid date:", dateValue);
    return null;
  }

  //  Log for debugging
  console.log(">>>> [parseCustomDate] For logs:", formatted.format("DD-MM-YYYY"));
  return formatted.format("YYYY-MM-DD");
};