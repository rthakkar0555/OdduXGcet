import { Employee } from "../models/employee.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiRespons } from "../utils/ApiRespons.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// @desc    Get employee profile
// @route   GET /api/v1/employees/profile
// @access  Private
export const getProfile = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id }).populate(
    "user",
    "-password -refreshToken"
  );

  if (!employee) {
    throw new ApiError(404, "Employee profile not found");
  }

  return res
    .status(200)
    .json(new ApiRespons(200, employee, "Profile fetched successfully"));
});

// @desc    Update employee profile
// @route   PUT /api/v1/employees/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const { personalDetails, jobDetails } = req.body;

  const employee = await Employee.findOne({ user: req.user._id });

  if (!employee) {
    throw new ApiError(404, "Employee profile not found");
  }

  // Employees can only update limited fields
  if (req.user.role === "employee") {
    if (personalDetails) {
      employee.personalDetails.phone = personalDetails.phone || employee.personalDetails.phone;
      employee.personalDetails.address = personalDetails.address || employee.personalDetails.address;
    }
  } else {
    // Admin/HR can update all fields
    if (personalDetails) {
      employee.personalDetails = { ...employee.personalDetails, ...personalDetails };
    }
    if (jobDetails) {
      employee.jobDetails = { ...employee.jobDetails, ...jobDetails };
    }
  }

  await employee.save();

  return res
    .status(200)
    .json(new ApiRespons(200, employee, "Profile updated successfully"));
});

// @desc    Upload profile picture
// @route   POST /api/v1/employees/profile-picture
// @access  Private
export const uploadProfilePicture = asyncHandler(async (req, res) => {
  const localFilePath = req.file?.path;

  if (!localFilePath) {
    throw new ApiError(400, "Profile picture file is required");
  }

  const profilePicture = await uploadOnCloudinary(localFilePath);

  if (!profilePicture) {
    throw new ApiError(400, "Error uploading profile picture");
  }

  const employee = await Employee.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        "personalDetails.profilePicture": profilePicture.url,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiRespons(200, employee, "Profile picture uploaded successfully"));
});

// @desc    Get all employees (Admin/HR only)
// @route   GET /api/v1/employees
// @access  Private (Admin/HR)
export const getAllEmployees = asyncHandler(async (req, res) => {
  const { department, status, page = 1, limit = 10 } = req.query;

  const query = {};
  if (department) query["jobDetails.department"] = department;
  if (status) query.status = status;

  const employees = await Employee.find(query)
    .populate("user", "-password -refreshToken")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Employee.countDocuments(query);

  return res.status(200).json(
    new ApiRespons(
      200,
      {
        employees,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      },
      "Employees fetched successfully"
    )
  );
});

// @desc    Get employee by ID (Admin/HR only)
// @route   GET /api/v1/employees/:id
// @access  Private (Admin/HR)
export const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).populate(
    "user",
    "-password -refreshToken"
  );

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  return res
    .status(200)
    .json(new ApiRespons(200, employee, "Employee fetched successfully"));
});

// @desc    Update employee status (Admin/HR only)
// @route   PATCH /api/v1/employees/:id/status
// @access  Private (Admin/HR)
export const updateEmployeeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["active", "inactive", "terminated"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const employee = await Employee.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  return res
    .status(200)
    .json(new ApiRespons(200, employee, "Employee status updated successfully"));
});

// @desc    Create employee (Admin/HR only)
// @route   POST /api/v1/employees
// @access  Private (Admin/HR)
export const createEmployee = asyncHandler(async (req, res) => {
  const { personalDetails, jobDetails, email, password, employeeId, role } = req.body;

  if (!email || !password || !employeeId) {
    throw new ApiError(400, "Email, password, and employeeId are required");
  }

  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [{ email }, { employeeId }] 
  });

  if (existingUser) {
    throw new ApiError(400, "User with this email or employeeId already exists");
  }

  // Create user
  const user = await User.create({
    email,
    password,
    employeeId,
    role: role || "employee",
  });

  // Create employee profile
  const employee = await Employee.create({
    user: user._id,
    personalDetails: personalDetails || {},
    jobDetails: {
      ...jobDetails,
      joiningDate: jobDetails?.joinDate ? new Date(jobDetails.joinDate) : new Date(),
    },
  });

  // Link employee to user
  user.employeeProfile = employee._id;
  await user.save();

  const populatedEmployee = await Employee.findById(employee._id).populate(
    "user",
    "-password -refreshToken"
  );

  return res
    .status(201)
    .json(new ApiRespons(201, populatedEmployee, "Employee created successfully"));
});

// @desc    Update employee by ID (Admin/HR only)
// @route   PUT /api/v1/employees/:id
// @access  Private (Admin/HR)
export const updateEmployee = asyncHandler(async (req, res) => {
  const { personalDetails, jobDetails } = req.body;

  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // Update fields
  if (personalDetails) {
    employee.personalDetails = { ...employee.personalDetails, ...personalDetails };
  }
  if (jobDetails) {
    // Handle joinDate -> joiningDate conversion
    if (jobDetails.joinDate) {
      jobDetails.joiningDate = new Date(jobDetails.joinDate);
      delete jobDetails.joinDate;
    }
    employee.jobDetails = { ...employee.jobDetails, ...jobDetails };
  }

  await employee.save();

  const populatedEmployee = await Employee.findById(employee._id).populate(
    "user",
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(new ApiRespons(200, populatedEmployee, "Employee updated successfully"));
});

// @desc    Delete employee (Admin only)
// @route   DELETE /api/v1/employees/:id
// @access  Private (Admin)
export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // Delete associated user
  await User.findByIdAndDelete(employee.user);

  // Delete employee
  await employee.deleteOne();

  return res
    .status(200)
    .json(new ApiRespons(200, {}, "Employee deleted successfully"));
});