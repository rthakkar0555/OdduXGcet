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
  body("companyName")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Company name must be at least 2 characters"),
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("phone")
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage("Please provide a valid phone number"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  body("role")
    .optional()
    .isIn(["employee", "hr", "admin"])
    .withMessage("Invalid role"),
  validate,
];

export const signinValidation = [
  body("loginIdOrEmail")
    .notEmpty()
    .withMessage("Login ID or Email is required")
    .trim(),
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
