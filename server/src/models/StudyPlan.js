const mongoose = require("mongoose");

const studyPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    dateKey: {
      type: String,
      trim: true,
      index: true,
    },
    course: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
    },
    dayIndex: {
      type: Number,
      required: true,
      min: 1,
    },
    trackName: {
      type: String,
      required: true,
      trim: true,
    },
    focusSummary: {
      type: String,
      required: true,
      trim: true,
    },
    subjects: [
      {
        type: String,
        trim: true,
      },
    ],
    preferredChannels: [
      {
        type: String,
        trim: true,
      },
    ],
    preferredSubjects: [
      {
        type: String,
        trim: true,
      },
    ],
    videoLanguage: {
      type: String,
      trim: true,
      default: "English",
    },
    recommendationVersion: {
      type: String,
      trim: true,
      default: "legacy",
      index: true,
    },
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    totalTasks: {
      type: Number,
      required: true,
      default: 0,
    },
    completedTasks: {
      type: Number,
      required: true,
      default: 0,
    },
    completionRate: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

studyPlanSchema.index({ user: 1, date: 1 }, { unique: true });
studyPlanSchema.index({ user: 1, dateKey: 1 });
studyPlanSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("StudyPlan", studyPlanSchema);
