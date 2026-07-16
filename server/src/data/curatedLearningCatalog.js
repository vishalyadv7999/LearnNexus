const PLAYLIST_URL_BASE = "https://www.youtube.com/playlist?list=";
const WATCH_URL_BASE = "https://www.youtube.com/watch?v=";

const buildPlaylistUrl = (youtubePlaylistId) =>
  youtubePlaylistId ? `${PLAYLIST_URL_BASE}${youtubePlaylistId}` : "";

const buildWatchUrl = (youtubeVideoId, youtubePlaylistId = "") =>
  youtubeVideoId
    ? `${WATCH_URL_BASE}${youtubeVideoId}${youtubePlaylistId ? `&list=${youtubePlaylistId}` : ""}`
    : "";

const extractPlaylistIdFromUrl = (value = "") => {
  const trimmed = String(value).trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("list") || "";
  } catch (_error) {
    return "";
  }
};

const normalizeCuratedKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");

const CREATOR_IDS = {
  codewithharry: "codewithharry",
  apnaCollege: "apna-college",
  chaiAurCode: "chai-aur-code",
  collegeWallah: "college-wallah",
  sheryians: "sheryians",
  webDevMastery: "web-dev-mastery",
  gateSmashers: "gate-smashers",
  theIScale: "the-iscale",
  greatLearningHindi: "great-learning-hindi",
  edureka: "edureka",
  intellipaat: "intellipaat",
  freeCodeCamp: "freecodecamp",
  traversyMedia: "traversy-media",
  webDevSimplified: "web-dev-simplified",
  statQuest: "statquest",
};

const CREATOR_PLAYLISTS = {
  codewithharry: {
    name: "CodeWithHarry",
    type: "playlist",
    playlistUrl:
      "https://www.youtube.com/watch?v=tVzUXW6siu0&list=PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
    playlistId: "PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w",
    startVideoId: "tVzUXW6siu0",
    startIndex: 0,
  },
  "codewithharry-machine-learning": {
    name: "CodeWithHarry Machine Learning",
    type: "playlist",
    playlistUrl:
      "https://www.youtube.com/watch?v=_u-PaJCpwiU&list=PLu0W_9lII9ai6fAMHp-acBmJONT7Y4BSG",
    playlistId: "PLu0W_9lII9ai6fAMHp-acBmJONT7Y4BSG",
    startVideoId: "_u-PaJCpwiU",
    startIndex: 0,
  },
  "statquest-machine-learning": {
    name: "StatQuest Machine Learning",
    type: "playlist",
    playlistUrl:
      "https://www.youtube.com/watch?v=Gv9_4yMHFhI&list=PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF",
    playlistId: "PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF",
    startVideoId: "Gv9_4yMHFhI",
    startIndex: 0,
  },
  "freecodecamp-artificial-intelligence": {
    name: "freeCodeCamp.org Artificial Intelligence",
    type: "playlist",
    playlistUrl:
      "https://www.youtube.com/watch?v=nYXVvK-Wmn0&list=PLXRgEJhChXxg0pXkq0i-YjVkDK89E2UUd",
    playlistId: "PLXRgEJhChXxg0pXkq0i-YjVkDK89E2UUd",
    startVideoId: "nYXVvK-Wmn0",
    startIndex: 0,
  },
  "apna-college": {
    name: "Apna College",
    type: "playlist",
    playlistUrl:
      "https://www.youtube.com/watch?v=l1EssrLxt7E&list=PLfqMhTWNBTe3H6c9OGXb5_6wcc1Mca52n",
    playlistId: "PLfqMhTWNBTe3H6c9OGXb5_6wcc1Mca52n",
    startVideoId: "l1EssrLxt7E",
    startIndex: 0,
  },
  "chai-aur-code": {
    name: "Chai aur Code",
    type: "playlist",
    playlistUrl:
      "https://www.youtube.com/watch?v=XmLOwJHFHf0&list=PLu71SKxNbfoDBNF5s-WH6aLbthSEIMhMI",
    playlistId: "PLu71SKxNbfoDBNF5s-WH6aLbthSEIMhMI",
    startVideoId: "XmLOwJHFHf0",
    startIndex: 0,
  },
  "college-wallah": {
    name: "College Wallah",
    type: "video",
    videoUrl: "https://www.youtube.com/watch?v=HBqWsrqK89U&t=5s",
    videoId: "HBqWsrqK89U",
    startIndex: 0,
  },
  sheryians: {
    name: "Sheryians Coding School",
    type: "playlist",
    playlistUrl:
      "https://www.youtube.com/watch?v=kkOuRJ69BRY&list=PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn",
    playlistId: "PLbtI3_MArDOk_A-GnYHPOiHSxlK2Vd3Zn",
    startVideoId: "kkOuRJ69BRY",
    startIndex: 0,
  },
  "sheryians-machine-learning": {
    name: "Sheryians Coding School Machine Learning",
    type: "playlist",
    playlistUrl:
      "https://www.youtube.com/watch?v=1L420xXpDTg&list=PLaldQ9PzZd9qT0KsKJ7yCq70iFFP3MFJ5",
    playlistId: "PLaldQ9PzZd9qT0KsKJ7yCq70iFFP3MFJ5",
    startVideoId: "1L420xXpDTg",
    startIndex: 0,
  },
  "web-dev-mastery": {
    name: "Web Dev Mastery",
    type: "playlist",
    playlistUrl:
      "https://www.youtube.com/watch?v=VnksVEsIH1o&list=PL-CeQccLavFeytqS_ALj97JNd4PF4gc1z",
    playlistId: "PL-CeQccLavFeytqS_ALj97JNd4PF4gc1z",
    startVideoId: "VnksVEsIH1o",
    startIndex: 0,
  },
  "traversy-media-software-engineering": {
    name: "Traversy Media Software Engineering",
    type: "playlist",
    playlistUrl:
      "https://www.youtube.com/watch?v=UB1O30fR-EE&list=PLillGF-RfqbYeckUaD1z6nviTp31GLTH8",
    playlistId: "PLillGF-RfqbYeckUaD1z6nviTp31GLTH8",
    startVideoId: "UB1O30fR-EE",
    startIndex: 0,
  },
  "web-dev-simplified-software-engineering": {
    name: "Web Dev Simplified Software Engineering",
    type: "playlist",
    playlistUrl:
      "https://www.youtube.com/watch?v=XlvsJLer_No&list=PLZlA0Gpn_vH8jbFkBjOuFjhxANC63OmXM",
    playlistId: "PLZlA0Gpn_vH8jbFkBjOuFjhxANC63OmXM",
    startVideoId: "XlvsJLer_No",
    startIndex: 0,
  },
};

