import * as lesson from "../repository/lessonRepository.js";
import * as lectureWindowRepository from "../repository/lectureWindowRepository.js";
import sequelize from '../database/sequelizeConfig.js';
import { resolveSourcePeriodByDateWiseId } from '../utility/attendancePlacement.js';
import * as timeTableCreateServices from './timeTableCreateServices.js';
import { timeTableCellDateWiseModel } from '../models/index.js';
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function toDateOnlyString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentWeekRange(anchorDate) {
  const base = new Date(`${anchorDate}T00:00:00`);
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const dayDates = {};
  for (let i = 0; i < WEEK_DAYS.length; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dayDates[WEEK_DAYS[i]] = toDateOnlyString(d);
  }

  const startDate = toDateOnlyString(monday);
  const endDate = toDateOnlyString(sunday);

  const previousMonday = new Date(monday);
  previousMonday.setDate(monday.getDate() - 7);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  return {
    startDate,
    endDate,
    anchorDate,
    dayDates,
    previousWeekDate: toDateOnlyString(previousMonday),
    nextWeekDate: toDateOnlyString(nextMonday),
  };
}

function formatDateKey(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return toDateOnlyString(new Date(value));
}

function resolveViewerTeacher(teachers, userId) {
  if (userId == null) {
    return teachers?.[0] || null;
  }
  for (const teacher of teachers || []) {
    if (Number(teacher.userId) === Number(userId)) {
      return teacher;
    }
  }
  return teachers?.[0] || null;
}

function mapDateWiseRow(row, userId) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const cell = plain.timeTableCell || {};
  const routine = cell.timeTableRoutine || {};
  const termRow = routine.timeTableClassSectionTerm || {};
  const section = termRow.classSection || {};
  const viewerTeacher = resolveViewerTeacher(plain.timeTableCellTeachersDateWise, userId);

  return {
    timeTableCellDateWiseId: plain.timeTableCellDateWiseId,
    timeTableCellId: Number(plain.timeTableCellId),
    date: formatDateKey(plain.date),
    day: cell.day || null,
    period: cell.period || null,
    timeTableCreationId: cell.timeTableCreationId || null,
    periodName: cell.timeTablecreation?.periodName || null,
    startTime: cell.timeTablecreation?.startTime || null,
    endTime: cell.timeTablecreation?.endTime || null,
    subjectId: cell.subjectId || cell.timeTableSubject?.subjectId || null,
    subjectName: cell.timeTableSubject?.subjectName || null,
    timeTableType: cell.timeTableType || null,
    teacherType: viewerTeacher?.teacherType || null,
    isAttendence: viewerTeacher?.isAttendence ?? null,
    userId: viewerTeacher?.userId != null
      ? Number(viewerTeacher.userId)
      : (userId != null ? Number(userId) : null),
    classRoomSectionId: plain.classRoomSectionId ?? null,
    roomNumber: plain.classRoom?.roomNumber ?? null,
    timeTableRoutineId: cell.timeTableRoutineId || routine.timeTableRoutineId || null,
    classSectionTermId: routine.classSectionTermId ?? termRow.classSectionTermId ?? null,
    classSectionsId: termRow.classSectionsId ?? section.classSectionsId ?? null,
    year: section.year ?? null,
    section: section.section ?? null,
    term: termRow.term ?? null,
  };
}

function buildDateWiseLookup(dateWiseCells) {
  const lookup = new Map();
  for (const item of dateWiseCells) {
    if (!item.timeTableCellId || !item.date) continue;
    lookup.set(`${item.timeTableCellId}|${item.date}`, item);
  }
  return lookup;
}

