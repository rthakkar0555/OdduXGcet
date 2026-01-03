import { Employee } from "../models/employee.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiRespons } from "../utils/ApiRespons.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendWelcomeEmail, sendVerificationEmail } from "../utils/emailService.js";
import jwt from "jsonwebtoken";

// Generate random password
const generateRandomPassword = () => {
  const length = 12;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = "";
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split("").sort(() => Math.random() - 0.5).join("");
};

// Generate Login ID: LOI (first 2 letters of first name + last name) (year of joining) (serial number)
// Example: OIJODO20220001
const generateLoginId = async (firstName, lastName, companyName, joiningDate) => {
  // Get first 2 letters of first name and last name
  const firstTwo = (firstName || "XX").substring(0, 2).toUpperCase().padEnd(2, "X");
  const lastTwo = (lastName || "XX").substring(0, 2).toUpperCase().padEnd(2, "X");
  const namePart = firstTwo + lastTwo;
  
  // Get year from joining date (or current year if not provided)
  const joinDate = joiningDate ? new Date(joiningDate) : new Date();
  const year = joinDate.getFullYear();
  
  // Get company prefix (first 2 letters of company name, default to "OI" for Odoo India)
  let companyPrefix = "OI";
  if (companyName && companyName.trim().length >= 2) {
    const prefix = companyName.trim().substring(0, 2).toUpperCase().replace(/[^A-Z]/g, "");
    if (prefix.length >= 2) {
      companyPrefix = prefix;
    }
  }
  
  // Find the last serial number for this year and company pattern
  const pattern = new RegExp(`^${companyPrefix}${namePart}${year}`);
  const lastUser = await User.findOne({
    loginId: pattern
  }).sort({ loginId: -1 });
  
  let serialNumber = 1;
  if (lastUser && lastUser.loginId) {
    const lastSerial = parseInt(lastUser.loginId.slice(-4));
    if (!isNaN(lastSerial)) {
      serialNumber = lastSerial + 1;
    }
  }
  
  return `${companyPrefix}${namePart}${year}${serialNumber.toString().padStart(4, "0")}`;
};

// Generate employee ID (EMP + timestamp + random)
const generateEmployeeId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `EMP${timestamp}${random}`;
};

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
  const { personalDetails, jobDetails, email, role } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  if (!personalDetails || !personalDetails.fullName) {
    throw new ApiError(400, "Employee full name is required");
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Parse name into first and last name
  const nameParts = (personalDetails.fullName || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Get joining date from jobDetails or use current date
  const joiningDate = jobDetails?.joiningDate 
    ? new Date(jobDetails.joiningDate) 
    : (jobDetails?.joinDate ? new Date(jobDetails.joinDate) : new Date());

  // Get company name from the admin/HR user who is creating this employee
  const adminUser = await User.findById(req.user._id);
  const companyName = adminUser?.companyName || null;

  // Generate Login ID using the format: [CompanyPrefix][First2Letters][Last2Letters][Year][SerialNumber]
  const loginId = await generateLoginId(firstName, lastName, companyName, joiningDate);

  // Generate unique employee ID
  const employeeId = generateEmployeeId();

  // Auto-generate password
  const autoGeneratedPassword = generateRandomPassword();

  // Generate email verification token
  const emailVerificationToken = jwt.sign(
    { email, userId: null }, // userId will be set after user creation
    process.env.ACCESS_TOKEN_SECRET || "default-secret",
    { expiresIn: "24h" }
  );

  // Create user with auto-generated password
  const user = await User.create({
    loginId,
    employeeId,
    email,
    password: autoGeneratedPassword,
    companyName: companyName,
    role: role || "employee",
    emailVerificationToken,
    emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  // Update token with actual userId
  const updatedToken = jwt.sign(
    { email, userId: user._id },
    process.env.ACCESS_TOKEN_SECRET || "default-secret",
    { expiresIn: "24h" }
  );
  user.emailVerificationToken = updatedToken;
  await user.save();

  // Create employee profile
  const employee = await Employee.create({
    user: user._id,
    personalDetails: {
      fullName: personalDetails.fullName,
      phone: personalDetails.phone || null,
      address: personalDetails.address || null,
      dateOfBirth: personalDetails.dateOfBirth ? new Date(personalDetails.dateOfBirth) : null,
      profilePicture: personalDetails.profilePicture || null,
    },
    jobDetails: {
      designation: jobDetails?.designation || "Not Assigned",
      department: jobDetails?.department || "General",
      joiningDate: joiningDate,
      employmentType: jobDetails?.employmentType || "full-time",
    },
  });

  // Link employee to user
  user.employeeProfile = employee._id;
  await user.save();

  // Send welcome email with credentials and verification email
  try {
    await sendWelcomeEmail(
      email,
      loginId,
      autoGeneratedPassword,
      personalDetails.fullName
    );
    // Also send verification email
    await sendVerificationEmail(
      email,
      updatedToken,
      personalDetails.fullName
    );
  } catch (emailError) {
    console.error("Failed to send emails:", emailError);
    // Don't fail employee creation if email fails
  }

  const populatedEmployee = await Employee.findById(employee._id).populate(
    "user",
    "-password -refreshToken"
  );

  // Return employee data with the auto-generated password (so HR/Admin can share it)
  return res
    .status(201)
    .json(new ApiRespons(201, {
      employee: populatedEmployee,
      loginId: loginId,
      temporaryPassword: autoGeneratedPassword, // Include this so HR/Admin can share it
      message: "Employee created successfully. Welcome email and verification email have been sent. Please share the Login ID and temporary password with the employee if needed."
    }, "Employee created successfully"));
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