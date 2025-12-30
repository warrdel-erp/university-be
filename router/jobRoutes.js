import express from "express";
import useAuth from "../middleware/authUser.js";
import {
  addJob,
  getAllJobs,
  getSingleJob,
  updateJob,
  deleteJob,
  getCalendarView,
  getFacultyCalendar,
  getDepartmentCalendar,getFilteredJobs,getScheduleList
} from "../controllers/jobController.js";

const router = express.Router();

router.post("/add", useAuth, addJob);
router.get("/list", useAuth, getAllJobs);
router.get("/calendar", useAuth, getCalendarView); 
router.get("/calendar/faculty/:employeeId", useAuth, getFacultyCalendar);
router.get("/calendar/department/:subAccountId", useAuth, getDepartmentCalendar);

router.get("/:id", useAuth, getSingleJob);
router.patch("/update/:id", useAuth, updateJob);
router.delete("/delete/:id", useAuth, deleteJob);

router.get("/list/filter", useAuth, getFilteredJobs);

router.get("/schedule/list", useAuth, getScheduleList);

export default router;
