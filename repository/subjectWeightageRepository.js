import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

export async function checkIdsBelongToSameCourse(examSetupTypeTermId, subjectId, sessionId) {
  const subject = await scoped(model.subjectModel).findOne({
    where: { subjectId },
    attributes: ['courseId'],
  });
  if (!subject) throw new Error('Invalid subjectId');

  const session = await scoped(model.sessionModel).findOne({
    where: { sessionId },
    attributes: ['sessionId'],
  });
  if (!session) {
    throw new Error('Invalid sessionId');
  }

  const sessionMapping = await scoped(model.sessionCouseMappingModel).findOne({
    where: {
      sessionId,
      courseId: subject.courseId,
    },
  });

  if (!sessionMapping) {
    throw new Error('sessionId is not mapped to the course of the given term/subject');
  }

  return subject.courseId;
}

export async function createOrUpdateWeightageBulk(dataList) {
  return await scoped(model.subjectWeightageModel).bulkCreate(dataList, {
    updateOnDuplicate: ['weightage', 'sessionId', 'updatedBy', 'updatedAt'],
  });
}

export async function getSubjectsWithWeightages(sessionId, courseId, term) {
  return await scoped(model.subjectModel).findAll({
    where: {
      courseId,
      term,
    },
    include: [
      {
        model: model.subjectWeightageModel,
        as: 'subjectWeightages',
        where: { sessionId },
        required: false,
      },
    ],
  });
}
