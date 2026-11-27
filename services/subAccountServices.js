import * as SubAccountCreationService from '../repository/subAccountRepository.js';
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

export async function addSubAccount(SubAccountData, createdBy, updatedBy, options = {}) {
    const runner = async (transaction) => {
        const opts = { ...options, transaction };
        const accountId = SubAccountData.accountId != null
            ? Number(SubAccountData.accountId)
            : await SubAccountCreationService.resolveDefaultAccountId(opts);

        const account = await SubAccountCreationService.getAccountById(accountId, opts);
        if (!account) {
            throw new Error('Account not found');
        }

        SubAccountData.accountId = accountId;
        SubAccountData.createdBy = createdBy;
        SubAccountData.updatedBy = updatedBy;
        return await SubAccountCreationService.addSubAccount(SubAccountData, opts);
    };

    if (options?.transaction) {
        return await runner(options.transaction);
    }
    return await withAuditEvent(AUDIT_EVENTS.SUB_ACCOUNT_CREATE, async ({ transaction }) => {
        return await runner(transaction);
    });
}

export async function getSubAccountDetails() {
    return await SubAccountCreationService.getSubAccountDetails();
}

export async function getSingleSubAccountDetails(subAccountId) {
    return await SubAccountCreationService.getSingleSubAccountDetails(subAccountId);
}

export async function deleteSubAccount(subAccountId, options = {}) {
    if (options?.transaction) {
        return await SubAccountCreationService.deleteSubAccount(subAccountId, options);
    }
    return await withAuditEvent(AUDIT_EVENTS.SUB_ACCOUNT_DELETE, async ({ transaction }) => {
        return await SubAccountCreationService.deleteSubAccount(subAccountId, { ...options, transaction });
    });
}

export async function updateSubAccount(subAccountId, SubAccountData, updatedBy, options = {}) {
    const runner = async (transaction) => {
        const opts = { ...options, transaction };
        if (SubAccountData.accountId) {
            const account = await SubAccountCreationService.getAccountById(SubAccountData.accountId, opts);
            if (!account) {
                throw new Error('Account not found');
            }
        }

        const {
            instituteId: _instituteId,
            universityId: _universityId,
            subAccountId: _subAccountId,
            ...updateData
        } = SubAccountData;
        updateData.updatedBy = updatedBy;
        return await SubAccountCreationService.updateSubAccount(subAccountId, updateData, opts);
    };

    if (options?.transaction) {
        return await runner(options.transaction);
    }
    return await withAuditEvent(AUDIT_EVENTS.SUB_ACCOUNT_UPDATE, async ({ transaction }) => {
        return await runner(transaction);
    });
}

export async function getAllAccount() {
    return await SubAccountCreationService.getAllAccount();
}