// WARNING: These playlists are manually curated.
// Do not replace with YouTube search results.
// Update only through the central playlist configuration.
const CURATED_PLAYLIST_MAPPINGS_RAW = [
  {
    category: "Computer Science Core",
    course: "Operating Systems",
    creatorId: CREATOR_IDS.gateSmashers,
    creator: "Gate Smashers",
    language: "Hindi",
    channelId: "UCJihyK0A38SZ6SdJirEdIOw",
    subject: "operating_systems",
    subjectName: "Operating Systems",
    playlistId: "PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
    playlistUrl:
      "https://www.youtube.com/watch?v=bkSWJJZNgf8&list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
    playlistTitle: "Gate Smashers Operating System",
    title: "Gate Smashers Operating System",
    source: "manual-curated",
    semester: 3,
    startVideoId: "bkSWJJZNgf8",
    primaryCreatorPlaylist: true,
    tags: ["operating_systems", "gate_smashers", "hindi"],
  },
  {
    category: "Computer Science Core",
    course: "DBMS",
    creatorId: CREATOR_IDS.gateSmashers,
    creator: "Gate Smashers",
    language: "Hindi",
    channelId: "UCJihyK0A38SZ6SdJirEdIOw",
    subject: "database_management_systems",
    subjectName: "DBMS",
    playlistId: "PLxCzCOWd7aiFAN6I8CuViBuCdJgiOkT2Y",
    playlistUrl: buildPlaylistUrl("PLxCzCOWd7aiFAN6I8CuViBuCdJgiOkT2Y"),
    playlistTitle: "Gate Smashers DBMS",
    title: "Gate Smashers DBMS",
    source: "manual-curated",
    semester: 3,
    tags: ["dbms", "gate_smashers", "hindi"],
  },
  {
    category: "Computer Science Core",
    course: "Computer Networks",
    creatorId: CREATOR_IDS.gateSmashers,
    creator: "Gate Smashers",
    language: "Hindi",
    channelId: "UCJihyK0A38SZ6SdJirEdIOw",
    subject: "computer_networks",
    subjectName: "Computer Networks",
    playlistId: "PLxCzCOWd7aiGFBD2-2joCpWOLUrDLvVV_",
    playlistUrl: buildPlaylistUrl("PLxCzCOWd7aiGFBD2-2joCpWOLUrDLvVV_"),
    playlistTitle: "Gate Smashers Computer Networks",
    title: "Gate Smashers Computer Networks",
    source: "manual-curated",
    semester: 4,
    tags: ["computer_networks", "gate_smashers", "hindi"],
  },
  {
    category: "Computer Science Core",
    course: "Data Structures",
    creatorId: CREATOR_IDS.gateSmashers,
    creator: "Gate Smashers",
    language: "Hindi",
    channelId: "UCJihyK0A38SZ6SdJirEdIOw",
    subject: "data_structures",
    subjectName: "Data Structures",
    playlistId: "PLxCzCOWd7aiHqU4HKL7-SITyuSIcD93id",
    playlistUrl: buildPlaylistUrl("PLxCzCOWd7aiHqU4HKL7-SITyuSIcD93id"),
    playlistTitle: "Gate Smashers Data Structures",
    title: "Gate Smashers Data Structures",
    source: "manual-curated",
    semester: 3,
    tags: ["data_structures", "gate_smashers", "hindi"],
  },
  {
    category: "Web Development",
    course: "Web Development",
    creatorId: CREATOR_IDS.codewithharry,
    creator: "CodeWithHarry",
    aliases: ["code with harry", "codewithharry", "harry"],
    language: "Hindi",
    channelId: "UCeVMnSShP_Iviwkknt83cww",
    subject: "web_development",
    subjectName: "Web Development",
    playlistId: CREATOR_PLAYLISTS.codewithharry.playlistId,
    playlistUrl: CREATOR_PLAYLISTS.codewithharry.playlistUrl,
    playlistTitle: "CodeWithHarry Sigma Web Development",
    title: "CodeWithHarry Sigma Web Development",
    source: "manual-curated",
    semester: 1,
    pathOrder: 10,
    startVideoId: CREATOR_PLAYLISTS.codewithharry.startVideoId,
    startIndex: CREATOR_PLAYLISTS.codewithharry.startIndex,
    primaryCreatorPlaylist: true,
    tags: ["web_development", "full_stack", "sigma", "codewithharry", "hindi"],
  },
  {
    category: "Machine Learning",
    course: "Machine Learning",
    creatorId: CREATOR_IDS.codewithharry,
    creator: "CodeWithHarry",
    aliases: ["code with harry", "codewithharry", "harry"],
    language: "Hindi",
    channelId: "UCeVMnSShP_Iviwkknt83cww",
    subject: "machine_learning",
    subjectName: "Machine Learning",
    playlistId: CREATOR_PLAYLISTS["codewithharry-machine-learning"].playlistId,
    playlistUrl: CREATOR_PLAYLISTS["codewithharry-machine-learning"].playlistUrl,
    playlistTitle: "CodeWithHarry Machine Learning",
    title: "CodeWithHarry Machine Learning",
    source: "manual-curated",
    semester: 3,
    pathOrder: 20,
    startVideoId: CREATOR_PLAYLISTS["codewithharry-machine-learning"].startVideoId,
    startIndex: CREATOR_PLAYLISTS["codewithharry-machine-learning"].startIndex,
    primaryCreatorPlaylist: false,
    creatorRoadmapId: "codewithharry-ml-roadmap",
    creatorRoadmapOrder: 20,
    tags: ["machine_learning", "python", "codewithharry", "hindi"],
  },
  {
    category: "Machine Learning",
    course: "Machine Learning",
    creatorId: CREATOR_IDS.statQuest,
    creator: "StatQuest",
    aliases: ["StatQuest", "StatQuestVerified", "StatQuest with Josh Starmer"],
    language: "English",
    channelId: "UCtYLUTtgS3k1Fg4y5tAhLbw",
    subject: "machine_learning",
    subjectName: "Machine Learning",
    playlistId: CREATOR_PLAYLISTS["statquest-machine-learning"].playlistId,
    playlistUrl: CREATOR_PLAYLISTS["statquest-machine-learning"].playlistUrl,
    playlistTitle: "StatQuest Machine Learning",
    title: "StatQuest Machine Learning",
    source: "manual-curated",
    semester: 3,
    pathOrder: 30,
    startVideoId: CREATOR_PLAYLISTS["statquest-machine-learning"].startVideoId,
    startIndex: CREATOR_PLAYLISTS["statquest-machine-learning"].startIndex,
    primaryCreatorPlaylist: true,
    tags: ["machine_learning", "statquest", "english"],
  },
  {
    category: "Artificial Intelligence",
    course: "Artificial Intelligence",
    creatorId: CREATOR_IDS.freeCodeCamp,
    creator: "freeCodeCamp.org",
    aliases: ["freeCodeCamp", "freeCodeCamp.org", "freeCodeCamp.orgVerified"],
    language: "English",
    channelId: "UC8butISFwT-Wl7EV0hUK0BQ",
    subject: "artificial_intelligence",
    subjectName: "Artificial Intelligence",
    playlistId: CREATOR_PLAYLISTS["freecodecamp-artificial-intelligence"].playlistId,
    playlistUrl: CREATOR_PLAYLISTS["freecodecamp-artificial-intelligence"].playlistUrl,
    playlistTitle: "freeCodeCamp.org Artificial Intelligence",
    title: "freeCodeCamp.org Artificial Intelligence",
    source: "manual-curated",
    semester: 1,
    pathOrder: 40,
    startVideoId: CREATOR_PLAYLISTS["freecodecamp-artificial-intelligence"].startVideoId,
    startIndex: CREATOR_PLAYLISTS["freecodecamp-artificial-intelligence"].startIndex,
    primaryCreatorPlaylist: true,
    tags: ["artificial_intelligence", "ai", "freecodecamp", "english"],
  },
  {
    category: "Web Development",
    course: "Web Development",
    creatorId: CREATOR_IDS.apnaCollege,
    creator: "Apna College",
    aliases: ["apna college"],
    language: "Hindi",
    channelId: "UCBwmMxybNva6P_5VmxjzwqA",
    subject: "web_development",
    subjectName: "Web Development",
    playlistId: CREATOR_PLAYLISTS["apna-college"].playlistId,
    playlistUrl: CREATOR_PLAYLISTS["apna-college"].playlistUrl,
    playlistTitle: "Apna College Web Development",
    title: "Apna College Web Development",
    source: "manual-curated",
    semester: 1,
    pathOrder: 10,
    startVideoId: CREATOR_PLAYLISTS["apna-college"].startVideoId,
    startIndex: CREATOR_PLAYLISTS["apna-college"].startIndex,
    primaryCreatorPlaylist: true,
    tags: ["web_development", "full_stack", "apna_college", "hindi"],
  },
  {
    category: "Web Development",
    course: "Web Development",
    creatorId: "bro-code",
    creator: "Bro Code",
    aliases: ["bro code", "brocode"],
    language: "English",
    channelId: "UC4SVo0Ue36XCfOyb5Lh1viQ",
    subject: "web_development",
    subjectName: "Web Development",
    playlistId: "PLZPZq0r_RZOPP5Yjt6IqgytMRY5uLt4y3",
    playlistUrl:
      "https://www.youtube.com/watch?v=HGTJBPNC-Gw&list=PLZPZq0r_RZOPP5Yjt6IqgytMRY5uLt4y3",
    playlistTitle: "Bro Code HTML and CSS",
    title: "Bro Code Web Development",
    source: "manual-curated",
    semester: 1,
    pathOrder: 10,
    startVideoId: "HGTJBPNC-Gw",
    tags: ["web_development", "full_stack", "bro_code", "english"],
  },
  {
    category: "Web Development",
    course: "HTML",
    creatorId: CREATOR_IDS.chaiAurCode,
    creator: "Chai aur Code",
    aliases: ["chai aur code", "chaiaurcode"],
    language: "Hindi",
    channelId: "UCNQ6FEtztATuaVhZKCY28Yw",
    subject: "web_development",
    subjectName: "Web Development",
    playlistId: CREATOR_PLAYLISTS["chai-aur-code"].playlistId,
    playlistUrl: CREATOR_PLAYLISTS["chai-aur-code"].playlistUrl,
    playlistTitle: "Chai aur Code HTML",
    title: "Chai aur Code HTML",
    source: "manual-curated",
    semester: 1,
    pathOrder: 10,
    startVideoId: CREATOR_PLAYLISTS["chai-aur-code"].startVideoId,
    startIndex: CREATOR_PLAYLISTS["chai-aur-code"].startIndex,
    primaryCreatorPlaylist: true,
    creatorRoadmapId: "chai-aur-code-web-roadmap",
    creatorRoadmapOrder: 10,
    tags: ["html", "web_development", "chai_aur_code", "hindi"],
  },
  {
    category: "Web Development",
    course: "JavaScript",
    creatorId: CREATOR_IDS.chaiAurCode,
    creator: "Chai aur Code",
    aliases: ["chai aur code", "chaiaurcode"],
    language: "Hindi",
    channelId: "UCNQ6FEtztATuaVhZKCY28Yw",
    subject: "javascript",
    subjectName: "JavaScript",
    playlistId: "PLu71SKxNbfoBuX3f4EOACle2y-tRC5Q37",
    playlistUrl:
      "https://www.youtube.com/watch?v=Hr5iLG7sUa0&list=PLu71SKxNbfoBuX3f4EOACle2y-tRC5Q37",
    playlistTitle: "Chai aur Code JavaScript",
    title: "Chai aur Code JavaScript",
    source: "manual-curated",
    semester: 1,
    pathOrder: 20,
    startVideoId: "Hr5iLG7sUa0",
    primaryCreatorPlaylist: false,
    creatorRoadmapId: "chai-aur-code-web-roadmap",
    creatorRoadmapOrder: 30,
    tags: ["javascript", "chai_aur_code", "hindi"],
  },
  {
    category: "Web Development",
    course: "React",
    creatorId: CREATOR_IDS.chaiAurCode,
    creator: "Chai aur Code",
    aliases: ["chai aur code", "chaiaurcode"],
    language: "Hindi",
    channelId: "UCNQ6FEtztATuaVhZKCY28Yw",
    subject: "react",
    subjectName: "React",
    playlistId: "PLu71SKxNbfoBGh_8p_NS-ZAh6v7HhYqHW",
    playlistUrl:
      "https://www.youtube.com/watch?v=EH3vGeqeIAo&list=PLu71SKxNbfoBGh_8p_NS-ZAh6v7HhYqHW",
    playlistTitle: "Chai aur Code React",
    title: "Chai aur Code React",
    source: "manual-curated",
    semester: 1,
    pathOrder: 30,
    startVideoId: "EH3vGeqeIAo",
    primaryCreatorPlaylist: false,
    tags: ["react", "chai_aur_code", "hindi"],
  },
  {
    category: "Web Development",
    course: "Backend Development",
    creatorId: CREATOR_IDS.chaiAurCode,
    creator: "Chai aur Code",
    aliases: ["chai aur code", "chaiaurcode"],
    language: "Hindi",
    channelId: "UCNQ6FEtztATuaVhZKCY28Yw",
    subject: "web_development",
    subjectName: "Web Development",
    playlistId: "PLu71SKxNbfoDqgPchmvIsL4hTnJIrtige",
    playlistUrl:
      "https://www.youtube.com/watch?v=vz1RlUyrc3w&list=PLu71SKxNbfoDqgPchmvIsL4hTnJIrtige",
    playlistTitle: "Chai aur Code Backend Development",
    title: "Chai aur Code Backend Development",
    source: "manual-curated",
    semester: 1,
    pathOrder: 40,
    startVideoId: "vz1RlUyrc3w",
    primaryCreatorPlaylist: false,
    tags: ["backend_development", "node", "express", "chai_aur_code", "hindi"],
  },
  {
    category: "Web Development",
    course: "Web Development",
    creatorId: CREATOR_IDS.sheryians,
    creator: "Sheryians Coding School",
    aliases: [
      "sheryians",
      "sheryians coding school",
      "sheriyans",
      "sheriyans coding school",
    ],
    language: "Hindi",
    channelId: "UCc7gpqMnnOSbU_F2-5MVVZw",
    subject: "web_development",
    subjectName: "Web Development",
    playlistId: CREATOR_PLAYLISTS.sheryians.playlistId,
    playlistUrl: CREATOR_PLAYLISTS.sheryians.playlistUrl,
    playlistTitle: "Sheryians Coding School Web Development",
    title: "Sheryians Coding School Web Development",
    source: "manual-curated",
    semester: 1,
    pathOrder: 10,
    startVideoId: CREATOR_PLAYLISTS.sheryians.startVideoId,
    startIndex: CREATOR_PLAYLISTS.sheryians.startIndex,
    primaryCreatorPlaylist: true,
    tags: ["web_development", "full_stack", "sheryians", "hindi"],
  },
  {
    category: "Software Engineering",
    course: "Software Engineering",
    creatorId: CREATOR_IDS.sheryians,
    creator: "Sheryians Coding School",
    aliases: [
      "sheryians",
      "sheryians coding school",
      "sheriyans",
      "sheriyans coding school",
      "shreyian coding school",
    ],
    language: "Hindi",
    channelId: "UCc7gpqMnnOSbU_F2-5MVVZw",
    subject: "software_engineering",
    subjectName: "Software Engineering",
    playlistId: CREATOR_PLAYLISTS.sheryians.playlistId,
    playlistUrl: CREATOR_PLAYLISTS.sheryians.playlistUrl,
    playlistTitle: "Sheryians Coding School Software Engineering",
    title: "Sheryians Coding School Software Engineering",
    source: "manual-curated",
    semester: 1,
    pathOrder: 10,
    startVideoId: CREATOR_PLAYLISTS.sheryians.startVideoId,
    startIndex: CREATOR_PLAYLISTS.sheryians.startIndex,
    primaryCreatorPlaylist: true,
    tags: ["software_engineering", "web_development", "full_stack", "sheryians", "hindi"],
  },
  {
    category: "Software Engineering",
    course: "Software Engineering",
    creatorId: CREATOR_IDS.webDevMastery,
    creator: "Web Dev Mastery",
    aliases: ["web dev mastery", "webdevmastery"],
    language: "Hindi",
    channelId: "UCQVE2WU-h_dszY5If6oFvFg",
    subject: "software_engineering",
    subjectName: "Software Engineering",
    playlistId: CREATOR_PLAYLISTS["web-dev-mastery"].playlistId,
    playlistUrl: CREATOR_PLAYLISTS["web-dev-mastery"].playlistUrl,
    playlistTitle: "Web Dev Mastery Full Stack Web Development",
    title: "Web Dev Mastery Software Engineering",
    source: "manual-curated",
    semester: 1,
    pathOrder: 20,
    startVideoId: CREATOR_PLAYLISTS["web-dev-mastery"].startVideoId,
    startIndex: CREATOR_PLAYLISTS["web-dev-mastery"].startIndex,
    primaryCreatorPlaylist: true,
    tags: [
      "software_engineering",
      "web_development",
      "full_stack",
      "mern",
      "web_dev_mastery",
      "hindi",
    ],
  },
  {
    category: "Software Engineering",
    course: "Software Engineering",
    creatorId: CREATOR_IDS.traversyMedia,
    creator: "Traversy Media",
    aliases: ["Traversy Media", "Traversy MediaVerified"],
    language: "English",
    channelId: "UC29ju8bIPH5as8OGnQzwJyA",
    subject: "software_engineering",
    subjectName: "Software Engineering",
    playlistId: CREATOR_PLAYLISTS["traversy-media-software-engineering"].playlistId,
    playlistUrl: CREATOR_PLAYLISTS["traversy-media-software-engineering"].playlistUrl,
    playlistTitle: "Traversy Media Software Engineering",
    title: "Traversy Media Software Engineering",
    source: "manual-curated",
    semester: 1,
    pathOrder: 30,
    startVideoId: CREATOR_PLAYLISTS["traversy-media-software-engineering"].startVideoId,
    startIndex: CREATOR_PLAYLISTS["traversy-media-software-engineering"].startIndex,
    primaryCreatorPlaylist: true,
    tags: ["software_engineering", "traversy_media", "english"],
  },
  {
    category: "Software Engineering",
    course: "Software Engineering",
    creatorId: CREATOR_IDS.webDevSimplified,
    creator: "Web Dev Simplified",
    aliases: ["Web Dev Simplified", "Web Dev SimplifiedVerified"],
    language: "English",
    channelId: "UCFbNIlppjAuEX4znoulh0Cw",
    subject: "software_engineering",
    subjectName: "Software Engineering",
    playlistId: CREATOR_PLAYLISTS["web-dev-simplified-software-engineering"].playlistId,
    playlistUrl: CREATOR_PLAYLISTS["web-dev-simplified-software-engineering"].playlistUrl,
    playlistTitle: "Web Dev Simplified Software Engineering",
    title: "Web Dev Simplified Software Engineering",
    source: "manual-curated",
    semester: 1,
    pathOrder: 40,
    startVideoId: CREATOR_PLAYLISTS["web-dev-simplified-software-engineering"].startVideoId,
    startIndex: CREATOR_PLAYLISTS["web-dev-simplified-software-engineering"].startIndex,
    primaryCreatorPlaylist: true,
    tags: ["software_engineering", "web_dev_simplified", "english"],
  },
  {
    category: "Machine Learning",
    course: "Machine Learning",
    creatorId: CREATOR_IDS.sheryians,
    creator: "Sheryians Coding School",
    aliases: [
      "sheryians",
      "sheryians coding school",
      "sheriyans",
      "sheriyans coding school",
      "shreyian coding school",
    ],
    language: "Hindi",
    channelId: "UCc7gpqMnnOSbU_F2-5MVVZw",
    subject: "machine_learning",
    subjectName: "Machine Learning",
    playlistId: CREATOR_PLAYLISTS["sheryians-machine-learning"].playlistId,
    playlistUrl: CREATOR_PLAYLISTS["sheryians-machine-learning"].playlistUrl,
    playlistTitle: "Sheryians Coding School Machine Learning",
    title: "Sheryians Coding School Machine Learning",
    source: "manual-curated",
    semester: 3,
    pathOrder: 10,
    startVideoId: CREATOR_PLAYLISTS["sheryians-machine-learning"].startVideoId,
    startIndex: CREATOR_PLAYLISTS["sheryians-machine-learning"].startIndex,
    primaryCreatorPlaylist: true,
    tags: ["machine_learning", "sheryians", "hindi"],
  },
  {
    category: "Web Development",
    course: "DevOps",
    creatorId: CREATOR_IDS.chaiAurCode,
    creator: "Chai aur Code",
    aliases: ["chai aur code", "chaiaurcode"],
    language: "Hindi",
    channelId: "UCNQ6FEtztATuaVhZKCY28Yw",
    subject: "software_engineering",
    subjectName: "Software Engineering",
    playlistId: "PLu71SKxNbfoBAaWGtn9GA2PTw0HO0tXzq",
    playlistUrl:
      "https://www.youtube.com/watch?v=OgS1ZWZItno&list=PLu71SKxNbfoBAaWGtn9GA2PTw0HO0tXzq",
    playlistTitle: "Chai aur Code DevOps",
    title: "Chai aur Code DevOps",
    source: "manual-curated",
    semester: 1,
    pathOrder: 50,
    startVideoId: "OgS1ZWZItno",
    primaryCreatorPlaylist: false,
    tags: ["devops", "software_engineering", "chai_aur_code", "hindi"],
  },
];

