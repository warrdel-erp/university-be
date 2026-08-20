import * as attendanceService from "../repository/attendanceRepository.js";
import * as employeeScheduleRepository from "../repository/employeeScheduleRepository.js";
import moment from "moment";
import xlsx from 'xlsx';
import sequelize from "../database/sequelizeConfig.js";
import { Op } from "sequelize";
import * as model from "../models/index.js";
import { ATTENDANCE_STATUS } from "../constant.js";
import { decimalDivide, decimalMultiply } from "../utility/decimalMoney.js";
import { resolveProgramYear, resolveStudentClassSectionsId } from "../utility/classSectionIncludes.js";
import {
  assertCopyPeriodDateWiseMatch,
  assertDateWiseCellsBelongToTerm,
  canCopyPeriodToTarget,
  getPeriodTeacherUserId,
  resolveAttendancePlacement,
  resolveDateWiseRoutinePlacement,
  resolveSourcePeriodByDateWiseId,
} from "../utility/attendancePlacement.js";

export { ATTENDANCE_STATUS };

function normalizeDateWiseIds(timeTableCellDateWiseId) {
  const ids = Array.isArray(timeTableCellDateWiseId)
    ? timeTableCellDateWiseId
    : [timeTableCellDateWiseId];

  if (!ids.length) {
    throw new Error('timeTableCellDateWiseId is required');
  }

  return ids.map((id) => Number(id));
}

export async function addAttendance(attendanceData, createdBy, updatedBy) {
  const dateWiseIds = normalizeDateWiseIds(attendanceData.timeTableCellDateWiseId);
  
  let placement = { classSectionsId: attendanceData.classSectionsId || null, classSectionTermId: attendanceData.classSectionTermId || null };
  let dateWiseRows = [];

  if (attendanceData.classSectionTermId) {
    try {
      placement = await resolveAttendancePlacement(attendanceData.classSectionTermId);
      dateWiseRows = await assertDateWiseCellsBelongToTerm(
        dateWiseIds,
        placement.classSectionTermId,
      );
    } catch (err) {
      dateWiseRows = await model.timeTableCellDateWiseModel.findAll({
        where: { timeTableCellDateWiseId: { [Op.in]: dateWiseIds } },
        attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId'],
      });
    }
  } else {
    dateWiseRows = await model.timeTableCellDateWiseModel.findAll({
      where: { timeTableCellDateWiseId: { [Op.in]: dateWiseIds } },
      attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId'],
    });
  }

  const dateWiseById = new Map();
  for (const row of dateWiseRows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    dateWiseById.set(Number(plain.timeTableCellDateWiseId), plain);
  }

  const pendingIds = [];
  const skippedIds = [];

  for (const dateWiseId of dateWiseIds) {
    const isExists = await attendanceService.checkAttendanceExists(dateWiseId);
    if (isExists) {
      skippedIds.push(dateWiseId);
    } else {
      pendingIds.push(dateWiseId);
    }
  }

  if (pendingIds.length === 0) {
    throw new Error(
      dateWiseIds.length === 1
        ? 'Attendance already marked for this date and period'
        : 'Attendance already marked for all periods on this date'
    );
  }

  const t = await sequelize.transaction();
  try {
    const attendanceRecords = [];
    for (const dateWiseId of pendingIds) {
      const dateWise = dateWiseById.get(Number(dateWiseId)) || {};
      for (const attendance of attendanceData.attendance) {
        let studentClassSectionsId = attendance.classSectionsId || placement.classSectionsId;

        if (!studentClassSectionsId) {
          const studentObj = await model.studentModel.findByPk(attendance.studentId, {
            attributes: ['studentId', 'classSectionTermId'],
          });
          if (studentObj && studentObj.classSectionTermId) {
            const termObj = await model.classSectionTermModel.findByPk(studentObj.classSectionTermId, {
              attributes: ['classSectionsId'],
            });
            studentClassSectionsId = termObj?.classSectionsId || null;
          }
        }

        attendanceRecords.push({
          ...attendance,
          classSectionsId: studentClassSectionsId,
          classSectionTermId: placement.classSectionTermId || null,
          timeTableCellDateWiseId: Number(dateWiseId),
          timeTableCellId: Number(dateWise.timeTableCellId),
          date: dateWise.date || attendanceData.date,
          createdBy,
          updatedBy,
        });
      }
    }

    const addedAttendance = await attendanceService.addAttendance(attendanceRecords, { transaction: t });
    await t.commit();
    return { addedAttendance, markedPeriods: pendingIds, skippedPeriods: skippedIds };
  } catch (error) {
    await t.rollback();
    console.error('Error adding Attendance:', error);
    throw error;
  }
};

