import * as repo from "../repository/leaveBalanceRepository.js";
import { withAuditEvent } from "../../../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../../../const/auditEvents.js";
import { getCurrentEventId } from "../../../utility/audit/auditContext.js";

export async function addBalance(data, options = {}) {
  const execute = async (opts) => {
    try {
      return await repo.addBalance(data, opts);
    } catch (err) {
      throw new Error(err.message);
    }
  };

  if (options.transaction || getCurrentEventId() != null) {
    return execute(options);
  }
  return withAuditEvent(AUDIT_EVENTS.LEAVE_BALANCE_CREATE, async ({ transaction }) => {
    return execute({ transaction });
  });
}

export async function getBalancesByEmployee(userId) {
  return await repo.getBalancesByEmployee(userId);
}

export async function updateBalance(balanceId, data, options = {}) {
  const execute = async (opts) => {
    return await repo.updateBalance(balanceId, data, opts);
  };

  if (options.transaction || getCurrentEventId() != null) {
    return execute(options);
  }
  return withAuditEvent(AUDIT_EVENTS.LEAVE_BALANCE_UPDATE, async ({ transaction }) => {
    return execute({ transaction });
  });
}