const CURATED_VIDEO_FALLBACKS_RAW = [
  {
    category: "Machine Learning",
    course: "Machine Learning",
    creatorId: CREATOR_IDS.codewithharry,
    creator: "CodeWithHarry",
    aliases: ["code with harry", "codewithharry", "harry"],
    language: "Hindi",
    channelId: "UCeVMnSShP_Iviwkknt83cww",
    subject: "machine_learning",
    subjectName: "Machine Learning",
    youtubeVideoId: "UrsmFxEIp5k",
    youtubeLink: "https://www.youtube.com/watch?v=UrsmFxEIp5k",
    title: "CodeWithHarry Python for Machine Learning",
    source: "manual-curated",
    startIndex: 0,
    creatorRoadmapId: "codewithharry-ml-roadmap",
    creatorRoadmapOrder: 10,
    tags: ["machine_learning", "python", "codewithharry", "hindi"],
  },
  {
    category: "Machine Learning",
    course: "Machine Learning",
    creatorId: CREATOR_IDS.freeCodeCamp,
    creator: "freeCodeCamp.org",
    aliases: ["freeCodeCamp", "freeCodeCamp.org", "freeCodeCamp.orgVerified"],
    language: "English",
    channelId: "UC8butISFwT-Wl7EV0hUK0BQ",
    subject: "machine_learning",
    subjectName: "Machine Learning",
    youtubeVideoId: "i_LwzRVP7bg",
    youtubeLink: buildWatchUrl("i_LwzRVP7bg"),
    title: "freeCodeCamp.org Machine Learning",
    source: "manual-curated",
    manualReviewRequired: true,
    reviewNote:
      "User-provided Machine Learning creator video. Keep this standalone video mapped to freeCodeCamp.org until an official playlist URL is provided.",
    tags: ["machine_learning", "freecodecamp", "english"],
  },
  {
    category: "Data Science",
    course: "Data Science",
    creatorId: CREATOR_IDS.freeCodeCamp,
    creator: "freeCodeCamp.org",
    aliases: ["freeCodeCamp", "freeCodeCamp.org", "freeCodeCamp.orgVerified"],
    language: "English",
    channelId: "UC8butISFwT-Wl7EV0hUK0BQ",
    subject: "data_science",
    subjectName: "Data Science",
    youtubeVideoId: "XU5pw3QRYjQ",
    youtubeLink: buildWatchUrl("XU5pw3QRYjQ"),
    title: "freeCodeCamp.org Data Science",
    source: "manual-curated",
    manualReviewRequired: true,
    reviewNote:
      "User-provided Data Science creator video. Keep this standalone video mapped to freeCodeCamp.org until an official playlist URL is provided.",
    tags: ["data_science", "freecodecamp", "english"],
  },
  {
    category: "Data Science",
    course: "Data Science",
    creatorId: CREATOR_IDS.statQuest,
    creator: "StatQuest",
    aliases: ["StatQuest", "StatQuestVerified", "StatQuest with Josh Starmer"],
    language: "English",
    channelId: "UCtYLUTtgS3k1Fg4y5tAhLbw",
    subject: "data_science",
    subjectName: "Data Science",
    youtubeVideoId: "ilUbD7EoQnk",
    youtubeLink: buildWatchUrl("ilUbD7EoQnk"),
    title: "StatQuest Data Science",
    source: "manual-curated",
    manualReviewRequired: true,
    reviewNote:
      "User-provided Data Science creator video. Keep this standalone video mapped to StatQuest until an official playlist URL is provided.",
    tags: ["data_science", "statquest", "english"],
  },
  {
    category: "Software Engineering",
    course: "Software Engineering",
    creatorId: CREATOR_IDS.freeCodeCamp,
    creator: "freeCodeCamp.org",
    aliases: ["freeCodeCamp", "freeCodeCamp.org", "freeCodeCamp.orgVerified"],
    language: "English",
    channelId: "UC8butISFwT-Wl7EV0hUK0BQ",
    subject: "software_engineering",
    subjectName: "Software Engineering",
    youtubeVideoId: "dX8396ZmSPk",
    youtubeLink: buildWatchUrl("dX8396ZmSPk"),
    title: "freeCodeCamp.org Software Engineering",
    source: "manual-curated",
    manualReviewRequired: true,
    reviewNote:
      "User-provided Software Engineering creator video. Keep this standalone video mapped to freeCodeCamp.org until an official playlist URL is provided.",
    tags: ["software_engineering", "freecodecamp", "english"],
  },
  {
    category: "Cyber Security",
    course: "Cyber Security",
    creatorId: "wscube-cyber-security",
    creator: "WsCube Cyber Security",
    aliases: ["WsCube Cyber Security", "Wscube Cyber Security", "WsCube Cyber SecurityVerified"],
    language: "Hindi",
    channelId: "UC9ESQKs98jVWjjUEWkvTMvA",
    subject: "cyber_security",
    subjectName: "Cyber Security",
    youtubeVideoId: "yywMI4pQbbc",
    youtubeLink: "https://www.youtube.com/watch?v=yywMI4pQbbc&list=PLwO5-rumi8A7RnPxB6Zx0wKFjFy75hCQs",
    title: "Ethical Hacking Full Course: Beginner to Pro in Hindi",
    source: "manual-curated",
    tags: ["cyber_security", "ethical_hacking", "wscube_tech", "hindi"],
  },
  {
    category: "Cyber Security",
    course: "Cyber Security",
    creatorId: CREATOR_IDS.greatLearningHindi,
    creator: "Great Learning",
    aliases: ["Great Learning", "Great Learning Hindi", "Great LearningVerified"],
    language: "Hindi",
    channelId: "UCObs0kLIrDjX2LLSybqNaEA",
    subject: "cyber_security",
    subjectName: "Cyber Security",
    youtubeVideoId: "fd0L1IousZU",
    youtubeLink: "https://www.youtube.com/watch?v=fd0L1IousZU&list=PLlgLmuG_Kgba6K93PuVuf9aP_UFnm7mCl",
    title: "Great Learning Cyber Security",
    source: "manual-curated",
    manualReviewRequired: true,
    reviewNote:
      "User-provided Cyber Security creator video. Keep this standalone video mapped to Great Learning until an official playlist URL is provided.",
    tags: ["cyber_security", "great_learning", "hindi"],
  },
  {
    category: "Artificial Intelligence",
    course: "Artificial Intelligence",
    creatorId: CREATOR_IDS.theIScale,
    creator: "The iScale",
    aliases: ["The iScale", "iScale"],
    language: "Hindi",
    channelId: "the-iscale",
    subject: "artificial_intelligence",
    subjectName: "Artificial Intelligence",
    youtubeVideoId: "68FcZUpgC7w",
    youtubeLink: "https://www.youtube.com/watch?v=68FcZUpgC7w&t=3s",
    title: "The iScale Artificial Intelligence",
    source: "manual-curated",
    manualReviewRequired: true,
    reviewNote:
      "User-provided Artificial Intelligence creator video. Keep this standalone video mapped to The iScale until an official playlist URL is provided.",
    tags: ["artificial_intelligence", "ai", "the_iscale", "hindi"],
  },
  {
    category: "Artificial Intelligence",
    course: "Artificial Intelligence",
    creatorId: CREATOR_IDS.greatLearningHindi,
    creator: "Great Learning",
    aliases: ["Great Learning", "Great Learning Hindi", "Great LearningVerified"],
    language: "Hindi",
    channelId: "UCObs0kLIrDjX2LLSybqNaEA",
    subject: "artificial_intelligence",
    subjectName: "Artificial Intelligence",
    youtubeVideoId: "T0r3hhFaA1k",
    youtubeLink: buildWatchUrl("T0r3hhFaA1k"),
    title: "Great Learning Artificial Intelligence",
    source: "manual-curated",
    manualReviewRequired: true,
    reviewNote:
      "User-provided Artificial Intelligence creator video. Keep this standalone video mapped to Great Learning until an official playlist URL is provided.",
    tags: ["artificial_intelligence", "ai", "great_learning", "hindi"],
  },
  {
    category: "Artificial Intelligence",
    course: "Artificial Intelligence",
    creatorId: CREATOR_IDS.edureka,
    creator: "edureka!",
    aliases: ["edureka!", "edureka", "edurekaIN"],
    language: "English",
    channelId: "@edurekaIN",
    subject: "artificial_intelligence",
    subjectName: "Artificial Intelligence",
    youtubeVideoId: "JMUxmLyrhSk",
    youtubeLink: buildWatchUrl("JMUxmLyrhSk"),
    title: "edureka! Artificial Intelligence",
    source: "manual-curated",
    manualReviewRequired: true,
    reviewNote:
      "User-provided Artificial Intelligence creator video. Keep this standalone video mapped to edureka! until an official playlist URL is provided.",
    tags: ["artificial_intelligence", "ai", "edureka", "english"],
  },
  {
    category: "Artificial Intelligence",
    course: "Artificial Intelligence",
    creatorId: CREATOR_IDS.intellipaat,
    creator: "Intellipaat",
    aliases: ["Intellipaat"],
    language: "English",
    channelId: "@Intellipaat",
    subject: "artificial_intelligence",
    subjectName: "Artificial Intelligence",
    youtubeVideoId: "9tbaiFIm0HU",
    youtubeLink: buildWatchUrl("9tbaiFIm0HU"),
    title: "Intellipaat Artificial Intelligence",
    source: "manual-curated",
    manualReviewRequired: true,
    reviewNote:
      "User-provided Artificial Intelligence creator video. Keep this standalone video mapped to Intellipaat until an official playlist URL is provided.",
    tags: ["artificial_intelligence", "ai", "intellipaat", "english"],
  },
  {
    category: "Artificial Intelligence",
    course: "Artificial Intelligence",
    creatorId: CREATOR_IDS.edureka,
    creator: "edureka!",
    aliases: ["edureka!", "edureka", "edurekaIN"],
    language: "Hindi",
    channelId: "@edurekaIN",
    subject: "artificial_intelligence",
    subjectName: "Artificial Intelligence",
    youtubeVideoId: "JMUxmLyrhSk",
    youtubeLink: buildWatchUrl("JMUxmLyrhSk"),
    title: "edureka! Artificial Intelligence",
    source: "manual-curated",
    manualReviewRequired: true,
    reviewNote:
      "User-provided Artificial Intelligence creator video. Keep this standalone video mapped to edureka! for Hindi AI setup until an official playlist URL is provided.",
    tags: ["artificial_intelligence", "ai", "edureka", "hindi"],
  },
  {
    category: "Artificial Intelligence",
    course: "Artificial Intelligence",
    creatorId: CREATOR_IDS.intellipaat,
    creator: "Intellipaat",
    aliases: ["Intellipaat"],
    language: "Hindi",
    channelId: "@Intellipaat",
    subject: "artificial_intelligence",
    subjectName: "Artificial Intelligence",
    youtubeVideoId: "9tbaiFIm0HU",
    youtubeLink: buildWatchUrl("9tbaiFIm0HU"),
    title: "Intellipaat Artificial Intelligence",
    source: "manual-curated",
    manualReviewRequired: true,
    reviewNote:
      "User-provided Artificial Intelligence creator video. Keep this standalone video mapped to Intellipaat for Hindi AI setup until an official playlist URL is provided.",
    tags: ["artificial_intelligence", "ai", "intellipaat", "hindi"],
  },
  {
    category: "Web Development",
    course: "Web Development",
    creatorId: CREATOR_IDS.collegeWallah,
    creator: "College Wallah",
    aliases: ["college wallah", "collegewallah"],
    language: "Hindi",
    channelId: "UCDrf0V4fcBr5FlCtKwvpfwA",
    subject: "web_development",
    subjectName: "Web Development",
    youtubeVideoId: CREATOR_PLAYLISTS["college-wallah"].videoId,
    youtubeLink: CREATOR_PLAYLISTS["college-wallah"].videoUrl,
    title: "College Wallah Web Development",
    source: "manual-curated",
    startIndex: CREATOR_PLAYLISTS["college-wallah"].startIndex,
    creatorRoadmapId: "college-wallah-web-roadmap",
    creatorRoadmapOrder: 10,
    manualReviewRequired: true,
    reviewNote:
      "The provided College Wallah URL is a standalone watch link with no playlist ID. Keep it as a protected manual-review entry until an official playlist URL is confirmed.",
    tags: ["web_development", "college_wallah", "hindi"],
  },
  {
    category: "Web Development",
    course: "Web Development",
    creatorId: CREATOR_IDS.collegeWallah,
    creator: "College Wallah",
    aliases: ["college wallah", "collegewallah"],
    language: "Hindi",
    channelId: "UCDrf0V4fcBr5FlCtKwvpfwA",
    subject: "web_development",
    subjectName: "Web Development",
    youtubeVideoId: "427pAhy9dI8",
    youtubeLink: "https://www.youtube.com/watch?v=427pAhy9dI8&t=1598s",
    title: "College Wallah Web Development - Next Lesson",
    source: "manual-curated",
    startIndex: 1,
    creatorRoadmapId: "college-wallah-web-roadmap",
    creatorRoadmapOrder: 20,
    manualReviewRequired: true,
    reviewNote:
      "User-provided College Wallah follow-up video. Keep it as the next standalone recommendation after HBqWsrqK89U.",
    tags: ["web_development", "college_wallah", "hindi"],
  },
];

