const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
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
    channelId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    creatorName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    creatorId: {
      type: String,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subjectName: {
      type: String,
      required: true,
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
      index: true,
    },
    playlistItemId: {
      type: String,
      trim: true,
    },
    videoOwnerChannelId: {
      type: String,
      trim: true,
    },
    relevanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
      index: true,
    },
    relevanceConfidence: {
      type: String,
      enum: ["none", "low", "medium", "high"],
      default: "high",
    },
    unavailable: {
      type: Boolean,
      default: false,
      index: true,
    },
    language: {
      type: String,
      required: true,
      enum: ["Hindi", "English"],
      index: true,
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    youtubeLink: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

videoSchema.index({ channelId: 1, subject: 1, language: 1, semester: 1, verified: 1 });
videoSchema.index({ creatorName: 1, subjectName: 1, language: 1, verified: 1 });
videoSchema.index({ playlistId: 1, playlistPosition: 1 });
videoSchema.index({ playlistId: 1, youtubeVideoId: 1 }, { unique: true });
videoSchema.index({ subject: 1, channelId: 1, language: 1, playlistPosition: 1 });

videoSchema.pre("validate", function validateVideoMetadata(next) {
  if (!this.youtubeLink && this.youtubeVideoId) {
    this.youtubeLink = `https://www.youtube.com/watch?v=${this.youtubeVideoId}`;
  }

  if (!this.playlistTitle && this.creatorName && this.subjectName) {
    this.playlistTitle = `${this.creatorName} ${this.subjectName}`;
  }

  if (this.youtubeLink && this.youtubeVideoId && !this.youtubeLink.includes(this.youtubeVideoId)) {
    next(new Error("youtubeLink must point to the configured YouTube video."));
    return;
  }

  next();
});

module.exports = mongoose.model("Video", videoSchema);
