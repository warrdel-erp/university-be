import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

const annotationAttributes = [
  "answerSheetAnnotationId",
  "answerSheetQrId",
  "annotationData",
  "version",
  "status",
  "academicYearId",
  "instituteId",
  "universityId",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
];

export async function getLatestVersion(answerSheetQrId, transaction) {
  const maxVersion = await scoped(model.answerSheetAnnotationModel).max(
    "version",
    {
      where: { answerSheetQrId: Number(answerSheetQrId) },
      transaction,
    },
  );

  return Number(maxVersion || 0);
}

export async function createAnnotation(payload, transaction) {
  return scoped(model.answerSheetAnnotationModel).create(payload, {
    transaction,
  });
}

export async function getLatestAnnotationByAnswerSheetQrId(
  answerSheetQrId,
  transaction,
) {
  return scoped(model.answerSheetAnnotationModel).findOne({
    where: { answerSheetQrId: Number(answerSheetQrId) },
    attributes: annotationAttributes,
    order: [
      ["version", "DESC"],
      ["answerSheetAnnotationId", "DESC"],
    ],
    transaction,
  });
}

export async function findAnswerSheetWithOriginalPdf(
  answerSheetQrId,
  assignedToUserId,
  transaction,
) {
  const where = { id: Number(answerSheetQrId) };
  if (assignedToUserId != null) {
    where.assignedToUser = Number(assignedToUserId);
  }

  return scoped(model.answerSheetQrModel).findOne({
    where,
    attributes: [
      "id",
      "qr",
      "assignedToUser",
      "fileUploadId",
      "markingStatus",
      "instituteId",
      "universityId",
    ],
    include: [
      {
        model: model.s3FileModel,
        as: "s3File",
        required: false,
        attributes: ["id", "status", "s3Key", "originalName", "mime"],
      },
    ],
    transaction,
  });
}