const validateLanguage = (language) => language === "Hindi" || language === "English";

const validateCuratedPlaylistMapping = (mapping, index) => {
  const requiredFields = [
    ["category", mapping.category],
    ["course", mapping.course],
    ["creatorId", mapping.creatorId],
    ["creator", mapping.creator],
    ["language", mapping.language],
    ["channelId", mapping.channelId],
    ["subject", mapping.subject],
    ["subjectName", mapping.subjectName],
    ["playlistUrl", mapping.playlistUrl],
    ["source", mapping.source],
  ];

  requiredFields.forEach(([field, value]) => {
    if (!String(value || "").trim()) {
      throw new Error(`Curated playlist mapping ${index + 1} is missing ${field}.`);
    }
  });

  if (!validateLanguage(mapping.language)) {
    throw new Error(
      `Curated playlist mapping ${mapping.creator} / ${mapping.course} has invalid language ${mapping.language}.`
    );
  }

  const playlistIdFromUrl = extractPlaylistIdFromUrl(mapping.playlistUrl);
  const explicitPlaylistId = String(mapping.playlistId || "").trim();
  const resolvedPlaylistId = explicitPlaylistId || playlistIdFromUrl;

  if (!resolvedPlaylistId) {
    throw new Error(
      `Curated playlist mapping ${mapping.creator} / ${mapping.course} must include a valid playlist ID.`
    );
  }

  if (explicitPlaylistId && playlistIdFromUrl && explicitPlaylistId !== playlistIdFromUrl) {
    throw new Error(
      `Curated playlist mapping ${mapping.creator} / ${mapping.course} has mismatched playlist IDs.`
    );
  }
};

