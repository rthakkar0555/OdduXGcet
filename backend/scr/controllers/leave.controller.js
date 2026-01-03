import { Leave } from "../models/leave.model.js";
import { Employee } from "../models/employee.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiRespons } from "../utils/ApiRespons.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Apply for leave
// @route   POST /api/v1/leaves/apply
// @access  Private
export const applyLeave = asyncHandler(async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  // Validate dates
  if (!startDate || !endDate) {
    throw new ApiError(400, "Start date and end date are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(400, "Invalid date format");
  }

  // Check if start date is before or equal to end date
  if (start > end) {
    throw new ApiError(400, "Start date must be before or equal to end date");
  }

  // Check if start date is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) {
    throw new ApiError(400, "Start date cannot be in the past");
  }

  const employee = await Employee.findOne({ user: req.user._id });

  if (!employee) {
    throw new ApiError(404, "Employee profile not found");
  }

  // Check for overlapping leaves
  const overlappingLeave = await Leave.findOne({
    employee: employee._id,
    status: { $in: ["pending", "approved"] },
    $or: [
      {
        startDate: { $lte: end },
        endDate: { $gte: start },
      },
    ],
  });

  if (overlappingLeave) {
    throw new ApiError(400, "You already have a leave request for this period");
  }

  // Calculate total days
  const diffTime = Math.abs(end - start);
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates

  const leave = await Leave.create({
    employee: employee._id,
    leaveType,
    startDate: start,
    endDate: end,
    totalDays,
    reason,
  });

  return res
    .status(201)
    .json(new ApiRespons(201, leave, "Leave application submitted successfully"));
});

// @desc    Get my leaves
// @route   GET /api/v1/leaves/my-leaves
// @access  Private
export const getMyLeaves = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const employee = await Employee.findOne({ user: req.user._id });

  if (!employee) {
    throw new ApiError(404, "Employee profile not found");
  }

  const query = { employee: employee._id };
  if (status) query.status = status;

  const leaves = await Leave.find(query)
    .populate("reviewedBy", "email employeeId")
    .sort({ appliedOn: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Leave.countDocuments(query);

  return res.status(200).json(
    new ApiRespons(
      200,
      {
        leaves,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      },
      "Leaves fetched successfully"
    )
  );
});

// @desc    Get all leave requests (Admin/HR only)
// @route   GET /api/v1/leaves
// @access  Private (Admin/HR)
export const getAllLeaves = asyncHandler(async (req, res) => {
  const { status, leaveType, page = 1, limit = 10 } = req.query;

  const query = {};
  if (status) query.status = status;
  if (leaveType) query.leaveType = leaveType;

  const leaves = await Leave.find(query)
    .populate("employee")
    .populate("reviewedBy", "email employeeId")
    .sort({ appliedOn: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Leave.countDocuments(query);

  return res.status(200).json(
    new ApiRespons(
      200,
      {
        leaves,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      },
      "Leaves fetched successfully"
    )
  );
});

// @desc    Approve leave (Admin/HR only)
// @route   PATCH /api/v1/leaves/:id/approve
// @access  Private (Admin/HR)
export const approveLeave = asyncHandler(async (req, res) => {
  const { reviewComments } = req.body;

  const leave = await Leave.findById(req.params.id);

  if (!leave) {
    throw new ApiError(404, "Leave request not found");
  }

  if (leave.status !== "pending") {
    throw new ApiError(400, "Leave request has already been reviewed");
  }

  leave.status = "approved";
  leave.reviewedBy = req.user._id;
  leave.reviewedOn = new Date();
  leave.reviewComments = reviewComments;

  await leave.save();

  return res
    .status(200)
    .json(new ApiRespons(200, leave, "Leave approved successfully"));
});

// @desc    Reject leave (Admin/HR only)
// @route   PATCH /api/v1/leaves/:id/reject
// @access  Private (Admin/HR)
export const rejectLeave = asyncHandler(async (req, res) => {
  const { reviewComments } = req.body;

  const leave = await Leave.findById(req.params.id);

  if (!leave) {
    throw new ApiError(404, "Leave request not found");
  }

  if (leave.status !== "pending") {
    throw new ApiError(400, "Leave request has already been reviewed");
  }

  leave.status = "rejected";
  leave.reviewedBy = req.user._id;
  leave.reviewedOn = new Date();
  leave.reviewComments = reviewComments;

  await leave.save();

  return res
    .status(200)
    .json(new ApiRespons(200, leave, "Leave rejected successfully"));
});

// @desc    Cancel leave
// @route   DELETE /api/v1/leaves/:id
// @access  Private
export const cancelLeave = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id });

  const leave = await Leave.findOne({
    _id: req.params.id,
    employee: employee._id,
  });

  if (!leave) {
    throw new ApiError(404, "Leave request not found");
  }

  if (leave.status !== "pending") {
    throw new ApiError(400, "Cannot cancel a leave that has been reviewed");
  }

  await leave.deleteOne();

  return res
    .status(200)
    .json(new ApiRespons(200, {}, "Leave cancelled successfully"));
});
