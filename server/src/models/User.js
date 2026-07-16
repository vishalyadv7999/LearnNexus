const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    course: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    year: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCodeHash: {
      type: String,
      select: false,
    },
    emailVerificationExpiresAt: {
      type: Date,
      select: false,
    },
    passwordResetCodeHash: {
      type: String,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },
    passwordChangedAt: Date,
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    lastActiveOn: Date,
    preferences: {
      studyMinutesPerDay: {
        type: Number,
        default: 60,
        min: 60,
        max: 60,
      },
      focusMode: {
        type: Boolean,
        default: true,
      },
      preferredChannels: {
        type: [String],
        default: [],
      },
      preferredSubjects: {
        type: [String],
        default: [],
      },
      videoLanguage: {
        type: String,
        enum: ["English", "Hindi"],
        default: "English",
      },
      adaptiveLevel: {
        type: Number,
        default: 3,
        min: 1,
        max: 5,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    next();
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
