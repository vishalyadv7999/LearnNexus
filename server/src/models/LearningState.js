const mongoose = require("mongoose");

const learningStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      index: true,
    },
    youtubeVideoId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    playlistId: {
      type: String,
      trim: true,
      index: true,
    },
    playlistTitle: {
      type: String,
      trim: true,
    },
    playlistPosition: {
      type: Number,
      min: 0,
    },
    channelId: {
      type: String,
      trim: true,
      index: true,
    },
    creatorName: {
      type: String,
      trim: true,
    },
    creatorId: {
      type: String,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      index: true,
    },
    subjectName: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      enum: ["Hindi", "English", ""],
      default: "",
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    youtubeLink: {
      type: String,
      trim: true,
    },
    currentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    percent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: Date,
    bookmarked: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

learningStateSchema.index({ user: 1, youtubeVideoId: 1 }, { unique: true });
learningStateSchema.index({ user: 1, playlistId: 1, playlistPosition: 1 });
learningStateSchema.index({ user: 1, lastWatchedAt: -1 });
learningStateSchema.index({ user: 1, subject: 1, completed: 1 });

module.exports = mongoose.model("LearningState", learningStateSchema);
