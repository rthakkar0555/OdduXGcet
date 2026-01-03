import { Router } from "express";
import {
  checkIn,
  checkOut,
  getMyAttendance,
  getEmployeeAttendance,
  markAttendance,
  getAttendanceSummary,
  getAllAttendance,
  getTodayAttendance,
} from "../controllers/attendance.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { markAttendanceValidation } from "../middlewares/validation.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Employee routes
router.post("/check-in", checkIn);
router.post("/check-out", checkOut);
router.get("/my-attendance", getMyAttendance);
router.get("/today", getTodayAttendance);

// Admin/HR routes
router.get("/", authorizeRoles("admin", "hr"), getAllAttendance);
router.get("/employee/:employeeId", authorizeRoles("admin", "hr"), getEmployeeAttendance);
router.post("/mark", authorizeRoles("admin", "hr"), markAttendanceValidation, markAttendance);
router.get("/summary", authorizeRoles("admin", "hr"), getAttendanceSummary);

export default router;