export async function copyAttendancePeriod(copyData, createdBy, updatedBy) {
  const sourceDateWiseId = Number(copyData.timeTableCellDateWiseId);
  const targetDateWiseIds = normalizeDateWiseIds(copyData.copyToTimeTableCellDateWiseId);

  const sourcePeriod = await resolveSourcePeriodByDateWiseId(sourceDateWiseId);
  const sourcePlacement = await assertCopyPeriodDateWiseMatch(
    sourceDateWiseId,
    targetDateWiseIds,
    sourcePeriod.classSectionTermId,
  );

  const date = sourcePeriod.date;
  const allowedCopyToPeriods = await getCopyToPeriodsForSameDay(sourcePeriod, date);
  const allowedTargetIds = new Set();
  for (const period of allowedCopyToPeriods) {
    allowedTargetIds.add(Number(period.timeTableCellDateWiseId));
  }

  for (const targetDateWiseId of targetDateWiseIds) {
    if (!allowedTargetIds.has(Number(targetDateWiseId))) {
      throw new Error(
        `timeTableCellDateWiseId ${targetDateWiseId} is not a valid copy target for this period on ${date}`,
      );
    }
  }

  const sourceRows = await attendanceService.getAttendanceRowsByDateWiseId(sourceDateWiseId);

  if (!sourceRows.length) {
    throw new Error('No attendance found for the source period');
  }

  const targetRows = await assertDateWiseCellsBelongToTerm(
    targetDateWiseIds,
    sourcePeriod.classSectionTermId,
  );
  const targetById = new Map();
  for (const row of targetRows) {
    const plain = row.get({ plain: true });
    targetById.set(Number(plain.timeTableCellDateWiseId), plain);
  }

  const pendingTargetIds = [];
  const skippedTargetIds = [];

  for (const targetDateWiseId of targetDateWiseIds) {
    if (Number(targetDateWiseId) === sourceDateWiseId) {
      skippedTargetIds.push(targetDateWiseId);
      continue;
    }

    const isExists = await attendanceService.checkAttendanceExists(targetDateWiseId);
    if (isExists) {
      skippedTargetIds.push(targetDateWiseId);
    } else {
      pendingTargetIds.push(targetDateWiseId);
    }
  }

  if (pendingTargetIds.length === 0) {
    throw new Error(
      targetDateWiseIds.length === 1
        ? 'Attendance already marked for the target period'
        : 'Attendance already marked for all target periods',
    );
  }

  const studentIds = [...new Set(sourceRows.map((r) => r.studentId))];
  const studentSectionMap = new Map();
  if (studentIds.length > 0) {
    const students = await model.studentModel.findAll({
      where: { studentId: { [Op.in]: studentIds } },
      attributes: ['studentId', 'classSectionTermId'],
      include: [
        {
          model: model.classSectionTermModel,
          as: 'studentClassSectionTerm',
          attributes: ['classSectionTermId', 'classSectionsId'],
          required: false,
        },
      ],
    });
    for (const s of students) {
      const plainS = s.get({ plain: true });
      const sectionId = plainS.studentClassSectionTerm?.classSectionsId || null;
      if (sectionId) {
        studentSectionMap.set(plainS.studentId, sectionId);
      }
    }
  }

  const t = await sequelize.transaction();
  try {
    const attendanceRecords = [];

    for (const targetDateWiseId of pendingTargetIds) {
      const target = targetById.get(Number(targetDateWiseId));
      for (const row of sourceRows) {
        const resolvedClassSectionsId = row.classSectionsId || sourcePlacement.classSectionsId || studentSectionMap.get(row.studentId) || null;
        attendanceRecords.push({
          studentId: row.studentId,
          attendanceStatus: row.attendanceStatus,
          notes: row.notes,
          description: row.description,
          classSectionsId: resolvedClassSectionsId,
          classSectionTermId: sourcePlacement.classSectionTermId || null,
          timeTableCellDateWiseId: Number(targetDateWiseId),
          timeTableCellId: Number(target.timeTableCellId),
          date,
          createdBy,
          updatedBy,
        });
      }
    }

    const addedAttendance = await attendanceService.addAttendance(attendanceRecords, { transaction: t });
    await t.commit();

    return {
      addedAttendance,
      copiedFrom: {
        timeTableCellDateWiseId: sourceDateWiseId,
        timeTableCellId: sourcePeriod.timeTableCellId,
        date,
        studentCount: sourceRows.length,
        classSectionTermId: sourcePlacement.classSectionTermId,
        term: sourcePlacement.term,
        year: sourcePlacement.year,
      },
      markedPeriods: pendingTargetIds,
      skippedPeriods: skippedTargetIds,
    };
  } catch (error) {
    await t.rollback();
    console.error('Error copying attendance period:', error);
    throw error;
  }
};

