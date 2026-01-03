import { Attendance } from "../models/attendance.model.js";
import { Employee } from "../models/employee.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiRespons } from "../utils/ApiRespons.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Check in
// @route   POST /api/v1/attendance/check-in
// @access  Private
export const checkIn = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id });

  if (!employee) {
    throw new ApiError(404, "Employee profile not found");
  }

  // Check if already checked in today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingAttendance = await Attendance.findOne({
    employee: employee._id,
    date: { $gte: today },
  });

  if (existingAttendance && existingAttendance.checkIn) {
    throw new ApiError(400, "Already checked in today");
  }

  const attendance = await Attendance.create({
    employee: employee._id,
    date: new Date(),
    checkIn: new Date(),
    status: "present",
  });

  return res
    .status(201)
    .json(new ApiRespons(201, attendance, "Checked in successfully"));
});

// @desc    Check out
// @route   POST /api/v1/attendance/check-out
// @access  Private
export const checkOut = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id });

  if (!employee) {
    throw new ApiError(404, "Employee profile not found");
  }

  // Find today's attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({
    employee: employee._id,
    date: { $gte: today },
  });

  if (!attendance) {
    throw new ApiError(404, "No check-in record found for today");
  }

  if (attendance.checkOut) {
    throw new ApiError(400, "Already checked out today");
  }

  attendance.checkOut = new Date();
  await attendance.save();

  return res
    .status(200)
    .json(new ApiRespons(200, attendance, "Checked out successfully"));
});

// @desc    Get my attendance
// @route   GET /api/v1/attendance/my-attendance
// @access  Private
export const getMyAttendance = asyncHandler(async (req, res) => {
  const { startDate, endDate, page = 1, limit = 30 } = req.query;

  const employee = await Employee.findOne({ user: req.user._id });

  if (!employee) {
    throw new ApiError(404, "Employee profile not found");
  }

  const query = { employee: employee._id };

  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const attendance = await Attendance.find(query)
    .sort({ date: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Attendance.countDocuments(query);

  return res.status(200).json(
    new ApiRespons(
      200,
      {
        attendance,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      },
      "Attendance fetched successfully"
    )
  );
});

// @desc    Get employee attendance (Admin/HR only)
// @route   GET /api/v1/attendance/employee/:employeeId
// @access  Private (Admin/HR)
export const getEmployeeAttendance = asyncHandler(async (req, res) => {
  const { startDate, endDate, page = 1, limit = 30 } = req.query;
  const { employeeId } = req.params;

  const query = { employee: employeeId };

  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const attendance = await Attendance.find(query)
    .populate("employee")
    .sort({ date: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Attendance.countDocuments(query);

  return res.status(200).json(
    new ApiRespons(
      200,
      {
        attendance,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      },
      "Attendance fetched successfully"
    )
  );
});

// @desc    Mark attendance manually (Admin/HR only)
// @route   POST /api/v1/attendance/mark
// @access  Private (Admin/HR)
export const markAttendance = asyncHandler(async (req, res) => {
  const { employeeId, date, status, remarks } = req.body;

  const employee = await Employee.findById(employeeId);

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // Check if attendance already exists for this date
  const existingAttendance = await Attendance.findOne({
    employee: employeeId,
    date: new Date(date),
  });

  if (existingAttendance) {
    existingAttendance.status = status;
    existingAttendance.remarks = remarks;
    await existingAttendance.save();

    return res
      .status(200)
      .json(new ApiRespons(200, existingAttendance, "Attendance updated successfully"));
  }

  const attendance = await Attendance.create({
    employee: employeeId,
    date: new Date(date),
    status,
    remarks,
  });

  return res
    .status(201)
    .json(new ApiRespons(201, attendance, "Attendance marked successfully"));
});

// @desc    Get attendance summary (Admin/HR only)
// @route   GET /api/v1/attendance/summary
// @access  Private (Admin/HR)
export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const matchStage = {};
  if (startDate && endDate) {
    matchStage.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const summary = await Attendance.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiRespons(200, summary, "Attendance summary fetched successfully"));
});

// @desc    Get all attendance records (Admin/HR only)
// @route   GET /api/v1/attendance
// @access  Private (Admin/HR)
export const getAllAttendance = asyncHandler(async (req, res) => {
  const { date, startDate, endDate, page = 1, limit = 30 } = req.query;

  const query = {};

  // If specific date is provided
  if (date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    query.date = {
      $gte: targetDate,
      $lt: nextDate,
    };
  } else if (startDate && endDate) {
    // If date range is provided
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const attendance = await Attendance.find(query)
    .populate("employee", "personalDetails jobDetails")
    .sort({ date: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Attendance.countDocuments(query);

  return res.status(200).json(
    new ApiRespons(
      200,
      {
        attendance,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      },
      "Attendance fetched successfully"
    )
  );
});

// @desc    Get today's attendance status
// @route   GET /api/v1/attendance/today
// @access  Private
export const getTodayAttendance = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id });

  if (!employee) {
    throw new ApiError(404, "Employee profile not found");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendance = await Attendance.findOne({
    employee: employee._id,
    date: {
      $gte: today,
      $lt: tomorrow,
    },
  });

  if (!attendance) {
    return res
      .status(200)
      .json(new ApiRespons(200, null, "No attendance record for today"));
  }

  return res
    .status(200)
    .json(new ApiRespons(200, attendance, "Today's attendance fetched successfully"));
});