function mapLessonPlanSummary(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const topic = plain.mappingTopic || {};
  const lessonRow = topic.lessonTopic || {};
  const window = lessonRow.lectureWindow || {};

  const subTopics = [];
  const subTopicNames = [];
  for (const sub of topic.subTopic || []) {
    subTopics.push({
      subTopicId: sub.subTopicId,
      name: sub.name || null,
    });
    if (sub.name) {
      subTopicNames.push(sub.name);
    }
  }

  return {
    lessonMappingId: plain.lessonMappingId,
    timeTableCellDateWiseId: plain.timeTableCellDateWiseId != null
      ? Number(plain.timeTableCellDateWiseId)
      : null,
    lessonId: lessonRow.lessonId || null,
    lessonName: lessonRow.name || null,
    topicId: topic.topicId || plain.topicId || null,
    topicName: topic.name || null,
    subTopics,
    subTopicName: subTopicNames.length > 0 ? subTopicNames.join(', ') : null,
    lectureWindowId: lessonRow.lectureWindowId || window.lectureWindowId || null,
    lectureWindowName: window.name || null,
    note: plain.note || null,
    lectureUrl: plain.lectureUrl || null,
    file: plain.file || null,
    status: plain.status || null,
    completeDate: plain.completeDate || null,
  };
}

function buildLessonPlanLookup(rows) {
  const lookup = new Map();
  for (const row of rows || []) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const dateWiseId = Number(plain.timeTableCellDateWiseId);
    if (!dateWiseId || lookup.has(dateWiseId)) {
      continue;
    }
    lookup.set(dateWiseId, mapLessonPlanSummary(plain));
  }
  return lookup;
}

function enrichPublishedRoutines(routines, week, dateWiseLookup, lessonPlanLookup, userId) {
  const published = [];

  for (const routine of routines || []) {
    if (!routine.isPublished) {
      continue;
    }

    for (const period of routine.periods || []) {
      for (const day of period.days || []) {
        const dayDate = week.dayDates[day.name] || null;
        day.date = dayDate;
        day.timeTableCellId = null;
        day.timeTableCellDateWiseId = null;
        day.teacherType = null;

        for (const item of day.scheduleItems || []) {
          const viewerTeacher = resolveViewerTeacher(item.teachers, userId);
          const cellId = item.timeTableCellId != null
            ? Number(item.timeTableCellId)
            : (viewerTeacher?.timeTableCellId != null
              ? Number(viewerTeacher.timeTableCellId)
              : null);

          let dateWiseId = null;
          let matched = null;
          if (cellId != null && dayDate != null) {
            matched = dateWiseLookup.get(`${cellId}|${dayDate}`);
            if (matched) {
              dateWiseId = matched.timeTableCellDateWiseId;
            }
          }

          item.timeTableCellId = cellId;
          item.timeTableCellDateWiseId = dateWiseId;
          item.teacherType = viewerTeacher?.teacherType || null;
          item.userId = viewerTeacher?.userId != null
            ? Number(viewerTeacher.userId)
            : (userId != null ? Number(userId) : null);
          item.lessonPlan = dateWiseId != null
            ? (lessonPlanLookup.get(Number(dateWiseId)) || null)
            : null;
        }
      }
    }

    published.push(routine);
  }

  return published;
}

export async function getRoutineByTeacherForLesson(userId, courseId, sessionId, subjectId, date) {
  const week = getCurrentWeekRange(date || toDateOnlyString(new Date()));

  const [result, dateWiseRows] = await Promise.all([
    timeTableCreateServices.getRoutineByTeacherAndAcademicYear(
      userId,
      courseId,
      sessionId,
      subjectId,
    ),
    lesson.getTeacherWeekDateWiseCells({
      userId,
      courseId,
      sessionId,
      subjectId,
      startDate: week.startDate,
      endDate: week.endDate,
    }),
  ]);

  const dateWiseCells = [];
  const dateWiseIds = [];
  for (const row of dateWiseRows) {
    const mapped = mapDateWiseRow(row, userId);
    dateWiseCells.push(mapped);
    if (mapped.timeTableCellDateWiseId != null) {
      dateWiseIds.push(mapped.timeTableCellDateWiseId);
    }
  }

  const lessonPlanRows = await lesson.getLessonPlanSummariesByDateWiseIds(dateWiseIds);
  const dateWiseLookup = buildDateWiseLookup(dateWiseCells);
  const lessonPlanLookup = buildLessonPlanLookup(lessonPlanRows);
  const routines = enrichPublishedRoutines(
    result.routines || [],
    week,
    dateWiseLookup,
    lessonPlanLookup,
    userId,
  );

  return {
    employee: result.employee,
    course: result.course,
    session: result.session,
    classSections: result.classSections,
    week: {
      week: 'current',
      startDate: week.startDate,
      endDate: week.endDate,
      anchorDate: week.anchorDate,
      previousWeekDate: week.previousWeekDate,
      nextWeekDate: week.nextWeekDate,
    },
    routines,
  };
}