const matchesCreator = (mapping, creator) => {
  const selectedCreatorKey = normalizeCuratedKey(creator);

  return (
    normalizeCuratedKey(mapping.creator) === selectedCreatorKey ||
    mapping.aliases?.some((alias) => normalizeCuratedKey(alias) === selectedCreatorKey)
  );
};

const matchesCourse = (mapping, course) =>
  normalizeCuratedKey(mapping.course) === normalizeCuratedKey(course);

const findCuratedMapping = ({ creator, course, language } = {}) =>
  CURATED_PLAYLIST_MAPPINGS.find(
    (mapping) =>
      matchesCreator(mapping, creator) &&
      matchesCourse(mapping, course) &&
      (!language || mapping.language === language)
  ) ||
  CURATED_VIDEO_FALLBACKS.find(
    (video) =>
      matchesCreator(video, creator) &&
      matchesCourse(video, course) &&
      (!language || video.language === language)
  ) ||
  null;

const validateCuratedVideoFallback = (video, index) => {
  const requiredFields = [
    ["category", video.category],
    ["course", video.course],
    ["creatorId", video.creatorId],
    ["creator", video.creator],
    ["language", video.language],
    ["channelId", video.channelId],
    ["subject", video.subject],
    ["subjectName", video.subjectName],
    ["youtubeVideoId", video.youtubeVideoId],
    ["youtubeLink", video.youtubeLink],
    ["source", video.source],
  ];

  requiredFields.forEach(([field, value]) => {
    if (!String(value || "").trim()) {
      throw new Error(`Curated fallback video ${index + 1} is missing ${field}.`);
    }
  });

  if (!validateLanguage(video.language)) {
    throw new Error(
      `Curated fallback video ${video.creator} / ${video.course} has invalid language ${video.language}.`
    );
  }
};