function getPeriodSubjectInfo(periodItem) {
  const cell = periodItem.timeTableCell || periodItem;

  if (cell.isSameTeacher && cell.timeTableTeacherSubject?.employeeSubject) {
    const subject = cell.timeTableTeacherSubject.employeeSubject;
    return { subjectId: subject.subjectId, subjectName: subject.subjectName };
  }

  if (cell.timeTableSubject) {
    return {
      subjectId: cell.timeTableSubject.subjectId,
      subjectName: cell.timeTableSubject.subjectName,
    };
  }

  if (cell.timeTableElective) {
    return {
      subjectId: cell.timeTableElective.electiveSubjectId,
      subjectName: cell.timeTableElective.electiveSubjectName,
    };
  }

  return { subjectId: null, subjectName: null };
}

function mapCopyPeriodItem(periodItem) {
  const plain = periodItem.get ? periodItem.get({ plain: true }) : periodItem;
  const cell = plain.timeTableCell;
  const subject = getPeriodSubjectInfo(cell);
  const structurePeriod = cell.timeTablecreation ?? {};
  const targetPlacement = resolveDateWiseRoutinePlacement(plain);

  return {
    timeTableCellDateWiseId: plain.timeTableCellDateWiseId,
    timeTableCellId: plain.timeTableCellId,
    classSectionTermId: targetPlacement.classSectionTermId,
    period: cell.period,
    periodName: structurePeriod.periodName ?? null,
    startTime: structurePeriod.startTime ?? null,
    endTime: structurePeriod.endTime ?? null,
    subjectId: subject.subjectId,
    subjectName: subject.subjectName,
    userId: getPeriodTeacherUserId(plain),
  };
}

function mapCurrentPeriod(sourcePeriod, date, isMarked) {
  const subject = getPeriodSubjectInfo(sourcePeriod);
  const structurePeriod = sourcePeriod.timeTablecreation ?? {};

  return {
    timeTableCellDateWiseId: sourcePeriod.timeTableCellDateWiseId,
    timeTableCellId: sourcePeriod.timeTableCellId,
    classSectionTermId: sourcePeriod.classSectionTermId,
    date,
    day: sourcePeriod.day,
    period: sourcePeriod.period,
    periodName: structurePeriod.periodName ?? null,
    startTime: structurePeriod.startTime ?? null,
    endTime: structurePeriod.endTime ?? null,
    subjectId: subject.subjectId,
    subjectName: subject.subjectName,
    userId: getPeriodTeacherUserId(sourcePeriod),
    isMarked,
  };
}

async function getCopyToPeriodsForSameDay(sourcePeriod, date) {
  const laterPeriods = await attendanceService.getNextDateWisePeriodsOnSameDay(
    sourcePeriod.timeTableRoutineId,
    date,
    sourcePeriod.period,
  );

  if (!laterPeriods.length) {
    return [];
  }

  const candidateIds = [];
  for (const periodItem of laterPeriods) {
    candidateIds.push(Number(periodItem.timeTableCellDateWiseId));
  }

  const markedIds = await attendanceService.getMarkedDateWiseIds(candidateIds);
  const copyToPeriods = [];
  const sourceUserId = getPeriodTeacherUserId(sourcePeriod);

  for (const periodItem of laterPeriods) {
    const targetDateWiseId = Number(periodItem.timeTableCellDateWiseId);
    if (targetDateWiseId === Number(sourcePeriod.timeTableCellDateWiseId)) {
      continue;
    }

    const targetUserId = getPeriodTeacherUserId(periodItem);
    if (sourceUserId != null && targetUserId != null && sourceUserId !== targetUserId) {
      continue;
    }

    const targetPlacement = resolveDateWiseRoutinePlacement(periodItem);
    const isMarked = markedIds.has(targetDateWiseId);
    const canCopy = canCopyPeriodToTarget(sourcePeriod, targetPlacement) && !isMarked;

    if (!canCopy) {
      continue;
    }

    copyToPeriods.push(mapCopyPeriodItem(periodItem));
  }

  return copyToPeriods;
}

