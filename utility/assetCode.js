const ASSET_CODE_SEQUENCE_PAD = 3;
const INVENTORY_COPY_PAD = 4;

/** Sets code_prefix on new asset category create (always stored on the category row). */
export function deriveCategoryCodePrefixFromName(categoryName) {
  const words = categoryName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s&]/g, " ")
    .split(/\s+/)
    .filter((word) => word && word !== "&");

  let prefix = "GEN";

  if (words.length === 1) {
    prefix = words[0].slice(0, 4);
  } else if (words.length > 1) {
    prefix = words
      .map((word) => word[0])
      .join("")
      .slice(0, 4);
  }

  return String(prefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

/** 3-letter slug from asset name (e.g. Table → TBL, Dell Laptop → DLL). */
export function deriveAssetNameCodePrefix(assetName) {
  const words = assetName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word);

  if (!words.length) {
    return "AST";
  }

  if (words.length === 1) {
    const word = words[0];
    const consonants = word.replace(/[AEIOU]/g, "");
    const letters = word.replace(/[^A-Z]/g, "");
    return `${consonants}${letters}`.slice(0, 3).padEnd(3, "X");
  }

  const initials = words.map((word) => word[0]).join("");
  const allConsonants = words.join("").replace(/[AEIOU]/g, "");
  return `${initials}${allConsonants}`.slice(0, 3).padEnd(3, "X");
}

/** Asset master code: FURN-TBL001 (category + name slug + per-name sequence). */
export function formatAssetCode(categoryPrefix, assetNamePrefix, sequence) {
  const category = String(categoryPrefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const name = String(assetNamePrefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");

  return `${category}-${name}${String(sequence).padStart(ASSET_CODE_SEQUENCE_PAD, "0")}`;
}

export function parseAssetCodeSequenceForNameSlug(code, categoryPrefix, assetNamePrefix) {
  const category = String(categoryPrefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const name = String(assetNamePrefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
  const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^${escapedCategory}-${escapedName}(\\d{3})$`).exec(code);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

/** Inventory copy: FURN-TBL001-0001 */
export function formatInventoryItemCode(assetCode, copyNumber) {
  return `${assetCode}-${String(copyNumber).padStart(INVENTORY_COPY_PAD, "0")}`;
}

export function parseInventoryItemCopyNumber(inventoryCode, assetCode) {
  const escapedAssetCode = assetCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^${escapedAssetCode}-(\\d+)$`).exec(inventoryCode);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}
