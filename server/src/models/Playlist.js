const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    youtubePlaylistId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
      index: true,
    },
    language: {
      type: String,
      required: true,
      enum: ["Hindi", "English"],
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    public: {
      type: Boolean,
      default: true,
    },
    videoCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    importedVideoCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    skippedVideoCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    duplicateVideoCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    importStatus: {
      type: String,
      enum: ["idle", "queued", "importing", "completed", "failed", "quota_exhausted"],
      default: "idle",
      index: true,
    },
    importNextPageToken: {
      type: String,
      trim: true,
    },
    importStartedAt: Date,
    importCompletedAt: Date,
    lastImportedAt: Date,
    importError: {
      type: String,
      trim: true,
    },
    importLog: {
      type: [
        {
          at: {
            type: Date,
            default: Date.now,
          },
          level: {
            type: String,
            enum: ["info", "warn", "error"],
            default: "info",
          },
          event: {
            type: String,
            required: true,
            trim: true,
          },
          message: {
            type: String,
            required: true,
            trim: true,
          },
          meta: {
            type: mongoose.Schema.Types.Mixed,
          },
        },
      ],
      default: [],
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    youtubeLink: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

playlistSchema.index({ channelId: 1, subject: 1, semester: 1, language: 1 });
playlistSchema.index({ creatorName: 1, subjectName: 1, language: 1, verified: 1 });
playlistSchema.index({ importStatus: 1, lastImportedAt: -1 });

playlistSchema.pre("validate", function validatePlaylistMetadata(next) {
  if (!this.playlistTitle) {
    this.playlistTitle = this.title;
  }

  if (!this.youtubeLink && this.youtubePlaylistId) {
    this.youtubeLink = `https://www.youtube.com/playlist?list=${this.youtubePlaylistId}`;
  }

  if (
    this.youtubeLink &&
    this.youtubePlaylistId &&
    !this.youtubeLink.includes(this.youtubePlaylistId)
  ) {
    next(new Error("youtubeLink must point to the configured YouTube playlist."));
    return;
  }

  next();
});

module.exports = mongoose.model("Playlist", playlistSchema);
