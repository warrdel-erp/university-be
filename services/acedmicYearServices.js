import * as acedmicYearCreationService from '../repository/acedmicYearRepository.js';
import * as instituteRepository from '../repository/instituteRepository.js';
import * as mainRepository from '../repository/mainRepository.js';
import * as electiveSubjectRepository from '../repository/electiveSubjectRepository.js';
import * as sessionRepository from '../repository/sessionRepository.js';
import * as model from '../models/index.js';
import sequelize from '../database/sequelizeConfig.js';
import { requestContext } from '../utility/requestContext.js';
import moment from 'moment';
import { parseCustomDate } from '../utility/dateFormat.js';

const ACADEMIC_YEAR_DATE_FORMAT = 'YYYY-MM-DD';

function badRequest(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function formatAcademicYearDate(value) {
    const parsed = parseCustomDate(value);
    if (!parsed) {
        return null;
    }
    const date = moment(parsed, 'YYYY-MM-DD', true).startOf('day');
    if (!date.isValid()) {
        return null;
    }
    return date.format(ACADEMIC_YEAR_DATE_FORMAT);
}

function requireFormattedDate(value, fieldName) {
    const formatted = formatAcademicYearDate(value);
    if (!formatted) {
        throw badRequest(`Invalid ${fieldName}`);
    }
    return formatted;
}

/** startingDate only → endingDate is start + 1 year − 1 day; yearTitle is e.g. 2026-2027 */
function resolveAcademicYearFields({ startingDate, endingDate, yearTitle } = {}) {
    if (startingDate === undefined || startingDate === null || String(startingDate).trim() === '') {
        throw badRequest('startingDate is required');
    }

    const parsedStart = parseCustomDate(startingDate);
    if (!parsedStart) {
        throw badRequest('Invalid startingDate');
    }

    const start = moment(parsedStart, 'YYYY-MM-DD', true).startOf('day');
    if (!start.isValid()) {
        throw badRequest('Invalid startingDate');
    }

    const autoEnd = start.clone().add(1, 'year').subtract(1, 'day');
    const trimmedTitle = typeof yearTitle === 'string' ? yearTitle.trim() : '';

    const resolvedEndingDate = endingDate != null && String(endingDate).trim() !== ''
        ? requireFormattedDate(endingDate, 'endingDate')
        : autoEnd.format(ACADEMIC_YEAR_DATE_FORMAT);

    return {
        startingDate: start.format(ACADEMIC_YEAR_DATE_FORMAT),
        endingDate: resolvedEndingDate,
        yearTitle: trimmedTitle || `${start.year()}-${start.year() + 1}`,
    };
}

const yearListAttributes = { exclude: ['updatedAt', 'deletedAt'] };
const copyExclude = ['createdAt', 'updatedAt', 'deletedAt'];
const copyExcludeMeta = [...copyExclude, 'createdBy', 'updatedBy'];

async function upsertAndActivateAcedmicYear(acedmicYearData, updatedBy, options = {}) {
    const { yearTitle, startingDate, endingDate } = resolveAcademicYearFields(acedmicYearData);
    const { universityId, instituteId } = requestContext.getStore() ?? {};

    if (!universityId || !instituteId) {
        throw badRequest('Active university and institute are required');
    }

    const activatePayload = {
        yearTitle,
        startingDate,
        endingDate,
        updatedBy,
        isActive: true,
    };

    const forInstitute = await acedmicYearCreationService.getSingleacedmicYearDetailsByTitle(yearTitle);
    if (forInstitute) {
        const acedmicYearId = forInstitute.acedmicYearId ?? forInstitute.dataValues?.acedmicYearId;
        const updated = await acedmicYearCreationService.updateacedmicYear(acedmicYearId, activatePayload, options);
        if (!updated) {
            throw badRequest('Failed to update academic year');
        }
        const record = await acedmicYearCreationService.getSingleacedmicYearDetails(acedmicYearId, options);
        if (!record) {
            throw badRequest('Academic year not found after update');
        }
        return record;
    }

    const withoutInstitute = await acedmicYearCreationService.findByYearTitleAndUniversityWithoutInstitute(
        yearTitle,
        universityId,
    );
    if (withoutInstitute) {
        const acedmicYearId = withoutInstitute.acedmicYearId ?? withoutInstitute.dataValues?.acedmicYearId;
        const claimed = await acedmicYearCreationService.claimUniversityAcedmicYear(
            acedmicYearId,
            universityId,
            { ...activatePayload, instituteId },
            options,
        );
        if (claimed) {
            return claimed;
        }
    }

    return acedmicYearCreationService.addacedmicYear({
        yearTitle,
        ...activatePayload,
    }, options);
}

/** Always create a new year for active university + institute (scoped create). */
async function createAndActivateAcedmicYear(acedmicYearData, updatedBy, options = {}) {
    const { yearTitle, startingDate, endingDate } = resolveAcademicYearFields(acedmicYearData);
    const { universityId, instituteId } = requestContext.getStore() ?? {};

    if (!universityId || !instituteId) {
        throw badRequest('Active university and institute are required');
    }

    return acedmicYearCreationService.addacedmicYear({
        yearTitle,
        startingDate,
        endingDate,
        updatedBy,
        isActive: true,
    }, options);
}

async function getAcedmicYearById(acedmicYearId, options = {}) {
    return model.acedmicYearModel.findOne({
        attributes: yearListAttributes,
        where: { acedmicYearId: Number(acedmicYearId) },
        ...options,
    });
}

async function findRowsByAcedmicYearId(sequelizeModel, sourceAcedmicYearId, attributes, options = {}) {
    return sequelizeModel.findAll({
        ...options,
        attributes,
        where: { acedmicYearId: Number(sourceAcedmicYearId) },
    });
}

function cloneRowForYear(row, pkField, acedmicYearId, updatedBy, withAudit = false) {
    const { [pkField]: _pk, createdAt, updatedAt, deletedAt, ...rest } = row.get({ plain: true });
    return withAudit
        ? { ...rest, acedmicYearId, createdBy: updatedBy, updatedBy }
        : { ...rest, acedmicYearId };
}

async function copyYearData(copyAcedmicYearId, copyData, acedmicYearId, updatedBy, options) {
    for (const dataType of copyData) {
        switch (dataType) {
            case 'subject': {
                const subjects = await findRowsByAcedmicYearId(
                    model.subjectModel,
                    copyAcedmicYearId,
                    { exclude: copyExclude },
                    options,
                );
                if (subjects.length) {
                    await mainRepository.subjectBulkCreate(
                        subjects.map((row) => cloneRowForYear(row, 'subjectId', acedmicYearId)),
                        options,
                    );
                }
                break;
            }
            case 'electiveSubject': {
                const electives = await findRowsByAcedmicYearId(
                    model.electiveSubjectModel,
                    copyAcedmicYearId,
                    { exclude: copyExcludeMeta },
                    options,
                );
                if (electives.length) {
                    await electiveSubjectRepository.addBulkElectiveSubject(
                        electives.map((row) => cloneRowForYear(row, 'electiveSubjectId', acedmicYearId, updatedBy, true)),
                        options,
                    );
                }
                break;
            }
            case 'session': {
                const sessions = await findRowsByAcedmicYearId(
                    model.sessionModel,
                    copyAcedmicYearId,
                    { exclude: copyExcludeMeta },
                    options,
                );
                if (sessions.length) {
                    await sessionRepository.addBulkSession(
                        sessions.map((row) => cloneRowForYear(row, 'sessionId', acedmicYearId, updatedBy, true)),
                        options,
                    );
                }
                break;
            }
            default:
                console.warn(`Unknown data type: ${dataType}`);
        }
    }
}

/** Create or update by yearTitle — always activates for the active institute. */
export async function addacedmicYear(acedmicYearData, updatedBy) {
    return upsertAndActivateAcedmicYear(acedmicYearData, updatedBy);
}

export async function getacedmicYearDetails() {
    return await acedmicYearCreationService.getacedmicYearDetails();
}

export async function getSingleacedmicYearDetailsByTitle(yearTitle) {
    return await acedmicYearCreationService.getSingleacedmicYearDetailsByTitle(yearTitle);
}

export async function updateacedmicYear(acedmicYearId, acedmicYearData, updatedBy) {
    const resolvedId = acedmicYearId ?? requestContext.getStore()?.academicYearId;
    if (!resolvedId) {
        const error = new Error('Active academic year is required');
        error.statusCode = 400;
        throw error;
    }

    const {
        instituteId: _instituteId,
        universityId: _universityId,
        acedmicYearId: _id,
        isActive: _isActive,
        ...updateData
    } = acedmicYearData;

    if (updateData.startingDate != null && String(updateData.startingDate).trim() !== '') {
        Object.assign(updateData, resolveAcademicYearFields(updateData));
    } else if (updateData.endingDate != null && String(updateData.endingDate).trim() !== '') {
        updateData.endingDate = requireFormattedDate(updateData.endingDate, 'endingDate');
    }

    updateData.updatedBy = updatedBy;
    return await acedmicYearCreationService.updateacedmicYear(resolvedId, updateData);
}

export async function deleteacedmicYear(acedmicYearId) {
    return await acedmicYearCreationService.deleteacedmicYear(acedmicYearId);
}

export async function getActiveAcedmicYearByInstitute() {
    const { universityId, instituteId } = requestContext.getStore() ?? {};
    if (!instituteId) {
        throw new Error('Active institute is required');
    }
    if (!universityId) {
        throw new Error('Active university is required');
    }
    return acedmicYearCreationService.getActiveAcedmicYearByInstitute(instituteId, universityId);
}

/** Active academic years for institute selected at login (instituteId from route param). */
export async function getActiveAcedmicYearListByInstituteId(instituteId) {
    const institute = await instituteRepository.getInstituteById(instituteId);
    if (!institute) {
        const error = new Error('Institute not found');
        error.statusCode = 404;
        throw error;
    }

    return acedmicYearCreationService.getActiveAcedmicYearByInstitute(
        instituteId,
        institute.universityId ?? institute.dataValues?.universityId,
    );
}

export async function newActivateAndCopyData(data, updatedBy) {
    const { copyAcedmicYearId, copyData, ...activateData } = data;

    return sequelize.transaction(async (transaction) => {
        const options = { transaction };

        const created = await createAndActivateAcedmicYear(activateData, updatedBy, options);
        const acedmicYearId = created.acedmicYearId ?? created.dataValues?.acedmicYearId;

        if (copyAcedmicYearId == null || !Array.isArray(copyData) || copyData.length === 0) {
            return created;
        }

        const sourceYear = await getAcedmicYearById(copyAcedmicYearId, options);
        if (!sourceYear) {
            const error = new Error(`Source academic year ${copyAcedmicYearId} not found`);
            error.statusCode = 404;
            throw error;
        }

        await copyYearData(copyAcedmicYearId, copyData, acedmicYearId, updatedBy, options);
        return created;
    });
}