const validateNoDuplicateMappings = (mappings) => {
  const seen = new Set();

  mappings.forEach((mapping) => {
    const key = [
      mapping.course,
      mapping.creator,
      mapping.language,
      mapping.playlistId || mapping.youtubeVideoId,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|");

    if (seen.has(key)) {
      throw new Error(`Duplicate curated mapping detected for ${mapping.creator} / ${mapping.course}.`);
    }

    seen.add(key);
  });
};

CURATED_PLAYLIST_MAPPINGS_RAW.forEach(validateCuratedPlaylistMapping);
CURATED_VIDEO_FALLBACKS_RAW.forEach(validateCuratedVideoFallback);
validateNoDuplicateMappings([
  ...CURATED_PLAYLIST_MAPPINGS_RAW,
  ...CURATED_VIDEO_FALLBACKS_RAW,
]);

const CURATED_PLAYLIST_MAPPINGS = CURATED_PLAYLIST_MAPPINGS_RAW.map((mapping) => {
  const playlistId = String(mapping.playlistId || "").trim() || extractPlaylistIdFromUrl(mapping.playlistUrl);

  return {
    ...mapping,
    playlistId,
    youtubePlaylistId: playlistId,
    playlistUrl: mapping.playlistUrl,
  };
});

const CURATED_PLAYLISTS = CURATED_PLAYLIST_MAPPINGS.map((mapping) => ({
  category: mapping.category,
  course: mapping.course,
  creatorId: mapping.creatorId,
  youtubePlaylistId: mapping.playlistId,
  playlistId: mapping.playlistId,
  playlistUrl: mapping.playlistUrl,
  youtubeLink: mapping.playlistUrl,
  channelId: mapping.channelId,
  creatorName: mapping.creator,
  channelName: mapping.creator,
  aliases: mapping.aliases || [],
  subject: mapping.subject,
  subjectName: mapping.subjectName,
  title: mapping.title || `${mapping.creator} ${mapping.course}`,
  playlistTitle: mapping.playlistTitle || mapping.title || `${mapping.creator} ${mapping.course}`,
  language: mapping.language,
  semester: mapping.semester,
  source: mapping.source,
  tags: mapping.tags || [],
  pathOrder: mapping.pathOrder,
  startVideoId: mapping.startVideoId,
  startIndex: Number.isFinite(Number(mapping.startIndex)) ? Number(mapping.startIndex) : 0,
  primaryCreatorPlaylist: mapping.primaryCreatorPlaylist !== false,
  creatorRoadmapId: mapping.creatorRoadmapId || "",
  creatorRoadmapOrder: Number.isFinite(Number(mapping.creatorRoadmapOrder))
    ? Number(mapping.creatorRoadmapOrder)
    : undefined,
}));

const CURATED_VIDEO_FALLBACKS = CURATED_VIDEO_FALLBACKS_RAW.map((video) => ({
  ...video,
  channelName: video.creator,
  creatorName: video.creator,
  aliases: video.aliases || [],
}));

const CURATED_VIDEOS = CURATED_VIDEO_FALLBACKS.map((video) => ({
  category: video.category,
  course: video.course,
  creatorId: video.creatorId,
  youtubeVideoId: video.youtubeVideoId,
  youtubeLink: video.youtubeLink || buildWatchUrl(video.youtubeVideoId),
  channelId: video.channelId,
  creatorName: video.creator,
  channelName: video.creator,
  aliases: video.aliases || [],
  subject: video.subject,
  subjectName: video.subjectName,
  title: video.title,
  language: video.language,
  semester: video.semester,
  source: video.source,
  startIndex: Number.isFinite(Number(video.startIndex)) ? Number(video.startIndex) : 0,
  creatorRoadmapId: video.creatorRoadmapId || "",
  creatorRoadmapOrder: Number.isFinite(Number(video.creatorRoadmapOrder))
    ? Number(video.creatorRoadmapOrder)
    : undefined,
  tags: video.tags || [],
  manualReviewRequired: video.manualReviewRequired === true,
  reviewNote: video.reviewNote || "",
}));

const REQUIRED_CREATOR_PLAYLIST_MAPPINGS = [
  ...CURATED_PLAYLISTS.filter(
    (playlist) =>
      playlist.primaryCreatorPlaylist &&
      Object.prototype.hasOwnProperty.call(CREATOR_PLAYLISTS, playlist.creatorId)
  ),
  ...CURATED_VIDEOS.filter((video) =>
    Object.prototype.hasOwnProperty.call(CREATOR_PLAYLISTS, video.creatorId)
  ),
];

const getCuratedPlaylistsForCourse = (course) =>
  CURATED_PLAYLIST_MAPPINGS.filter((mapping) => mapping.course === course);

const getCuratedCreatorsForCourse = (course, language) =>
  getCuratedPlaylistsForCourse(course)
    .filter((mapping) => !language || mapping.language === language)
    .map((mapping) => mapping.creator);

const getMappedCreatorsForCourse = (course, language) =>
  Array.from(
    new Set(
      [...CURATED_PLAYLIST_MAPPINGS, ...CURATED_VIDEO_FALLBACKS]
        .filter((mapping) => matchesCourse(mapping, course))
        .filter((mapping) => !language || mapping.language === language)
        .map((mapping) => mapping.creator)
    )
  );

module.exports = {
  CURATED_PLAYLIST_MAPPINGS,
  CURATED_PLAYLISTS,
  CURATED_VIDEO_FALLBACKS,
  CURATED_VIDEOS,
  CREATOR_IDS,
  CREATOR_PLAYLISTS,
  REQUIRED_CREATOR_PLAYLIST_MAPPINGS,
  extractPlaylistIdFromUrl,
  findCuratedMapping,
  getCuratedCreatorsForCourse,
  getMappedCreatorsForCourse,
  getCuratedPlaylistsForCourse,
  normalizeCuratedKey,
};
