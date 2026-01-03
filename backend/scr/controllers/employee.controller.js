import { Employee } from "../models/employee.model.js";
import { User } from "../models/user.model.js";
import { Attendance } from "../models/attendance.model.js";
import { Leave } from "../models/leave.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiRespons } from "../utils/ApiRespons.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendWelcomeEmail, sendVerificationEmail } from "../utils/emailService.js";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";

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

// Calculate salary components based on wage
const calculateSalaryComponents = (monthWage) => {
  if (!monthWage || monthWage <= 0) {
    return {
      basicSalary: { amount: 0, percentage: 50 },
      hra: { amount: 0, percentage: 50 },
      standardAllowance: { amount: 4167, percentage: 0 },
      performanceBonus: { amount: 0, percentage: 8.33 },
      lta: { amount: 0, percentage: 8.33 },
      fixedAllowance: { amount: 0, percentage: 0 },
      pfEmployee: { amount: 0, percentage: 10 },
      pfEmployer: { amount: 0, percentage: 12 },
      professionalTax: { amount: 200, percentage: 0 },
    };
  }

  // Basic Salary = 50% of wage
  const basicSalary = monthWage * 0.5;
  
  // HRA = 50% of Basic
  const hra = basicSalary * 0.5;
  
  // Standard Allowance = 4167 (fixed)
  const standardAllowance = 4167;
  
  // Performance Bonus = 8.33% of Basic
  const performanceBonus = basicSalary * 0.0833;
  
  // LTA = 8.33% of Basic
  const lta = basicSalary * 0.0833;
  
  // Fixed Allowance = Wage - Total of all other components
  const otherComponentsTotal = basicSalary + hra + standardAllowance + performanceBonus + lta;
  const fixedAllowance = Math.max(0, monthWage - otherComponentsTotal);
  
  // PF Employee = 10% of Basic
  const pfEmployee = basicSalary * 0.10;
  
  // PF Employer = 12% of Basic
  const pfEmployer = basicSalary * 0.12;
  
  // Professional Tax = 200 (fixed)
  const professionalTax = 200;

  return {
    basicSalary: { amount: Math.round(basicSalary * 100) / 100, percentage: 50 },
    hra: { amount: Math.round(hra * 100) / 100, percentage: 50 },
    standardAllowance: { amount: standardAllowance, percentage: 0 },
    performanceBonus: { amount: Math.round(performanceBonus * 100) / 100, percentage: 8.33 },
    lta: { amount: Math.round(lta * 100) / 100, percentage: 8.33 },
    fixedAllowance: { amount: Math.round(fixedAllowance * 100) / 100, percentage: 0 },
    pfEmployee: { amount: Math.round(pfEmployee * 100) / 100, percentage: 10 },
    pfEmployer: { amount: Math.round(pfEmployer * 100) / 100, percentage: 12 },
    professionalTax: { amount: professionalTax, percentage: 0 },
  };
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
  const { personalDetails, jobDetails, salaryInfo } = req.body;

  const employee = await Employee.findOne({ user: req.user._id });

  if (!employee) {
    throw new ApiError(404, "Employee profile not found");
  }

  // Employees can only update limited fields
  if (req.user.role === "employee") {
    if (personalDetails) {
      employee.personalDetails.phone = personalDetails.phone !== undefined ? personalDetails.phone : employee.personalDetails.phone;
      employee.personalDetails.address = personalDetails.address !== undefined ? personalDetails.address : employee.personalDetails.address;
      employee.personalDetails.emoji = personalDetails.emoji !== undefined ? personalDetails.emoji : employee.personalDetails.emoji;
      // Allow updating personal info fields
      if (personalDetails.about !== undefined) {
        employee.personalDetails.about = personalDetails.about;
      }
      if (personalDetails.jobLove !== undefined) {
        employee.personalDetails.jobLove = personalDetails.jobLove;
      }
      if (personalDetails.interests !== undefined) {
        employee.personalDetails.interests = personalDetails.interests;
      }
      if (personalDetails.skills !== undefined) {
        employee.personalDetails.skills = personalDetails.skills;
      }
      if (personalDetails.certifications !== undefined) {
        employee.personalDetails.certifications = personalDetails.certifications;
      }
      // Allow removing profile picture by setting to null
      if (personalDetails.profilePicture === null) {
        employee.personalDetails.profilePicture = null;
      }
    }
  } else {
    // Admin/HR can update all fields including salary info
    if (personalDetails) {
      // Handle nested updates properly
      if (personalDetails.bankDetails) {
        employee.personalDetails.bankDetails = { 
          ...employee.personalDetails.bankDetails, 
          ...personalDetails.bankDetails 
        };
        delete personalDetails.bankDetails;
      }
      if (personalDetails.skills) {
        employee.personalDetails.skills = personalDetails.skills;
        delete personalDetails.skills;
      }
      if (personalDetails.certifications) {
        employee.personalDetails.certifications = personalDetails.certifications;
        delete personalDetails.certifications;
      }
      employee.personalDetails = { ...employee.personalDetails, ...personalDetails };
    }
    if (jobDetails) {
      employee.jobDetails = { ...employee.jobDetails, ...jobDetails };
    }
    if (salaryInfo && (req.user.role === "admin" || req.user.role === "hr")) {
      // Only Admin/HR can update salary info
      // If monthWage is updated, recalculate all salary components
      if (salaryInfo.monthWage !== undefined) {
        const monthWage = salaryInfo.monthWage;
        const yearlyWage = monthWage * 12;
        const calculatedComponents = calculateSalaryComponents(monthWage);
        
        employee.salaryInfo.monthWage = monthWage;
        employee.salaryInfo.yearlyWage = yearlyWage;
        employee.salaryInfo.salaryComponents = calculatedComponents;
        
        // Also update PF and Professional Tax
        employee.salaryInfo.pfEmployee = calculatedComponents.pfEmployee;
        employee.salaryInfo.pfEmployer = calculatedComponents.pfEmployer;
        employee.salaryInfo.professionalTax = calculatedComponents.professionalTax;
      } else {
        // Update other salary info fields without recalculation
        if (salaryInfo.yearlyWage !== undefined) {
          employee.salaryInfo.yearlyWage = salaryInfo.yearlyWage;
        }
        if (salaryInfo.workingDays !== undefined) {
          employee.salaryInfo.workingDays = salaryInfo.workingDays;
        }
        if (salaryInfo.breakTime !== undefined) {
          employee.salaryInfo.breakTime = salaryInfo.breakTime;
        }
        if (salaryInfo.salaryComponents) {
          employee.salaryInfo.salaryComponents = {
            ...employee.salaryInfo.salaryComponents,
            ...salaryInfo.salaryComponents,
          };
        }
        if (salaryInfo.pfEmployee) {
          employee.salaryInfo.pfEmployee = {
            ...employee.salaryInfo.pfEmployee,
            ...salaryInfo.pfEmployee,
          };
        }
        if (salaryInfo.pfEmployer) {
          employee.salaryInfo.pfEmployer = {
            ...employee.salaryInfo.pfEmployer,
            ...salaryInfo.pfEmployer,
          };
        }
        if (salaryInfo.professionalTax) {
          employee.salaryInfo.professionalTax = {
            ...employee.salaryInfo.professionalTax,
            ...salaryInfo.professionalTax,
          };
        }
      }
    }
  }

  await employee.save();

  const populatedEmployee = await Employee.findById(employee._id).populate(
    "user",
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(new ApiRespons(200, populatedEmployee, "Profile updated successfully"));
});

