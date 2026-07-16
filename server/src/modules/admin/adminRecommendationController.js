const Channel = require("../../models/Channel");
const Playlist = require("../../models/Playlist");
const Video = require("../../models/Video");
const ApiError = require("../../utils/apiError");
const {
  continuePlaylistImport,
  importPlaylist,
} = require("../videos/services/youtubePlaylistImportService");
const { cleanupRecommendations } = require("./services/recommendationCleanupService");

const models = {
  channels: Channel,
  playlists: Playlist,
  videos: Video,
};

const getModel = (resource) => {
  const model = models[resource];

  if (!model) {
    throw new ApiError(404, "Recommendation resource not found.");
  }

  return model;
};

const listResources = async (req, res, next) => {
  try {
    const Model = getModel(req.params.resource);
    const filter = {};

    ["language", "subject", "channelId"].forEach((key) => {
      if (req.query[key]) {
        filter[key] = req.query[key];
      }
    });

    if (typeof req.query.verified !== "undefined") {
      filter.verified = req.query.verified === "true";
    }

    const items = await Model.find(filter).sort({ updatedAt: -1 }).limit(100);
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const upsertResource = async (req, res, next) => {
  try {
    const Model = getModel(req.params.resource);
    const identityField =
      req.params.resource === "channels"
        ? "youtubeChannelId"
        : req.params.resource === "playlists"
          ? "youtubePlaylistId"
          : "youtubeVideoId";
    const identityValue = req.body[identityField];

    if (!identityValue) {
      throw new ApiError(400, `${identityField} is required.`);
    }

    const item = await Model.findOneAndUpdate(
      { [identityField]: identityValue },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
};

const verifyResource = async (req, res, next) => {
  try {
    const Model = getModel(req.params.resource);
    const item = await Model.findByIdAndUpdate(
      req.params.id,
      { verified: req.body.verified !== false },
      { new: true, runValidators: true }
    );

    if (!item) {
      throw new ApiError(404, "Recommendation resource not found.");
    }

    res.json({ item });
  } catch (error) {
    next(error);
  }
};

const removeResource = async (req, res, next) => {
  try {
    const Model = getModel(req.params.resource);
    const item = await Model.findByIdAndDelete(req.params.id);

    if (!item) {
      throw new ApiError(404, "Recommendation resource not found.");
    }

    res.json({ message: "Recommendation resource removed." });
  } catch (error) {
    next(error);
  }
};

const importPlaylistResource = async (req, res, next) => {
  try {
    const playlist = await importPlaylist(req.body);
    res.status(202).json({ playlist });
  } catch (error) {
    next(error);
  }
};

const continuePlaylistResourceImport = async (req, res, next) => {
  try {
    const playlist = await continuePlaylistImport(req.params.id, {
      maxPages: req.body.maxPages,
    });
    res.status(202).json({ playlist });
  } catch (error) {
    next(error);
  }
};

const cleanupRecommendationResources = async (_req, res, next) => {
  try {
    const report = await cleanupRecommendations();
    res.json({ report });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  cleanupRecommendationResources,
  continuePlaylistResourceImport,
  importPlaylistResource,
  listResources,
  removeResource,
  upsertResource,
  verifyResource,
};
