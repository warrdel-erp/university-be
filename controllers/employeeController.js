import * as employee from '../services/employeeServices.js';
import * as fileHandler from '../utility/fileHandler.js';
import * as AttendanceCreation from "../services/attendanceServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export const addEmployee = async (req, res) => {
    const universityId = req.user.universityId;
    try {
        const data = req.body
        const file = req.files;
        const createdBy = req.user.userId;
        const { campusId, instituteId, roleId } = req.body;
        if (!(campusId && instituteId && roleId)) {
            return res.status(400).send('campusId,instituteId is required')
        }
        const result = await employee.addEmployee(data, file, createdBy, universityId, roleId, instituteId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in adding employee:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getAllEmployee = async (req, res) => {
    const universityId = req.user.universityId;
    const headInstituteId = req.user.defaultInstituteId;
    const role = req.user.role;
    const { campusId, instituteId, acedmicYearId } = req.query
    try {
        const result = await employee.getAllEmployee(universityId, campusId, instituteId, acedmicYearId, headInstituteId, role);
        const normalized = await Promise.all((result || []).map(async (row) => {
            const item = typeof row?.toJSON === "function" ? row.toJSON() : row;
            const authUser = item?.user || item?.userEmployee || {};
            const userRoles = authUser?.userRoles || [];
            const userPermissions = authUser?.userPermissions || [];
            const mappedRoleData = {
                role: userRoles?.[0]?.role || "",
                permissions: userPermissions.map((p) => p.permission).filter(Boolean)
            };

            const directOffice = await employee.getEmployeeOfficeDetails(item?.employeeId);
            const directOfficeEntry = directOffice?.toJSON ? directOffice.toJSON() : (directOffice || {});
            const includedOffice = Array.isArray(item?.office) ? (item.office[0] || {}) : (item?.office || {});
            const officeEntry = Object.keys(directOfficeEntry).length > 0 ? directOfficeEntry : includedOffice;
            const addressEntry = Array.isArray(item?.address) ? (item.address[0] || {}) : (item?.address || {});

            const employment = {
                department: item?.department || "",
                employmentType: item?.employmentType || "",
                joiningDate: officeEntry?.joiningDate || "",
                noticePeriod: officeEntry?.noticePeriod ?? "",
                employeeFileNumber: officeEntry?.employeeFileNumber || "",
                officeMailId: officeEntry?.officeMailId || addressEntry?.officalEmailId || "",
                officeExtensionNumber: officeEntry?.officeExtensionNumber || "",
                employeeRank: officeEntry?.employeeRank || ""
            };
            const getMetaCode = (type) => {
                return item?.employeeMetaData?.find((m) =>
                    String(m?.typess?.codes?.codeMasterType || "").trim().toLowerCase() === type
                )?.typess?.code || "";
            };

            return {
                employeeId: item?.employeeId,
                userId: item?.userId,
                employeeCode: item?.employeeCode,
                employeeName: item?.employeeName || "",
                dateOfBirth: item?.dateOfBirth || "",
                department: item?.department || "",
                employmentType: item?.employmentType || "",
                pickColor: item?.pickColor || "",
                campusId: item?.campusId,
                instituteId: item?.instituteId,
                acedmicYearId: item?.acedmicYearId,
                roleId: item?.roleId || mappedRoleData?.role || "",
                roleData: mappedRoleData,
                role: mappedRoleData?.role ? [mappedRoleData.role] : (item?.role || []),
                joiningDate: employment.joiningDate,
                gender: getMetaCode("gender"),
                religion: getMetaCode("religion"),
                nationality: getMetaCode("nationality"),
                employment
            };
        }));
        res.status(200).send(normalized);
    } catch (error) {
        console.error("Error in getting all employee:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingleEmployeeDetails = async (req, res) => {
    const employeeId = req.params.id
    const universityId = req.user.universityId;
    try {
        if (!employeeId) {
            return res.status(400).send('employeeId is required')
        }
        const result = await employee.getSingleEmployeeDetails(employeeId, universityId);

        // Keep DB-backed keys intact while normalizing API shape for frontend edit form.
        const normalized = await Promise.all((result || []).map(async (row) => {
            const item = typeof row?.toJSON === "function" ? row.toJSON() : row;
            const authUser = item?.user || item?.userEmployee || {};
            const userRoles = authUser?.userRoles || [];
            const userPermissions = authUser?.userPermissions || [];

            const mappedRoleData = {
                role: userRoles?.[0]?.role || "",
                permissions: userPermissions.map((p) => p.permission).filter(Boolean)
            };

            const mappedQualification = Array.isArray(item?.qualification) ? item.qualification : [];
            const mappedDocuments = Array.isArray(item?.documents) ? item.documents : [];
            const directOffice = await employee.getEmployeeOfficeDetails(item?.employeeId);
            const directOfficeEntry = directOffice?.toJSON ? directOffice.toJSON() : (directOffice || {});
            const includedOffice = Array.isArray(item?.office) ? (item.office[0] || {}) : (item?.office || {});
            const officeEntry = Object.keys(directOfficeEntry).length > 0 ? directOfficeEntry : includedOffice;
            const referenceList = (Array.isArray(item?.reference) && item.reference.length > 0)
                ? item.reference
                : (await employee.getEmployeeReferenceDetails(item?.employeeId))?.map(r => (r?.toJSON ? r.toJSON() : r)) || [];
            const skillList = (Array.isArray(item?.skill) && item.skill.length > 0)
                ? item.skill
                : (await employee.getEmployeeSkillDetails(item?.employeeId))?.map(s => (s?.toJSON ? s.toJSON() : s)) || [];
            const qualificationList = (Array.isArray(mappedQualification) && mappedQualification.length > 0)
                ? mappedQualification
                : (await employee.getEmployeeDocumentDetails(item?.employeeId))?.map(q => (q?.toJSON ? q.toJSON() : q)) || [];
            const documentList = (Array.isArray(mappedDocuments) && mappedDocuments.length > 0)
                ? mappedDocuments
                : (await employee.getEmployeeQualificationDetails(item?.employeeId))?.map(d => (d?.toJSON ? d.toJSON() : d)) || [];
            const experienceList = (Array.isArray(item?.experiance) && item.experiance.length > 0)
                ? item.experiance
                : (await employee.getEmployeeExperienceDetails(item?.employeeId))?.map(e => (e?.toJSON ? e.toJSON() : e)) || [];
            const achievementList = (Array.isArray(item?.achievements) && item.achievements.length > 0)
                ? item.achievements
                : (await employee.getEmployeeAchievementDetails(item?.employeeId))?.map(a => (a?.toJSON ? a.toJSON() : a)) || [];
            const researchList = (Array.isArray(item?.research) && item.research.length > 0)
                ? item.research
                : (await employee.getEmployeeResearchList(item?.employeeId))?.map(r => (r?.toJSON ? r.toJSON() : r)) || [];
            const activityList = (Array.isArray(item?.activty) && item.activty.length > 0)
                ? item.activty
                : (await employee.getEmployeeActivityDetails(item?.employeeId))?.map(a => (a?.toJSON ? a.toJSON() : a)) || [];
            const normalizedActivityList = (Array.isArray(activityList) ? activityList : []).map((a) => ({
                ...a,
                activityName: a?.activityName ?? a?.activity ?? "",
                date: a?.date ?? a?.monthYear ?? "",
                description: a?.description ?? a?.remarks ?? "",
                category: a?.category ?? ""
            }));
            const longLeaveList = (Array.isArray(item?.longLeave) && item.longLeave.length > 0)
                ? item.longLeave
                : (await employee.getEmployeeLongLeaveDetails(item?.employeeId))?.map(l => (l?.toJSON ? l.toJSON() : l)) || [];
            const normalizedLongLeaveList = (Array.isArray(longLeaveList) ? longLeaveList : []).map((l) => ({
                ...l,
                leaveType: l?.leaveType ?? l?.leave_type ?? "",
                fromDate: l?.fromDate ?? l?.dateOfLeaving ?? l?.DateOfLeaving ?? "",
                toDate: l?.toDate ?? l?.dateOfRejoining ?? l?.DateOfRejoining ?? "",
                reason: l?.reason ?? l?.remark ?? ""
            }));
            const addressEntry = Array.isArray(item?.address) ? (item.address[0] || {}) : (item?.address || {});
            const employment = {
                department: item?.department || "",
                employmentType: item?.employmentType || "",
                joiningDate: officeEntry?.joiningDate || "",
                noticePeriod: officeEntry?.noticePeriod ?? "",
                employeeFileNumber: officeEntry?.employeeFileNumber || "",
                officeMailId: officeEntry?.officeMailId || addressEntry?.officalEmailId || "",
                officeExtensionNumber: officeEntry?.officeExtensionNumber || "",
                employeeRank: officeEntry?.employeeRank || ""
            };

            const { office: _officeIgnored, ...itemWithoutOffice } = item;

            return {
                ...itemWithoutOffice,
                userEmployee: authUser,
                roleData: mappedRoleData,
                roleId: item?.roleId || mappedRoleData?.role || "",
                role: mappedRoleData?.role ? [mappedRoleData.role] : (item?.role || []),
                employment,
                salutation: officeEntry?.employeeRank || "",
                designation: officeEntry?.employeeRank || "",
                qualification: qualificationList,
                documents: documentList,
                skill: skillList,
                reference: referenceList,
                // Frontend expects these keys; keep legacy keys untouched.
                experience: experienceList,
                achievements: achievementList,
                research: researchList,
                longLeave: normalizedLongLeaveList,
                activity: normalizedActivityList
            };
        }));

        res.status(200).send(normalized);
    } catch (error) {
        console.error("Error in getting single employee details:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const deleteEmployeeDetail = async (req, res) => {
    const employeeId = req.params.id;
    try {
        if (!employeeId) {
            res.status(400).send("employee Id is required");
        } else {
            const result = await employee.deleteEmployeeDetail(employeeId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in deleting employeeId Id ${employeeId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const importEmployeeData = async (req, res) => {
    try {
        const { campusId, instituteId, roleId, acedmicYearId } = req.body;
        const universityId = req.user.universityId;
        const createdBy = req.user.userId;
        const data = { ...req.body, universityId, createdBy };

        if (!(campusId && instituteId && roleId && acedmicYearId)) {
            return res.status(400).json({ error: 'campusId, instituteId, roleId, and acedmicYearId are required' });
        }

        const excelFile = req.files?.employee;
        if (!excelFile) {
            return res.status(400).json({ error: 'Excel file is required' });
        }

        const excelData = fileHandler.readExcelFile(excelFile.data);
        if (!excelData) {
            return res.status(400).json({ error: 'Error reading the Excel file' });
        }

        const result = await employee.importEmployeeData(excelData, data);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        return res.status(200).json({ message: result.message });

    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ error: error.message || 'An unexpected error occurred' });
    }
};

export const updateEmployee = async (req, res) => {
    const universityId = req.user.universityId;
    const employeeId = req.params.id;
    try {
        const data = req.body;
        const file = req.files;
        const updatedBy = req.user.userId;
        const createdBy = req.user.userId;
        const { campusId, instituteId, roleId } = req.body;

        if (!(campusId && instituteId && roleId)) {
            return res.status(400).send("campusId, instituteId and roleId are required");
        }

        const result = await employee.updateEmployee(
            employeeId,
            data,
            file,
            updatedBy,
            createdBy,
            universityId,
            roleId,
            instituteId
        );

        res.status(200).send(result);
    } catch (error) {
        console.error("Error in updating employee:", error);
        res.status(500).send("Internal Server Error");
    }
};

export async function getBooksIssuedToEmployee(req, res) {
    try {
        const { employeeId } = req.query;

        if (!employeeId) {
            return res.status(400).json({ message: "employeeId is required" });
        }

        const result = await employee.getBooksIssuedToEmployee(employeeId);
        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getTeacherTimeTable = async (req, res) => {
    try {
        const { employeeId } = req.query;

        if (!employeeId) {
            return res.status(400).send("employeeId is required");
        }

        const universityId = req.user.universityId;
        const instituteId = req.user.defaultInstituteId;
        const role = req.user.role;

        const result = await employee.getTeacherTimeTable(
            employeeId,
            universityId,
            instituteId,
            role
        );

        res.status(200).send(result);

    } catch (error) {
        console.error("Error in getTeacherTimeTable:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTeacherSubject = async (req, res) => {
    try {
        const { employeeId } = req.query;

        if (!employeeId) {
            return res.status(400).send("employeeId is required");
        }

        const universityId = req.user.universityId;
        const instituteId = req.user.defaultInstituteId;
        const role = req.user.role;

        const result = await employee.getTeacherSubject(
            employeeId,
            universityId,
            instituteId,
            role
        );

        res.status(200).send(result);

    } catch (error) {
        console.error("Error in getTeacher subject:", error);
        res.status(500).send("Internal Server Error");
    }
};

export async function getSubjectEvalution(req, res) {
    const universityId = req.user.universityId;
    try {
        const { employeeId } = req.query;
        const evaluation = await employee.getSubjectEvalution(employeeId);
        if (evaluation) {
            res.status(200).json(evaluation);
        } else {
            res.status(404).json({ message: "evaluation not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const getTodayClassSchedule = async (req, res) => {
    try {
        const { employeeId, date, sessionId } = req.query;

        if (!employeeId) {
            return res.status(400).send("employeeId is required");
        }

        const currentDate = new Date(date);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayString = days[currentDate.getDay()];

        // formatted currentDate for simple YYYY-MM-DD
        const formattedDate = currentDate.toISOString().split('T')[0];

        const result = await employee.getTodayClassSchedule(
            employeeId,
            formattedDate,
            dayString,
            sessionId
        );

        res.status(200).send({ success: true, result });

    } catch (error) {
        console.error("Error in getTodayClassSchedule:", error);
        res.status(500).send({ message: "Internal Server Error", success: false });
    }
};

export const getTeacherCourses = async (req, res) => {
    try {
        const { employeeId } = req.query;
        const acedmicYearId = req.user.defaultAcademicYearId;

        if (!employeeId) {
            return res.status(400).send("employeeId is required");
        }

        if (!acedmicYearId) {
            return res.status(400).send("academicYearId not found in user session");
        }

        const result = await employee.getTeacherCourses(employeeId, acedmicYearId);
        res.status(200).send({ success: true, result });
    } catch (error) {
        console.error("Error in getTeacherCourses controller:", error);
        res.status(500).send({ message: "Internal Server Error", success: false });
    }
};

export const getTeacherSubjectsFromSchedule = async (req, res) => {
    try {
        const { employeeId } = req.query;
        const acedmicYearId = req.user.defaultAcademicYearId;

        if (!employeeId) {
            return res.status(400).send("employeeId is required");
        }

        if (!acedmicYearId) {
            return res.status(400).send("academicYearId not found in user session");
        }

        const result = await employee.getTeacherSubjectsFromSchedule(employeeId, acedmicYearId);
        res.status(200).send({ success: true, result });
    } catch (error) {
        console.error("Error in getTeacherSubjectsFromSchedule controller:", error);
        res.status(500).send({ message: "Internal Server Error", success: false });
    }
};

export const getPastClassSchedules = async (req, res) => {
    try {
        const { employeeId, date } = req.query;
        const acedmicYearId = req.user.defaultAcademicYearId;

        if (!employeeId) {
            return res.status(400).send("employeeId is required");
        }

        if (!acedmicYearId) {
            return res.status(400).send("academicYearId not found in user session");
        }

        const currentDate = date ? new Date(date) : new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];

        const result = await employee.getPastClassSchedules(
            employeeId,
            acedmicYearId,
            formattedDate
        );

        res.status(200).send({ success: true, result });
    } catch (error) {
        console.error("Error in getPastClassSchedules:", error);
        res.status(500).send({ message: "Internal Server Error", success: false });
    }
};

export const getUpcomingClassSchedules = async (req, res) => {
    try {
        const { employeeId, date } = req.query;
        const acedmicYearId = req.user.defaultAcademicYearId;

        if (!employeeId) {
            return res.status(400).send("employeeId is required");
        }

        if (!acedmicYearId) {
            return res.status(400).send("academicYearId not found in user session");
        }

        const currentDate = date ? new Date(date) : new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];

        const result = await employee.getUpcomingClassSchedules(
            employeeId,
            acedmicYearId,
            formattedDate
        );

        res.status(200).send({ success: true, result });
    } catch (error) {
        console.error("Error in getUpcomingClassSchedules:", error);
        res.status(500).send({ message: "Internal Server Error", success: false });
    }
};

export const getClassCounts = async (req, res) => {
    try {
        const { employeeId, date } = req.query;
        const acedmicYearId = req.user.defaultAcademicYearId;

        if (!employeeId) {
            return ErrorResponse(res, 400, "employeeId is required");
        }

        if (!acedmicYearId) {
            return ErrorResponse(res, 400, "academicYearId not found in user session");
        }

        const currentDate = date ? new Date(date) : new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];

        const { pastCount, upcomingCount, uniqueCombinationsCount, uniqueSubjectsCount } = await employee.getClassCounts(
            employeeId,
            acedmicYearId,
            formattedDate
        );

        return SuccessResponse(res, 200, "Class counts fetched successfully", {
            pastClassesCount: pastCount,
            upcomingClassesCount: upcomingCount,
            uniqueCombinationsCount,
            uniqueSubjectsCount
        });
    } catch (error) {
        console.error("Error in getClassCounts:", error);
        return ErrorResponse(res, 500, "Internal Server Error");
    }
};

export const getUniqueClassSectionSubjects = async (req, res) => {
    try {
        const { employeeId } = req.query;
        const acedmicYearId = req.user.defaultAcademicYearId;

        if (!employeeId) {
            return res.status(400).send("employeeId is required");
        }

        if (!acedmicYearId) {
            return res.status(400).send("academicYearId not found in user session");
        }

        const result = await employee.getUniqueClassSectionSubjects(
            employeeId,
            acedmicYearId
        );

        res.status(200).send({ success: true, result });
    } catch (error) {
        console.error("Error in getUniqueClassSectionSubjects:", error);
        res.status(500).send({ message: "Internal Server Error", success: false });
    }
};

export async function getEmployeeClassDates(req, res) {
    try {
        const { classSectionId, subjectId, employeeId } = req.query;

        const data = await AttendanceCreation.getEmployeeClassDates(
            classSectionId,
            subjectId,
            employeeId
        );

        return SuccessResponse(res, 200, "Employee Class Dates Fetched Successfully", data);
    } catch (error) {
        console.error("Controller Error:", error);
        return ErrorResponse(res, 500, "Internal Server Error");
    }
};