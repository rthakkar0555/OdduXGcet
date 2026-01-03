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
        index: true,
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
