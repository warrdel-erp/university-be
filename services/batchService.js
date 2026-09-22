import * as repo from '../repository/batchRepository.js';
import * as model from '../models/index.js';

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

/**
 * List all sessions with their batches, grouped by session.
 * Returns an array of session objects, each with a `batches` array.
 */
export async function getAllBatches(filters = {}) {
  const rows = await repo.findAll(filters);
  
  return rows.map(row => {
    const plain = row.get ? row.get({ plain: true }) : row;
    return {
      sessionId: plain.sessionId,
      sessionName: plain.sessionName,
      course: plain.course,
      batches: plain.batches || [],
    };
  });
}

/**
 * Get a single batch by ID.
 */
export async function getBatch(id) {
  const batch = await repo.findById(id);
  if (!batch) httpError('Batch not found', 404);
  return batch;
}

/**
 * Create a new batch in draft state.
 *
 * @param {{ sessionId, batch, intakeCapacity? }} data
 * @param {number} userId
 */
export async function createBatch(data, userId) {
  const { sessionId, batch, intakeCapacity } = data;

  if (!sessionId) httpError('sessionId is required', 400);
  if (!batch) httpError('batch year is required', 400);

  // Validate session exists
  const session = await model.sessionModel.findByPk(Number(sessionId), {
    attributes: ['sessionId'],
  });
  if (!session) httpError(`Session ID ${sessionId} not found`, 404);

  // Check uniqueness: same session + batch year can't be duplicated
  const existing = await model.batchModel.findOne({
    where: { sessionId: Number(sessionId), batch: Number(batch) },
    attributes: ['batchId'],
  });
  if (existing) httpError(`Batch ${batch} is already mapped to this session`, 409);

  return repo.create({
    sessionId: Number(sessionId),
    batch: Number(batch),
    status: 'draft',
    intakeCapacity: intakeCapacity ? Number(intakeCapacity) : null,
    createdBy: userId,
  });
}

/**
 * Publish a batch (draft → published). Once published, core fields are immutable.
 */
export async function publishBatch(id) {
  const batch = await repo.findById(id);
  if (!batch) httpError('Batch not found', 404);

  if (batch.status === 'published') {
    httpError('Batch is already published', 400);
  }

  const [affected] = await repo.publish(id);
  if (affected === 0) httpError('Failed to publish batch', 500);

  return repo.findById(id);
}

/**
 * Update mutable fields of a batch. Only allowed when status is draft.
 * Fields allowed: intakeCapacity.
 */
export async function updateBatch(id, data) {
  const batch = await repo.findById(id);
  if (!batch) httpError('Batch not found', 404);

  if (batch.status === 'published') {
    httpError('Cannot update a published batch. Published batches are immutable.', 400);
  }

  const allowed = {};
  if (data.intakeCapacity !== undefined) {
    allowed.intakeCapacity = data.intakeCapacity ? Number(data.intakeCapacity) : null;
  }

  if (Object.keys(allowed).length === 0) {
    httpError('No updatable fields provided', 400);
  }

  return repo.update(id, allowed);
}

/**
 * Delete a batch. Not allowed if:
 * - batch is published
 * - batch has curriculum mappings
 * - batch has class sections
 */
export async function deleteBatch(id) {
  const batch = await repo.findById(id);
  if (!batch) httpError('Batch not found', 404);

  if (batch.status === 'published') {
    httpError('Cannot delete a published batch. Unpublish it first.', 400);
  }

  const curriculumCount = await repo.countCurriculumMappings(id);
  if (curriculumCount > 0) {
    httpError(
      `Cannot delete this batch: ${curriculumCount} curriculum mapping(s) exist. Remove them first.`,
      400,
    );
  }

  const sectionCount = await repo.countClassSections(id);
  if (sectionCount > 0) {
    httpError(
      `Cannot delete this batch: ${sectionCount} class section(s) are linked. Remove them first.`,
      400,
    );
  }

  await repo.remove(id);
  return { batchId: Number(id), deleted: true };
}