export async function getCopyAttendanceNextPeriods(query) {
  const timeTableCellDateWiseId = Number(query.timeTableCellDateWiseId);
  const sourcePeriod = await resolveSourcePeriodByDateWiseId(timeTableCellDateWiseId);
  const date = sourcePeriod.date;

  const sourceIsMarked = await attendanceService.checkAttendanceExists(timeTableCellDateWiseId);
  if (!sourceIsMarked) {
    throw new Error('No attendance found for the source period');
  }

  const currentPeriod = mapCurrentPeriod(sourcePeriod, date, true);
  const copyToPeriods = await getCopyToPeriodsForSameDay(sourcePeriod, date);

  return {
    date,
    classSectionTermId: sourcePeriod.classSectionTermId,
    subjectId: currentPeriod.subjectId,
    subjectName: currentPeriod.subjectName,
    currentPeriod,
    copyToPeriods,
  };
};

export async function getAttendanceDetails(page, limit, search) {
  const result = await attendanceService.getAttendanceDetails();
  const groupedData = {};
  for (const record of result) {
    const {
      attendanceId,
      timeTableCellDateWise,
      classAttendance,
      studentAttendance,
      studentId,
      attendanceStatus,
      date,
      description,
      notes
    } = record;

    const cell = timeTableCellDateWise?.timeTableCell;
    const recordDate = new Date(date).toISOString().split('T')[0];

    let subjectId = null;
    let subjectName = null;
    let subjectCode = null;
    let userId = null;

    if (cell) {
      subjectId = cell.timeTableSubject?.subjectId || cell.subjectId;
      subjectName = cell.timeTableSubject?.subjectName;
      subjectCode = cell.timeTableSubject?.subjectCode;
      if (cell.isSameTeacher && cell.timeTableTeacherSubject?.employeeSubject) {
        subjectId = cell.timeTableTeacherSubject.employeeSubject.subjectId;
        subjectName = cell.timeTableTeacherSubject.employeeSubject.subjectName;
        subjectCode = cell.timeTableTeacherSubject.employeeSubject.subjectCode;
      }
      const teachers = cell.timeTableCellTeachers || [];
      if (teachers.length) {
        userId = teachers[0].userId || teachers[0].employeeDetails?.userId;
      }
    }

    const classSectionsId = classAttendance?.classSectionsId;
    const sectionName = classAttendance?.section;
    const groupKey = `${subjectId}_${userId}_${classSectionsId}_${recordDate}`;
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        subjectId,
        subjectName,
        subjectCode,
        userId,
        classSectionId: classSectionsId,
        sectionName,
        date: recordDate,
        students: []
      };
    }
    groupedData[groupKey].students.push({
      studentId,
      attendanceId,
      scholarNumber: studentAttendance?.scholarNumber,
      fullName: [studentAttendance?.firstName, studentAttendance?.middleName, studentAttendance?.lastName]
        .filter(Boolean)
        .join(" "),
      firstName: studentAttendance?.firstName,
      middleName: studentAttendance?.middleName,
      lastName: studentAttendance?.lastName,
      attendanceStatus,
      date: recordDate,
      description,
      notes
    });
  }

  let grouped = Object.values(groupedData);

  if (search && String(search).trim()) {
    const term = String(search).trim().toLowerCase();
    grouped = grouped.filter(item => {
      const matchesSubject = (item.subjectName && item.subjectName.toLowerCase().includes(term)) ||
                            (item.subjectCode && item.subjectCode.toLowerCase().includes(term)) ||
                            (item.sectionName && item.sectionName.toLowerCase().includes(term));
      const matchesStudent = item.students.some(st => 
        (st.fullName && st.fullName.toLowerCase().includes(term)) ||
        (st.scholarNumber && st.scholarNumber.toLowerCase().includes(term))
      );
      return matchesSubject || matchesStudent;
    });
  }

  const total = grouped.length;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const start = (pageNum - 1) * limitNum;
  const paginated = grouped.slice(start, start + limitNum);

  return {
    rows: paginated,
    total,
  };
}

export async function updateAttendance(attendanceId, record, updatedBy) {
  try {
    record.updatedBy = updatedBy;
    const result = await attendanceService.updateAttendance(attendanceId, record);
    return result;
  } catch (error) {
    console.error(`Error updating Attendance:`, error);
    throw error;
  }
};

