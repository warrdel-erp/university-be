import { AUDIT_ACTIONS } from "../../const/auditActions.js";
import { getCurrentEventId } from "./auditContext.js";
import { requestContext } from "../requestContext.js";
import {
  isAuditModelExcluded,
  isModelAuditEnabled,
} from "./auditConfig.js";
import {
  sanitizeAuditData,
  buildAuditUpdateDiff,
} from "./auditSanitizer.js";
import { createEventLog } from "../../repository/eventLogRepository.js";

function getPrimaryKeyValue(instance, model) {
  const pk = model.primaryKeyAttribute;
  const value = instance.get?.(pk) ?? instance[pk];
  return value == null ? null : String(value);
}

async function writeAuditLog(model, instance, action, oldData, newData, transaction) {
  const eventId = getCurrentEventId();
  if (eventId == null) return;

  const tableName = model.tableName;
  const store = requestContext.getStore();

  const universityId = store?.universityId;

  const instituteId = store?.instituteId;

  const academicYearId = store?.academicYearId;

  await createEventLog(
    {
      eventId,
      entity: tableName,
      entityId: getPrimaryKeyValue(instance, model),
      action,
      oldData,
      newData,
      universityId,
      instituteId,
      academicYearId,
    },
    { transaction },
  );
}

/**
 * Registers afterCreate / afterUpdate / afterDestroy hooks on one Sequelize model.
 * Logs only when an active withAuditEvent() context exists.
 */
export function registerAuditHooks(model) {
  if (!model?.tableName || isAuditModelExcluded(model)) return;
  if (model.__auditHooksRegistered) return;
  model.__auditHooksRegistered = true;

  const tableName = model.tableName;

  model.addHook("afterCreate", async (instance, options) => {
    await writeAuditLog(
      model,
      instance,
      AUDIT_ACTIONS.CREATE,
      null,
      sanitizeAuditData(instance, { tableName }),
      options.transaction,
    );
  });

  model.addHook("afterUpdate", async (instance, options) => {
    const { oldData, newData } = buildAuditUpdateDiff(instance, { tableName });
    if (oldData == null && newData == null) return;

    await writeAuditLog(
      model,
      instance,
      AUDIT_ACTIONS.UPDATE,
      oldData,
      newData,
      options.transaction,
    );
  });

  model.addHook("afterDestroy", async (instance, options) => {
    await writeAuditLog(
      model,
      instance,
      AUDIT_ACTIONS.DELETE,
      sanitizeAuditData(instance, { tableName }),
      null,
      options.transaction,
    );
  });
}

/**
 * Enables audit hooks for all models except those listed in AUDIT_EXCLUDED_MODELS.
 *
 * Usage in models/index.js (after model exports exist):
 *   registerAuditedModels(models);
 */
export function registerAuditedModels(modelsByName) {
  for (const model of Object.values(modelsByName)) {
    if (!model?.tableName) continue;
    if (!isModelAuditEnabled(model)) continue;
    registerAuditHooks(model);
  }
}