export async function addLesson(data, createdBy, updatedBy) {
    const window = await lectureWindowRepository.getLectureWindowById(
        data.lectureWindowId,
        data.academicYearId,
    );
    if (!window) {
        throw new Error("Lecture window not found");
    }

    const payload = {
        ...data,
        lectureWindowId: window.lectureWindowId,
        createdBy,
        updatedBy,
    };
    return lesson.addLesson(payload);
}

export async function getLessonDetails(academicYearId) {
    return await lesson.getLessonDetails(academicYearId);
}

export async function getSingleLessonDetails(lessonId) {
    return await lesson.getSingleLessonDetails(lessonId);
}

export async function addTopice(data, createdBy, updatedBy) {
    try {
        const payload = {
            ...data,
            createdBy,
            updatedBy,
        };
        return await lesson.addTopic(payload);
    } catch (error) {
        console.error("Error in add topic:", error);
        throw error;
    }
}

export async function updateTopic(topicId, data, updatedBy) {
  const payload = { updatedBy };
  if (data.name !== undefined) {
    payload.name = data.name;
  }
  if (data.description !== undefined) {
    payload.description = data.description;
  }
  if (data.lessonId !== undefined) {
    payload.lessonId = Number(data.lessonId);
  }

  const updated = await lesson.updateTopic(topicId, payload);
  if (!updated) {
    throw Object.assign(new Error('Topic not found'), { statusCode: 404 });
  }
  return updated;
}

