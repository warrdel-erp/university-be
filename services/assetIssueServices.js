import sequelize from "../database/sequelizeConfig.js";
import * as repo from "../repository/assetIssueRepository.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function toPlain(row) {
  if (!row) return null;
  return typeof row.get === "function" ? row.get({ plain: true }) : row;
}

function buildIssueUpdatePayload(body) {
  return Object.fromEntries(
    Object.entries({
      memberId: body.memberId,
      memberType: body.memberType,
      issueDate: body.issueDate,
      dueDate: body.dueDate,
      remarks: body.remarks,
    }).filter(([, value]) => value !== undefined)
  );
}

async function getMemberDetails(memberType, memberId, instituteId, transaction) {
  if (memberType === "STUDENT") {
    const student = await repo.findStudentMemberDetailsById(memberId, instituteId, { transaction });
    const studentPlain = toPlain(student);
    return {
      memberType,
      memberName: [studentPlain?.firstName, studentPlain?.middleName, studentPlain?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null,
      scholarNumber: studentPlain?.scholarNumber ?? null,
      courseId: studentPlain?.course?.courseId ?? studentPlain?.courseId ?? null,
      courseName: studentPlain?.course?.courseName ?? null,
    };
  }

  const employee = await repo.findEmployeeMemberDetailsById(memberId, instituteId, { transaction });
  const employeePlain = toPlain(employee);
  return {
    memberType,
    memberName: employeePlain?.employeeName ?? null,
    employeeCode: employeePlain?.employeeCode ?? null,
    department: employeePlain?.department ?? null,
  };
}

function buildMemberDetailsFromStudent(studentRow) {
  const student = toPlain(studentRow);
  return {
    memberType: "STUDENT",
    memberName: [student?.firstName, student?.middleName, student?.lastName].filter(Boolean).join(" ").trim() || null,
    scholarNumber: student?.scholarNumber ?? null,
    courseId: student?.course?.courseId ?? student?.courseId ?? null,
    courseName: student?.course?.courseName ?? null,
  };
}

function buildMemberDetailsFromEmployee(employeeRow) {
  const employee = toPlain(employeeRow);
  return {
    memberType: "TEACHER",
    memberName: employee?.employeeName ?? null,
    employeeCode: employee?.employeeCode ?? null,
    department: employee?.department ?? null,
  };
}

async function validateMember(memberType, memberId, instituteId, transaction) {
  if (memberType === "STUDENT") {
    const student = await repo.findStudentById(memberId, instituteId, { transaction });
    if (!student) {
      throw httpError("memberId student not found in your institute", 404);
    }
    return;
  }

  const teacher = await repo.findTeacherById(memberId, instituteId, { transaction });
  if (!teacher) {
    throw httpError("memberId employee not found in your institute", 404);
  }
}

async function validateIssueAssets(items, instituteId, transaction) {
  if (!items.length) {
    throw httpError("At least one asset item is required", 400);
  }

  const issueAssetIds = [...new Set(items.map((item) => item.assetId))];
  const assets = await repo.findInstituteAssetsByIds(issueAssetIds, instituteId, { transaction });
  const existingAssetIds = new Set(assets.map((asset) => asset.assetId));

  const missingAssetId = issueAssetIds.find((assetId) => !existingAssetIds.has(assetId));
  if (missingAssetId) {
    throw httpError(`assetId ${missingAssetId} not found in your institute`, 404);
  }
}

export async function createAssetIssue(body, instituteId) {
  const row = await sequelize.transaction(async (transaction) => {
    await validateMember(body.memberType, body.memberId, instituteId, transaction);
    await validateIssueAssets(body.items, instituteId, transaction);
    const issueAssetIds = [...new Set(body.items.map((item) => item.assetId))];

    const issue = await repo.createAssetIssue(
      {
        instituteId,
        memberId: body.memberId,
        memberType: body.memberType,
        issueDate: body.issueDate,
        dueDate: body.dueDate,
        remarks: body.remarks ?? null,
      },
      { transaction }
    );

    const issueItems = body.items.map((item) => ({
      assetIssueId: issue.assetIssueId,
      assetId: item.assetId,
      returnDate: item.returnDate ?? null,
      remarks: item.remarks ?? null,
    }));

    await repo.createAssetIssueItems(issueItems, { transaction });
    await repo.updateAssetStatusByIds(issueAssetIds, instituteId, "ISSUED", { transaction });
    return repo.findAssetIssueById(issue.assetIssueId, instituteId, { transaction });
  });

  return toPlain(row);
}

export async function listAssetIssues(instituteId, query) {
  const { rows, total, page, limit } = await repo.findAssetIssuesPaginated(
    instituteId,
    { search: query.search },
    { page: query.page, limit: query.limit }
  );

  const assetIssues = rows.map(toPlain);
  const studentIds = [
    ...new Set(
      assetIssues
        .filter((issue) => issue.memberType === "STUDENT")
        .map((issue) => issue.memberId)
    ),
  ];
  const employeeIds = [
    ...new Set(
      assetIssues
        .filter((issue) => issue.memberType === "TEACHER")
        .map((issue) => issue.memberId)
    ),
  ];

  const [studentRows, employeeRows] = await Promise.all([
    repo.findStudentMemberDetailsByIds(studentIds, instituteId),
    repo.findEmployeeMemberDetailsByIds(employeeIds, instituteId),
  ]);

  const studentMap = new Map(studentRows.map((row) => [toPlain(row).studentId, row]));
  const employeeMap = new Map(employeeRows.map((row) => [toPlain(row).employeeId, row]));

  const enrichedAssetIssues = assetIssues.map((issue) => {
    if (issue.memberType === "STUDENT") {
      return {
        ...issue,
        memberBasicDetails: buildMemberDetailsFromStudent(studentMap.get(issue.memberId)),
      };
    }
    return {
      ...issue,
      memberBasicDetails: buildMemberDetailsFromEmployee(employeeMap.get(issue.memberId)),
    };
  });

  return {
    data: { assetIssues: enrichedAssetIssues },
    pagination: { page, limit, total },
  };
}

export async function getSingleAssetIssue(assetIssueId, instituteId) {
  const data = await sequelize.transaction(async (transaction) => {
    const issue = await repo.findAssetIssueById(assetIssueId, instituteId, { transaction });
    if (!issue) {
      throw httpError("Asset issue not found", 404);
    }

    const issuePlain = toPlain(issue);
    const member = await getMemberDetails(
      issuePlain.memberType,
      issuePlain.memberId,
      instituteId,
      transaction
    );

    return {
      ...issuePlain,
      memberBasicDetails: member,
    };
  });

  return data;
}

export async function updateAssetIssue(assetIssueId, body, instituteId) {
  const data = await sequelize.transaction(async (transaction) => {
    const existing = await repo.findAssetIssueById(assetIssueId, instituteId, { transaction });
    if (!existing) {
      throw httpError("Asset issue not found", 404);
    }

    const existingPlain = toPlain(existing);
    const issuePayload = buildIssueUpdatePayload(body);
    const finalMemberType = issuePayload.memberType ?? existingPlain.memberType;
    const finalMemberId = issuePayload.memberId ?? existingPlain.memberId;

    if (issuePayload.memberType !== undefined || issuePayload.memberId !== undefined) {
      await validateMember(finalMemberType, finalMemberId, instituteId, transaction);
    }

    if (Object.keys(issuePayload).length > 0) {
      const affected = await repo.updateAssetIssue(assetIssueId, instituteId, issuePayload, { transaction });
      if (!affected) {
        throw httpError("Asset issue update failed", 500);
      }
    }

    if (body.items !== undefined) {
      if (!body.items.length) {
        throw httpError("At least one asset item is required", 400);
      }

      const itemIds = [...new Set(body.items.map((item) => item.assetIssueItemId))];
      const existingItems = await repo.findIssueItemsByIds(assetIssueId, itemIds, { transaction });
      if (existingItems.length !== itemIds.length) {
        throw httpError("One or more assetIssueItemId not found for this assetIssueId", 404);
      }

      const assetIdsToValidate = [
        ...new Set(body.items.map((item) => item.assetId).filter((assetId) => assetId !== undefined)),
      ];
      if (assetIdsToValidate.length) {
        const assets = await repo.findInstituteAssetsByIds(assetIdsToValidate, instituteId, { transaction });
        const foundAssetIds = new Set(assets.map((asset) => asset.assetId));
        const missingAssetId = assetIdsToValidate.find((assetId) => !foundAssetIds.has(assetId));
        if (missingAssetId) {
          throw httpError(`assetId ${missingAssetId} not found in your institute`, 404);
        }
      }

      for (const item of body.items) {
        const itemPayload = Object.fromEntries(
          Object.entries({
            assetId: item.assetId,
            returnDate: item.returnDate,
            remarks: item.remarks,
          }).filter(([, value]) => value !== undefined)
        );

        const affected = await repo.updateAssetIssueItemById(
          item.assetIssueItemId,
          assetIssueId,
          itemPayload,
          { transaction }
        );
        if (!affected) {
          throw httpError(`Failed to update assetIssueItemId ${item.assetIssueItemId}`, 500);
        }
      }

      if (assetIdsToValidate.length) {
        await repo.updateAssetStatusByIds(assetIdsToValidate, instituteId, "ISSUED", { transaction });
      }
    }

    const updated = await repo.findAssetIssueById(assetIssueId, instituteId, { transaction });
    const updatedPlain = toPlain(updated);
    const member = await getMemberDetails(
      updatedPlain.memberType,
      updatedPlain.memberId,
      instituteId,
      transaction
    );

    return {
      ...updatedPlain,
      memberBasicDetails: member,
    };
  });

  return data;
}
