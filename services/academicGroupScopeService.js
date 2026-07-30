import * as academicGroupScopeRepository from '../repository/academicGroupScopeRepository.js';

export async function getCascadingGroupRoutinesService({ academicGroupScopeId, academicGroupId, sessionId }) {
  const scopes = await academicGroupScopeRepository.getCascadingGroupRoutinesRepository({
    academicGroupScopeId,
    academicGroupId,
    sessionId,
  });

  return scopes.map((scope) => {
    const scopeData = scope.get({ plain: true });
    const mappedStructures = (scopeData.timeTableStructureCourses || []).map((m) => ({
      timetableStructureCourseMapperId: m.timetableStructureCourseMapperId,
      timeTableNameId: m.timeTableNameId,
      startingDate: m.startingDate,
      endingDate: m.endingDate,
      structureName: m.timeTableStructure ? m.timeTableStructure.name : null,
      structureDetails: m.timeTableStructure || null,
    }));

    const groups = (scopeData.groups || []).map((grp) => {
      const routines = (grp.timeTableRoutines || []).map((rt) => {
        const rawCells = rt.timeTableCells || rt.timeTablecreate || [];
        const schedules = rawCells.map((cell) => ({
          timeTableCellId: cell.timeTableCellId,
          timeTableRoutineId: cell.timeTableRoutineId,
          timeTableNameId: cell.timeTableNameId,
          timeTableCreationId: cell.timeTableCreationId,
          day: cell.day || cell.dayName,
          dayName: cell.day || cell.dayName,
          period: cell.period,
          subjectId: cell.subjectId,
          subjectName: cell.timeTableSubject?.subjectName ?? null,
          subjectCode: cell.timeTableSubject?.subjectCode ?? null,
          electiveSubjectId: cell.electiveSubjectId,
          electiveSubjectName: cell.timeTableElective?.electiveSubjectName ?? null,
          electiveSubjectCode: cell.timeTableElective?.electiveSubjectCode ?? null,
          teacherSubjectMappingId: cell.teacherSubjectMappingId,
          classRoomSectionId: cell.classRoomSectionId,
          roomNo: cell.classRoom ? cell.classRoom.roomNumber : (cell.roomNo || null),
          timeTableType: cell.timeTableType,
          isAttendence: cell.isAttendence,
          isSameTeacher: cell.isSameTeacher,
          timeTableTeacherSubject: cell.timeTableTeacherSubject || null,
          timeTableSubject: cell.timeTableSubject || null,
          timeTableElective: cell.timeTableElective || null,
          classRoom: cell.classRoom || null,
          timeTableCellTeachers: cell.timeTableCellTeachers || [],
        }));

        return {
          ...rt,
          schedules,
          timeTablecreate: schedules,
        };
      });

      return {
        ...grp,
        title: grp.groupName,
        routines,
      };
    });

    const { timeTableStructureCourses, groups: _rawGroups, ...scopeFields } = scopeData;

    return {
      ...scopeFields,
      mappedStructures,
      groups,
    };
  });
}

