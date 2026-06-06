const ASSET_CODE_SEQUENCE_PAD = 3;
const INVENTORY_COPY_PAD = 4;

/** Default prefixes for seeded asset category names. */
export const CATEGORY_CODE_PREFIX_BY_NAME = {
  "Land & Buildings": "LDB",
  "Furniture & Fixtures": "FURN",
  "IT Assets": "IT",
  "Software & Licenses": "SWL",
  "Office Equipment": "AV",
  Vehicles: "VEH",
  "Plant & Machinery": "PLM",
  "Electrical & Utility Equipment": "ELE",
  "Tools & Instruments": "LIB",
  "Security Equipment": "SEC",
  "Other Equipment": "OTH",
  "Intangible Assets": "INT",
};

/** Category code prefix from name (seeded map or derived), normalized for storage. */
export function codePrefixForCategoryName(categoryName) {
  const mappedPrefix = CATEGORY_CODE_PREFIX_BY_NAME[categoryName];
  let prefix = mappedPrefix;

  if (!prefix) {
    const words = categoryName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s&]/g, " ")
      .split(/\s+/)
      .filter((word) => word && word !== "&");

    if (!words.length) {
      prefix = "GEN";
    } else if (words.length === 1) {
      prefix = words[0].slice(0, 4);
    } else {
      prefix = words
        .map((word) => word[0])
        .join("")
        .slice(0, 4);
    }
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
