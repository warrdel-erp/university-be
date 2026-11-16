import * as repo from "../repository/leaveTypeRepository.js";

const VALID_CLASSIFICATIONS = ["Paid", "Unpaid", "Duty"];
const VALID_STATUSES = ["Active", "Inactive", "Draft", "Published"];

export async function createLeaveType(data, user = {}) {
  const { name, code, classification, status } = data;

  if (!name || !name.trim()) {
    throw new Error("Leave type name is required");
  }

  if (!code || !code.trim()) {
    throw new Error("Leave code is required");
  }

  const cleanCode = code.trim().toUpperCase();

  if (classification && !VALID_CLASSIFICATIONS.includes(classification)) {
    throw new Error(
      `Invalid classification '${classification}'. Allowed values are: ${VALID_CLASSIFICATIONS.join(", ")}`
    );
  }

  if (status && !VALID_STATUSES.includes(status)) {
    throw new Error(
      `Invalid status '${status}'. Allowed values are: ${VALID_STATUSES.join(", ")}`
    );
  }

  const universityId = data.universityId || user?.universityId || user?.dataValues?.universityId;
  const instituteId = data.instituteId || user?.instituteId || user?.dataValues?.instituteId || null;
  const campusId = data.campusId || user?.campusId || user?.dataValues?.campusId || null;

  if (!universityId) {
    throw new Error("University ID is required for multi-tenancy");
  }

  // Check duplicate code
  const existing = await repo.findByCode(cleanCode, universityId);
  if (existing) {
    throw new Error(`Leave code '${cleanCode}' already exists for this university.`);
  }

  const payload = {
    ...data,
    name: name.trim(),
    code: cleanCode,
    classification: classification || "Paid",
    status: status || "Active",
    trackBalance: data.trackBalance !== undefined ? Boolean(data.trackBalance) : true,
    universityId,
    instituteId,
    campusId,
    createdBy: user?.userId || user?.dataValues?.userId || null,
    updatedBy: user?.userId || user?.dataValues?.userId || null,
  };

  return repo.createLeaveType(payload);
}

export async function getAllLeaveTypes(filters = {}, pagination = {}) {
  return repo.getLeaveTypes(filters, pagination);
}

export async function getLeaveTypeById(id) {
  if (!id) throw new Error("Leave type ID is required");
  const leaveType = await repo.getLeaveTypeById(id);
  if (!leaveType) {
    throw new Error("Leave type not found");
  }
  return leaveType;
}

export async function updateLeaveType(id, data, user = {}) {
  if (!id) throw new Error("Leave type ID is required");

  const existing = await repo.getLeaveTypeById(id);
  if (!existing) {
    throw new Error("Leave type not found");
  }

  // Validation: Once published, a leave type cannot be edited
  if (existing.status === "Published") {
    throw new Error(
      "Cannot edit leave type because it is already published. Published leave types are locked from modifications."
    );
  }

  // If code is being changed, check uniqueness
  if (data.code && data.code.trim()) {
    const cleanCode = data.code.trim().toUpperCase();
    const universityId = existing.universityId;
    const duplicate = await repo.findByCode(cleanCode, universityId, id);
    if (duplicate) {
      throw new Error(`Leave code '${cleanCode}' is already in use by another leave type.`);
    }
    data.code = cleanCode;
  }

  if (data.classification && !VALID_CLASSIFICATIONS.includes(data.classification)) {
    throw new Error(
      `Invalid classification '${data.classification}'. Allowed values are: ${VALID_CLASSIFICATIONS.join(", ")}`
    );
  }

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    throw new Error(
      `Invalid status '${data.status}'. Allowed values are: ${VALID_STATUSES.join(", ")}`
    );
  }

  const payload = {
    ...data,
    updatedBy: user?.userId || user?.dataValues?.userId || null,
  };

  return repo.updateLeaveType(id, payload);
}

export async function updateLeaveTypeStatus(id, status, user = {}) {
  if (!id) throw new Error("Leave type ID is required");
  if (!status || !VALID_STATUSES.includes(status)) {
    throw new Error(
      `Invalid status '${status}'. Allowed values are: ${VALID_STATUSES.join(", ")}`
    );
  }

  const existing = await repo.getLeaveTypeById(id);
  if (!existing) {
    throw new Error("Leave type not found");
  }

  // Once published, cannot revert back to Draft
  if (existing.status === "Published" && status === "Draft") {
    throw new Error("Cannot revert a published leave type back to Draft.");
  }

  const updatedBy = user?.userId || user?.dataValues?.userId || null;
  return repo.updateLeaveTypeStatus(id, status, updatedBy);
}

export async function deleteLeaveType(id, options = {}) {
  if (!id) throw new Error("Leave type ID is required");

  const existing = await repo.getLeaveTypeById(id);
  if (!existing) {
    throw new Error("Leave type not found");
  }

  // Check if leave type is being used in policies
  const usedCount = await repo.countPoliciesUsingLeaveCode(existing.code);
  if (usedCount > 0 && !options.force) {
    throw new Error(
      `Cannot delete leave type '${existing.name} (${existing.code})' because it is currently used in ${usedCount} leave policy/policies. Please remove it from the policies first, or pass force=true.`
    );
  }

  return repo.deleteLeaveType(id);
}
