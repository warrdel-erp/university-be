const TICKET_NUMBER_PAD = 3;

export function currentTicketYear() {
  return new Date().getFullYear();
}

export function formatTicketNumber(year, sequence) {
  return `TKT-${year}-${String(sequence).padStart(TICKET_NUMBER_PAD, "0")}`;
}

export function parseTicketNumberSequence(ticketNumber) {
  const match = /^TKT-(\d{4})-(\d+)$/.exec(String(ticketNumber ?? "").trim());
  if (!match) {
    return null;
  }

  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}
