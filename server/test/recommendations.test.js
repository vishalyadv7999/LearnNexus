const assert = require("node:assert/strict");
const { after, afterEach, before, beforeEach, describe, it } = require("node:test");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/learnnexus-recommendations-test";
process.env.JWT_SECRET = "test_shared_secret_that_is_long_enough_for_recommendation_tests";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.YOUTUBE_API_KEY = "test-youtube-api-key";

const {
  getChannelsByLanguage,
  VERIFIED_PLAYLISTS,
} = require("../src/data/recommendationCatalog");
const {
  CURATED_PLAYLIST_MAPPINGS,
  CURATED_VIDEO_FALLBACKS,
  extractPlaylistIdFromUrl,
  findCuratedMapping,
  getCuratedCreatorsForCourse,
  getMappedCreatorsForCourse,
  normalizeCuratedKey,
} = require("../src/data/curatedLearningCatalog");
const { findLectureVideos } = require("../src/services/videoSearchService");
const { clearMemoryCache } = require("../src/services/cacheService");
const Playlist = require("../src/models/Playlist");
const Progress = require("../src/models/Progress");
const StudyPlan = require("../src/models/StudyPlan");
const Task = require("../src/models/Task");
const Video = require("../src/models/Video");
const LearningState = require("../src/models/LearningState");
const User = require("../src/models/User");
const {
  getLearningFlow,
  getNextPlaylistVideosForState,
  updateVideoLearningState,
} = require("../src/services/learningFlowService");
const { getStudyPlanBundle } = require("../src/services/studyPlanService");
const { importPlaylist } = require("../src/services/youtubePlaylistImportService");

let mongoServer;

const buildYoutubeSearchHtml = (videos) => {
  const data = {
    contents: {
      twoColumnSearchResultsRenderer: {
        primaryContents: {
          sectionListRenderer: {
            contents: [
              {
                itemSectionRenderer: {
                  contents: videos.map((video) => ({
                    videoRenderer: {
                      videoId: video.videoId,
                      title: { runs: [{ text: video.title }] },
                      lengthText: { simpleText: "12:30" },
                      viewCountText: { simpleText: "12,000 views" },
                      thumbnail: {
                        thumbnails: [
                          {
                            url: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
                          },
                        ],
                      },
                      ownerText: {
                        runs: [
                          {
                            text: video.channelName,
                            navigationEndpoint: {
                              browseEndpoint: {
                                browseId: video.channelId,
                              },
                            },
                          },
                        ],
                      },
                    },
                  })),
                },
              },
            ],
          },
        },
      },
    },
  };

  return `<html><script>var ytInitialData = ${JSON.stringify(data)};</script></html>`;
};

