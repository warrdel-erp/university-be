import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

export async function findClassSectionTermBySectionAndTerm(
  classSectionsId,
  term,
  options = {},
) {
  if (classSectionsId == null || term == null) return null;

  return scoped(model.classSectionTermModel).findOne({
    where: {
      classSectionsId: Number(classSectionsId),
      term: Number(term),
    },
    transaction: options.transaction,
  });
}

export async function resolveClassSectionTermId(
  { classSectionsId, term },
  options = {},
) {
  const row = await findClassSectionTermBySectionAndTerm(
    classSectionsId,
    term,
    options,
  );
  if (!row) return null;
  const plain = row.get ? row.get({ plain: true }) : row;
  return plain.classSectionTermId ?? null;
}

export async function findClassSectionTermById(classSectionTermId, options = {}) {
  if (classSectionTermId == null) return null;

  return scoped(model.classSectionTermModel).findOne({
    where: { classSectionTermId: Number(classSectionTermId) },
    include: [
      {
        model: model.classSectionModel,
        as: 'classSection',
        required: false,
      },
    ],
    transaction: options.transaction,
  });
}
