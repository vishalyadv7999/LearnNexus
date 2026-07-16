const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    youtubeChannelId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      enum: ["Hindi", "English"],
      index: true,
    },
    subjects: {
      type: [String],
      default: [],
      index: true,
    },
    semesters: {
      type: [Number],
      default: [],
    },
    branches: {
      type: [String],
      default: [],
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

channelSchema.index({ language: 1, subjects: 1, verified: 1 });

module.exports = mongoose.model("Channel", channelSchema);