const buildYoutubePlaylistHtml = (videos) => {
  const data = {
    contents: {
      twoColumnBrowseResultsRenderer: {
        tabs: [
          {
            tabRenderer: {
              content: {
                sectionListRenderer: {
                  contents: [
                    {
                      itemSectionRenderer: {
                        contents: videos.map((video, index) => ({
                          playlistVideoRenderer: {
                            videoId: video.videoId,
                            title: { runs: [{ text: video.title }] },
                            index: { simpleText: String(index + 1) },
                            lengthText: { simpleText: video.duration || "12:30" },
                            thumbnail: {
                              thumbnails: [
                                {
                                  url: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
                                },
                              ],
                            },
                          },
                        })),
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  };

  return `<html><script>var ytInitialData = ${JSON.stringify(data)};</script></html>`;
};

describe("strict recommendation filtering", () => {
  afterEach(() => {
    global.fetch = undefined;
  });

  it("lists the requested creator channels in the Hindi catalog", () => {
    const channelNames = getChannelsByLanguage("Hindi").map((channel) => channel.name);

    [
      "Apna College",
      "CodeWithHarry",
      "Chai aur Code",
      "College Wallah",
      "Sheryians Coding School",
    ].forEach((channelName) => {
      assert.ok(channelNames.includes(channelName), `${channelName} should be available in Hindi`);
    });

    assert.equal(channelNames.includes("Bro Code"), false);
    assert.equal(channelNames.includes("Jenny's Lectures CS IT"), false);
  });

  it("lists Bro Code only in the English catalog", () => {
    const englishChannelNames = getChannelsByLanguage("English").map((channel) => channel.name);
    const hindiChannelNames = getChannelsByLanguage("Hindi").map((channel) => channel.name);

    assert.equal(englishChannelNames.includes("Bro Code"), true);
    assert.equal(hindiChannelNames.includes("Bro Code"), false);
  });

  it("includes Sheryians in the Hindi Machine Learning creator options", () => {
    const machineLearningCreators = getChannelsByLanguage("Hindi")
      .filter(
        (channel) =>
          channel.subjects.includes("machine_learning") &&
          channel.branches.includes("machine_learning")
      )
      .map((channel) => channel.name);

    assert.ok(
      machineLearningCreators.includes("Sheryians Coding School"),
      "Sheryians Coding School should appear under Machine Learning creators"
    );
  });

  it("includes The iScale in the Hindi Artificial Intelligence creator options", () => {
    const artificialIntelligenceCreators = getChannelsByLanguage("Hindi")
      .filter(
        (channel) =>
          channel.subjects.includes("artificial_intelligence") &&
          channel.branches.includes("artificial_intelligence")
      )
      .map((channel) => channel.name);

    assert.ok(
      artificialIntelligenceCreators.includes("The iScale"),
      "The iScale should appear under Artificial Intelligence creators"
    );
    assert.ok(
      artificialIntelligenceCreators.includes("edureka!"),
      "edureka! should appear under Hindi Artificial Intelligence creators"
    );
    assert.ok(
      artificialIntelligenceCreators.includes("Intellipaat"),
      "Intellipaat should appear under Hindi Artificial Intelligence creators"
    );
    assert.ok(
      !artificialIntelligenceCreators.includes("WsCube Tech"),
      "WsCube Tech should not appear under Hindi Artificial Intelligence creators"
    );
  });

  it("keeps WsCube Tech out of the Hindi Cyber Security creator options", () => {
    const cyberSecurityCreators = getChannelsByLanguage("Hindi")
      .filter(
        (channel) =>
          channel.subjects.includes("cyber_security") &&
          channel.branches.includes("cyber_security")
      )
      .map((channel) => channel.name);

    assert.ok(
      cyberSecurityCreators.includes("WsCube Cyber Security"),
      "WsCube Cyber Security should remain under Hindi Cyber Security creators"
    );
    assert.ok(
      cyberSecurityCreators.includes("Great Learning"),
      "Great Learning should remain under Hindi Cyber Security creators"
    );
    assert.ok(
      !cyberSecurityCreators.includes("WsCube Tech"),
      "WsCube Tech should not appear under Hindi Cyber Security creators"
    );
  });

  it("includes edureka! and Intellipaat in the English Artificial Intelligence creator options", () => {
    const artificialIntelligenceCreators = getChannelsByLanguage("English")
      .filter(
        (channel) =>
          channel.subjects.includes("artificial_intelligence") &&
          channel.branches.includes("artificial_intelligence")
      )
      .map((channel) => channel.name);

    assert.ok(
      artificialIntelligenceCreators.includes("edureka!"),
      "edureka! should appear under English Artificial Intelligence creators"
    );
    assert.ok(
      artificialIntelligenceCreators.includes("Intellipaat"),
      "Intellipaat should appear under English Artificial Intelligence creators"
    );
  });

  it("keeps manually curated playlists fully populated", () => {
    VERIFIED_PLAYLISTS.forEach((playlist) => {
      assert.ok(playlist.title, "Curated playlist title is required");
      assert.ok(playlist.creatorName, "Curated playlist channel name is required");
      assert.ok(
        playlist.youtubePlaylistId || playlist.playlistUrl,
        "Curated playlist must keep its playlist id or URL"
      );
      assert.ok(playlist.subject, "Curated playlist subject is required");
      assert.ok(playlist.language, "Curated playlist language is required");
      assert.equal(playlist.source, "manual-curated");
    });
  });

  it("keeps the central creator to playlist mapping on the exact curated playlist ids", () => {
    const expectedMappings = [
      ["Operating Systems", "Gate Smashers", "Hindi", "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p"],
      ["Web Development", "CodeWithHarry", "Hindi", "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w"],
      ["Machine Learning", "CodeWithHarry", "Hindi", "PLu0W_9lII9ai6fAMHp-acBmJONT7Y4BSG"],
      ["Machine Learning", "StatQuest", "English", "PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF"],
      ["Artificial Intelligence", "freeCodeCamp.org", "English", "PLXRgEJhChXxg0pXkq0i-YjVkDK89E2UUd"],
      ["Web Development", "Apna College", "Hindi", "PLfqMhTWNBTe3H6c9OGXb5_6wcc1Mca52n"],
      ["Web Development", "Bro Code", "English", "PLZPZq0r_RZOPP5Yjt6IqgytMRY5uLt4y3"],
      ["HTML", "Chai aur Code", "Hindi", "PLu71SKxNbfoDBNF5s-WH6aLbthSEIMhMI"],
      ["Web Development", "Sheryians Coding School", "Hindi", "PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn"],
      ["Software Engineering", "Sheryians Coding School", "Hindi", "PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn"],
      ["Software Engineering", "Web Dev Mastery", "Hindi", "PL-CeQccLavFeytqS_ALj97JNd4PF4gc1z"],
      ["Software Engineering", "Traversy Media", "English", "PLillGF-RfqbYeckUaD1z6nviTp31GLTH8"],
      ["Software Engineering", "Web Dev Simplified", "English", "PLZlA0Gpn_vH8jbFkBjOuFjhxANC63OmXM"],
      ["Machine Learning", "Sheryians Coding School", "Hindi", "PLaldQ9PzZd9qT0KsKJ7yCq70iFFP3MFJ5"],
      ["JavaScript", "Chai aur Code", "Hindi", "PLu71SKxNbfoBuX3f4EOACle2y-tRC5Q37"],
      ["React", "Chai aur Code", "Hindi", "PLu71SKxNbfoBGh_8p_NS-ZAh6v7HhYqHW"],
      ["Backend Development", "Chai aur Code", "Hindi", "PLu71SKxNbfoDqgPchmvIsL4hTnJIrtige"],
      ["DevOps", "Chai aur Code", "Hindi", "PLu71SKxNbfoBAaWGtn9GA2PTw0HO0tXzq"],
    ];

    expectedMappings.forEach(([course, creator, language, playlistId]) => {
      const mapping = CURATED_PLAYLIST_MAPPINGS.find(
        (entry) =>
          entry.course === course &&
          entry.creator === creator &&
          entry.language === language
      );

      assert.ok(mapping, `Missing curated mapping for ${creator} / ${course} / ${language}`);
      assert.equal(mapping.playlistId, playlistId);
      assert.equal(extractPlaylistIdFromUrl(mapping.playlistUrl), playlistId);
    });
  });

  it("keeps the required creator playlist URLs and standalone video as the source of truth", () => {
    const expectedMappings = [
      [
        "Operating Systems",
        "Gate Smashers",
        "Hindi",
        "https://www.youtube.com/watch?v=bkSWJJZNgf8&list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
      ],
      [
        "Web Development",
        "CodeWithHarry",
        "Hindi",
        "https://www.youtube.com/watch?v=tVzUXW6siu0&list=PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
      ],
      [
        "Machine Learning",
        "CodeWithHarry",
        "Hindi",
        "https://www.youtube.com/watch?v=_u-PaJCpwiU&list=PLu0W_9lII9ai6fAMHp-acBmJONT7Y4BSG",
      ],
      [
        "Machine Learning",
        "StatQuest",
        "English",
        "https://www.youtube.com/watch?v=Gv9_4yMHFhI&list=PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF",
      ],
      [
        "Artificial Intelligence",
        "freeCodeCamp.org",
        "English",
        "https://www.youtube.com/watch?v=nYXVvK-Wmn0&list=PLXRgEJhChXxg0pXkq0i-YjVkDK89E2UUd",
      ],
      [
        "Web Development",
        "Apna College",
        "Hindi",
        "https://www.youtube.com/watch?v=l1EssrLxt7E&list=PLfqMhTWNBTe3H6c9OGXb5_6wcc1Mca52n",
      ],
      [
        "HTML",
        "Chai aur Code",
        "Hindi",
        "https://www.youtube.com/watch?v=XmLOwJHFHf0&list=PLu71SKxNbfoDBNF5s-WH6aLbthSEIMhMI",
      ],
      [
        "Web Development",
        "Sheryians Coding School",
        "Hindi",
        "https://www.youtube.com/watch?v=kkOuRJ69BRY&list=PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn",
      ],
      [
        "Software Engineering",
        "Sheryians Coding School",
        "Hindi",
        "https://www.youtube.com/watch?v=kkOuRJ69BRY&list=PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn",
      ],
      [
        "Software Engineering",
        "Web Dev Mastery",
        "Hindi",
        "https://www.youtube.com/watch?v=VnksVEsIH1o&list=PL-CeQccLavFeytqS_ALj97JNd4PF4gc1z",
      ],
      [
        "Software Engineering",
        "Traversy Media",
        "English",
        "https://www.youtube.com/watch?v=UB1O30fR-EE&list=PLillGF-RfqbYeckUaD1z6nviTp31GLTH8",
      ],
      [
        "Software Engineering",
        "Web Dev Simplified",
        "English",
        "https://www.youtube.com/watch?v=XlvsJLer_No&list=PLZlA0Gpn_vH8jbFkBjOuFjhxANC63OmXM",
      ],
      [
        "Machine Learning",
        "Sheryians Coding School",
        "Hindi",
        "https://www.youtube.com/watch?v=1L420xXpDTg&list=PLaldQ9PzZd9qT0KsKJ7yCq70iFFP3MFJ5",
      ],
    ];

    expectedMappings.forEach(([course, creator, language, playlistUrl]) => {
      const mapping = CURATED_PLAYLIST_MAPPINGS.find(
        (entry) =>
          entry.course === course &&
          entry.creator === creator &&
          entry.language === language
      );

      assert.ok(mapping, `Missing curated mapping for ${creator} / ${course} / ${language}`);
      assert.equal(mapping.playlistUrl, playlistUrl);
    });

    const collegeWallah = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "College Wallah" && entry.course === "Web Development"
    );

    assert.ok(collegeWallah);
    assert.equal(
      collegeWallah.youtubeLink,
      "https://www.youtube.com/watch?v=HBqWsrqK89U&t=5s"
    );
    assert.equal(collegeWallah.youtubeVideoId, "HBqWsrqK89U");

    const theIScale = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "The iScale" && entry.course === "Artificial Intelligence"
    );

    assert.ok(theIScale);
    assert.equal(theIScale.youtubeLink, "https://www.youtube.com/watch?v=68FcZUpgC7w&t=3s");
    assert.equal(theIScale.youtubeVideoId, "68FcZUpgC7w");

    const greatLearning = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "Great Learning" && entry.course === "Artificial Intelligence"
    );

    assert.ok(greatLearning);
    assert.equal(greatLearning.youtubeLink, "https://www.youtube.com/watch?v=T0r3hhFaA1k");
    assert.equal(greatLearning.youtubeVideoId, "T0r3hhFaA1k");

    const wscubeCyberSecurity = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "WsCube Cyber Security" && entry.course === "Cyber Security"
    );

    assert.ok(wscubeCyberSecurity);
    assert.equal(
      wscubeCyberSecurity.youtubeLink,
      "https://www.youtube.com/watch?v=yywMI4pQbbc&list=PLwO5-rumi8A7RnPxB6Zx0wKFjFy75hCQs"
    );
    assert.equal(wscubeCyberSecurity.youtubeVideoId, "yywMI4pQbbc");

    const greatLearningCyberSecurity = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "Great Learning" && entry.course === "Cyber Security"
    );

    assert.ok(greatLearningCyberSecurity);
    assert.equal(
      greatLearningCyberSecurity.youtubeLink,
      "https://www.youtube.com/watch?v=fd0L1IousZU&list=PLlgLmuG_Kgba6K93PuVuf9aP_UFnm7mCl"
    );
    assert.equal(greatLearningCyberSecurity.youtubeVideoId, "fd0L1IousZU");

    const freeCodeCampSoftwareEngineering = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "freeCodeCamp.org" && entry.course === "Software Engineering"
    );

    assert.ok(freeCodeCampSoftwareEngineering);
    assert.equal(
      freeCodeCampSoftwareEngineering.youtubeLink,
      "https://www.youtube.com/watch?v=dX8396ZmSPk"
    );
    assert.equal(freeCodeCampSoftwareEngineering.youtubeVideoId, "dX8396ZmSPk");

    const freeCodeCampMachineLearning = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "freeCodeCamp.org" && entry.course === "Machine Learning"
    );

    assert.ok(freeCodeCampMachineLearning);
    assert.equal(
      freeCodeCampMachineLearning.youtubeLink,
      "https://www.youtube.com/watch?v=i_LwzRVP7bg"
    );
    assert.equal(freeCodeCampMachineLearning.youtubeVideoId, "i_LwzRVP7bg");

    const freeCodeCampDataScience = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "freeCodeCamp.org" && entry.course === "Data Science"
    );

    assert.ok(freeCodeCampDataScience);
    assert.equal(
      freeCodeCampDataScience.youtubeLink,
      "https://www.youtube.com/watch?v=XU5pw3QRYjQ"
    );
    assert.equal(freeCodeCampDataScience.youtubeVideoId, "XU5pw3QRYjQ");

    const statQuestDataScience = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "StatQuest" && entry.course === "Data Science"
    );

    assert.ok(statQuestDataScience);
    assert.equal(
      statQuestDataScience.youtubeLink,
      "https://www.youtube.com/watch?v=ilUbD7EoQnk"
    );
    assert.equal(statQuestDataScience.youtubeVideoId, "ilUbD7EoQnk");

    const edureka = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "edureka!" && entry.course === "Artificial Intelligence"
    );
    const intellipaat = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "Intellipaat" && entry.course === "Artificial Intelligence"
    );

    assert.ok(edureka);
    assert.equal(edureka.youtubeLink, "https://www.youtube.com/watch?v=JMUxmLyrhSk");
    assert.equal(edureka.youtubeVideoId, "JMUxmLyrhSk");
    assert.ok(intellipaat);
    assert.equal(intellipaat.youtubeLink, "https://www.youtube.com/watch?v=9tbaiFIm0HU");
    assert.equal(intellipaat.youtubeVideoId, "9tbaiFIm0HU");
  });

  it("filters curated creators by course and language from the single central mapping", () => {
    assert.deepEqual(
      getCuratedCreatorsForCourse("Web Development", "Hindi").sort(),
      ["Apna College", "CodeWithHarry", "Sheryians Coding School"].sort()
    );
    assert.deepEqual(
      getCuratedCreatorsForCourse("Machine Learning", "Hindi").sort(),
      ["CodeWithHarry", "Sheryians Coding School"].sort()
    );
    assert.deepEqual(getCuratedCreatorsForCourse("Machine Learning", "English"), [
      "StatQuest",
    ]);
    assert.deepEqual(getCuratedCreatorsForCourse("Artificial Intelligence", "English"), [
      "freeCodeCamp.org",
    ]);
    assert.deepEqual(
      getCuratedCreatorsForCourse("Software Engineering", "Hindi").sort(),
      ["Sheryians Coding School", "Web Dev Mastery"].sort()
    );
    assert.deepEqual(getCuratedCreatorsForCourse("Software Engineering", "English"), [
      "Traversy Media",
      "Web Dev Simplified",
    ]);
    assert.deepEqual(
      getCuratedCreatorsForCourse("Web Development", "English"),
      ["Bro Code"]
    );
    assert.deepEqual(getCuratedCreatorsForCourse("React", "Hindi"), ["Chai aur Code"]);
  });

  it("tracks exact curated playlist or fallback creators by course", () => {
    assert.deepEqual(
      getMappedCreatorsForCourse("Web Development", "Hindi").sort(),
      ["Apna College", "CodeWithHarry", "College Wallah", "Sheryians Coding School"].sort()
    );
    assert.deepEqual(
      getMappedCreatorsForCourse("Machine Learning", "Hindi").sort(),
      ["CodeWithHarry", "Sheryians Coding School"].sort()
    );
    assert.deepEqual(getMappedCreatorsForCourse("Machine Learning", "English").sort(), [
      "freeCodeCamp.org",
      "StatQuest",
    ].sort());
    assert.deepEqual(getMappedCreatorsForCourse("Data Science", "English").sort(), [
      "freeCodeCamp.org",
      "StatQuest",
    ].sort());
    assert.deepEqual(
      getMappedCreatorsForCourse("Software Engineering", "Hindi").sort(),
      ["Sheryians Coding School", "Web Dev Mastery"].sort()
    );
    assert.deepEqual(getMappedCreatorsForCourse("Software Engineering", "English").sort(), [
      "freeCodeCamp.org",
      "Traversy Media",
      "Web Dev Simplified",
    ].sort());
    assert.deepEqual(getMappedCreatorsForCourse("Artificial Intelligence", "Hindi").sort(), [
      "Great Learning",
      "Intellipaat",
      "The iScale",
      "edureka!",
    ]);
    assert.deepEqual(getMappedCreatorsForCourse("Artificial Intelligence", "English").sort(), [
      "freeCodeCamp.org",
      "Intellipaat",
      "edureka!",
    ].sort());
    assert.deepEqual(getMappedCreatorsForCourse("Cyber Security", "Hindi"), [
      "WsCube Cyber Security",
      "Great Learning",
    ]);
    assert.deepEqual(getMappedCreatorsForCourse("Data Science", "Hindi"), []);
  });

  it("resolves curated mappings by normalized creator aliases and exact course", () => {
    assert.equal(normalizeCuratedKey("Code With Harry"), "codewithharry");
    assert.equal(
      findCuratedMapping({
        creator: "harry",
        course: "Web Development",
        language: "Hindi",
      })?.playlistId,
      "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w"
    );
    assert.equal(
      findCuratedMapping({
        creator: "shreyian coding school",
        course: "Web Development",
        language: "Hindi",
      }),
      null
    );
    assert.equal(
      findCuratedMapping({
        creator: "chaiaurcode",
        course: "Backend Development",
        language: "Hindi",
      })?.playlistId,
      "PLu71SKxNbfoDqgPchmvIsL4hTnJIrtige"
    );
    assert.equal(
      findCuratedMapping({
        creator: "collegewallah",
        course: "Web Development",
        language: "Hindi",
      })?.youtubeVideoId,
      "HBqWsrqK89U"
    );
    assert.equal(
      findCuratedMapping({
        creator: "iScale",
        course: "Artificial Intelligence",
        language: "Hindi",
      })?.youtubeVideoId,
      "68FcZUpgC7w"
    );
    assert.equal(
      findCuratedMapping({
        creator: "Great LearningVerified",
        course: "Artificial Intelligence",
        language: "Hindi",
      })?.youtubeVideoId,
      "T0r3hhFaA1k"
    );
    assert.equal(
      findCuratedMapping({
        creator: "Great LearningVerified",
        course: "Cyber Security",
        language: "Hindi",
      })?.youtubeVideoId,
      "fd0L1IousZU"
    );
    assert.equal(
      findCuratedMapping({
        creator: "WsCube Cyber SecurityVerified",
        course: "Cyber Security",
        language: "Hindi",
      })?.youtubeVideoId,
      "yywMI4pQbbc"
    );
    assert.equal(
      findCuratedMapping({
        creator: "freeCodeCamp.orgVerified",
        course: "Software Engineering",
        language: "English",
      })?.youtubeVideoId,
      "dX8396ZmSPk"
    );
    assert.equal(
      findCuratedMapping({
        creator: "freeCodeCamp.orgVerified",
        course: "Machine Learning",
        language: "English",
      })?.youtubeVideoId,
      "i_LwzRVP7bg"
    );
    assert.equal(
      findCuratedMapping({
        creator: "freeCodeCamp.orgVerified",
        course: "Data Science",
        language: "English",
      })?.youtubeVideoId,
      "XU5pw3QRYjQ"
    );
    assert.equal(
      findCuratedMapping({
        creator: "freeCodeCamp.orgVerified",
        course: "Artificial Intelligence",
        language: "English",
      })?.playlistId,
      "PLXRgEJhChXxg0pXkq0i-YjVkDK89E2UUd"
    );
    assert.equal(
      findCuratedMapping({
        creator: "StatQuestVerified",
        course: "Machine Learning",
        language: "English",
      })?.playlistId,
      "PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF"
    );
    assert.equal(
      findCuratedMapping({
        creator: "StatQuestVerified",
        course: "Data Science",
        language: "English",
      })?.youtubeVideoId,
      "ilUbD7EoQnk"
    );
    assert.equal(
      findCuratedMapping({
        creator: "Traversy MediaVerified",
        course: "Software Engineering",
        language: "English",
      })?.playlistId,
      "PLillGF-RfqbYeckUaD1z6nviTp31GLTH8"
    );
    assert.equal(
      findCuratedMapping({
        creator: "Web Dev SimplifiedVerified",
        course: "Software Engineering",
        language: "English",
      })?.playlistId,
      "PLZlA0Gpn_vH8jbFkBjOuFjhxANC63OmXM"
    );
    assert.equal(
      findCuratedMapping({
        creator: "edurekaIN",
        course: "Artificial Intelligence",
        language: "English",
      })?.youtubeVideoId,
      "JMUxmLyrhSk"
    );
    assert.equal(
      findCuratedMapping({
        creator: "Intellipaat",
        course: "Artificial Intelligence",
        language: "English",
      })?.youtubeVideoId,
      "9tbaiFIm0HU"
    );
    assert.equal(
      findCuratedMapping({
        creator: "CodeWithHarry",
        course: "React",
        language: "Hindi",
      }),
      null
    );
    assert.equal(
      findCuratedMapping({
        creator: "webdevmastery",
        course: "Software Engineering",
        language: "Hindi",
      })?.playlistId,
      "PL-CeQccLavFeytqS_ALj97JNd4PF4gc1z"
    );
  });

  it("keeps curated playlist mappings free from duplicates", () => {
    const keys = CURATED_PLAYLIST_MAPPINGS.map((mapping) =>
      [mapping.course, mapping.creator, mapping.language, mapping.playlistId].join("|")
    );

    assert.equal(new Set(keys).size, keys.length);
  });

  it("keeps College Wallah as a manual-review standalone course video until a playlist id is confirmed", () => {
    const collegeWallahEntry = CURATED_VIDEO_FALLBACKS.find(
      (entry) => entry.creator === "College Wallah"
    );

    assert.ok(collegeWallahEntry);
    assert.equal(collegeWallahEntry.manualReviewRequired, true);
    assert.equal(extractPlaylistIdFromUrl(collegeWallahEntry.youtubeLink), "");
  });

  it("ignores removed creators that have no verified catalog content", async () => {
    global.fetch = async () => {
      throw new Error("Removed creators should not trigger YouTube search.");
    };

    const result = await findLectureVideos({
      topic: "Operating System Introduction",
      subject: "Operating Systems",
      course: "Software Engineering",
      year: 2,
      preferredChannels: ["Jenny's Lectures"],
      language: "Hindi",
    });

    assert.equal(result.videoChannelId, "");
    assert.equal(result.videoChannel, "No verified channel");
    assert.equal(result.videoVerified, false);
    assert.equal(result.videoSubjectTag, "operating_systems");
    assert.equal((result.alternativeVideos || []).some((video) => video.videoChannel === "CodeWithHarry"), false);
  });

  it("returns an appropriate selected creator video for Software Engineering", async () => {
    global.fetch = async () => ({
      ok: true,
      text: async () =>
        buildYoutubeSearchHtml([
          {
            videoId: "wrongcreator1",
            title: "Software Engineering Git and GitHub Workflow",
            channelName: "CodeWithHarry",
            channelId: "UCeVMnSShP_Iviwkknt83cww",
          },
          {
            videoId: "chaicode1",
            title: "Software Engineering Git and GitHub Workflow",
            channelName: "Chai aur Code",
            channelId: "UCNQ6FEtztATuaVhZKCY28Yw",
          },
        ]),
    });

    const result = await findLectureVideos({
      topic: "Git and GitHub Workflow",
      subject: "Software Engineering",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["Chai and Code"],
      language: "Hindi",
    });

    assert.equal(result.videoChannelId, "UCNQ6FEtztATuaVhZKCY28Yw");
    assert.equal(result.videoChannel, "Chai aur Code");
    assert.equal(result.videoSubjectTag, "software_engineering");
    assert.equal(result.alternativeVideos.some((video) => video.videoChannel === "CodeWithHarry"), false);
  });
});