// @desc    Upload profile picture
// @route   POST /api/v1/employees/profile-picture
// @access  Private
export const uploadProfilePicture = asyncHandler(async (req, res) => {
  console.log("Upload request received:", {
    hasFile: !!req.file,
    file: req.file,
    body: req.body
  });

  if (!req.file) {
    throw new ApiError(400, "Profile picture file is required. Please select an image file.");
  }

  // Get the relative path from public folder
  // req.file.path will be like: public/temp/profilePicture-xxx.jpg
  // We need to convert it to: /uploads/profile-pictures/profilePicture-xxx.jpg
  
  const tempFilePath = req.file.path;
  const fileName = req.file.filename;
  
  // Create uploads/profile-pictures directory if it doesn't exist
  const uploadsDir = path.resolve(process.cwd(), "public", "uploads", "profile-pictures");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("✅ Created profile pictures directory:", uploadsDir);
  }

  // Move file from temp to permanent location
  const permanentPath = path.join(uploadsDir, fileName);
  fs.renameSync(tempFilePath, permanentPath);

  // Store relative path in database (accessible via static file serving)
  // This will be: /uploads/profile-pictures/filename.jpg
  const relativePath = `/uploads/profile-pictures/${fileName}`;

  console.log("✅ File saved locally at:", permanentPath);
  console.log("📝 Relative path stored:", relativePath);

  // If employee already has a profile picture, delete the old one
  const existingEmployee = await Employee.findOne({ user: req.user._id });
  if (existingEmployee?.personalDetails?.profilePicture) {
    const oldPath = existingEmployee.personalDetails.profilePicture;
    // Only delete if it's a local path (starts with /uploads)
    if (oldPath.startsWith("/uploads")) {
      const oldFilePath = path.resolve(process.cwd(), "public", oldPath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log("🗑️ Deleted old profile picture:", oldFilePath);
      }
    }
  }

  const employee = await Employee.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        "personalDetails.profilePicture": relativePath,
      },
    },
    { new: true }
  ).populate("user", "-password -refreshToken");

  if (!employee) {
    throw new ApiError(404, "Employee profile not found");
  }

  return res
    .status(200)
    .json(new ApiRespons(200, employee, "Profile picture uploaded successfully"));
});