/* ----------------  Parse student string ---------------- */
function parseStudentString(studentString) {
  if (!studentString) return null;
  try {
    const [namePart, idsPart] = studentString.split("$");
    const [studentId, classSectionsId, timeTableCellDateWiseId] = idsPart
      .replace(/\s+/g, "")
      .split(/[%&]/);

    return {
      studentName: namePart,
      studentId: Number(studentId),
      classSectionsId: Number(classSectionsId),
      timeTableCellDateWiseId: Number(timeTableCellDateWiseId),
    };
  } catch (error) {
    console.error(" Error parsing student string:", studentString, error);
    return null;
  }
}

/* ----------------  Parse date column correctly ---------------- */
function parseExcelDate(dateString) {
  try {
    if (!dateString) return null;

    // Handle numeric Excel dates
    if (typeof dateString === 'number') {
      const date = xlsx.SSF.parse_date_code(dateString);
      return moment(new Date(date.y, date.m - 1, date.d)).format("YYYY-MM-DD");
    }

    const parsed = moment(dateString, ["D MMMM YYYY", "YYYY-MM-DD", "DD-MM-YYYY"], true);
    if (!parsed.isValid()) return null;
    return parsed.format("YYYY-MM-DD");
  } catch {
    return null;
  }
}

/* ----------------  Validate required fields ---------------- */
function validateAttendanceRow(attendance) {
  const requiredFields = [
    "studentId",
    "classSectionsId",
    "timeTableCellDateWiseId",
    "timeTableCellId",
    "createdBy",
    "updatedBy",
    "attendanceStatus",
    "date",
  ];

  for (const field of requiredFields) {
    if (!attendance[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/* ----------------  Main Import Function ---------------- */
export async function importAttendanceData(excelData, commonData) {
  try {
    const dateColumns = Object.keys(excelData[0]).filter(
      (key) => key !== "Name" && key !== "Scholar No"
    );

    const dataRows = excelData.slice(1);
    let totalEntries = 0;

    for (const [index, row] of dataRows.entries()) {
      const parsedStudent = parseStudentString(row.Name);
      if (!parsedStudent) {
        throw new Error(`Row ${index + 2}: Invalid student name format`);
      }

      for (const dateCol of dateColumns) {
        const status = String(row[dateCol]).trim();

        if (!status) continue;

        if (status.toLowerCase() === 'undefined') {
          console.log(` Skipping entry where status is 'undefined' for date: ${dateCol}`);
          continue;
        }

        const date = parseExcelDate(dateCol);
        if (!date && !status) continue;

        const dateWise = await resolveSourcePeriodByDateWiseId(
          parsedStudent.timeTableCellDateWiseId,
        );

        const attendanceEntry = {
          studentId: parsedStudent.studentId,
          classSectionsId: parsedStudent.classSectionsId,
          timeTableCellDateWiseId: parsedStudent.timeTableCellDateWiseId,
          timeTableCellId: dateWise.timeTableCellId,
          date,
          attendanceStatus: status,
          ...commonData,
        };

        const error = validateAttendanceRow(attendanceEntry);
        if (error) {
          throw new Error(
            `Row ${index + 2} (${parsedStudent.studentName}) — ${error}`
          );
        }
        await attendanceService.addImportAttendance(attendanceEntry);
        totalEntries++;
      }
    }

    return {
      success: true,
      message: `Attendance imported successfully. Total entries: ${totalEntries}`,
    };
  } catch (error) {
    console.error(" Error importing attendance data:", error.message);
    return { success: false, error: error.message };
  }
};


export async function getAttendanceByDate(date, classSectionTermId, userId) {
  const data = await attendanceService.getAttendanceByDate(date, classSectionTermId, userId);

  const { attendanceDetails = [], subjectDetail = {} } = data;

  const grouped = {};

  attendanceDetails.forEach(att => {
    const classAtt = att.classAttendance;
    if (!classAtt) return;

    const courseName = classAtt.courseSection?.courseName || '';
    const className = classAtt.year != null ? String(classAtt.year) : '';
    const sectionName = classAtt.section || '';
    const dateStr = att.date?.toISOString().split('T')[0] || '';

    //  Subject comes from subjectDetail, not courseSection
    const subjectName = subjectDetail?.employeeSubject?.subjects?.subjectName || '';

    const key = `${courseName}-${className}-${sectionName}-${subjectName}-${dateStr}`;

    if (!grouped[key]) {
      grouped[key] = {
        course: courseName,
        class: className,
        section: sectionName,
        subject: subjectName,
        date: dateStr,
        students: []
      };
    }

    // Add student
    grouped[key].students.push({
      attendanceId: att.attendanceId,
      firstName: att.studentAttendance?.firstName || '',
      scholarNumber: att.studentAttendance?.scholarNumber || '',
      enrollNumber: att.studentAttendance?.enrollNumber || '',
      attendanceStatus: att.attendanceStatus || '',
      notes: att.notes || ''
    });
  });

  return {
    // originalData: data,
    groupedData: Object.values(grouped)
  };
};



export async function getPreviousSessions(userId) {
  const sessions = await attendanceService.getTeacherDateWiseSessions(userId);

  if (!Array.isArray(sessions) || !sessions.length) {
    return { data: [] };
  }

  const today = moment().format('YYYY-MM-DD');
  const pastSessions = [];
  for (const session of sessions) {
    const plain = session.get({ plain: true });
    if (plain.date < today) {
      pastSessions.push(plain);
    }
  }

  if (!pastSessions.length) {
    return { data: [] };
  }

  const dateWiseIds = [];
  for (const session of pastSessions) {
    dateWiseIds.push(Number(session.timeTableCellDateWiseId));
  }

  const markedMap = await attendanceService.getAttendanceMarkedMap({ dateWiseIds }) || {};
  const presentMap = await attendanceService.getAttendanceMap({ dateWiseIds }) || {};
  const studentCountCache = {};
  const flatData = [];

  for (const session of pastSessions) {
    const cell = session.timeTableCell;
    const routine = cell.timeTableRoutine;
    const term = routine.timeTableClassSectionTerm;
    const section = term?.classSection;
    const sectionId = section?.classSectionsId || term?.classSectionsId;
    if (!sectionId) {
      continue;
    }

    if (studentCountCache[sectionId] == null) {
      studentCountCache[sectionId] = await attendanceService.getStudentCount(sectionId);
    }

    const totalStudents = studentCountCache[sectionId] || 0;
    const dwKey = `dw:${session.timeTableCellDateWiseId}`;
    const presentCount = presentMap[dwKey];
    const isMarked = (markedMap[dwKey] || 0) > 0;
    const programYear = resolveProgramYear(section);
    const subjectName = cell.timeTableSubject?.subjectName
      || cell.timeTableElective?.electiveSubjectName
      || 'N/A';

    flatData.push({
      date: session.date,
      day: cell.day,
      period: cell.period,
      subject: subjectName,
      class: (programYear != null ? `Year ${programYear}` : null)
        || (section?.year != null ? String(section.year) : null)
        || null,
      section: section?.section || null,
      classSectionsId: sectionId,
      attendance: `${presentCount ?? 0} / ${totalStudents}`,
      status: isMarked ? 'MARKED' : 'PENDING',
      timeTableCellDateWiseId: session.timeTableCellDateWiseId,
      timeTableCellId: session.timeTableCellId,
    });
  }

  flatData.sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date);
    if (dateDiff !== 0) return dateDiff;
    return (Number(a.period) || 0) - (Number(b.period) || 0);
  });

  return {
    fromDate: flatData.length ? flatData[flatData.length - 1].date : null,
    toDate: flatData.length ? flatData[0].date : null,
    data: flatData,
  };
};

export async function getStudentAttendanceReport(classSectionsId, subjectId, userId) {
  const students = await attendanceService.getStudentAttendanceReport(classSectionsId, subjectId, userId);

  return students;

};

export async function getEmployeeSectionDates(classSectionTermId, subjectId, userId) {
  const placement = await resolveAttendancePlacement(classSectionTermId);
  const [scheduleItems, details] = await Promise.all([
    employeeScheduleRepository.getEmployeeSectionDateWiseRows(
      placement.classSectionTermId,
      subjectId,
      userId,
    ),
    attendanceService.getDetailsByTerm(placement.classSectionTermId, subjectId, userId),
  ]);

  const dateMap = {};

  for (const item of scheduleItems) {
    const plain = item.get({ plain: true });
    const cell = plain.timeTableCell;
    const routine = cell.timeTableRoutine;
    const dateKey = plain.date;

    if (!dateMap[dateKey]) {
      dateMap[dateKey] = {
        date: dateKey,
        day: cell.day,
        timeTableRoutineId: routine.timeTableRoutineId,
        periods: [],
      };
    }

    dateMap[dateKey].periods.push({
      timeTableCellDateWiseId: plain.timeTableCellDateWiseId,
      timeTableCellId: plain.timeTableCellId,
      timeTableCreationId: cell.timeTablecreation?.timeTableCreationId,
      periodName: cell.timeTablecreation?.periodName,
      startTime: cell.timeTablecreation?.startTime,
      endTime: cell.timeTablecreation?.endTime,
    });
  }

  const dates = Object.values(dateMap).map((dayData) => {
    dayData.periods.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    return dayData;
  }).sort((a, b) => a.date.localeCompare(b.date));

  return {
    details,
    dates,
  };
}

const LEAVE_STATUS_SET = new Set(["Approved Leave", "Duty Leave", "Sports Leave", "NCC Leave"]);

export async function getStudentsBatchAttendance(classSectionTermId, filters = []) {
  const placement = await resolveAttendancePlacement(classSectionTermId);

  const dateWiseIds = [];
  const templateAttendance = {};
  if (Array.isArray(filters)) {
    for (let i = 0; i < filters.length; i++) {
      const id = Number(filters[i]?.timeTableCellDateWiseId);
      if (id) {
        dateWiseIds.push(id);
        templateAttendance[id] = null;
      }
    }
  }

  if (dateWiseIds.length > 0) {
    await assertDateWiseCellsBelongToTerm(dateWiseIds, placement.classSectionTermId);
  }

  const rawStudents = await attendanceService.getStudentsBatchAttendance(
    placement.classSectionTermId,
    filters,
  );

  const len = rawStudents.length;
  const students = new Array(len);

  for (let i = 0; i < len; i++) {
    const row = rawStudents[i];
    const s = row.get ? row.get({ plain: true }) : row;
    const records = s.studentAttendance || [];

    const attendance = { ...templateAttendance };
    let present = 0;
    let absent = 0;
    let leave = 0;
    let medical = 0;
    let holiday = 0;

    const rLen = records.length;
    for (let j = 0; j < rLen; j++) {
      const rec = records[j];
      const cellId = rec.timeTableCellDateWiseId;
      const status = rec.attendanceStatus;

      if (cellId && status) {
        attendance[cellId] = status.toUpperCase();

        if (status === "Present") {
          present++;
        } else if (status === "Absent") {
          absent++;
        } else if (status === "Medical Leave") {
          medical++;
        } else if (status === "Holiday") {
          holiday++;
        } else if (LEAVE_STATUS_SET.has(status)) {
          leave++;
        }
      }
    }

    const totalEvaluated = present + absent + medical + leave;
    const attended = present + leave + medical;
    const percentage = totalEvaluated > 0
      ? decimalDivide(decimalMultiply(attended, 100), totalEvaluated)
      : 0;

    let studentName = s.firstName || '';
    if (s.middleName) studentName += ' ' + s.middleName;
    if (s.lastName) studentName += ' ' + s.lastName;

    students[i] = {
      studentId: s.studentId,
      studentName,
      scholarNumber: s.scholarNumber,
      enrollNumber: s.enrollNumber ?? null,
      summary: {
        present,
        leave,
        absent,
        medical,
        holiday,
        percentage,
      },
      attendance,
      studentAttendance: records,
    };
  }

  return { students };
}

/* ----------------  Extract Student ID from Name ---------------- */
function extractStudentIdFromName(nameStr) {
  if (!nameStr) return null;
  // Format: "12---Raven"
  if (nameStr.includes("---")) {
    const parts = nameStr.split("---");
    const id = parseInt(parts[0].trim());
    return isNaN(id) ? null : id;
  }
  return null;
}

/* ----------------  Parse Header to Column Mappings ---------------- */
function parseAttendanceExcelHeaders(header1, header2) {
  const colMappings = [];
  // Standard columns: 0 (Name), 1 (Scholar No) - Attendance starts from column 2
  for (let i = 2; i < header2.length; i++) {
    const periodCell = header2[i];
    if (!periodCell || (typeof periodCell !== 'string') || !periodCell.includes("---")) continue;

    const mappingIdStr = periodCell.split("---")[1].trim();
    const timeTableCellDateWiseId = parseInt(mappingIdStr);
    if (isNaN(timeTableCellDateWiseId)) continue;

    let dateStr = null;
    for (let j = i; j >= 2; j--) {
      if (header1[j]) {
        dateStr = header1[j];
        break;
      }
    }

    if (!dateStr) throw new Error(`Date missing for column ${i + 1} (${periodCell})`);

    const date = parseExcelDate(dateStr);
    if (!date) throw new Error(`Invalid date format in header at column ${i + 1}: ${dateStr}`);

    colMappings.push({ colIndex: i, date, timeTableCellDateWiseId });
  }
  return colMappings;
}

/* ----------------  Parse Body rows to raw Entries ---------------- */
function parseAttendanceExcelRows(dataRows, colMappings) {
  const studentIds = new Set();
  const rawEntries = [];

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    const nameStr = row[0]?.toString().trim();
    if (!nameStr) continue;

    const studentId = extractStudentIdFromName(nameStr);
    if (!studentId) continue;

    studentIds.add(studentId);

    for (const mapping of colMappings) {
      const statusVal = row[mapping.colIndex];

      if (statusVal === undefined || statusVal === null || statusVal === '') {
        throw new Error(`Row ${r + 3}: Attendance status is missing for Student ${nameStr} at column ${mapping.colIndex + 1}. Whether fill it or remove column`);
      }

      const status = statusVal.toString().trim();
      if (!ATTENDANCE_STATUS.includes(status)) {
        throw new Error(`Row ${r + 3}: Invalid status '${status}' for Student ${nameStr}. Allowed values: ${ATTENDANCE_STATUS.join(", ")}`);
      }

      rawEntries.push({
        studentId,
        studentName: nameStr,
        date: mapping.date,
        timeTableCellDateWiseId: mapping.timeTableCellDateWiseId,
        attendanceStatus: status,
        rowIndex: r + 3
      });
    }
  }
  return { studentIds: Array.from(studentIds), rawEntries };
}

