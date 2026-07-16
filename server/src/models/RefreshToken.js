const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: Date,
    replacedByTokenHash: String,
    userAgent: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 80,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