// @desc    Get all employees (Admin/HR only)
// @route   GET /api/v1/employees
// @access  Private (Admin/HR)
export const getAllEmployees = asyncHandler(async (req, res) => {
  const { department, status, page = 1, limit = 10, withAttendance } = req.query;

  const query = {};
  if (department) query["jobDetails.department"] = department;
  if (status) query.status = status;

  const employees = await Employee.find(query)
    .populate("user", "-password -refreshToken")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  // If withAttendance is true, get today's attendance status for each employee
  let employeesWithAttendance = employees;
  if (withAttendance === "true") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get today's attendance records
    const todayAttendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    const attendanceMap = {};
    todayAttendance.forEach((att) => {
      const empId = att.employee?.toString();
      if (empId) {
        attendanceMap[empId] = {
          status: att.status,
          checkIn: att.checkIn,
          checkOut: att.checkOut,
        };
      }
    });

    // Check for active leaves today
    const todayLeaves = await Leave.find({
      startDate: { $lte: tomorrow },
      endDate: { $gte: today },
      status: "approved",
    });

    const leaveMap = {};
    todayLeaves.forEach((leave) => {
      const empId = leave.employee?.toString();
      if (empId) {
        leaveMap[empId] = true;
      }
    });

    employeesWithAttendance = employees.map((emp) => {
      const empObj = emp.toObject();
      const empId = emp._id.toString();
      
      // Check if on leave (highest priority)
      if (leaveMap[empId]) {
        empObj.todayStatus = "on-leave";
      } else if (attendanceMap[empId]) {
        // Check attendance status
        if (attendanceMap[empId].status === "present" && attendanceMap[empId].checkIn) {
          empObj.todayStatus = "present";
        } else if (attendanceMap[empId].status === "absent") {
          empObj.todayStatus = "absent";
        } else {
          empObj.todayStatus = "absent"; // Not checked in = absent
        }
      } else {
        // No attendance record = absent
        empObj.todayStatus = "absent";
      }
      
      return empObj;
    });
  }

  const count = await Employee.countDocuments(query);

  return res.status(200).json(
    new ApiRespons(
      200,
      {
        employees: employeesWithAttendance,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
      },
      "Employees fetched successfully"
    )
  );
});

