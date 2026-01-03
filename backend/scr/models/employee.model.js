import mongoose, { Schema } from "mongoose";

const employeeSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    personalDetails: {
      fullName: {
        type: String,
        required: true,
        trim: true,
        // index: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
      dateOfBirth: {
        type: Date,
      },
      profilePicture: {
        type: String, // Cloudinary URL
      },
      emoji: {
        type: String, // Emoji character for avatar
        trim: true,
      },
      nationality: {
        type: String,
        trim: true,
      },
      personalEmail: {
        type: String,
        trim: true,
        lowercase: true,
      },
      gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer-not-to-say'],
        trim: true,
      },
      maritalStatus: {
        type: String,
        enum: ['single', 'married', 'divorced', 'widowed'],
        trim: true,
      },
      about: {
        type: String,
        trim: true,
      },
      jobLove: {
        type: String,
        trim: true,
      },
      interests: {
        type: String,
        trim: true,
      },
      skills: [{
        type: String,
        trim: true,
      }],
      certifications: [{
        name: {
          type: String,
          trim: true,
        },
        issuedBy: {
          type: String,
          trim: true,
        },
        issueDate: {
          type: Date,
        },
        expiryDate: {
          type: Date,
        },
      }],
      bankDetails: {
        accountNumber: {
          type: String,
          trim: true,
        },
        bankName: {
          type: String,
          trim: true,
        },
        ifscCode: {
          type: String,
          trim: true,
          uppercase: true,
        },
        panNo: {
          type: String,
          trim: true,
          uppercase: true,
        },
        uanNo: {
          type: String,
          trim: true,
        },
      },
    },
    jobDetails: {
      designation: {
        type: String,
        required: true,
        trim: true,
      },
      department: {
        type: String,
        required: true,
        trim: true,
      },
      joiningDate: {
        type: Date,
        required: true,
        default: Date.now,
      },
      employmentType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'intern'],
        default: 'full-time',
      },
      manager: {
        type: String,
        trim: true,
      },
      location: {
        type: String,
        trim: true,
      },
    },
    documents: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive', 'terminated'],
      default: 'active',
    },
    salaryInfo: {
      monthWage: {
        type: Number,
        min: 0,
        default: 0,
      },
      yearlyWage: {
        type: Number,
        min: 0,
        default: 0,
      },
      workingDays: {
        type: Number,
        min: 1,
        max: 7,
        default: 5,
      },
      breakTime: {
        type: Number,
        min: 0,
        default: 1,
      },
      salaryComponents: {
        basicSalary: {
          amount: { type: Number, default: 0 },
          percentage: { type: Number, default: 50 },
        },
        hra: {
          amount: { type: Number, default: 0 },
          percentage: { type: Number, default: 50 },
        },
        standardAllowance: {
          amount: { type: Number, default: 4167 },
          percentage: { type: Number, default: 0 },
        },
        performanceBonus: {
          amount: { type: Number, default: 0 },
          percentage: { type: Number, default: 8.33 },
        },
        lta: {
          amount: { type: Number, default: 0 },
          percentage: { type: Number, default: 8.33 },
        },
        fixedAllowance: {
          amount: { type: Number, default: 0 },
          percentage: { type: Number, default: 0 },
        },
      },
      pfEmployee: {
        amount: { type: Number, default: 0 },
        percentage: { type: Number, default: 10 },
      },
      pfEmployer: {
        amount: { type: Number, default: 0 },
        percentage: { type: Number, default: 12 },
      },
      professionalTax: {
        amount: { type: Number, default: 200 },
        percentage: { type: Number, default: 0 },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
employeeSchema.index({ 'personalDetails.fullName': 'text' });
employeeSchema.index({ 'jobDetails.department': 1 });
employeeSchema.index({ status: 1 });

export const Employee = mongoose.model("Employee", employeeSchema);
