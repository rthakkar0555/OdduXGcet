import { body, param, query, validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

// Middleware to handle validation errors
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    console.error("Validation Errors:", errors.array());
    throw new ApiError(400, "Validation failed", errorMessages);
  }
  next();
};

// Validation rules for authentication
export const signupValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("role")
    .optional()
    .isIn(["employee", "hr", "admin"])
    .withMessage("Invalid role"),
  validate,
];

export const signinValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

// Validation rules for employee
export const createEmployeeValidation = [
  body("personalDetails.fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .trim(),
  body("personalDetails.phone")
    .optional()
    .isMobilePhone()
    .withMessage("Invalid phone number"),
  body("jobDetails.designation")
    .notEmpty()
    .withMessage("Designation is required"),
  body("jobDetails.department")
    .notEmpty()
    .withMessage("Department is required"),
  body("jobDetails.employmentType")
    .optional()
    .isIn(["full-time", "part-time", "contract", "intern"])
    .withMessage("Invalid employment type"),
  validate,
];

// Validation rules for leave
export const applyLeaveValidation = [
  body("leaveType")
    .isIn(["paid", "sick", "unpaid", "casual"])
    .withMessage("Invalid leave type"),
  body("startDate").isISO8601().withMessage("Invalid start date"),
  body("endDate").isISO8601().withMessage("Invalid end date"),
  body("reason").notEmpty().withMessage("Reason is required").trim(),
  validate,
];

// Validation rules for attendance
export const markAttendanceValidation = [
  body("date").isISO8601().withMessage("Invalid date"),
  body("status")
    .isIn(["present", "absent", "half-day", "leave"])
    .withMessage("Invalid status"),
  validate,
];