describe("YouTube playlist imports", () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "learnnexus-recommendations-test",
    });
  });

  beforeEach(async () => {
    clearMemoryCache();
    await Promise.all([
      LearningState.deleteMany({}),
      Playlist.deleteMany({}),
      Progress.deleteMany({}),
      StudyPlan.deleteMany({}),
      Task.deleteMany({}),
      User.deleteMany({}),
      Video.deleteMany({}),
    ]);
  });

  afterEach(() => {
    global.fetch = undefined;
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const buildPlaylistItem = ({ videoId, channelId, title, position }) => ({
    id: `playlist-item-${videoId}`,
    snippet: {
      title,
      position,
      channelId: "UCJihyK0A38SZ6SdJirEdIOw",
      videoOwnerChannelId: channelId,
      thumbnails: {
        high: {
          url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        },
      },
      resourceId: {
        videoId,
      },
    },
    contentDetails: {
      videoId,
    },
    status: {
      privacyStatus: "public",
    },
  });

  const assertOnlySelectedCuratedVideos = (
    result,
    {
      creator,
      course,
      playlistId,
      videoId,
      allowedAlternativeCourses = [],
      allowedAlternativePlaylistIds = [],
      allowedStandaloneVideoIds = [],
    }
  ) => {
    assert.equal(result.source, "curated");
    assert.equal(result.creator, creator);
    assert.equal(result.creatorName, creator);
    assert.equal(result.videoChannel, creator);
    assert.equal(result.course, course);

    if (playlistId) {
      assert.equal(result.playlistId, playlistId);
    } else {
      assert.equal(result.playlistId || "", "");
    }

    if (videoId) {
      assert.equal(result.videoId, videoId);
    }

    (result.alternativeVideos || []).forEach((video) => {
      assert.equal(video.source, "curated");
      assert.equal(video.creator, creator);
      assert.ok(
        video.course === course || allowedAlternativeCourses.includes(video.course),
        `Unexpected alternative course ${video.course}`
      );

      if (playlistId) {
        assert.ok(
          video.playlistId === playlistId ||
            allowedAlternativePlaylistIds.includes(video.playlistId),
          `Unexpected alternative playlist ${video.playlistId}`
        );
      } else {
        assert.equal(video.playlistId || "", "");
        assert.ok(
          video.videoId === videoId || allowedStandaloneVideoIds.includes(video.videoId),
          `Unexpected standalone follow-up video ${video.videoId}`
        );
      }
    });
  };

  it("strictly maps each selected creator to only its curated playlist or standalone video", async () => {
    global.fetch = async () => {
      throw new Error("Curated creator selections must not use generic YouTube search.");
    };

    const cases = [
      {
        creator: "Gate Smashers",
        course: "Operating Systems",
        playlistId: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
        language: "Hindi",
        subject: "Operating Systems",
        preferredSubjects: ["operating_systems"],
        topic: "Operating System Introduction",
        videoId: "bkSWJJZNgf8",
      },
      {
        creator: "CodeWithHarry",
        course: "Web Development",
        playlistId: "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
        language: "Hindi",
        subject: "Web Development",
        preferredSubjects: ["web_development"],
        topic: "Web Development Sigma",
      },
      {
        creator: "Apna College",
        course: "Web Development",
        playlistId: "PLfqMhTWNBTe3H6c9OGXb5_6wcc1Mca52n",
        language: "Hindi",
        subject: "Web Development",
        preferredSubjects: ["web_development"],
        topic: "Web Development",
      },
      {
        creator: "College Wallah",
        course: "Web Development",
        videoId: "HBqWsrqK89U",
        language: "Hindi",
        subject: "Web Development",
        preferredSubjects: ["web_development"],
        topic: "Web Development College Wallah",
        allowedStandaloneVideoIds: ["427pAhy9dI8"],
      },
      {
        creator: "Sheryians Coding School",
        course: "Web Development",
        playlistId: "PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn",
        language: "Hindi",
        subject: "Web Development",
        preferredSubjects: ["web_development"],
        topic: "Sheryians Web Development",
        videoId: "kkOuRJ69BRY",
      },
      {
        creator: "Bro Code",
        course: "Web Development",
        playlistId: "PLZPZq0r_RZOPP5Yjt6IqgytMRY5uLt4y3",
        language: "English",
        subject: "Web Development",
        preferredSubjects: ["web_development"],
        topic: "Web Development Bro Code",
      },
      {
        creator: "Chai aur Code",
        course: "HTML",
        playlistId: "PLu71SKxNbfoDBNF5s-WH6aLbthSEIMhMI",
        language: "Hindi",
        subject: "Web Development",
        preferredSubjects: ["web_development"],
        topic: "HTML Foundations",
        allowedAlternativeCourses: ["JavaScript"],
        allowedAlternativePlaylistIds: ["PLu71SKxNbfoBuX3f4EOACle2y-tRC5Q37"],
      },
    ];

    for (const testCase of cases) {
      const result = await findLectureVideos({
        topic: `${testCase.topic} strict ${testCase.playlistId || testCase.videoId}`,
        subject: testCase.subject,
        course: "Software Engineering",
        year: 1,
        preferredChannels: [testCase.creator],
        preferredSubjects: testCase.preferredSubjects,
        language: testCase.language,
      });

      assertOnlySelectedCuratedVideos(result, testCase);
    }
  });

  it("uses the exact The iScale video for Artificial Intelligence", async () => {
    global.fetch = async () => {
      throw new Error("The iScale Artificial Intelligence must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Artificial Intelligence Foundations The iScale",
      subject: "Artificial Intelligence",
      course: "Artificial Intelligence",
      year: 1,
      preferredChannels: ["The iScale"],
      preferredSubjects: ["artificial_intelligence"],
      language: "Hindi",
    });

    assertOnlySelectedCuratedVideos(result, {
      creator: "The iScale",
      course: "Artificial Intelligence",
      videoId: "68FcZUpgC7w",
    });
    assert.equal(result.videoUrl, "https://www.youtube.com/watch?v=68FcZUpgC7w&t=3s");
    assert.equal(result.videoSubjectTag, "artificial_intelligence");
  });

  it("keeps The iScale on the exact AI video when the daily AI topic looks like ML", async () => {
    global.fetch = async () => {
      throw new Error("The iScale Artificial Intelligence must not fall back to the regression curriculum video.");
    };

    const result = await findLectureVideos({
      topic: "Linear Regression",
      subject: "Artificial Intelligence Roadmap",
      course: "Artificial Intelligence",
      year: 1,
      preferredChannels: ["the-iscale"],
      preferredSubjects: [],
      language: "Hindi",
    });

    assertOnlySelectedCuratedVideos(result, {
      creator: "The iScale",
      course: "Artificial Intelligence",
      videoId: "68FcZUpgC7w",
    });
    assert.equal(result.videoUrl, "https://www.youtube.com/watch?v=68FcZUpgC7w&t=3s");
    assert.equal(result.videoSubjectTag, "artificial_intelligence");
  });

  it("uses the exact Great Learning video for Artificial Intelligence", async () => {
    global.fetch = async () => {
      throw new Error("Great Learning Artificial Intelligence must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Artificial Intelligence Foundations Great Learning",
      subject: "Artificial Intelligence",
      course: "Artificial Intelligence",
      year: 1,
      preferredChannels: ["great-learning-hindi"],
      preferredSubjects: ["artificial_intelligence"],
      language: "Hindi",
    });

    assertOnlySelectedCuratedVideos(result, {
      creator: "Great Learning",
      course: "Artificial Intelligence",
      videoId: "T0r3hhFaA1k",
    });
    assert.equal(result.videoUrl, "https://www.youtube.com/watch?v=T0r3hhFaA1k");
    assert.equal(result.videoSubjectTag, "artificial_intelligence");
  });

  it("uses the exact WsCube Cyber Security video for Cyber Security", async () => {
    global.fetch = async () => {
      throw new Error("WsCube Cyber Security must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Cyber Security Foundations WsCube Cyber Security",
      subject: "Cyber Security",
      course: "Cyber Security",
      year: 1,
      preferredChannels: ["WsCube Cyber SecurityVerified"],
      preferredSubjects: ["cyber_security"],
      language: "Hindi",
    });

    assertOnlySelectedCuratedVideos(result, {
      creator: "WsCube Cyber Security",
      course: "Cyber Security",
      videoId: "yywMI4pQbbc",
    });
    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=yywMI4pQbbc&list=PLwO5-rumi8A7RnPxB6Zx0wKFjFy75hCQs"
    );
    assert.equal(result.videoSubjectTag, "cyber_security");
  });

  it("uses the exact Great Learning video for Cyber Security", async () => {
    global.fetch = async () => {
      throw new Error("Great Learning Cyber Security must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Cyber Security Foundations Great Learning",
      subject: "Cyber Security",
      course: "Cyber Security",
      year: 1,
      preferredChannels: ["Great LearningVerified"],
      preferredSubjects: ["cyber_security"],
      language: "Hindi",
    });

    assertOnlySelectedCuratedVideos(result, {
      creator: "Great Learning",
      course: "Cyber Security",
      videoId: "fd0L1IousZU",
    });
    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=fd0L1IousZU&list=PLlgLmuG_Kgba6K93PuVuf9aP_UFnm7mCl"
    );
    assert.equal(result.videoSubjectTag, "cyber_security");
  });

  it("uses the exact edureka! and Intellipaat videos for Artificial Intelligence", async () => {
    global.fetch = async () => {
      throw new Error("English Artificial Intelligence creators must not fall back to generic search.");
    };

    const cases = [
      {
        creator: "edureka!",
        videoId: "JMUxmLyrhSk",
        videoUrl: "https://www.youtube.com/watch?v=JMUxmLyrhSk",
      },
      {
        creator: "Intellipaat",
        videoId: "9tbaiFIm0HU",
        videoUrl: "https://www.youtube.com/watch?v=9tbaiFIm0HU",
      },
    ];

    for (const testCase of cases) {
      const result = await findLectureVideos({
        topic: `Artificial Intelligence Foundations ${testCase.creator}`,
        subject: "Artificial Intelligence",
        course: "Artificial Intelligence",
        year: 1,
        preferredChannels: [testCase.creator],
        preferredSubjects: ["artificial_intelligence"],
        language: "English",
      });

      assertOnlySelectedCuratedVideos(result, {
        creator: testCase.creator,
        course: "Artificial Intelligence",
        videoId: testCase.videoId,
      });
      assert.equal(result.videoUrl, testCase.videoUrl);
      assert.equal(result.videoSubjectTag, "artificial_intelligence");
    }
  });

  it("uses the exact freeCodeCamp.org playlist for English Artificial Intelligence", async () => {
    global.fetch = async () => {
      throw new Error("freeCodeCamp.org Artificial Intelligence must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Artificial Intelligence Foundations freeCodeCamp.org",
      subject: "Artificial Intelligence",
      course: "Artificial Intelligence",
      year: 1,
      preferredChannels: ["freeCodeCamp.orgVerified"],
      preferredSubjects: ["artificial_intelligence"],
      language: "English",
    });

    assert.equal(result.videoChannel, "freeCodeCamp.org");
    assert.equal(result.creatorId, "freecodecamp");
    assert.equal(result.videoId, "nYXVvK-Wmn0");
    assert.equal(result.playlistId, "PLXRgEJhChXxg0pXkq0i-YjVkDK89E2UUd");
    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=nYXVvK-Wmn0&list=PLXRgEJhChXxg0pXkq0i-YjVkDK89E2UUd"
    );
    assert.equal(result.videoSubjectTag, "artificial_intelligence");
  });

  it("uses the exact edureka! and Intellipaat AI videos when Hindi is selected", async () => {
    global.fetch = async () => {
      throw new Error("Hindi Artificial Intelligence creator mappings must not use generic search.");
    };

    const cases = [
      {
        creator: "edureka",
        displayName: "edureka!",
        videoId: "JMUxmLyrhSk",
        videoUrl: "https://www.youtube.com/watch?v=JMUxmLyrhSk",
      },
      {
        creator: "intellipaat",
        displayName: "Intellipaat",
        videoId: "9tbaiFIm0HU",
        videoUrl: "https://www.youtube.com/watch?v=9tbaiFIm0HU",
      },
    ];

    for (const testCase of cases) {
      const result = await findLectureVideos({
        topic: `Artificial Intelligence Foundations ${testCase.displayName}`,
        subject: "Artificial Intelligence",
        course: "Artificial Intelligence",
        year: 1,
        preferredChannels: [testCase.creator],
        preferredSubjects: ["artificial_intelligence"],
        language: "Hindi",
      });

      assertOnlySelectedCuratedVideos(result, {
        creator: testCase.displayName,
        course: "Artificial Intelligence",
        videoId: testCase.videoId,
      });
      assert.equal(result.videoUrl, testCase.videoUrl);
      assert.equal(result.videoSubjectTag, "artificial_intelligence");
      assert.equal(result.videoLanguage, "Hindi");
    }
  });

  it("ignores stale database videos that use the selected creator with the wrong playlist", async () => {
    await Video.create({
      youtubeVideoId: "stale-chai-html",
      playlistId: "wrong-chai-playlist",
      channelId: "UCNQ6FEtztATuaVhZKCY28Yw",
      creatorName: "Chai aur Code",
      subject: "web_development",
      subjectName: "Web Development",
      playlistTitle: "Old Wrong Chai Playlist",
      playlistPosition: 0,
      language: "Hindi",
      semester: 1,
      title: "Backend Development stale wrong playlist",
      verified: true,
      thumbnail: "https://img.youtube.com/vi/stale-chai-html/hqdefault.jpg",
      youtubeLink: "https://www.youtube.com/watch?v=stale-chai-html",
    });

    global.fetch = async () => {
      throw new Error("Wrong stale database rows must not trigger or replace curated playlists.");
    };

    const result = await findLectureVideos({
      topic: "Backend Development strict stale db guard",
      subject: "Web Development",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["Chai aur Code"],
      preferredSubjects: ["web_development"],
      language: "Hindi",
    });

    assertOnlySelectedCuratedVideos(result, {
      creator: "Chai aur Code",
      course: "HTML",
      playlistId: "PLu71SKxNbfoDBNF5s-WH6aLbthSEIMhMI",
      allowedAlternativeCourses: ["JavaScript"],
      allowedAlternativePlaylistIds: ["PLu71SKxNbfoBuX3f4EOACle2y-tRC5Q37"],
    });
    assert.notEqual(result.videoId, "stale-chai-html");
  });

  it("ignores stale database videos that impersonate selected creator playlists", async () => {
    await Video.insertMany([
      {
        youtubeVideoId: "stale-harry-wrong-creator",
        playlistId: "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
        channelId: "UCeVMnSShP_Iviwkknt83cww",
        creatorName: "Wrong Creator",
        subject: "web_development",
        subjectName: "Web Development",
        playlistTitle: "Wrong Creator Sigma",
        playlistPosition: 0,
        language: "Hindi",
        semester: 1,
        title: "Wrong creator should not replace CodeWithHarry",
        verified: true,
        thumbnail: "https://img.youtube.com/vi/stale-harry-wrong-creator/hqdefault.jpg",
        youtubeLink: "https://www.youtube.com/watch?v=stale-harry-wrong-creator",
      },
      {
        youtubeVideoId: "stale-apna-wrong-creator",
        playlistId: "PLfqMhTWNBTe3H6c9OGXb5_6wcc1Mca52n",
        channelId: "UCBwmMxybNva6P_5VmxjzwqA",
        creatorName: "Wrong Creator",
        subject: "web_development",
        subjectName: "Web Development",
        playlistTitle: "Wrong Creator Apna",
        playlistPosition: 0,
        language: "Hindi",
        semester: 1,
        title: "Wrong creator should not replace Apna College",
        verified: true,
        thumbnail: "https://img.youtube.com/vi/stale-apna-wrong-creator/hqdefault.jpg",
        youtubeLink: "https://www.youtube.com/watch?v=stale-apna-wrong-creator",
      },
      {
        youtubeVideoId: "stale-gate-os-wrong-creator",
        playlistId: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
        channelId: "UCJihyK0A38SZ6SdJirEdIOw",
        creatorName: "Wrong Creator",
        subject: "operating_systems",
        subjectName: "Operating Systems",
        playlistTitle: "Wrong Creator OS",
        playlistPosition: 0,
        language: "Hindi",
        semester: 3,
        title: "Wrong creator should not replace Gate Smashers OS",
        verified: true,
        thumbnail: "https://img.youtube.com/vi/stale-gate-os-wrong-creator/hqdefault.jpg",
        youtubeLink: "https://www.youtube.com/watch?v=stale-gate-os-wrong-creator",
      },
      {
        youtubeVideoId: "stale-college-wallah-wrong-creator",
        playlistId: "",
        channelId: "UCDrf0V4fcBr5FlCtKwvpfwA",
        creatorName: "Wrong Creator",
        subject: "web_development",
        subjectName: "Web Development",
        playlistTitle: "",
        playlistPosition: 0,
        language: "Hindi",
        semester: 1,
        title: "Wrong creator should not replace College Wallah",
        verified: true,
        thumbnail: "https://img.youtube.com/vi/stale-college-wallah-wrong-creator/hqdefault.jpg",
        youtubeLink: "https://www.youtube.com/watch?v=stale-college-wallah-wrong-creator",
      },
    ]);

    global.fetch = async () => {
      throw new Error("Wrong creator database rows must not trigger external replacement.");
    };

    const cases = [
      {
        creator: "CodeWithHarry",
        subject: "Web Development",
        preferredSubjects: ["web_development"],
        topic: "HTML Foundations",
        playlistId: "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
        videoId: "tVzUXW6siu0",
        staleVideoId: "stale-harry-wrong-creator",
      },
      {
        creator: "Apna College",
        subject: "Web Development",
        preferredSubjects: ["web_development"],
        topic: "Web Development",
        playlistId: "PLfqMhTWNBTe3H6c9OGXb5_6wcc1Mca52n",
        videoId: "l1EssrLxt7E",
        staleVideoId: "stale-apna-wrong-creator",
      },
      {
        creator: "College Wallah",
        subject: "Web Development",
        preferredSubjects: ["web_development"],
        topic: "Web Development",
        playlistId: "",
        videoId: "HBqWsrqK89U",
        staleVideoId: "stale-college-wallah-wrong-creator",
      },
      {
        creator: "Gate Smashers",
        subject: "Operating Systems",
        preferredSubjects: ["operating_systems"],
        topic: "Operating System Introduction",
        playlistId: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
        videoId: "bkSWJJZNgf8",
        staleVideoId: "stale-gate-os-wrong-creator",
        year: 2,
      },
    ];

    for (const testCase of cases) {
      const result = await findLectureVideos({
        topic: `${testCase.topic} wrong creator guard ${testCase.creator}`,
        subject: testCase.subject,
        course: "Software Engineering",
        year: testCase.year || 1,
        preferredChannels: [testCase.creator],
        preferredSubjects: testCase.preferredSubjects,
        language: "Hindi",
      });

      assert.equal(result.creatorName, testCase.creator);
      assert.equal(result.videoChannel, testCase.creator);
      assert.equal(result.videoId, testCase.videoId);
      assert.notEqual(result.videoId, testCase.staleVideoId);

      if (testCase.playlistId) {
        assert.equal(result.playlistId, testCase.playlistId);
      } else {
        assert.equal(result.playlistId || "", "");
      }
    }
  });

  it("loads the full selected curated playlist queue so related videos and next video are available", async () => {
    global.fetch = async (url) => {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname === "www.googleapis.com" && parsedUrl.pathname.endsWith("/playlistItems")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                snippet: {
                  title: "Sigma Web Development Lecture 1",
                  position: 0,
                  videoOwnerChannelId: "UCeVMnSShP_Iviwkknt83cww",
                  thumbnails: {
                    high: {
                      url: "https://img.youtube.com/vi/tVzUXW6siu0/hqdefault.jpg",
                    },
                  },
                  resourceId: {
                    videoId: "tVzUXW6siu0",
                  },
                },
                contentDetails: {
                  videoId: "tVzUXW6siu0",
                },
                status: {
                  privacyStatus: "public",
                },
              },
              {
                snippet: {
                  title: "Sigma Web Development Lecture 2",
                  position: 1,
                  videoOwnerChannelId: "UCeVMnSShP_Iviwkknt83cww",
                  thumbnails: {
                    high: {
                      url: "https://img.youtube.com/vi/sigma-lecture-2/hqdefault.jpg",
                    },
                  },
                  resourceId: {
                    videoId: "sigma-lecture-2",
                  },
                },
                contentDetails: {
                  videoId: "sigma-lecture-2",
                },
                status: {
                  privacyStatus: "public",
                },
              },
              {
                snippet: {
                  title: "Sigma Web Development Lecture 3",
                  position: 2,
                  videoOwnerChannelId: "UCeVMnSShP_Iviwkknt83cww",
                  thumbnails: {
                    high: {
                      url: "https://img.youtube.com/vi/sigma-lecture-3/hqdefault.jpg",
                    },
                  },
                  resourceId: {
                    videoId: "sigma-lecture-3",
                  },
                },
                contentDetails: {
                  videoId: "sigma-lecture-3",
                },
                status: {
                  privacyStatus: "public",
                },
              },
            ],
          }),
        };
      }

      throw new Error("Curated playlist queue should use playlistItems, not generic search.");
    };

    const result = await findLectureVideos({
      topic: "Full playlist queue CodeWithHarry Sigma unique",
      subject: "Web Development",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["CodeWithHarry"],
      preferredSubjects: ["web_development"],
      language: "Hindi",
    });

    assert.equal(result.videoId, "tVzUXW6siu0");
    assert.equal(result.playlistId, "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");
    assert.equal(result.alternativeVideos.length, 2);
    assert.deepEqual(
      result.alternativeVideos.map((video) => video.videoId),
      ["sigma-lecture-2", "sigma-lecture-3"]
    );
    assert.equal(
      result.alternativeVideos.every(
        (video) =>
          video.creator === "CodeWithHarry" &&
          video.course === "Web Development" &&
          video.playlistId === "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w"
      ),
      true
    );
  });

  it("uses the public playlist feed to populate related videos when playlistItems is unavailable", async () => {
    global.fetch = async (url) => {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname === "www.googleapis.com" && parsedUrl.pathname.endsWith("/playlistItems")) {
        return {
          ok: false,
          status: 403,
        };
      }

      if (parsedUrl.hostname === "www.youtube.com" && parsedUrl.pathname === "/feeds/videos.xml") {
        return {
          ok: true,
          text: async () => `
            <feed>
              <entry>
                <yt:videoId>tVzUXW6siu0</yt:videoId>
                <title>CodeWithHarry Sigma Web Development</title>
                <media:group>
                  <media:thumbnail url="https://img.youtube.com/vi/tVzUXW6siu0/hqdefault.jpg" />
                </media:group>
              </entry>
              <entry>
                <yt:videoId>sigma-feed-2</yt:videoId>
                <title>CodeWithHarry Sigma Lecture 2</title>
                <media:group>
                  <media:thumbnail url="https://img.youtube.com/vi/sigma-feed-2/hqdefault.jpg" />
                </media:group>
              </entry>
            </feed>
          `,
        };
      }

      throw new Error("Curated playlist feed fallback should not use generic search.");
    };

    const result = await findLectureVideos({
      topic: "Public feed queue CodeWithHarry Sigma unique",
      subject: "Web Development",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["CodeWithHarry"],
      preferredSubjects: ["web_development"],
      language: "Hindi",
    });

    assert.equal(result.videoId, "tVzUXW6siu0");
    assert.equal(result.playlistId, "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");
    assert.equal(
      result.alternativeVideos.some((video) => video.videoId === "sigma-feed-2"),
      true
    );
    assert.equal(
      result.alternativeVideos.every(
        (video) => video.playlistId === "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w"
      ),
      true
    );
  });

  it("paginates playlistItems and skips videos from the wrong educator", async () => {
    global.fetch = async (url) => {
      const parsedUrl = new URL(url);

      if (parsedUrl.pathname.endsWith("/playlists")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
                snippet: {
                  title: "Operating System",
                  channelId: "UCJihyK0A38SZ6SdJirEdIOw",
                  channelTitle: "Gate Smashers",
                  description: "Operating System full course",
                  thumbnails: {
                    high: {
                      url: "https://img.youtube.com/vi/WJ-UaAaumNA/hqdefault.jpg",
                    },
                  },
                },
                contentDetails: {
                  itemCount: 4,
                },
              },
            ],
          }),
        };
      }

      const pageToken = parsedUrl.searchParams.get("pageToken");
      return {
        ok: true,
        json: async () =>
          pageToken
            ? {
                items: [
                  buildPlaylistItem({
                    videoId: "gate-os-3",
                    channelId: "UCJihyK0A38SZ6SdJirEdIOw",
                    title: "L-1.3: Types of Operating System",
                    position: 2,
                  }),
                  buildPlaylistItem({
                    videoId: "harry-wrong",
                    channelId: "UCeVMnSShP_Iviwkknt83cww",
                    title: "Operating System in One Video",
                    position: 3,
                  }),
                ],
              }
            : {
                nextPageToken: "second-page",
                items: [
                  buildPlaylistItem({
                    videoId: "gate-os-1",
                    channelId: "UCJihyK0A38SZ6SdJirEdIOw",
                    title: "L-1.1: Introduction to Operating System",
                    position: 0,
                  }),
                  buildPlaylistItem({
                    videoId: "gate-os-2",
                    channelId: "UCJihyK0A38SZ6SdJirEdIOw",
                    title: "L-1.2: Batch Operating System",
                    position: 1,
                  }),
                ],
              },
      };
    };

    const playlist = await importPlaylist({
      youtubePlaylistId: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
      channelId: "UCJihyK0A38SZ6SdJirEdIOw",
      creatorName: "Gate Smashers",
      subject: "operating_systems",
      subjectName: "Operating Systems",
      playlistTitle: "Gate Smashers Operating System",
      language: "Hindi",
      semester: 3,
    });
    const videos = await Video.find({ playlistId: playlist.youtubePlaylistId }).sort({
      playlistPosition: 1,
    });

    assert.equal(playlist.importStatus, "completed");
    assert.equal(playlist.importedVideoCount, 3);
    assert.equal(playlist.skippedVideoCount, 1);
    assert.deepEqual(
      videos.map((video) => video.youtubeVideoId),
      ["gate-os-1", "gate-os-2", "gate-os-3"]
    );
    assert.equal(videos.some((video) => video.creatorName === "CodeWithHarry"), false);
  });

  it("serves imported playlist videos before falling back to YouTube search", async () => {
    await Video.create({
      youtubeVideoId: "gate-os-1",
      playlistId: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
      channelId: "UCJihyK0A38SZ6SdJirEdIOw",
      creatorName: "Gate Smashers",
      subject: "operating_systems",
      subjectName: "Operating Systems",
      playlistTitle: "Gate Smashers Operating System",
      playlistPosition: 0,
      language: "Hindi",
      semester: 3,
      title: "L-1.1: Introduction to Operating System",
      verified: true,
      thumbnail: "https://img.youtube.com/vi/gate-os-1/hqdefault.jpg",
      youtubeLink: "https://www.youtube.com/watch?v=gate-os-1",
    });

    global.fetch = async () => {
      throw new Error("Search fallback should not be needed for a verified playlist hit.");
    };

    const result = await findLectureVideos({
      topic: "Introduction to Operating System",
      subject: "Operating Systems",
      course: "Software Engineering",
      year: 2,
      preferredChannels: ["Gate Smashers"],
      language: "Hindi",
    });

    assert.equal(result.videoChannel, "Gate Smashers");
    assert.equal(result.videoChannelId, "UCJihyK0A38SZ6SdJirEdIOw");
    assert.equal(result.playlistId, "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p");
    assert.equal(result.videoSubjectTag, "operating_systems");
  });

  it("keeps Gate Smashers data-structures selections on Gate Smashers videos", async () => {
    await Video.create({
      youtubeVideoId: "gate-ds-1",
      playlistId: "PLxCzCOWd7aiHqU4HKL7-SITyuSIcD93id",
      channelId: "UCJihyK0A38SZ6SdJirEdIOw",
      creatorName: "Gate Smashers",
      subject: "data_structures",
      subjectName: "Data Structures",
      playlistTitle: "Gate Smashers Data Structures",
      playlistPosition: 0,
      language: "Hindi",
      semester: 3,
      title: "Data Structures Introduction",
      verified: true,
      thumbnail: "https://img.youtube.com/vi/gate-ds-1/hqdefault.jpg",
      youtubeLink: "https://www.youtube.com/watch?v=gate-ds-1",
    });

    global.fetch = async () => {
      throw new Error("A selected Gate Smashers catalog video should avoid YouTube search.");
    };

    const result = await findLectureVideos({
      topic: "Data Structures Introduction",
      subject: "Data Structures",
      course: "Software Engineering",
      year: 2,
      preferredChannels: ["Gate Smashers"],
      preferredSubjects: ["data_structures"],
      language: "Hindi",
    });

    assert.equal(result.videoChannel, "Gate Smashers");
    assert.equal(result.videoChannelId, "UCJihyK0A38SZ6SdJirEdIOw");
    assert.equal(result.playlistId, "PLxCzCOWd7aiHqU4HKL7-SITyuSIcD93id");
    assert.equal(result.videoSubjectTag, "data_structures");
  });

  it("uses the verified CodeWithHarry Web Development playlist when selected as Code With Harry", async () => {
    await Video.create({
      youtubeVideoId: "harry-web-1",
      playlistId: "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
      channelId: "UCeVMnSShP_Iviwkknt83cww",
      creatorName: "CodeWithHarry",
      subject: "web_development",
      subjectName: "Web Development",
      playlistTitle: "CodeWithHarry Web Development",
      playlistPosition: 0,
      language: "Hindi",
      semester: 1,
      title: "HTML CSS and JavaScript Introduction",
      verified: true,
      thumbnail: "https://img.youtube.com/vi/harry-web-1/hqdefault.jpg",
      youtubeLink: "https://www.youtube.com/watch?v=harry-web-1",
    });

    global.fetch = async () => {
      throw new Error("A selected creator's verified playlist should avoid YouTube search.");
    };

    const result = await findLectureVideos({
      topic: "HTML CSS and JavaScript",
      subject: "Web Development",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["Code With Harry"],
      preferredSubjects: ["web_development"],
      language: "Hindi",
    });

    assert.equal(result.videoChannel, "CodeWithHarry");
    assert.equal(result.videoChannelId, "UCeVMnSShP_Iviwkknt83cww");
    assert.equal(result.playlistId, "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");
    assert.equal(result.videoSubjectTag, "web_development");
    assert.equal(result.videoSemester, 1);
  });

  it("uses the protected Sigma starter instead of scraping changed playlist results", async () => {
    global.fetch = async () => {
      throw new Error("Manual curated playlists should not be replaced by scraped playlist results.");
    };

    const result = await findLectureVideos({
      topic: "HTML Foundations",
      subject: "Web Development",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["CodeWithHarry"],
      preferredSubjects: ["web_development"],
      language: "Hindi",
    });

    assert.equal(result.videoChannel, "CodeWithHarry");
    assert.equal(result.videoUrl, "https://www.youtube.com/watch?v=tVzUXW6siu0&list=PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");
    assert.equal(result.playlistId, "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");
    assert.equal(result.playlistPosition, 0);
    assert.match(result.recommendationReason, /manual curated playlist starter/i);
    assert.equal(
      (result.alternativeVideos || []).every(
        (video) => video.playlistId === "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w"
      ),
      true
    );
  });

  it("keeps Code With Harry on the exact Sigma playlist even when React is selected", async () => {
    const user = await User.create({
      name: "Code With Harry React Guard Student",
      email: "code-with-harry-react-guard@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["codewithharry"],
        preferredSubjects: ["react"],
      },
    });

    await Playlist.create({
      title: "Old CodeWithHarry React Playlist",
      youtubePlaylistId: "stale-codewithharry-react-playlist",
      channelId: "UCeVMnSShP_Iviwkknt83cww",
      creatorName: "CodeWithHarry",
      creatorId: "codewithharry",
      subject: "react",
      subjectName: "React",
      playlistTitle: "Old CodeWithHarry React Playlist",
      semester: 1,
      language: "Hindi",
      verified: true,
      videoCount: 25,
      importedVideoCount: 25,
      thumbnail: "https://img.youtube.com/vi/stale-react-1/hqdefault.jpg",
      youtubeLink: "https://www.youtube.com/playlist?list=stale-codewithharry-react-playlist",
    });

    await Video.create({
      youtubeVideoId: "stale-react-1",
      playlistId: "stale-codewithharry-react-playlist",
      channelId: "UCeVMnSShP_Iviwkknt83cww",
      creatorName: "CodeWithHarry",
      creatorId: "codewithharry",
      subject: "react",
      subjectName: "React",
      playlistTitle: "Old CodeWithHarry React Playlist",
      playlistPosition: 0,
      language: "Hindi",
      semester: 1,
      title: "React Tutorial in Hindi",
      verified: true,
      thumbnail: "https://img.youtube.com/vi/stale-react-1/hqdefault.jpg",
      youtubeLink: "https://www.youtube.com/watch?v=stale-react-1",
    });

    global.fetch = async () => {
      throw new Error("Code With Harry selection must not be replaced by stale React data.");
    };

    const bundle = await getStudyPlanBundle(user, new Date());
    const task = bundle.plan.tasks[0];
    const flow = await getLearningFlow(user);

    assert.equal(
      task.videoUrl,
      "https://www.youtube.com/watch?v=tVzUXW6siu0&list=PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w"
    );
    assert.equal(task.videoId, "tVzUXW6siu0");
    assert.equal(task.playlistId, "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");
    assert.notEqual(task.videoTitle, "React Tutorial in Hindi");
    assert.equal(flow.recommendedForYou[0].playlistId, "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");
    assert.equal(
      flow.recommendedForYou.some(
        (playlist) => playlist.playlistId === "stale-codewithharry-react-playlist"
      ),
      false
    );
  });

  it("uses CodeWithHarry Python first and ML playlist as recommendation for Machine Learning", async () => {
    global.fetch = async () => {
      throw new Error("CodeWithHarry Machine Learning must not fall back to Sigma Web Development.");
    };

    const result = await findLectureVideos({
      topic: "Machine Learning Foundations",
      subject: "Machine Learning",
      course: "Machine Learning",
      year: 2,
      preferredChannels: ["CodeWithHarry"],
      preferredSubjects: ["machine_learning"],
      language: "Hindi",
    });

    assert.equal(result.videoChannel, "CodeWithHarry");
    assert.equal(result.creatorId, "codewithharry");
    assert.equal(result.videoId, "UrsmFxEIp5k");
    assert.equal(result.videoUrl, "https://www.youtube.com/watch?v=UrsmFxEIp5k");
    assert.notEqual(result.playlistId, "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");
    assert.equal(
      result.alternativeVideos.some(
        (video) =>
          video.playlistId === "PLu0W_9lII9ai6fAMHp-acBmJONT7Y4BSG" &&
          video.videoId === "_u-PaJCpwiU"
      ),
      true
    );
    assert.equal(
      result.alternativeVideos.some(
        (video) => video.playlistId === "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w"
      ),
      false
    );
  });

  it("does not show the CodeWithHarry Sigma playlist for Machine Learning learning-flow recommendations", async () => {
    const user = await User.create({
      name: "Machine Learning Flow Student",
      email: "ml-flow@example.com",
      password: "StrongPass1",
      course: "Machine Learning",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["CodeWithHarry"],
        preferredSubjects: [],
      },
    });

    await LearningState.create({
      user: user._id,
      youtubeVideoId: "tVzUXW6siu0",
      playlistId: "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
      playlistTitle: "CodeWithHarry Sigma Web Development",
      playlistPosition: 0,
      channelId: "UCeVMnSShP_Iviwkknt83cww",
      creatorName: "CodeWithHarry",
      creatorId: "codewithharry",
      subject: "web_development",
      subjectName: "Web Development",
      language: "Hindi",
      title: "CodeWithHarry Sigma Web Development",
      youtubeLink:
        "https://www.youtube.com/watch?v=tVzUXW6siu0&list=PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
      percent: 20,
    });

    const flow = await getLearningFlow(user);

    assert.equal(
      flow.recommendedForYou.some(
        (playlist) => playlist.playlistId === "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w"
      ),
      false
    );
    assert.equal(
      flow.recommendedForYou.every((playlist) => playlist.subject !== "web_development"),
      true
    );
  });

  it("uses the exact Sheryians Coding School playlist for Machine Learning", async () => {
    global.fetch = async () => {
      throw new Error("Sheryians Machine Learning must not fall back to another creator.");
    };

    const result = await findLectureVideos({
      topic: "Machine Learning Foundations",
      subject: "Machine Learning",
      course: "Machine Learning",
      year: 2,
      preferredChannels: ["Sheryians Coding School"],
      preferredSubjects: ["machine_learning"],
      language: "Hindi",
    });

    assert.equal(result.videoChannel, "Sheryians Coding School");
    assert.equal(result.creatorId, "sheryians");
    assert.equal(result.videoId, "1L420xXpDTg");
    assert.equal(result.playlistId, "PLaldQ9PzZd9qT0KsKJ7yCq70iFFP3MFJ5");
    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=1L420xXpDTg&list=PLaldQ9PzZd9qT0KsKJ7yCq70iFFP3MFJ5"
    );
    assert.equal(
      result.alternativeVideos.some(
        (video) =>
          video.creatorId &&
          video.creatorId !== "sheryians"
      ),
      false
    );
  });

  it("uses the exact freeCodeCamp.org video for English Machine Learning", async () => {
    global.fetch = async () => {
      throw new Error("freeCodeCamp.org Machine Learning must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Machine Learning Foundations freeCodeCamp.org",
      subject: "Machine Learning",
      course: "Machine Learning",
      year: 2,
      preferredChannels: ["freeCodeCamp.orgVerified"],
      preferredSubjects: ["machine_learning"],
      language: "English",
    });

    assertOnlySelectedCuratedVideos(result, {
      creator: "freeCodeCamp.org",
      course: "Machine Learning",
      videoId: "i_LwzRVP7bg",
    });
    assert.equal(result.videoUrl, "https://www.youtube.com/watch?v=i_LwzRVP7bg");
    assert.equal(result.videoSubjectTag, "machine_learning");
  });

  it("uses the exact freeCodeCamp.org video for English Data Science", async () => {
    global.fetch = async () => {
      throw new Error("freeCodeCamp.org Data Science must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Data Science Foundations freeCodeCamp.org",
      subject: "Data Science",
      course: "Data Science",
      year: 2,
      preferredChannels: ["freeCodeCamp.orgVerified"],
      preferredSubjects: ["data_science"],
      language: "English",
    });

    assertOnlySelectedCuratedVideos(result, {
      creator: "freeCodeCamp.org",
      course: "Data Science",
      videoId: "XU5pw3QRYjQ",
    });
    assert.equal(result.videoUrl, "https://www.youtube.com/watch?v=XU5pw3QRYjQ");
    assert.equal(result.videoSubjectTag, "data_science");
  });

  it("uses the exact StatQuest video for English Data Science", async () => {
    global.fetch = async () => {
      throw new Error("StatQuest Data Science must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Data Science Foundations StatQuest",
      subject: "Data Science",
      course: "Data Science",
      year: 2,
      preferredChannels: ["StatQuestVerified"],
      preferredSubjects: ["data_science"],
      language: "English",
    });

    assertOnlySelectedCuratedVideos(result, {
      creator: "StatQuest",
      course: "Data Science",
      videoId: "ilUbD7EoQnk",
    });
    assert.equal(result.videoUrl, "https://www.youtube.com/watch?v=ilUbD7EoQnk");
    assert.equal(result.videoSubjectTag, "data_science");
  });

  it("uses the exact StatQuest playlist for English Machine Learning", async () => {
    global.fetch = async () => {
      throw new Error("StatQuest Machine Learning must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Machine Learning Foundations StatQuest",
      subject: "Machine Learning",
      course: "Machine Learning",
      year: 2,
      preferredChannels: ["StatQuestVerified"],
      preferredSubjects: ["machine_learning"],
      language: "English",
    });

    assert.equal(result.videoChannel, "StatQuest");
    assert.equal(result.creatorId, "statquest");
    assert.equal(result.videoId, "Gv9_4yMHFhI");
    assert.equal(result.playlistId, "PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF");
    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=Gv9_4yMHFhI&list=PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF"
    );
    assert.equal(result.videoSubjectTag, "machine_learning");
  });

  it("uses the exact Sheryians Coding School playlist for Software Engineering", async () => {
    global.fetch = async () => {
      throw new Error("Sheryians Software Engineering must not fall back to another creator.");
    };

    const result = await findLectureVideos({
      topic: "Software Engineering Roadmap",
      subject: "Software Engineering",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["Sheryians Coding School"],
      preferredSubjects: ["software_engineering"],
      language: "Hindi",
    });

    assert.equal(result.videoChannel, "Sheryians Coding School");
    assert.equal(result.creatorId, "sheryians");
    assert.equal(result.videoId, "kkOuRJ69BRY");
    assert.equal(result.playlistId, "PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn");
    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=kkOuRJ69BRY&list=PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn"
    );
    assert.equal(
      result.alternativeVideos.some(
        (video) => video.playlistId === "PLaldQ9PzZd9qT0KsKJ7yCq70iFFP3MFJ5"
      ),
      false
    );
  });

  it("uses the exact freeCodeCamp.org video for English Software Engineering", async () => {
    global.fetch = async () => {
      throw new Error("freeCodeCamp.org Software Engineering must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Software Engineering Roadmap freeCodeCamp.org",
      subject: "Software Engineering",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["freeCodeCamp.orgVerified"],
      preferredSubjects: ["software_engineering"],
      language: "English",
    });

    assertOnlySelectedCuratedVideos(result, {
      creator: "freeCodeCamp.org",
      course: "Software Engineering",
      videoId: "dX8396ZmSPk",
    });
    assert.equal(result.videoUrl, "https://www.youtube.com/watch?v=dX8396ZmSPk");
    assert.equal(result.videoSubjectTag, "software_engineering");
  });

  it("uses the exact Traversy Media playlist for English Software Engineering", async () => {
    global.fetch = async () => {
      throw new Error("Traversy Media Software Engineering must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Software Engineering Roadmap Traversy Media",
      subject: "Software Engineering",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["Traversy MediaVerified"],
      preferredSubjects: ["software_engineering"],
      language: "English",
    });

    assert.equal(result.videoChannel, "Traversy Media");
    assert.equal(result.creatorId, "traversy-media");
    assert.equal(result.videoId, "UB1O30fR-EE");
    assert.equal(result.playlistId, "PLillGF-RfqbYeckUaD1z6nviTp31GLTH8");
    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=UB1O30fR-EE&list=PLillGF-RfqbYeckUaD1z6nviTp31GLTH8"
    );
    assert.equal(result.videoSubjectTag, "software_engineering");
  });

  it("uses the exact Web Dev Simplified playlist for English Software Engineering", async () => {
    global.fetch = async () => {
      throw new Error("Web Dev Simplified Software Engineering must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Software Engineering Roadmap Web Dev Simplified",
      subject: "Software Engineering",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["Web Dev SimplifiedVerified"],
      preferredSubjects: ["software_engineering"],
      language: "English",
    });

    assert.equal(result.videoChannel, "Web Dev Simplified");
    assert.equal(result.creatorId, "web-dev-simplified");
    assert.equal(result.videoId, "XlvsJLer_No");
    assert.equal(result.playlistId, "PLZlA0Gpn_vH8jbFkBjOuFjhxANC63OmXM");
    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=XlvsJLer_No&list=PLZlA0Gpn_vH8jbFkBjOuFjhxANC63OmXM"
    );
    assert.equal(result.videoSubjectTag, "software_engineering");
  });

  it("keeps freeCodeCamp.org on the exact English Software Engineering video without a selected subject", async () => {
    global.fetch = async () => {
      throw new Error("freeCodeCamp.org Software Engineering must not fall back to a generic HTML video.");
    };

    const user = await User.create({
      name: "freeCodeCamp Software Student",
      email: "fcc-software-no-subject@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "English",
        preferredChannels: ["freeCodeCamp.orgVerified"],
        preferredSubjects: [],
      },
    });

    const bundle = await getStudyPlanBundle(user, new Date());
    const task = bundle.plan.tasks[0];

    assert.equal(task.videoChannel, "freeCodeCamp.org");
    assert.equal(task.videoId, "dX8396ZmSPk");
    assert.equal(task.videoUrl, "https://www.youtube.com/watch?v=dX8396ZmSPk");
    assert.equal(task.videoSubjectTag, "software_engineering");
  });

  it("uses the exact Web Dev Mastery playlist for Software Engineering", async () => {
    global.fetch = async () => {
      throw new Error("Web Dev Mastery Software Engineering must not fall back to generic search.");
    };

    const result = await findLectureVideos({
      topic: "Software Development Roadmap",
      subject: "Software Engineering",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["Web Dev Mastery"],
      preferredSubjects: ["software_engineering"],
      language: "Hindi",
    });

    assert.equal(result.videoChannel, "Web Dev Mastery");
    assert.equal(result.creatorId, "web-dev-mastery");
    assert.equal(result.videoId, "VnksVEsIH1o");
    assert.equal(result.playlistId, "PL-CeQccLavFeytqS_ALj97JNd4PF4gc1z");
    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=VnksVEsIH1o&list=PL-CeQccLavFeytqS_ALj97JNd4PF4gc1z"
    );
    assert.equal(
      result.alternativeVideos.some(
        (video) => video.creatorId && video.creatorId !== "web-dev-mastery"
      ),
      false
    );
  });

  it("keeps Sheryians Software Engineering on the software playlist even with stale ML preferences", async () => {
    global.fetch = async () => {
      throw new Error("Software Engineering must not use the Sheryians Machine Learning playlist.");
    };

    const result = await findLectureVideos({
      topic: "Build software projects",
      subject: "Web Development",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["sheryians"],
      preferredSubjects: ["machine_learning"],
      language: "Hindi",
    });

    assert.equal(result.videoChannel, "Sheryians Coding School");
    assert.equal(result.creatorId, "sheryians");
    assert.equal(result.videoId, "kkOuRJ69BRY");
    assert.equal(result.playlistId, "PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn");
    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=kkOuRJ69BRY&list=PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn"
    );
    assert.equal(
      result.alternativeVideos.some(
        (video) => video.playlistId === "PLaldQ9PzZd9qT0KsKJ7yCq70iFFP3MFJ5"
      ),
      false
    );
  });

  it("ignores stale Machine Learning preferred subject when Software Engineering is selected", async () => {
    global.fetch = async () => {
      throw new Error("Software Engineering plan must not use the Machine Learning playlist.");
    };

    const user = await User.create({
      name: "Sheryians Software Subject Guard",
      email: "sheryians-software-subject-guard@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["sheryians"],
        preferredSubjects: ["machine_learning"],
      },
    });

    const { studyPlan } = await getStudyPlanBundle(user, new Date("2026-06-29T00:00:00.000Z"));
    const task = studyPlan.tasks[0];

    assert.equal(studyPlan.course, "Software Engineering");
    assert.notEqual(task.subject, "Machine Learning");
    assert.equal(task.creatorId, "sheryians");
    assert.equal(task.videoId, "kkOuRJ69BRY");
    assert.equal(task.playlistId, "PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn");
    assert.equal(task.topic, task.videoTitle);
    assert.notEqual(task.topic, "React Router and API Calls");
    assert.equal(task.quizQuestions[0].question.includes(task.videoTitle), true);
    assert.equal(
      task.quizQuestions.some((question) =>
        question.question.includes("React Router and API Calls")
      ),
      false
    );
    assert.equal(
      task.videoUrl,
      "https://www.youtube.com/watch?v=kkOuRJ69BRY&list=PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn"
    );
  });

  it("keeps Apna College on the exact web development playlist even when React is selected", async () => {
    const user = await User.create({
      name: "Apna React Guard Student",
      email: "apna-react-guard@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["apna-college"],
        preferredSubjects: ["react"],
      },
    });

    await Playlist.create({
      title: "Old Apna React Playlist",
      youtubePlaylistId: "stale-apna-react-playlist",
      channelId: "UCBwmMxybNva6P_5VmxjzwqA",
      creatorName: "Apna College",
      creatorId: "apna-college",
      subject: "react",
      subjectName: "React",
      playlistTitle: "Old Apna React Playlist",
      semester: 1,
      language: "Hindi",
      verified: true,
      videoCount: 25,
      importedVideoCount: 25,
      thumbnail: "https://img.youtube.com/vi/stale-apna-react-1/hqdefault.jpg",
      youtubeLink: "https://www.youtube.com/playlist?list=stale-apna-react-playlist",
    });

    await Video.create({
      youtubeVideoId: "stale-apna-react-1",
      playlistId: "stale-apna-react-playlist",
      channelId: "UCBwmMxybNva6P_5VmxjzwqA",
      creatorName: "Apna College",
      creatorId: "apna-college",
      subject: "react",
      subjectName: "React",
      playlistTitle: "Old Apna React Playlist",
      playlistPosition: 0,
      language: "Hindi",
      semester: 1,
      title: "React Router and API Calls",
      verified: true,
      thumbnail: "https://img.youtube.com/vi/stale-apna-react-1/hqdefault.jpg",
      youtubeLink: "https://www.youtube.com/watch?v=stale-apna-react-1",
    });

    global.fetch = async () => {
      throw new Error("Apna College selection must not be replaced by stale React data.");
    };

    const result = await findLectureVideos({
      topic: "React Router and API Calls",
      subject: "React",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["apna-college"],
      preferredSubjects: ["react"],
      language: "Hindi",
    });
    const bundle = await getStudyPlanBundle(user, new Date());
    const task = bundle.plan.tasks[0];

    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=l1EssrLxt7E&list=PLfqMhTWNBTe3H6c9OGXb5_6wcc1Mca52n"
    );
    assert.equal(result.videoChannel, "Apna College");
    assert.equal(result.videoId, "l1EssrLxt7E");
    assert.equal(result.playlistId, "PLfqMhTWNBTe3H6c9OGXb5_6wcc1Mca52n");
    assert.equal(task.videoUrl, result.videoUrl);
    assert.equal(task.creatorId, "apna-college");
    assert.notEqual(task.videoChannel, "Traversy Media");
    assert.notEqual(task.videoTitle, "React Router and API Calls");
  });

  it("keeps College Wallah on the provided standalone videos even when React is selected", async () => {
    const user = await User.create({
      name: "College Wallah React Guard Student",
      email: "college-wallah-react-guard@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["college-wallah"],
        preferredSubjects: ["react"],
      },
    });

    global.fetch = async () => {
      throw new Error("College Wallah selection must not be replaced by generic React data.");
    };

    const result = await findLectureVideos({
      topic: "React Router and API Calls",
      subject: "React",
      course: "Software Engineering",
      year: 1,
      preferredChannels: ["college-wallah"],
      preferredSubjects: ["react"],
      language: "Hindi",
    });
    const bundle = await getStudyPlanBundle(user, new Date());
    const task = bundle.plan.tasks[0];

    assert.equal(result.videoUrl, "https://www.youtube.com/watch?v=HBqWsrqK89U&t=5s");
    assert.equal(result.videoChannel, "College Wallah");
    assert.equal(result.videoId, "HBqWsrqK89U");
    assert.equal(result.creatorId, "college-wallah");
    assert.equal(result.alternativeVideos[0].videoUrl, "https://www.youtube.com/watch?v=427pAhy9dI8&t=1598s");
    assert.equal(task.videoUrl, result.videoUrl);
    assert.equal(task.creatorId, "college-wallah");
    assert.notEqual(task.videoChannel, "Traversy Media");
    assert.notEqual(task.videoTitle, "React Router and API Calls");
  });

  it("returns same-playlist continuation videos in the order learners should watch next", async () => {
    await Video.insertMany([
      {
        youtubeVideoId: "gate-os-1",
        playlistId: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
        channelId: "UCJihyK0A38SZ6SdJirEdIOw",
        creatorName: "Gate Smashers",
        subject: "operating_systems",
        subjectName: "Operating Systems",
        playlistTitle: "Gate Smashers Operating System",
        playlistPosition: 0,
        language: "Hindi",
        semester: 3,
        title: "Operating System Introduction",
        verified: true,
        thumbnail: "https://img.youtube.com/vi/gate-os-1/hqdefault.jpg",
        youtubeLink: "https://www.youtube.com/watch?v=gate-os-1",
      },
      {
        youtubeVideoId: "gate-os-2",
        playlistId: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
        channelId: "UCJihyK0A38SZ6SdJirEdIOw",
        creatorName: "Gate Smashers",
        subject: "operating_systems",
        subjectName: "Operating Systems",
        playlistTitle: "Gate Smashers Operating System",
        playlistPosition: 1,
        language: "Hindi",
        semester: 3,
        title: "Operating System Memory Management",
        verified: true,
        thumbnail: "https://img.youtube.com/vi/gate-os-2/hqdefault.jpg",
        youtubeLink: "https://www.youtube.com/watch?v=gate-os-2",
      },
      {
        youtubeVideoId: "gate-os-3",
        playlistId: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
        channelId: "UCJihyK0A38SZ6SdJirEdIOw",
        creatorName: "Gate Smashers",
        subject: "operating_systems",
        subjectName: "Operating Systems",
        playlistTitle: "Gate Smashers Operating System",
        playlistPosition: 2,
        language: "Hindi",
        semester: 3,
        title: "Operating System Deadlocks",
        verified: true,
        thumbnail: "https://img.youtube.com/vi/gate-os-3/hqdefault.jpg",
        youtubeLink: "https://www.youtube.com/watch?v=gate-os-3",
      },
    ]);

    global.fetch = async () => {
      throw new Error("Playlist continuation should come from imported catalog videos.");
    };

    const result = await findLectureVideos({
      topic: "Memory Management",
      subject: "Operating Systems",
      course: "Software Engineering",
      year: 2,
      preferredChannels: ["Gate Smashers"],
      preferredSubjects: ["operating_systems"],
      language: "Hindi",
    });

    assert.equal(
      result.videoUrl,
      "https://www.youtube.com/watch?v=bkSWJJZNgf8&list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p"
    );
    assert.equal(result.alternativeVideos[0].videoUrl, "https://www.youtube.com/watch?v=gate-os-2");
    assert.equal(result.alternativeVideos[1].videoUrl, "https://www.youtube.com/watch?v=gate-os-3");
    assert.equal(result.alternativeVideos.at(-1).videoUrl, "https://www.youtube.com/watch?v=gate-os-1");
  });

  it("persists exact video progress and returns continue-learning guidance", async () => {
    const user = await User.create({
      name: "Learning Student",
      email: "learning@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 2,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["Gate Smashers"],
        preferredSubjects: ["operating_systems"],
      },
    });

    await updateVideoLearningState(user, {
      youtubeVideoId: "gate-os-progress",
      currentSeconds: 754,
      durationSeconds: 1800,
      percent: 42,
      video: {
        title: "L-1.1: Introduction to Operating System",
        playlistId: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
        playlistTitle: "Gate Smashers Operating System",
        playlistPosition: 0,
        channelId: "UCJihyK0A38SZ6SdJirEdIOw",
        creatorName: "Gate Smashers",
        subject: "operating_systems",
        subjectName: "Operating Systems",
        language: "Hindi",
        youtubeLink: "https://www.youtube.com/watch?v=gate-os-progress",
      },
    });

    const flow = await getLearningFlow(user);

    assert.equal(flow.progressByVideoId["gate-os-progress"].currentSeconds, 754);
    assert.equal(flow.continueLearning[0].youtubeVideoId, "gate-os-progress");
    assert.equal(flow.roadmap.currentSubject.id, "operating_systems");
    assert.equal(flow.roadmap.nextRecommendedSubjects[0].id, "database_management_systems");
  });

  it("shows a selected creator's manually curated playlist before playlist import runs", async () => {
    const user = await User.create({
      name: "Curated Playlist Student",
      email: "curated-playlist@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["CodeWithHarry"],
        preferredSubjects: [],
      },
    });

    const flow = await getLearningFlow(user);

    assert.equal(flow.recommendedForYou.length > 0, true);
    assert.equal(flow.recommendedForYou[0].creatorName, "CodeWithHarry");
    assert.equal(flow.recommendedForYou[0].playlistId, "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");
    assert.equal(
      flow.recommendedForYou.every((playlist) => playlist.creatorName === "CodeWithHarry"),
      true
    );
  });

  it("updates learning recommendations when switching from CodeWithHarry to Apna College", async () => {
    const user = await User.create({
      name: "Creator Switch Student",
      email: "creator-switch@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["CodeWithHarry"],
        preferredSubjects: [],
      },
    });

    const codeWithHarryFlow = await getLearningFlow(user);

    assert.equal(codeWithHarryFlow.recommendedForYou[0].creatorName, "CodeWithHarry");
    assert.equal(
      codeWithHarryFlow.recommendedForYou[0].playlistId,
      "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w"
    );

    user.preferences.preferredChannels = ["apna-college"];
    await user.save();

    const apnaFlow = await getLearningFlow(user);

    assert.equal(apnaFlow.recommendedForYou.length > 0, true);
    assert.equal(apnaFlow.recommendedForYou[0].creatorName, "Apna College");
    assert.equal(
      apnaFlow.recommendedForYou[0].playlistId,
      "PLfqMhTWNBTe3H6c9OGXb5_6wcc1Mca52n"
    );
    assert.equal(
      apnaFlow.recommendedForYou.some(
        (playlist) => playlist.playlistId === "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w"
      ),
      false
    );
  });

  it("regenerates a completed Sigma study plan after switching to Web Dev Mastery", async () => {
    const user = await User.create({
      name: "Completed Creator Switch Student",
      email: "completed-creator-switch@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      createdAt: new Date("2026-06-20T00:00:00.000Z"),
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["CodeWithHarry"],
        preferredSubjects: [],
      },
    });
    const planDate = new Date("2026-06-30T00:00:00.000Z");
    const codeWithHarryBundle = await getStudyPlanBundle(user, planDate);
    const oldPlanId = String(codeWithHarryBundle.plan._id);
    const oldTask = codeWithHarryBundle.plan.tasks[0];

    assert.equal(oldTask.creatorId, "codewithharry");
    assert.equal(oldTask.playlistId, "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");

    oldTask.completed = true;
    oldTask.completedAt = new Date("2026-06-30T10:00:00.000Z");
    oldTask.progressRate = 100;
    await oldTask.save();
    codeWithHarryBundle.plan.completedTasks = 1;
    codeWithHarryBundle.plan.completionRate = 100;
    await codeWithHarryBundle.plan.save();
    codeWithHarryBundle.progress.completedTasks = 1;
    codeWithHarryBundle.progress.completionRate = 100;
    await codeWithHarryBundle.progress.save();

    user.preferences.preferredChannels = ["web-dev-mastery"];
    await user.save();

    const webDevMasteryBundle = await getStudyPlanBundle(user, planDate);
    const newTask = webDevMasteryBundle.plan.tasks[0];

    assert.notEqual(String(webDevMasteryBundle.plan._id), oldPlanId);
    assert.equal(newTask.creatorId, "web-dev-mastery");
    assert.equal(newTask.videoChannel, "Web Dev Mastery");
    assert.equal(newTask.playlistId, "PL-CeQccLavFeytqS_ALj97JNd4PF4gc1z");
    assert.equal(
      newTask.videoUrl,
      "https://www.youtube.com/watch?v=VnksVEsIH1o&list=PL-CeQccLavFeytqS_ALj97JNd4PF4gc1z"
    );
  });

  it("shows the selected English Bro Code playlist only for English learners", async () => {
    const user = await User.create({
      name: "Bro Code Student",
      email: "bro-code@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "English",
        preferredChannels: ["Bro Code"],
        preferredSubjects: [],
      },
    });

    const flow = await getLearningFlow(user);

    assert.equal(flow.recommendedForYou.length > 0, true);
    assert.equal(flow.recommendedForYou[0].creatorName, "Bro Code");
    assert.equal(flow.recommendedForYou[0].playlistId, "PLZPZq0r_RZOPP5Yjt6IqgytMRY5uLt4y3");
  });

  it("generates the daily lesson from the selected subject before recommending videos", async () => {
    const user = await User.create({
      name: "React Student",
      email: "react@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "English",
        preferredChannels: ["freeCodeCamp.org"],
        preferredSubjects: ["react"],
      },
    });

    await Video.create({
      youtubeVideoId: "fcc-react-1",
      playlistId: "PLreact",
      channelId: "UC8butISFwT-Wl7EV0hUK0BQ",
      creatorName: "freeCodeCamp.org",
      subject: "react",
      subjectName: "React",
      playlistTitle: "freeCodeCamp React",
      playlistPosition: 0,
      language: "English",
      semester: 1,
      title: "React Basics Full Course",
      verified: true,
      thumbnail: "https://img.youtube.com/vi/fcc-react-1/hqdefault.jpg",
      youtubeLink: "https://www.youtube.com/watch?v=fcc-react-1",
    });

    global.fetch = async () => {
      throw new Error("A matching verified catalog video should avoid YouTube search.");
    };

    const bundle = await getStudyPlanBundle(user, new Date());
    const task = bundle.plan.tasks[0];
    const flow = await getLearningFlow(user);

    assert.match(task.topic, /React/);
    assert.equal(task.subject, "React");
    assert.equal(task.videoSubjectTag, "react");
    assert.equal(task.videoChannel, "freeCodeCamp.org");
    assert.equal(task.videoUrl, "https://www.youtube.com/watch?v=fcc-react-1");
    assert.equal(task.relatedVideos.every((video) => video.videoSubjectTag === "react"), true);
    assert.equal(flow.roadmap.currentSubject.id, "react");
  });

  it("starts the selected CodeWithHarry Sigma playlist from video 1 instead of old watched progress", async () => {
    const user = await User.create({
      name: "Sigma Student",
      email: "sigma@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["CodeWithHarry"],
        preferredSubjects: ["web_development"],
      },
    });

    await Video.insertMany([
      {
        youtubeVideoId: "sigma-html",
        playlistId: "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
        channelId: "UCeVMnSShP_Iviwkknt83cww",
        creatorName: "CodeWithHarry",
        subject: "web_development",
        subjectName: "Web Development",
        playlistTitle: "CodeWithHarry Sigma Web Development",
        playlistPosition: 0,
        language: "Hindi",
        semester: 1,
        title: "Sigma Web Development Lecture 1",
        verified: true,
        thumbnail: "https://img.youtube.com/vi/sigma-html/hqdefault.jpg",
        youtubeLink: "https://www.youtube.com/watch?v=sigma-html",
      },
      {
        youtubeVideoId: "sigma-css",
        playlistId: "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
        channelId: "UCeVMnSShP_Iviwkknt83cww",
        creatorName: "CodeWithHarry",
        subject: "web_development",
        subjectName: "Web Development",
        playlistTitle: "CodeWithHarry Sigma Web Development",
        playlistPosition: 1,
        language: "Hindi",
        semester: 1,
        title: "Sigma Web Development Lecture 2",
        verified: true,
        thumbnail: "https://img.youtube.com/vi/sigma-css/hqdefault.jpg",
        youtubeLink: "https://www.youtube.com/watch?v=sigma-css",
      },
      {
        youtubeVideoId: "wrong-creator-sigma-css",
        playlistId: "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
        channelId: "UCeVMnSShP_Iviwkknt83cww",
        creatorName: "Wrong Creator",
        subject: "web_development",
        subjectName: "Web Development",
        playlistTitle: "Wrong Creator Sigma Web Development",
        playlistPosition: 1,
        language: "Hindi",
        semester: 1,
        title: "Wrong creator duplicate lecture",
        verified: true,
        thumbnail: "https://img.youtube.com/vi/wrong-creator-sigma-css/hqdefault.jpg",
        youtubeLink: "https://www.youtube.com/watch?v=wrong-creator-sigma-css",
      },
      {
        youtubeVideoId: "sigma-js",
        playlistId: "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
        channelId: "UCeVMnSShP_Iviwkknt83cww",
        creatorName: "CodeWithHarry",
        subject: "web_development",
        subjectName: "Web Development",
        playlistTitle: "CodeWithHarry Sigma Web Development",
        playlistPosition: 2,
        language: "Hindi",
        semester: 1,
        title: "Sigma Web Development Lecture 3",
        verified: true,
        thumbnail: "https://img.youtube.com/vi/sigma-js/hqdefault.jpg",
        youtubeLink: "https://www.youtube.com/watch?v=sigma-js",
      },
    ]);

    await updateVideoLearningState(user, {
      currentSeconds: 1200,
      durationSeconds: 1200,
      completed: true,
      video: {
        videoId: "sigma-html",
        title: "Sigma Web Development Lecture 1",
        playlistId: "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
        playlistTitle: "CodeWithHarry Sigma Web Development",
        playlistPosition: 0,
        channelId: "UCeVMnSShP_Iviwkknt83cww",
        creatorName: "CodeWithHarry",
        subject: "web_development",
        subjectName: "Web Development",
        language: "Hindi",
        youtubeLink: "https://www.youtube.com/watch?v=sigma-html",
      },
    });

    global.fetch = async () => {
      throw new Error("Daily lesson should use the protected selected creator starter.");
    };

    const bundle = await getStudyPlanBundle(user, new Date());
    const task = bundle.plan.tasks[0];

    assert.equal(task.videoUrl, "https://www.youtube.com/watch?v=tVzUXW6siu0&list=PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");
    assert.notEqual(task.videoUrl, "https://www.youtube.com/watch?v=wrong-creator-sigma-css");
    assert.equal(task.videoId, "tVzUXW6siu0");
    assert.equal(task.videoTitle, "CodeWithHarry Sigma Web Development");
    assert.equal(task.subject, "Web Development");
    assert.equal(task.playlistId, "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w");
    assert.equal(task.playlistPosition, 0);
    assert.ok(
      task.relatedVideos.every((video) => video.creatorName === "CodeWithHarry" || video.videoChannel === "CodeWithHarry")
    );
  });

  it("keeps playlist continuation moving beyond the first 15 videos", async () => {
    const user = await User.create({
      name: "Long Playlist Student",
      email: "long-playlist@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["CodeWithHarry"],
        preferredSubjects: ["web_development"],
      },
    });
    const playlistId = "PL-long-continuation";
    const videos = Array.from({ length: 200 }, (_, index) => ({
      youtubeVideoId: `long-video-${index + 1}`,
      playlistId,
      channelId: "UCeVMnSShP_Iviwkknt83cww",
      creatorName: "CodeWithHarry",
      subject: "web_development",
      subjectName: "Web Development",
      playlistTitle: "CodeWithHarry Long Web Development",
      playlistPosition: index,
      language: "Hindi",
      semester: 1,
      title: `Long Playlist Lecture ${index + 1}`,
      verified: true,
      thumbnail: `https://img.youtube.com/vi/long-video-${index + 1}/hqdefault.jpg`,
      youtubeLink: `https://www.youtube.com/watch?v=long-video-${index + 1}`,
    }));

    await Video.insertMany(videos);
    await Video.create({
      youtubeVideoId: "wrong-creator-long-video-16",
      playlistId,
      channelId: "UCeVMnSShP_Iviwkknt83cww",
      creatorName: "Wrong Creator",
      subject: "database_management_systems",
      subjectName: "Database Management Systems",
      playlistTitle: "Wrong Creator Long Playlist",
      playlistPosition: 15,
      language: "Hindi",
      semester: 1,
      title: "Wrong creator duplicate at continuation boundary",
      verified: true,
      thumbnail: "https://img.youtube.com/vi/wrong-creator-long-video-16/hqdefault.jpg",
      youtubeLink: "https://www.youtube.com/watch?v=wrong-creator-long-video-16",
    });

    for (const position of [14, 29, 98, 148]) {
      const state = await updateVideoLearningState(user, {
        currentSeconds: 1200,
        durationSeconds: 1200,
        completed: true,
        video: {
          videoId: `long-video-${position + 1}`,
          title: `Long Playlist Lecture ${position + 1}`,
          playlistId,
          playlistTitle: "CodeWithHarry Long Web Development",
          playlistPosition: position,
          channelId: "UCeVMnSShP_Iviwkknt83cww",
          creatorName: "CodeWithHarry",
          subject: position === 14 ? "react" : "web_development",
          subjectName: position === 14 ? "React" : "Web Development",
          language: "Hindi",
          youtubeLink: `https://www.youtube.com/watch?v=long-video-${position + 1}`,
        },
      });
      const continuation = await getNextPlaylistVideosForState(user, state, { limit: 5 });

      assert.equal(continuation.playlistCompleted, false);
      assert.deepEqual(
        continuation.nextPlaylistVideos.map((video) => video.playlistPosition),
        [position + 1, position + 2, position + 3, position + 4, position + 5]
      );
      assert.deepEqual(
        continuation.nextPlaylistVideos.map((video) => video.videoId),
        [
          `long-video-${position + 2}`,
          `long-video-${position + 3}`,
          `long-video-${position + 4}`,
          `long-video-${position + 5}`,
          `long-video-${position + 6}`,
        ]
      );
      assert.equal(new Set(continuation.nextPlaylistVideos.map((video) => video.videoId)).size, 5);
      assert.equal(
        continuation.nextPlaylistVideos.some(
          (video) => video.videoId === "wrong-creator-long-video-16"
        ),
        false
      );
    }

    const finalState = await updateVideoLearningState(user, {
      currentSeconds: 1200,
      durationSeconds: 1200,
      completed: true,
      video: {
        videoId: "long-video-200",
        title: "Long Playlist Lecture 200",
        playlistId,
        playlistTitle: "CodeWithHarry Long Web Development",
        playlistPosition: 199,
        channelId: "UCeVMnSShP_Iviwkknt83cww",
        creatorName: "CodeWithHarry",
        subject: "web_development",
        subjectName: "Web Development",
        language: "Hindi",
        youtubeLink: "https://www.youtube.com/watch?v=long-video-200",
      },
    });
    const completed = await getNextPlaylistVideosForState(user, finalState, { limit: 5 });

    assert.deepEqual(completed.nextPlaylistVideos, []);
    assert.equal(completed.playlistCompleted, true);
  });

  it("does not mark the CodeWithHarry playlist complete when only the first 15 videos are cached", async () => {
    const user = await User.create({
      name: "Partial Playlist Student",
      email: "partial-playlist@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["CodeWithHarry"],
        preferredSubjects: ["web_development"],
      },
    });
    const playlistId = "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w";

    await Playlist.create({
      title: "CodeWithHarry Sigma Web Development",
      youtubePlaylistId: playlistId,
      channelId: "UCeVMnSShP_Iviwkknt83cww",
      creatorName: "CodeWithHarry",
      creatorId: "codewithharry",
      subject: "web_development",
      subjectName: "Web Development",
      playlistTitle: "CodeWithHarry Sigma Web Development",
      semester: 1,
      language: "Hindi",
      verified: true,
      videoCount: 129,
      importedVideoCount: 15,
      youtubeLink: `https://www.youtube.com/playlist?list=${playlistId}`,
    });

    await Video.insertMany(
      Array.from({ length: 15 }, (_, index) => ({
        youtubeVideoId: index === 14 ? "tutorial-15" : `tutorial-${index + 1}`,
        playlistId,
        channelId: "UCeVMnSShP_Iviwkknt83cww",
        creatorName: "CodeWithHarry",
        creatorId: "codewithharry",
        subject: "web_development",
        subjectName: "Web Development",
        playlistTitle: "CodeWithHarry Sigma Web Development",
        playlistPosition: index,
        language: "Hindi",
        semester: 1,
        title: `Sigma Web Development Tutorial #${index + 1}`,
        verified: true,
        thumbnail: `https://img.youtube.com/vi/tutorial-${index + 1}/hqdefault.jpg`,
        youtubeLink: `https://www.youtube.com/watch?v=tutorial-${index + 1}`,
      }))
    );

    global.fetch = undefined;

    const state = await updateVideoLearningState(user, {
      currentSeconds: 10,
      durationSeconds: 660,
      completed: false,
      video: {
        videoId: "tutorial-15",
        title: "Inline, Internal & External CSS | Sigma Web Development Course - Tutorial #15",
        playlistId,
        playlistTitle: "CodeWithHarry Sigma Web Development",
        playlistPosition: 14,
        channelId: "UCeVMnSShP_Iviwkknt83cww",
        creatorName: "CodeWithHarry",
        creatorId: "codewithharry",
        subject: "react",
        subjectName: "React",
        language: "Hindi",
        youtubeLink: "https://www.youtube.com/watch?v=tutorial-15",
      },
    });
    const continuation = await getNextPlaylistVideosForState(user, state, { limit: 16 });

    assert.deepEqual(continuation.nextPlaylistVideos, []);
    assert.equal(continuation.playlistCompleted, false);
  });

  it("loads CodeWithHarry videos 16 onward from the public playlist when local cache stops at 15", async () => {
    const user = await User.create({
      name: "Public Continuation Student",
      email: "public-continuation@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["CodeWithHarry"],
        preferredSubjects: ["web_development"],
      },
    });
    const playlistId = "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w";
    const publicPlaylistVideos = Array.from({ length: 31 }, (_, index) => ({
      videoId: `public-sigma-${index + 1}`,
      title: `Sigma Web Development Tutorial #${index + 1}`,
      duration: "11:04",
    }));

    await Playlist.create({
      title: "CodeWithHarry Sigma Web Development",
      youtubePlaylistId: playlistId,
      channelId: "UCeVMnSShP_Iviwkknt83cww",
      creatorName: "CodeWithHarry",
      creatorId: "codewithharry",
      subject: "web_development",
      subjectName: "Web Development",
      playlistTitle: "CodeWithHarry Sigma Web Development",
      semester: 1,
      language: "Hindi",
      verified: true,
      videoCount: 129,
      importedVideoCount: 15,
      youtubeLink: `https://www.youtube.com/playlist?list=${playlistId}`,
    });

    await Video.insertMany(
      publicPlaylistVideos.slice(0, 15).map((video, index) => ({
        youtubeVideoId: video.videoId,
        playlistId,
        channelId: "UCeVMnSShP_Iviwkknt83cww",
        creatorName: "CodeWithHarry",
        creatorId: "codewithharry",
        subject: "web_development",
        subjectName: "Web Development",
        playlistTitle: "CodeWithHarry Sigma Web Development",
        playlistPosition: index,
        language: "Hindi",
        semester: 1,
        title: video.title,
        verified: true,
        thumbnail: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
        youtubeLink: `https://www.youtube.com/watch?v=${video.videoId}`,
      }))
    );

    global.fetch = async (url) => {
      const urlText = String(url);

      if (urlText.includes("googleapis.com") || urlText.includes("feeds/videos.xml")) {
        return {
          ok: false,
          status: 403,
          statusText: "Forbidden",
          text: async () => "",
        };
      }

      return {
        ok: true,
        text: async () => buildYoutubePlaylistHtml(publicPlaylistVideos),
      };
    };

    const state = await updateVideoLearningState(user, {
      currentSeconds: 10,
      durationSeconds: 660,
      completed: false,
      video: {
        videoId: "public-sigma-15",
        title: "Inline, Internal & External CSS | Sigma Web Development Course - Tutorial #15",
        playlistId,
        playlistTitle: "CodeWithHarry Sigma Web Development",
        playlistPosition: 14,
        channelId: "UCeVMnSShP_Iviwkknt83cww",
        creatorName: "CodeWithHarry",
        creatorId: "codewithharry",
        subject: "react",
        subjectName: "React",
        language: "Hindi",
        youtubeLink: "https://www.youtube.com/watch?v=public-sigma-15",
      },
    });
    const continuation = await getNextPlaylistVideosForState(user, state, { limit: 16 });

    assert.equal(continuation.playlistCompleted, false);
    assert.equal(continuation.nextPlaylistVideos.length, 16);
    assert.equal(continuation.nextPlaylistVideos[0].videoId, "public-sigma-16");
    assert.equal(continuation.nextPlaylistVideos.at(-1).videoId, "public-sigma-31");
    assert.deepEqual(
      continuation.nextPlaylistVideos.map((video) => video.playlistPosition),
      Array.from({ length: 16 }, (_, index) => index + 15)
    );
  });

  it("honors a selected subject even when it is outside the default course roadmap", async () => {
    const user = await User.create({
      name: "Gate Data Structures Student",
      email: "gate-ds@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
      preferences: {
        videoLanguage: "Hindi",
        preferredChannels: ["Gate Smashers"],
        preferredSubjects: ["data_structures"],
      },
    });

    await Video.create({
      youtubeVideoId: "gate-ds-start",
      playlistId: "PLxCzCOWd7aiHqU4HKL7-SITyuSIcD93id",
      channelId: "UCJihyK0A38SZ6SdJirEdIOw",
      creatorName: "Gate Smashers",
      subject: "data_structures",
      subjectName: "Data Structures",
      playlistTitle: "Gate Smashers Data Structures",
      playlistPosition: 0,
      language: "Hindi",
      semester: 3,
      title: "Data Structures Foundations",
      verified: true,
      thumbnail: "https://img.youtube.com/vi/gate-ds-start/hqdefault.jpg",
      youtubeLink: "https://www.youtube.com/watch?v=gate-ds-start",
    });

    global.fetch = async () => {
      throw new Error("The selected subject should use the verified Gate Smashers catalog video.");
    };

    const bundle = await getStudyPlanBundle(user, new Date());
    const task = bundle.plan.tasks[0];

    assert.equal(task.subject, "Data Structures");
    assert.equal(task.videoSubjectTag, "data_structures");
    assert.equal(task.videoChannel, "Gate Smashers");
    assert.equal(task.videoUrl, "https://www.youtube.com/watch?v=gate-ds-start");
  });

  it("keeps a playable curriculum video for every career field when verified imports are empty", async () => {
    global.fetch = async () => ({
      ok: false,
      text: async () => "",
    });

    const courses = [
      "Software Engineering",
      "Machine Learning",
      "Data Science",
      "Artificial Intelligence",
      "Cyber Security",
    ];

    for (const course of courses) {
      const user = await User.create({
        name: `${course} Student`,
        email: `${course.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@example.com`,
        password: "StrongPass1",
        course,
        year: 1,
        emailVerified: true,
        preferences: {
          videoLanguage: "English",
          preferredChannels: [],
          preferredSubjects: [],
        },
      });
      const bundle = await getStudyPlanBundle(user, new Date());
      const task = bundle.plan.tasks[0];

      assert.ok(task.videoUrl.includes("youtube.com/watch?v="), `${course} should keep a watch URL`);
      assert.ok(task.videoEmbedUrl.includes("youtube-nocookie.com/embed/"), `${course} should keep an embed URL`);
      assert.equal(task.relatedVideos.some((video) => video.videoEmbedUrl), true);
    }
  });
});