// @desc    Get employee by ID (All authenticated users can view)
// @route   GET /api/v1/employees/:id
// @access  Private
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
  const { personalDetails, jobDetails, salaryInfo } = req.body;

  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // Update fields
  if (personalDetails) {
    // Handle nested updates properly
    if (personalDetails.bankDetails) {
      employee.personalDetails.bankDetails = { 
        ...employee.personalDetails.bankDetails, 
        ...personalDetails.bankDetails 
      };
      delete personalDetails.bankDetails;
    }
    if (personalDetails.skills) {
      employee.personalDetails.skills = personalDetails.skills;
      delete personalDetails.skills;
    }
    if (personalDetails.certifications) {
      employee.personalDetails.certifications = personalDetails.certifications;
      delete personalDetails.certifications;
    }
    // Only update provided fields
    if (personalDetails.fullName !== undefined) {
      employee.personalDetails.fullName = personalDetails.fullName;
    }
    if (personalDetails.phone !== undefined) {
      employee.personalDetails.phone = personalDetails.phone;
    }
    // Merge other personal details
    Object.keys(personalDetails).forEach(key => {
      if (key !== 'bankDetails' && key !== 'skills' && key !== 'certifications' && 
          key !== 'fullName' && key !== 'phone') {
        employee.personalDetails[key] = personalDetails[key];
      }
    });
  }
  if (jobDetails) {
    // Handle joinDate -> joiningDate conversion
    if (jobDetails.joinDate !== undefined && jobDetails.joinDate !== null && jobDetails.joinDate !== '') {
      const joinDate = new Date(jobDetails.joinDate);
      // Validate date
      if (isNaN(joinDate.getTime())) {
        throw new ApiError(400, "Invalid join date format. Please provide a valid date.");
      }
      jobDetails.joiningDate = joinDate;
      delete jobDetails.joinDate;
    }
    // Only update provided fields
    if (jobDetails.designation !== undefined) {
      employee.jobDetails.designation = jobDetails.designation;
    }
    if (jobDetails.department !== undefined) {
      employee.jobDetails.department = jobDetails.department;
    }
    if (jobDetails.employmentType !== undefined) {
      employee.jobDetails.employmentType = jobDetails.employmentType;
    }
    if (jobDetails.joiningDate !== undefined) {
      employee.jobDetails.joiningDate = jobDetails.joiningDate;
    }
    // Merge other job details
    Object.keys(jobDetails).forEach(key => {
      if (key !== 'designation' && key !== 'department' && 
          key !== 'employmentType' && key !== 'joiningDate' && key !== 'joinDate') {
        employee.jobDetails[key] = jobDetails[key];
      }
    });
  }
  if (salaryInfo) {
    // If monthWage is updated, recalculate all salary components
    if (salaryInfo.monthWage !== undefined) {
      const monthWage = salaryInfo.monthWage;
      const yearlyWage = monthWage * 12;
      const calculatedComponents = calculateSalaryComponents(monthWage);
      
      employee.salaryInfo.monthWage = monthWage;
      employee.salaryInfo.yearlyWage = yearlyWage;
      employee.salaryInfo.salaryComponents = calculatedComponents;
      
      // Also update PF and Professional Tax
      employee.salaryInfo.pfEmployee = calculatedComponents.pfEmployee;
      employee.salaryInfo.pfEmployer = calculatedComponents.pfEmployer;
      employee.salaryInfo.professionalTax = calculatedComponents.professionalTax;
    } else {
      // Update other salary info fields without recalculation
      if (salaryInfo.yearlyWage !== undefined) {
        employee.salaryInfo.yearlyWage = salaryInfo.yearlyWage;
      }
      if (salaryInfo.workingDays !== undefined) {
        employee.salaryInfo.workingDays = salaryInfo.workingDays;
      }
      if (salaryInfo.breakTime !== undefined) {
        employee.salaryInfo.breakTime = salaryInfo.breakTime;
      }
      if (salaryInfo.salaryComponents) {
        employee.salaryInfo.salaryComponents = {
          ...employee.salaryInfo.salaryComponents,
          ...salaryInfo.salaryComponents,
        };
      }
      if (salaryInfo.pfEmployee) {
        employee.salaryInfo.pfEmployee = {
          ...employee.salaryInfo.pfEmployee,
          ...salaryInfo.pfEmployee,
        };
      }
      if (salaryInfo.pfEmployer) {
        employee.salaryInfo.pfEmployer = {
          ...employee.salaryInfo.pfEmployer,
          ...salaryInfo.pfEmployer,
        };
      }
      if (salaryInfo.professionalTax) {
        employee.salaryInfo.professionalTax = {
          ...employee.salaryInfo.professionalTax,
          ...salaryInfo.professionalTax,
        };
      }
    }
  }

  try {
    await employee.save();
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      throw new ApiError(400, `Validation error: ${errors.join(', ')}`);
    }
    // Handle duplicate key errors
    if (error.code === 11000) {
      throw new ApiError(409, "Employee with this information already exists");
    }
    // Re-throw other errors
    throw error;
  }

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