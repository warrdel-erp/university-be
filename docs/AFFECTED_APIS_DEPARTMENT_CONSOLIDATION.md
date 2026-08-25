# Affected APIs — Examination Session Subjects Optimization

Shared function: `getMappedSubjectsBySessionAndTerm`  
(also used via `getMappedSubjectsBySessionAndTermNeed`)

Related repository changes:

- `findExamSchedulesBySubjects` (added `published`)
- `findRoomCapacitiesByExamSchedules` (`SUM(capacity) GROUP BY`)
- `getStudentCountsByGroups` (optional `transaction`)

Response/payload contracts were **not** changed. Re-test these APIs for behavior/performance regressions.

---

## Directly affected (primary)

| Method | Endpoint | Why affected |
|--------|----------|--------------|
| `GET` | `/examinationSession/subjects` | Main entry; full mapped-subjects enrichment path |
| `GET` | `/examinationSession/questionPaper` | Wrapper forcing `isExamScheduled: true` on the same shared function |

---

## Indirectly affected (call shared logic)

| Method | Endpoint | Why affected |
|--------|----------|--------------|
| `POST` | `/examinationSession/publish` | Uses mapped subjects (light enrichment) to mark ready schedules as published |
| `GET` | `/examinationSession/skuStats` | Uses mapped subjects (light enrichment) for subject vs scheduled counts |
| `GET` | `/examinationSessionSlot/` | Slot list optimized; uses batched student counts + shared selection filters / needsScheduling |
| `GET` | `/examinationSessionSlot/count` | Count path optimized the same way (no per-schedule student-count queries) |
| `POST` | `/examSchedule/roomAssignment` (add room capacity) | After assign, re-evaluates `ready` via shared function to auto-publish schedule |
| `GET` | `/examSchedule/` | Uses updated `getStudentCountsByGroups` + Map-based student count lookup |

---

## Shared helpers touched (no route of their own)

| Layer | Symbol | Used by |
|-------|--------|---------|
| Service | `getMappedSubjectsBySessionAndTerm` | subjects, questionPaper, publish, skuStats, slots, room assign |
| Service | `getMappedSubjectsBySessionAndTermNeed` | `/examinationSession/questionPaper` |
| Repository | `findExamSchedulesBySubjects` | mapped-subjects flow |
| Repository | `findRoomCapacitiesByExamSchedules` | mapped-subjects flow |
| Repository | `getStudentCountsByGroups` | mapped-subjects flow, `/examSchedule/` |

---

## Suggested smoke test checklist

- [ ] `GET /examinationSession/subjects` — with/without `selections`, `filterStatus`, `date`
- [ ] `GET /examinationSession/questionPaper` — only scheduled subjects
- [ ] `POST /examinationSession/publish` — ready schedules become published
- [ ] `GET /examinationSession/skuStats` — subject/scheduled counts look correct
- [ ] `GET /examinationSessionSlot/?filterStatus=needsScheduling`
- [ ] `GET /examinationSessionSlot/count`
- [ ] `POST /examSchedule` room assignment — auto-publish when session is Published and schedule is ready
- [ ] `GET /examSchedule/` — `studentCount` still correct