export async function getGroupRoutinesWrappedInStructureService({ academicGroupId, sessionId }) {
  const groupRow = await academicGroupScopeRepository.getGroupRoutinesWrappedInStructureRepository({
    academicGroupId,
    sessionId,
  });

  if (!groupRow) {
    throw new Error('Academic group not found');
  }

  const groupData = groupRow.get ? groupRow.get({ plain: true }) : groupRow;
  const scope = groupData.scope || groupData.academicGroupScope || {};


  const structureMap = new Map();

  const scopeMappings = scope.timeTableStructureCourses || [];
  for (const m of scopeMappings) {
    const mapperId = m.timetableStructureCourseMapperId;
    const structure = m.timeTableStructure || {};
    const timeSlots = structure.timeTableName || [];

    structureMap.set(mapperId, {
      timetableStructureCourseMapperId: mapperId,
      timeTableNameId: m.timeTableNameId,
      startingDate: m.startingDate,
      endingDate: m.endingDate,
      structureName: structure.name || null,
      maximumPeriod: structure.maximumPeriod || null,
      periodLength: structure.periodLength || null,
      periodGap: structure.periodGap || null,
      startingTime: structure.startingTime || null,
      weekOff: structure.weekOff || null,
      timeSlots,
      routines: [],
    });
  }

  const rawRoutines = groupData.timeTableRoutines || [];
  for (const rt of rawRoutines) {
    const mapperId = rt.timetableStructureCourseMapperId;
    const rawCells = rt.timeTableCells || [];

    const schedules = rawCells.map((cell) => {
      const cellTeachers = (cell.timeTableCellTeachers || []).map((t) => ({
        employeeId: t.employeeDetails?.employeeId ?? null,
        employeeName: t.employeeDetails?.employeeName ?? null,
        employeeCode: t.employeeDetails?.employeeCode ?? null,
      }));

      const teacherData = cell.timeTableTeacherSubject?.teacherEmployeeData;
      if (teacherData && !cellTeachers.some((ct) => ct.employeeId === teacherData.employeeId)) {
        cellTeachers.unshift({
          employeeId: teacherData.employeeId ?? null,
          employeeName: teacherData.employeeName ?? null,
          employeeCode: teacherData.employeeCode ?? null,
        });
      }

      return {
        timeTableCellId: cell.timeTableCellId,
        timeTableRoutineId: cell.timeTableRoutineId,
        timeTableNameId: cell.timeTableNameId,
        timeTableCreationId: cell.timeTableCreationId,
        day: cell.day || cell.dayName,
        dayName: cell.day || cell.dayName,
        period: cell.period,
        subjectId: cell.subjectId,
        subjectName: cell.timeTableSubject?.subjectName ?? cell.timeTableTeacherSubject?.employeeSubject?.subjectName ?? null,
        subjectCode: cell.timeTableSubject?.subjectCode ?? cell.timeTableTeacherSubject?.employeeSubject?.subjectCode ?? null,
        electiveSubjectId: cell.electiveSubjectId,
        electiveSubjectName: cell.timeTableElective?.electiveSubjectName ?? null,
        electiveSubjectCode: cell.timeTableElective?.electiveSubjectCode ?? null,
        teacherSubjectMappingId: cell.teacherSubjectMappingId,
        classRoomSectionId: cell.classRoomSectionId,
        roomNo: cell.classRoom ? cell.classRoom.roomNumber : (cell.roomNo || null),
        timeTableType: cell.timeTableType,
        isAttendence: cell.isAttendence,
        isSameTeacher: cell.isSameTeacher,
        timeTableTeacherSubject: cell.timeTableTeacherSubject || null,
        timeTableSubject: cell.timeTableSubject || null,
        timeTableElective: cell.timeTableElective || null,
        classRoom: cell.classRoom || null,
        teachers: cellTeachers,
        timeTableCellTeachers: cell.timeTableCellTeachers || [],
      };
    });

    const formattedRoutine = {
      timeTableRoutineId: rt.timeTableRoutineId,
      timetableStructureCourseMapperId: rt.timetableStructureCourseMapperId,
      academicGroupId: rt.academicGroupId,
      courseId: rt.courseId,
      academicYearId: rt.academicYearId,
      isPublish: rt.isPublish,
      campusId: rt.campusId,
      timeTableType: rt.timeTableType,
      startingDate: rt.startingDate,
      endingDate: rt.endingDate,
      schedules,
      timeTablecreate: schedules,
    };

    if (structureMap.has(mapperId)) {
      structureMap.get(mapperId).routines.push(formattedRoutine);
    } else {
      const mapping = rt.structureCourseMapping || {};
      const structure = mapping.timeTableStructure || {};
      const timeSlots = structure.timeTableName || [];

      structureMap.set(mapperId, {
        timetableStructureCourseMapperId: mapperId,
        timeTableNameId: mapping.timeTableNameId || null,
        startingDate: mapping.startingDate || rt.startingDate,
        endingDate: mapping.endingDate || rt.endingDate,
        structureName: structure.name || null,
        maximumPeriod: structure.maximumPeriod || null,
        periodLength: structure.periodLength || null,
        periodGap: structure.periodGap || null,
        startingTime: structure.startingTime || null,
        weekOff: structure.weekOff || null,
        timeSlots,
        routines: [formattedRoutine],
      });
    }
  }

  const structures = Array.from(structureMap.values());

  return {
    academicGroupId: groupData.academicGroupId,
    groupName: groupData.groupName,
    groupCode: groupData.groupCode,
    capacity: groupData.capacity,
    publishStatus: groupData.publishStatus,
    academicGroupScopeId: scope.academicGroupScopeId || groupData.academicGroupScopeId,
    scopeTitle: scope.title || null,
    course: scope.course || null,
    session: scope.session || null,
    structures,
  };
}

export async function getSubjectOptionsService({ classSectionTermId, academicGroupId }) {
  return await academicGroupScopeRepository.getSubjectOptionsRepository({
    classSectionTermId,
    academicGroupId,
  });
}