export async function deleteTopic(topicId) {
  const transaction = await sequelize.transaction();
  try {
    const deleted = await lesson.deleteTopic(topicId, transaction);
    if (!deleted) {
      throw Object.assign(new Error('Topic not found'), { statusCode: 404 });
    }
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function updateLesson(lessonId, data, updatedBy) {
  const payload = { updatedBy };
  if (data.name !== undefined) {
    payload.name = data.name;
  }
  if (data.description !== undefined) {
    payload.description = data.description;
  }
  if (data.subjectId !== undefined) {
    payload.subjectId = Number(data.subjectId);
  }
  if (data.sessionId !== undefined) {
    payload.sessionId = Number(data.sessionId);
  }
  if (data.userId !== undefined) {
    payload.userId = Number(data.userId);
  }
  if (data.lectureWindowId !== undefined) {
    if (data.lectureWindowId != null) {
      const window = await lectureWindowRepository.getLectureWindowById(
        data.lectureWindowId,
        data.academicYearId,
      );
      if (!window) {
        throw Object.assign(new Error('Lecture window not found'), { statusCode: 404 });
      }
      payload.lectureWindowId = window.lectureWindowId;
    } else {
      payload.lectureWindowId = null;
    }
  }

  const updated = await lesson.updateLesson(lessonId, payload);
  if (!updated) {
    throw Object.assign(new Error('Lesson not found'), { statusCode: 404 });
  }
  return updated;
}

export async function deleteLesson(lessonId) {
  const transaction = await sequelize.transaction();
  try {
    const deleted = await lesson.deleteLesson(lessonId, transaction);
    if (!deleted) {
      throw Object.assign(new Error('Lesson not found'), { statusCode: 404 });
    }
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function resolveMappingDateWiseIdFromPayload(data, transaction) {
  if (data.timeTableCellDateWiseId != null) {
    return Number(data.timeTableCellDateWiseId);
  }

  if (data.timeTableCellId != null && data.date != null) {
    const dateWiseRow = await lesson.getDateWiseCellByCellIdAndDate(
      data.timeTableCellId,
      data.date,
      transaction,
    );
    return dateWiseRow?.timeTableCellDateWiseId ?? null;
  }

  return null;
}

export async function addMapping(data, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    const resolvedDateWiseId = await resolveMappingDateWiseIdFromPayload(data, transaction);

    if (!resolvedDateWiseId) {
      throw Object.assign(
        new Error("timeTableCellDateWiseId is required"),
        { statusCode: 400 },
      );
    }

    const period = await timeTableCellDateWiseModel.findByPk(resolvedDateWiseId, { transaction });
    if (!period) {
      throw Object.assign(new Error("Scheduled period not found"), { statusCode: 404 });
    }

    const payload = {
      topicId: data.topicId,
      timeTableCellDateWiseId: period.timeTableCellDateWiseId,
      timeTableCellId: period.timeTableCellId,
      date: period.date,
      completeDate: data.completeDate || null,
      note: data.note || null,
      lectureUrl: data.lectureUrl || null,
      file: data.file || null,
      status: data.status || 'inComplete',
      createdBy,
      updatedBy,
    };

    await lesson.addLessionMapping(payload, transaction);

    if (data.subTopic && Array.isArray(data.subTopic)) {
      for (const sub of data.subTopic) {
        const subTopicData = {
          name: sub.name,
          description: sub.description || null,
          topicId: data.topicId,
          createdBy,
          updatedBy,
        };
        await lesson.addSubTopic(subTopicData, transaction);
      }
    }

    await transaction.commit();
    return { message: "Lesson mapping and sub-topics added successfully" };
  } catch (error) {
    await transaction.rollback();
    console.error("Error in addMapping:", error);
    throw error;
  }
}

/**
 * Copy an existing lesson/topic mapping onto one or more date-wise periods.
 */
export async function copyMapping(data, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    const source = await lesson.getLessonMappingById(data.sourceLessonMappingId, transaction);
    if (!source) {
      throw Object.assign(new Error("Source lesson mapping not found"), { statusCode: 404 });
    }

    const note = data.note !== undefined ? data.note : source.note;
    const lectureUrl = data.lectureUrl !== undefined ? data.lectureUrl : source.lectureUrl;
    const file = data.file !== undefined ? data.file : source.file;

    const copied = [];

    for (const target of data.targets) {
      const period = await resolveSourcePeriodByDateWiseId(
        Number(target.timeTableCellDateWiseId),
        { transaction },
      );

      const row = await lesson.addLessionMapping(
        {
          topicId: source.topicId,
          timeTableCellDateWiseId: period.timeTableCellDateWiseId,
          timeTableCellId: period.timeTableCellId,
          date: period.date,
          completeDate: null,
          note,
          lectureUrl,
          file,
          status: "inComplete",
          createdBy,
          updatedBy,
        },
        transaction,
      );

      copied.push({
        lessonMappingId: row.lessonMappingId,
        topicId: row.topicId,
        timeTableCellDateWiseId: row.timeTableCellDateWiseId,
        timeTableCellId: row.timeTableCellId,
        date: row.date,
        status: row.status,
      });
    }

    await transaction.commit();
    return {
      message: `Lesson mapping copied to ${copied.length} period(s) successfully`,
      copied,
      sourceLessonMappingId: Number(data.sourceLessonMappingId),
    };
  } catch (error) {
    await transaction.rollback();
    console.error("Error in copyMapping:", error);
    throw error;
  }
}

function pickTeacherFromCell(cell) {
  const teachers = cell.timeTableCellTeachers || [];
  for (const teacher of teachers) {
    if (teacher.employeeDetails) {
      return teacher.employeeDetails;
    }
  }
  const tsmEmp = cell.timeTableTeacherSubject?.teacherEmployeeData
    || cell.timeTableTeacherSubject?.employeeDetails;
  return tsmEmp || null;
}

export async function getMapping(academicYearId) {
  try {
    const originalData = await lesson.getMapping(academicYearId);

    const grouped = {};
    const plainData = [];

    for (const row of originalData) {
      const item = row.get ? row.get({ plain: true }) : row;
      plainData.push(item);

      const dateWise = item.timeTableCellDateWise;
      const cell = dateWise?.timeTableCell;
      if (!cell) {
        continue;
      }

      const finalEmp = pickTeacherFromCell(cell);
      const empId = finalEmp?.userId || cell.timeTableCellId;

      if (!grouped[empId]) {
        grouped[empId] = {
          userId: finalEmp?.userId || null,
          employeeName: finalEmp?.employeeName || 'N/A',
          employeeCode: finalEmp?.employeeCode || 'N/A',
          pickColor: finalEmp?.pickColor || '#ccc',
          timeTables: []
        };
      }

      const ttCreate = cell.timeTableRoutine || {};
      const classSection = ttCreate.timeTableClassSectionTerm?.classSection
        || ttCreate.timeTableClassSection
        || {};
      const subject = item.mappingTopic?.lessonTopic?.lessonSubject || {};
      const lessonRow = item.mappingTopic?.lessonTopic || {};
      const topic = item.mappingTopic || {};
      const subTopics = topic.subTopic || [];

      grouped[empId].timeTables.push({
        timeTableCellDateWiseId: dateWise.timeTableCellDateWiseId,
        timeTableCellId: cell.timeTableCellId,
        day: cell.day,
        date: item.date || dateWise.date,
        lectureUrl: item.lectureUrl,
        note: item.note,
        lessonMappingId: item.lessonMappingId,
        status: item.status,
        completeDate: item.completeDate,
        period: cell.period,
        timeTableType: cell.timeTableType,
        classSection,
        subject,
        lesson: {
          lessonId: lessonRow.lessonId,
          name: lessonRow.name,
          description: lessonRow.description
        },
        topic: {
          topicId: topic.topicId,
          name: topic.name,
          description: topic.description,
          subTopics
        }
      });
    }

    return {
      original: plainData,
      filtered: Object.values(grouped)
    };
  } catch (error) {
    console.error('Error in lesson service:', error);
    throw error;
  }
}

export async function updateMapping(completeDate, lessonMappingId) {
  try {
    const data = {
      completeDate,
      status: 'complete'
    };
    return await lesson.updateMapping(lessonMappingId, data);
  } catch (error) {
    console.error('Error updating mapping:', error);
    throw error;
  }
}

export async function updateCompleteMapping(lessonMappingId, data, updatedBy) {
  const transaction = await sequelize.transaction();
  try {
    const payload = {
      topicId: data.topicId,
      completeDate: data.completeDate || null,
      note: data.note || null,
      lectureUrl: data.lectureUrl || null,
      file: data.file || null,
      status: data.status || 'inComplete',
      updatedBy
    };

    if (data.timeTableCellDateWiseId != null) {
      const period = await resolveSourcePeriodByDateWiseId(
        Number(data.timeTableCellDateWiseId),
        { transaction },
      );
      payload.timeTableCellDateWiseId = period.timeTableCellDateWiseId;
      payload.timeTableCellId = period.timeTableCellId;
      payload.date = period.date;
    } else if (data.timeTableCellId != null && data.date != null) {
      payload.timeTableCellId = data.timeTableCellId;
      payload.date = data.date;
    }

    const updatedLesson = await lesson.updateLessionMapping(
      lessonMappingId,
      payload,
      transaction
    );

    if (data.subTopic && Array.isArray(data.subTopic)) {
      for (const sub of data.subTopic) {
        if (sub.subTopicId) {
          await lesson.updateSubTopic(
            sub.subTopicId,
            {
              name: sub.name,
              description: sub.description || null,
              updatedBy
            },
            transaction
          );
        }
      }
    }

    await transaction.commit();
    return updatedLesson;
  } catch (error) {
    await transaction.rollback();
    console.error("Error in updateCompleteMapping:", error);
    throw error;
  }
}

export async function deleteMapping(lessonMappingId) {
  const transaction = await sequelize.transaction();
  try {
    await lesson.deleteLessionMapping(lessonMappingId, transaction);
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error("Error in deleteMapping:", error);
    throw error;
  }
}

export async function getEmployeeSubjectAndLesson(userId, courseId, sessionId, subjectSearch, subjectId) {
    const data = await lesson.getEmployeeSubjectAndLesson(
        userId,
        courseId,
        sessionId,
        subjectSearch,
        subjectId,
    );

    return data.filter((item) => item?.employeeSubject?.subjectId != null);
}

export async function getSimpleLessonList(whereClause) {
    return await lesson.getSimpleLessonList(whereClause);
}

export async function linkLessonsToWindow(lectureWindowId, lessonIds, updatedBy, academicYearId) {
    const window = await lectureWindowRepository.getLectureWindowById(lectureWindowId, academicYearId);
    if (!window) {
        throw new Error("Lecture window not found");
    }

    return lectureWindowRepository.linkLessonsToWindow(lectureWindowId, lessonIds, updatedBy);
}

export async function getLectureWindowById(lectureWindowId, academicYearId) {
    return lectureWindowRepository.getLectureWindowById(lectureWindowId, academicYearId);
}

/**
 * Mapped lesson plans for teacher + subject (+ optional course/session/lesson/status).
 * Same source + shape as scheduleItems[].lessonPlan from getRoutineByTeacher,
 * so both endpoints stay consistent (no date window here — all cells).
 */
export async function getMappedLessonProgress({
  userId,
  subjectId,
  courseId,
  sessionId,
  lessonId,
  status,
}) {
  if (!Number.isFinite(Number(userId))) {
    throw Object.assign(new Error('A valid userId is required'), { statusCode: 400 });
  }
  if (!Number.isFinite(Number(subjectId))) {
    throw Object.assign(new Error('A valid subjectId is required'), { statusCode: 400 });
  }

  const dateWiseRows = await lesson.getTeacherWeekDateWiseCells({
    userId,
    courseId,
    sessionId,
    subjectId,
  });

  const dateWiseIds = [];
  for (const row of dateWiseRows) {
    const id = row.get ? row.get('timeTableCellDateWiseId') : row.timeTableCellDateWiseId;
    if (id != null) {
      dateWiseIds.push(Number(id));
    }
  }

  const [mappingRows, attendanceRows] = await Promise.all([
    lesson.getLessonPlanSummariesByDateWiseIds(dateWiseIds),
    lesson.getDateWiseIdsWithAttendance(dateWiseIds),
  ]);

  const attendanceTakenIds = new Set();
  for (const row of attendanceRows) {
    const id = row.get ? row.get('timeTableCellDateWiseId') : row.timeTableCellDateWiseId;
    if (id != null) {
      attendanceTakenIds.add(Number(id));
    }
  }

  const lessonPlan = [];
  for (const row of mappingRows) {
    const plan = mapLessonPlanSummary(row);

    // Attendance taken for this dated class => class completed.
    plan.attendanceTaken = attendanceTakenIds.has(plan.timeTableCellDateWiseId);
    if (plan.attendanceTaken) {
      plan.status = 'complete';
    }

    if (lessonId != null && plan.lessonId !== Number(lessonId)) {
      continue;
    }
    if (status != null && status !== '' && plan.status !== status) {
      continue;
    }

    lessonPlan.push(plan);
  }

  return { lessonPlan };
}
