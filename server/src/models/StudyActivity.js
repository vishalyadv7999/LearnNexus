const mongoose = require("mongoose");

const studyActivitySchema = new mongoose.Schema(
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
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["task_completed", "video_completed", "manual"],
      default: "task_completed",
    },
    completed: {
      type: Boolean,
      default: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

studyActivitySchema.index({ user: 1, dateKey: 1 });
studyActivitySchema.index(
  { user: 1, task: 1 },
  {
    unique: true,
    partialFilterExpression: {
      task: { $type: "objectId" },
    },
  }
);

module.exports = mongoose.model("StudyActivity", studyActivitySchema);
