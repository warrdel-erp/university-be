import sequelize from "../database/sequelizeConfig.js";
import * as feeTypeCatalogRepo from "../repository/feeTypeCatalogRepository.js";

function catalogUpdatePayload(body) {
  const { feeTypeCatalogId, ...rest } = body;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

export async function addFeeTypeCatalog(body) {
  const row = await sequelize.transaction(async (transaction) => {
    const { name, amount, feeTypeCategoryId, ledgerType, description } = body;

    const category = await feeTypeCatalogRepo.findFeeTypeCategoryByIdForInstitute(
      feeTypeCategoryId,
      { transaction }
    );
    if (!category) {
      throw new Error("feeTypeCategoryId not found or not in your institute");
    }

    const created = await feeTypeCatalogRepo.createFeeTypeCatalog(
      {
        name,
        amount,
        feeTypeCategoryId,
        ledgerType,
        description: description ?? null,
      },
      { transaction }
    );

    return created.get({ plain: true });
  });

  return row;
}

export async function listFeeTypeCatalogs() {
  return sequelize.transaction(async (transaction) =>
    feeTypeCatalogRepo.findFeeTypeCatalogsByInstitute({ transaction })
  );
}

export async function getSingleFeeTypeCatalog(feeTypeCatalogId) {
  return sequelize.transaction(async (transaction) =>
    feeTypeCatalogRepo.findFeeTypeCatalogById(feeTypeCatalogId, { transaction })
  );
}

export async function updateFeeTypeCatalog(feeTypeCatalogId, body) {
  return sequelize.transaction(async (transaction) => {
    const existing = await feeTypeCatalogRepo.findFeeTypeCatalogById(feeTypeCatalogId, {
      transaction,
    });
    if (!existing) {
      throw new Error("Fee type catalog not found or not in your institute");
    }

    const payload = catalogUpdatePayload(body);

    if (payload.feeTypeCategoryId !== undefined) {
      const cat = await feeTypeCatalogRepo.findFeeTypeCategoryByIdForInstitute(
        payload.feeTypeCategoryId,
        { transaction }
      );
      if (!cat) {
        throw new Error("feeTypeCategoryId not found or not in your institute");
      }
    }

    const affected = await feeTypeCatalogRepo.updateFeeTypeCatalog(feeTypeCatalogId, payload, {
      transaction,
    });
    if (!affected) {
      throw new Error("Update failed");
    }

    return feeTypeCatalogRepo.findFeeTypeCatalogById(feeTypeCatalogId, { transaction });
  });
}

export async function deleteFeeTypeCatalog(feeTypeCatalogId) {
  await sequelize.transaction(async (transaction) => {
    const existing = await feeTypeCatalogRepo.findFeeTypeCatalogById(feeTypeCatalogId, {
      transaction,
    });
    if (!existing) {
      throw new Error("Fee type catalog not found or not in your institute");
    }

    const [planLineCount, invoiceLineCount] = await Promise.all([
      feeTypeCatalogRepo.countPlanSubItemsForCatalog(feeTypeCatalogId, { transaction }),
      feeTypeCatalogRepo.countInvoiceItemsForCatalog(feeTypeCatalogId, { transaction }),
    ]);
    if (planLineCount > 0 || invoiceLineCount > 0) {
      const parts = [];
      if (planLineCount > 0) parts.push(`${planLineCount} fee plan line(s)`);
      if (invoiceLineCount > 0) parts.push(`${invoiceLineCount} invoice line(s)`);
      throw new Error(`Cannot delete: catalog is referenced by ${parts.join(" and ")}`);
    }

    const ok = await feeTypeCatalogRepo.deleteFeeTypeCatalog(feeTypeCatalogId, { transaction });
    if (!ok) {
      throw new Error("Delete failed");
    }
  });

  return true;
}
