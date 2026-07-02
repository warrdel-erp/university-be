/**
 * Generates class-section-term-smoke.postman_collection.json
 * and prepends CST folders + fixes stale URLs in univ-v2.postman_collection.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postmanDir = path.resolve(__dirname, "..");

const bearer = {
  type: "bearer",
  bearer: [{ key: "token", value: "{{token}}", type: "string" }],
};

function req({ name, method, urlPath, query = [], body, description, tests = [] }) {
  const url = {
    raw: `{{baseurl}}${urlPath}${query.length ? "?" + query.map((q) => `${q.key}=${q.value}`).join("&") : ""}`,
    host: ["{{baseurl}}"],
    path: urlPath.replace(/^\//, "").split("/").filter(Boolean),
    query: query.length ? query : undefined,
  };
  const item = {
    name,
    request: {
      auth: bearer,
      method,
      header: body ? [{ key: "Content-Type", value: "application/json" }] : [],
      ...(body
        ? {
            body: {
              mode: "raw",
              raw: typeof body === "string" ? body : JSON.stringify(body, null, 2),
              options: { raw: { language: "json" } },
            },
          }
        : {}),
      url,
      ...(description ? { description } : {}),
    },
    response: [],
  };
  if (tests.length) {
    item.event = [
      {
        listen: "test",
        script: { type: "text/javascript", exec: tests },
      },
    ];
  }
  return item;
}

function folder(name, description, items) {
  return { name, ...(description ? { description } : {}), item: items };
}

const loginTests = [
  "pm.test('status 200', () => pm.response.to.have.status(200));",
  "const j = pm.response.json();",
  "if (j.token) pm.collectionVariables.set('token', j.token);",
];

const saveCstVars = [
  "const j = pm.response.json();",
  "const pick = (o, ...keys) => keys.find((k) => o?.[k] != null) && o[keys.find((k) => o?.[k] != null)];",
  "const arr = Array.isArray(j) ? j : j.data || j.result || [];",
  "if (arr[0]?.classSectionTermId) pm.collectionVariables.set('classSectionTermId', String(arr[0].classSectionTermId));",
  "if (arr[0]?.classSectionsId) pm.collectionVariables.set('classSectionsId', String(arr[0].classSectionsId));",
  "if (arr[0]?.courseId) pm.collectionVariables.set('courseId', String(arr[0].courseId));",
  "if (arr[0]?.sessionId) pm.collectionVariables.set('sessionId', String(arr[0].sessionId));",
];

const cstFolders = [
  folder(
    "CST — 00 - Auth & Tenant",
    "Run once per session. See docs/postman/CLASS_SECTION_TERM_POSTMAN_ORDER.md",
    [
      req({
        name: "0.1 POST login",
        method: "POST",
        urlPath: "/user/login",
        body: { email: "admin@example.com", password: "password" },
        description: "Set email/password for your env. Saves {{token}}.",
        tests: loginTests,
      }),
      req({
        name: "0.2 PUT saveUserDefaults",
        method: "PUT",
        urlPath: "/user/saveUserDefaults",
        body: {
          defaultInstituteId: "{{instituteId}}",
          defaultAcademicYearId: "{{academicYearId}}",
          defaultRole: "admin",
        },
        description: "Active tenant for scoped routes. No academicYearId on later calls.",
      }),
    ],
  ),
  folder("CST — 01 - Master (Course / Session / Section)", null, [
    req({ name: "1.1 GET courses", method: "GET", urlPath: "/course" }),
    req({
      name: "1.2 GET course sessions",
      method: "GET",
      urlPath: "/course/{{courseId}}/sessions",
    }),
    req({
      name: "1.3 GET course withSubjects",
      method: "GET",
      urlPath: "/course/withSubjects",
      query: [{ key: "instituteId", value: "{{instituteId}}" }],
    }),
    req({ name: "1.4 GET sessions", method: "GET", urlPath: "/session/" }),
    req({
      name: "1.5 POST session",
      method: "POST",
      urlPath: "/session/",
      body: {
        sessionName: "CST Test Session",
        startingDate: "2026-01-01",
        endingDate: "2026-06-30",
        classTillDate: "2026-06-30",
      },
    }),
    req({
      name: "1.6 POST courseSessionMapping",
      method: "POST",
      urlPath: "/session/courseSessionMapping",
      body: { sessionId: "{{sessionId}}", courseId: "{{courseId}}" },
    }),
    req({ name: "1.7 GET sections", method: "GET", urlPath: "/section/" }),
    req({
      name: "1.8 POST section",
      method: "POST",
      urlPath: "/section/",
      body: { sectionName: "A1", sectionCode: "A1" },
    }),
  ]),
  folder("CST — 02 - Options", null, [
    req({
      name: "2.1 GET courseTerms",
      method: "GET",
      urlPath: "/options/courseTerms",
      query: [{ key: "courseId", value: "{{courseId}}" }],
    }),
    req({
      name: "2.2 GET classSections",
      method: "GET",
      urlPath: "/options/classSections",
      query: [
        { key: "courseId", value: "{{courseId}}" },
        { key: "term", value: "1" },
        { key: "sessionId", value: "{{sessionId}}" },
      ],
      tests: saveCstVars,
    }),
  ]),
  folder("CST — 03 - Class Section Master", null, [
    req({
      name: "3.1 POST classSections",
      method: "POST",
      urlPath: "/main/classSections",
      body: {
        courseId: "{{courseId}}",
        sessionId: "{{sessionId}}",
        sections: [
          { sectionId: "{{sectionId}}", section: "A1", year: 1, term: 1 },
        ],
      },
      tests: saveCstVars,
    }),
    req({ name: "3.2 GET classSections", method: "GET", urlPath: "/main/classSections" }),
    req({
      name: "3.3 GET classSectionSpecific",
      method: "GET",
      urlPath: "/main/classSectionSpecific",
      query: [
        { key: "courseId", value: "{{courseId}}" },
        { key: "sessionId", value: "{{sessionId}}" },
      ],
    }),
    req({
      name: "3.4 GET termsWithClassSections",
      method: "GET",
      urlPath: "/course/termsWithClassSections",
      query: [
        { key: "courseId", value: "{{courseId}}" },
        { key: "sessionId", value: "{{sessionId}}" },
      ],
    }),
    req({
      name: "3.5 GET classSections filter",
      method: "GET",
      urlPath: "/classSections/",
      query: [
        { key: "courseId", value: "{{courseId}}" },
        { key: "sessionId", value: "{{sessionId}}" },
      ],
    }),
    req({
      name: "3.6 GET classSectionRecord",
      method: "GET",
      urlPath: "/main/classSectionRecord",
      query: [
        { key: "courseId", value: "{{courseId}}" },
        { key: "classSectionsId", value: "{{classSectionsId}}" },
      ],
    }),
  ]),
  folder("CST — 04 - Subject Mapping", null, [
    req({
      name: "4.3 GET sectionSubjectMapper",
      method: "GET",
      urlPath: "/main/sectionSubjectMapper",
      query: [{ key: "term", value: "1" }],
    }),
    req({
      name: "4.4 GET terms list withSubject",
      method: "GET",
      urlPath: "/terms/list/withSubject",
      query: [{ key: "instituteId", value: "{{instituteId}}" }],
    }),
  ]),
  folder("CST — 05 - Student", null, [
    req({
      name: "5.2 GET sectionStudentMapping",
      method: "GET",
      urlPath: "/student/sectionStudentMapping",
      query: [{ key: "classSectionTermId", value: "{{classSectionTermId}}" }],
    }),
    req({
      name: "5.3 POST sectionStudentMapping",
      method: "POST",
      urlPath: "/student/sectionStudentMapping",
      body: {
        studentId: "{{studentId}}",
        classSectionTermId: "{{classSectionTermId}}",
        sessionId: "{{sessionId}}",
      },
    }),
  ]),
  folder("CST — 06 - Promotion", null, [
    req({
      name: "6.2 GET available-section",
      method: "GET",
      urlPath: "/student/promotion/available-section",
      query: [
        { key: "courseId", value: "{{courseId}}" },
        { key: "term", value: "1" },
        { key: "classSectionId", value: "{{classSectionsId}}" },
      ],
    }),
    req({
      name: "6.3 POST promoteStudent",
      method: "POST",
      urlPath: "/student/promoteStudent",
      body: { studentId: "{{studentId}}", classSectionTermId: "{{classSectionTermId}}" },
    }),
  ]),
  folder("CST — 07 - Timetable", null, [
    req({
      name: "7.2 GET getRoutine",
      method: "GET",
      urlPath: "/timeTableCreate/getRoutine",
      query: [{ key: "classSectionTermId", value: "{{classSectionTermId}}" }],
    }),
    req({
      name: "7.6 GET studentTimetable",
      method: "GET",
      urlPath: "/student/studentTimetable",
      query: [{ key: "studentId", value: "{{studentId}}" }],
    }),
  ]),
  folder("CST — 08 - Teacher Mapping", null, [
    req({ name: "8.1 GET teacherSection", method: "GET", urlPath: "/teacher/teacherSection" }),
    req({ name: "8.3 GET teacherSubject", method: "GET", urlPath: "/teacher/teacherSubject" }),
  ]),
  folder("CST — 09 - Attendance", null, [
    req({
      name: "9.1 GET employee sectionDates",
      method: "GET",
      urlPath: "/employee/sectionDates",
      query: [
        { key: "classSectionId", value: "{{classSectionsId}}" },
        { key: "subjectId", value: "1" },
        { key: "employeeId", value: "1" },
      ],
    }),
    req({
      name: "9.2 GET attendance sectionDates",
      method: "GET",
      urlPath: "/attendance/sectionDates",
      query: [
        { key: "classSectionId", value: "{{classSectionsId}}" },
        { key: "subjectId", value: "1" },
        { key: "employeeId", value: "1" },
      ],
    }),
    req({
      name: "9.4 GET previous-sessions",
      method: "GET",
      urlPath: "/attendance/previous-sessions/1",
    }),
  ]),
  folder("CST — 10 - Syllabus & CO", null, [
    req({
      name: "10.1 GET semesterSubject",
      method: "GET",
      urlPath: "/syllabus/semesterSubject",
      query: [{ key: "term", value: "1" }, { key: "semesterId", value: "1" }],
    }),
    req({ name: "10.3 GET co", method: "GET", urlPath: "/co" }),
  ]),
  folder("CST — 11 - Exam", null, [
    req({
      name: "11.1 GET course terms",
      method: "GET",
      urlPath: "/course/{{courseId}}/terms",
    }),
    req({
      name: "11.2 GET examType single",
      method: "GET",
      urlPath: "/examStructure/examType/single",
      query: [
        { key: "courseId", value: "{{courseId}}" },
        { key: "sessionId", value: "{{sessionId}}" },
      ],
    }),
    req({
      name: "11.3 GET withExamTypesPerCourse",
      method: "GET",
      urlPath: "/terms/withExamTypesPerCourse",
      query: [
        { key: "courseId", value: "{{courseId}}" },
        { key: "sessionId", value: "{{sessionId}}" },
      ],
    }),
    req({
      name: "11.4 GET examScheduleMapping student",
      method: "GET",
      urlPath: "/examScheduleMapping/student",
      query: [{ key: "studentId", value: "{{studentId}}" }],
    }),
  ]),
];

const smokeCollection = {
  info: {
    _postman_id: "cst-smoke-2026-06-29",
    name: "class-section-term-smoke",
    description:
      "Class Section Term refactor — ordered smoke tests.\n\nGuide: docs/postman/CLASS_SECTION_TERM_POSTMAN_ORDER.md\n\nImport after setting collection variables: baseurl, instituteId, academicYearId, courseId, sessionId, sectionId, studentId.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseurl", value: "http://localhost:8080" },
    { key: "token", value: "" },
    { key: "instituteId", value: "1" },
    { key: "academicYearId", value: "76" },
    { key: "courseId", value: "42" },
    { key: "sessionId", value: "22" },
    { key: "sectionId", value: "16" },
    { key: "classSectionTermId", value: "" },
    { key: "classSectionsId", value: "" },
    { key: "studentId", value: "1" },
  ],
  item: cstFolders,
};

const smokePath = path.join(postmanDir, "class-section-term-smoke.postman_collection.json");
fs.writeFileSync(smokePath, JSON.stringify(smokeCollection, null, 2));
console.log("Wrote", smokePath);

const univPath = path.join(postmanDir, "univ-v2.postman_collection.json");
let univText = fs.readFileSync(univPath, "utf8");

const replacements = [
  ["/student/promotion/available-class-section", "/student/promotion/available-section"],
  ["semesterWithClassSections", "termsWithClassSections"],
  ["/employee/classDates", "/employee/sectionDates"],
  ["/attendance/classDates", "/attendance/sectionDates"],
  ["/attendance/previous-classes/", "/attendance/previous-sessions/"],
  ["/student/classStudentMapping", "/student/sectionStudentMapping"],
  ["/main/classSubjectMapper", "/main/sectionSubjectMapper"],
  ["/main/classRecord", "/main/classSectionRecord"],
  ["/main/classSpecific", "/main/classSectionSpecific"],
  ['"/main/class"', '"/main/classSections"'],
  ["available-class-section", "available-section"],
];

for (const [from, to] of replacements) {
  univText = univText.split(from).join(to);
}

const univ = JSON.parse(univText);

univ.info.description =
  "University BE v2 collection.\n\n**Class Section Term smoke order:** Run folders `CST — 00` … `CST — 11` at the top (or import class-section-term-smoke.postman_collection.json).\n\nGuide: docs/postman/CLASS_SECTION_TERM_POSTMAN_ORDER.md\n\nTenant: PUT /user/saveUserDefaults before scoped routes. Do not send academicYearId on most list/create APIs.";

const existingNames = new Set(univ.item.map((f) => f.name));
const toPrepend = cstFolders.filter((f) => !existingNames.has(f.name));
univ.item = [...toPrepend, ...univ.item];

const cstVarKeys = new Set(smokeCollection.variable.map((v) => v.key));
const univVars = univ.variable || [];
for (const v of smokeCollection.variable) {
  if (!univVars.some((u) => u.key === v.key)) {
    univVars.push(v);
  }
}
univ.variable = univVars;

fs.writeFileSync(univPath, JSON.stringify(univ, null, 2));
console.log("Patched", univPath, `— prepended ${toPrepend.length} CST folders, URL fixes applied`);
