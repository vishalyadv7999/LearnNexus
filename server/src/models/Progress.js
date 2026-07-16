const mongoose = require("mongoose");

const progressEntrySchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    watchSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    progressRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    quizScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    completedAt: Date,
  },
  { _id: false }
);

const subjectBreakdownSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    completed: {
      type: Number,
      required: true,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studyPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyPlan",
      required: true,
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
    entries: [progressEntrySchema],
    subjectBreakdown: [subjectBreakdownSchema],
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

progressSchema.index({ user: 1, date: 1 }, { unique: true });
progressSchema.index({ user: 1, dateKey: 1 });
progressSchema.index({ user: 1, lastUpdatedAt: -1 });
progressSchema.index({ studyPlan: 1 });

module.exports = mongoose.model("Progress", progressSchema);
