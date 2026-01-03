import { Payroll } from "../models/payroll.model.js";
import { Employee } from "../models/employee.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiRespons } from "../utils/ApiRespons.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Get my payroll
// @route   GET /api/v1/payroll/my-payroll
// @access  Private
export const getMyPayroll = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id });

  if (!employee) {
    throw new ApiError(404, "Employee profile not found");
  }

  const payroll = await Payroll.findOne({ employee: employee._id }).populate(
    "employee"
  );

  if (!payroll) {
    throw new ApiError(404, "Payroll information not found");
  }

  return res
    .status(200)
    .json(new ApiRespons(200, payroll, "Payroll fetched successfully"));
});

// @desc    Get all payrolls (Admin/HR only)
// @route   GET /api/v1/payroll
// @access  Private (Admin/HR)
export const getAllPayrolls = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const payrolls = await Payroll.find()
    .populate("employee")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Payroll.countDocuments();

  return res.status(200).json(
    new ApiRespons(
      200,
      {
        payrolls,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      },
      "Payrolls fetched successfully"
    )
  );
});

// @desc    Get payroll by employee ID (Admin/HR only)
// @route   GET /api/v1/payroll/employee/:employeeId
// @access  Private (Admin/HR)
export const getPayrollByEmployeeId = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findOne({
    employee: req.params.employeeId,
  }).populate("employee");

  if (!payroll) {
    throw new ApiError(404, "Payroll information not found");
  }

  return res
    .status(200)
    .json(new ApiRespons(200, payroll, "Payroll fetched successfully"));
});

// @desc    Create or update payroll (Admin/HR only)
// @route   POST /api/v1/payroll
// @access  Private (Admin/HR)
export const createOrUpdatePayroll = asyncHandler(async (req, res) => {
  const { employeeId, basicSalary, allowances, deductions, effectiveFrom, currency } =
    req.body;

  if (!employeeId) {
    throw new ApiError(400, "Employee ID is required");
  }

  if (!basicSalary && basicSalary !== 0) {
    throw new ApiError(400, "Basic salary is required");
  }

  const employee = await Employee.findById(employeeId);

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // Check if payroll already exists
  let payroll = await Payroll.findOne({ employee: employeeId });

  if (payroll) {
    // Update existing payroll - only update provided fields
    if (basicSalary !== undefined) {
      payroll.basicSalary = basicSalary;
    }
    if (allowances !== undefined) {
      payroll.allowances = { ...payroll.allowances, ...allowances };
    }
    if (deductions !== undefined) {
      payroll.deductions = { ...payroll.deductions, ...deductions };
    }
    if (effectiveFrom !== undefined) {
      payroll.effectiveFrom = effectiveFrom;
    }
    if (currency !== undefined) {
      payroll.currency = currency;
    }

    // The pre-save hook will calculate netSalary automatically
    await payroll.save();

    return res
      .status(200)
      .json(new ApiRespons(200, payroll, "Payroll updated successfully"));
  } else {
    // Create new payroll
    payroll = await Payroll.create({
      employee: employeeId,
      basicSalary,
      allowances: allowances || {},
      deductions: deductions || {},
      effectiveFrom: effectiveFrom || new Date(),
      currency: currency || 'INR',
    });

    return res
      .status(201)
      .json(new ApiRespons(201, payroll, "Payroll created successfully"));
  }
});

// @desc    Delete payroll (Admin only)
// @route   DELETE /api/v1/payroll/:id
// @access  Private (Admin)
export const deletePayroll = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(req.params.id);

  if (!payroll) {
    throw new ApiError(404, "Payroll not found");
  }

  await payroll.deleteOne();

  return res
    .status(200)
    .json(new ApiRespons(200, {}, "Payroll deleted successfully"));
});