/* ----------------  Validate and Batch Prepare Records ---------------- */
async function prepareFinalAttendanceRecords(rawEntries, studentIds, commonData) {
  const studentRecords = await attendanceService.getStudentsByIds(studentIds);
  const studentMap = new Map();
  studentRecords.forEach(s => studentMap.set(s.studentId, s));

  const dateWiseCache = new Map();
  const finalRecords = [];
  for (const entry of rawEntries) {
    const student = studentMap.get(entry.studentId);
    if (!student) {
      throw new Error(`Row ${entry.rowIndex}: Student with ID ${entry.studentId} not found in this institute.`);
    }

    let dateWise = dateWiseCache.get(entry.timeTableCellDateWiseId);
    if (!dateWise) {
      dateWise = await resolveSourcePeriodByDateWiseId(entry.timeTableCellDateWiseId);
      dateWiseCache.set(entry.timeTableCellDateWiseId, dateWise);
    }

    const attendanceEntry = {
      studentId: entry.studentId,
      classSectionsId: resolveStudentClassSectionsId(
        typeof student.get === "function" ? student.get({ plain: true }) : student,
      ),
      timeTableCellDateWiseId: entry.timeTableCellDateWiseId,
      timeTableCellId: dateWise.timeTableCellId,
      date: entry.date,
      attendanceStatus: entry.attendanceStatus,
      ...commonData,
    };

    const error = validateAttendanceRow(attendanceEntry);
    if (error) throw new Error(`Row ${entry.rowIndex} (Student ID ${entry.studentId}): ${error}`);

    const isExists = await attendanceService.checkAttendanceExists(attendanceEntry.timeTableCellDateWiseId);
    if (isExists) {
      throw new Error(`Row ${entry.rowIndex}: Attendance already marked for Student ID ${entry.studentId} on ${entry.date} for date-wise ${entry.timeTableCellDateWiseId}`);
    }

    finalRecords.push(attendanceEntry);
  }
  return finalRecords;
}

export async function importBulkAttendanceData(fileBuffer, commonData) {
  const t = await sequelize.transaction();
  try {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 3) throw new Error("Invalid Excel format: At least 3 rows required.");

    const colMappings = parseAttendanceExcelHeaders(rows[0], rows[1]);
    if (colMappings.length === 0) throw new Error("No valid attendance periods found in Excel header.");

    const { studentIds, rawEntries } = parseAttendanceExcelRows(rows.slice(2), colMappings);
    if (rawEntries.length === 0) throw new Error("No attendance data found in the Excel sheet.");

    const finalRecords = await prepareFinalAttendanceRecords(rawEntries, studentIds, commonData);

    if (finalRecords.length > 0) {
      await attendanceService.addAttendance(finalRecords, { transaction: t });
    }

    await t.commit();
    return {
      success: true,
      message: `Bulk attendance imported successfully. Total entries: ${finalRecords.length}`,
    };
  } catch (error) {
    if (t) await t.rollback();
    console.error("Error in importBulkAttendanceData:", error.message);
    return { success: false, error: error.message };
  }
}
