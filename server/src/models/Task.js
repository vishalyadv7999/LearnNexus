const mongoose = require("mongoose");

const supportResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    explanation: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const relatedVideoSchema = new mongoose.Schema(
  {
    videoTitle: {
      type: String,
      required: true,
      trim: true,
    },
    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    videoEmbedUrl: {
      type: String,
      trim: true,
    },
    videoThumbnailUrl: {
      type: String,
      trim: true,
    },
    videoChannel: {
      type: String,
      trim: true,
    },
    creatorName: {
      type: String,
      trim: true,
    },
    creatorId: {
      type: String,
      trim: true,
    },
    creator: {
      type: String,
      trim: true,
    },
    channelName: {
      type: String,
      trim: true,
    },
    course: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ["curated", "verified", "fallback", "external"],
      default: "verified",
    },
    videoId: {
      type: String,
      trim: true,
    },
    videoDurationLabel: {
      type: String,
      trim: true,
    },
    videoDurationSeconds: {
      type: Number,
      min: 0,
    },
    videoViews: {
      type: Number,
      min: 0,
    },
    videoChannelId: {
      type: String,
      trim: true,
    },
    videoLanguage: {
      type: String,
      enum: ["Hindi", "English"],
    },
    videoSubject: {
      type: String,
      trim: true,
    },
    subjectName: {
      type: String,
      trim: true,
    },
    videoSubjectTag: {
      type: String,
      trim: true,
    },
    videoSemester: {
      type: Number,
      min: 1,
      max: 8,
    },
    videoVerified: {
      type: Boolean,
      default: false,
    },
    playlistTitle: {
      type: String,
      trim: true,
    },
    playlistId: {
      type: String,
      trim: true,
    },
    playlistPosition: {
      type: Number,
      min: 0,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    youtubeLink: {
      type: String,
      trim: true,
    },
    recommendationScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    recommendationConfidence: {
      type: String,
      enum: ["none", "low", "medium", "high"],
    },
    recommendationReason: {
      type: String,
      trim: true,
    },
    fallbackUsed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    explanation: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
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
      index: true,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    conceptSummary: {
      type: String,
      required: true,
      trim: true,
    },
    difficultyLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    difficultyLabel: {
      type: String,
      required: true,
      trim: true,
    },
    videoTitle: {
      type: String,
      required: true,
      trim: true,
    },
    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    videoEmbedUrl: {
      type: String,
      trim: true,
    },
    videoThumbnailUrl: {
      type: String,
      trim: true,
    },
    videoChannel: {
      type: String,
      trim: true,
    },
    creatorName: {
      type: String,
      trim: true,
    },
    creatorId: {
      type: String,
      trim: true,
    },
    creator: {
      type: String,
      trim: true,
    },
    channelName: {
      type: String,
      trim: true,
    },
    course: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ["curated", "verified", "fallback", "external"],
      default: "verified",
    },
    videoId: {
      type: String,
      trim: true,
    },
    videoChannelId: {
      type: String,
      trim: true,
      index: true,
    },
    videoLanguage: {
      type: String,
      enum: ["Hindi", "English"],
      index: true,
    },
    videoSubject: {
      type: String,
      trim: true,
    },
    subjectName: {
      type: String,
      trim: true,
    },
    videoSubjectTag: {
      type: String,
      trim: true,
      index: true,
    },
    playlistTitle: {
      type: String,
      trim: true,
    },
    playlistId: {
      type: String,
      trim: true,
    },
    playlistPosition: {
      type: Number,
      min: 0,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    youtubeLink: {
      type: String,
      trim: true,
    },
    videoSemester: {
      type: Number,
      min: 1,
      max: 8,
      index: true,
    },
    videoVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    recommendationScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    recommendationConfidence: {
      type: String,
      enum: ["none", "low", "medium", "high"],
    },
    recommendationReason: {
      type: String,
      trim: true,
    },
    fallbackUsed: {
      type: Boolean,
      default: false,
    },
    videoDurationLabel: {
      type: String,
      trim: true,
    },
    notesText: {
      type: String,
      required: true,
      trim: true,
    },
    notesPdfUrl: {
      type: String,
      trim: true,
    },
    practiceTask: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedMinutes: {
      type: Number,
      required: true,
      min: 15,
      max: 180,
    },
    supportResources: [supportResourceSchema],
    relatedVideos: [relatedVideoSchema],
    quizQuestions: [quizQuestionSchema],
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
    startedAt: Date,
    quizScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    quizCompletedAt: Date,
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

taskSchema.index({ user: 1, date: 1, order: 1 });
taskSchema.index({ user: 1, studyPlan: 1 });
taskSchema.index({ studyPlan: 1, order: 1 });
taskSchema.index({ user: 1, videoChannelId: 1, videoSubjectTag: 1 });

module.exports = mongoose.model("Task", taskSchema);
