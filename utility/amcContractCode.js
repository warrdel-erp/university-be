const CONTRACT_NUMBER_PAD = 4;

export function currentContractYear() {
  return new Date().getFullYear();
}

export function formatContractNumber(year, sequence) {
  const yy = String(year).slice(-2);
  return `AMC${yy}${String(sequence).padStart(CONTRACT_NUMBER_PAD, "0")}`;
}

export function parseContractNumberSequence(contractNumber) {
  const match = /^AMC(\d{2})(\d+)$/.exec(String(contractNumber ?? "").trim());
  if (!match) {
    return null;
  }

  return {
    yearSuffix: match[1],
    sequence: parseInt(match[2], 10),
  };
}
