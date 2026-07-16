const normalizeKey = (value = "") =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const {
  CURATED_PLAYLISTS,
  CURATED_VIDEOS,
} = require("./curatedLearningCatalog");

const CHANNELS = [
  {
    id: "jennys-lectures-cs-it",
    youtubeChannelId: "UCM-yUTYGmrNvKOCcAl21g3w",
    name: "Jenny's Lectures CS IT",
    aliases: ["Jenny's Lectures", "Jenny's Lectures CS/IT", "Jennys Lectures"],
    language: "Hindi",
    subjects: [
      "data_structures",
      "object_oriented_programming",
      "operating_systems",
      "database_management_systems",
      "computer_networks",
      "software_engineering",
      "programming",
    ],
    semesters: [1, 2, 3, 4, 5, 6],
    branches: ["software", "computer_science", "information_technology", "machine_learning"],
    verified: false,
  },
  {
    id: "gate-smashers",
    youtubeChannelId: "UCJihyK0A38SZ6SdJirEdIOw",
    name: "Gate Smashers",
    aliases: ["Gate Smashers", "gatesmashers"],
    language: "Hindi",
    subjects: [
      "operating_systems",
      "database_management_systems",
      "computer_networks",
      "data_structures",
      "theory_of_computation",
      "compiler_design",
      "software_engineering",
      "cyber_security",
      "machine_learning",
    ],
    semesters: [2, 3, 4, 5, 6, 7, 8],
    branches: [
      "software",
      "computer_science",
      "information_technology",
      "cyber_security",
      "machine_learning",
    ],
    verified: false,
  },
  {
    id: "neso-academy",
    youtubeChannelId: "UCQYMhOMi_Cdj1CEAU-fv80A",
    name: "Neso Academy",
    aliases: ["Neso Academy"],
    language: "English",
    subjects: [
      "computer_networks",
      "database_management_systems",
      "operating_systems",
      "digital_logic",
      "programming",
    ],
    semesters: [1, 2, 3, 4, 5, 6],
    branches: ["software", "computer_science", "information_technology", "electronics"],
    verified: false,
  },
  {
    id: "codewithharry",
    youtubeChannelId: "UCeVMnSShP_Iviwkknt83cww",
    name: "CodeWithHarry",
    aliases: ["CodeWithHarry", "Code With Harry", "Harry"],
    language: "Hindi",
    subjects: [
      "programming",
      "web_development",
      "python",
      "javascript",
      "java",
      "react",
      "object_oriented_programming",
      "machine_learning",
    ],
    semesters: [1, 2, 3, 4, 5, 6],
    branches: ["software", "computer_science", "information_technology", "machine_learning"],
    verified: true,
  },
  {
    id: "apna-college",
    youtubeChannelId: "UCBwmMxybNva6P_5VmxjzwqA",
    name: "Apna College",
    aliases: ["Apna College"],
    language: "Hindi",
    subjects: ["programming", "web_development", "data_structures", "java"],
    semesters: [1, 2, 3, 4],
    branches: ["software", "computer_science", "information_technology"],
    verified: true,
  },
  {
    id: "chai-aur-code",
    youtubeChannelId: "UCNQ6FEtztATuaVhZKCY28Yw",
    name: "Chai aur Code",
    aliases: ["Chai aur Code", "Chai and Code", "Chai aur code", "chaiaurcode"],
    language: "Hindi",
    subjects: [
      "programming",
      "web_development",
      "javascript",
      "react",
      "python",
      "software_engineering",
    ],
    semesters: [1, 2, 3, 4, 5, 6],
    branches: ["software", "computer_science", "information_technology", "machine_learning"],
    verified: true,
  },
  {
    id: "college-wallah",
    youtubeChannelId: "UCDrf0V4fcBr5FlCtKwvpfwA",
    name: "College Wallah",
    aliases: ["College Wallah", "CollegeWallah"],
    language: "Hindi",
    subjects: [
      "programming",
      "web_development",
      "data_structures",
      "java",
      "python",
      "software_engineering",
    ],
    semesters: [1, 2, 3, 4, 5, 6],
    branches: ["software", "computer_science", "information_technology"],
    verified: true,
  },
  {
    id: "sheryians",
    youtubeChannelId: "UCc7gpqMnnOSbU_F2-5MVVZw",
    name: "Sheryians Coding School",
    aliases: [
      "Sheryians Coding School",
      "Sheryians",
      "Sheryians Coding",
      "Shreyian Coding School",
      "Sheriyans",
      "Sheriyans Coding School",
      "sheryians-coding-school",
    ],
    language: "Hindi",
    subjects: [
      "programming",
      "web_development",
      "javascript",
      "react",
      "machine_learning",
      "software_engineering",
    ],
    semesters: [1, 2, 3, 4, 5, 6],
    branches: ["software", "computer_science", "information_technology", "machine_learning"],
    verified: true,
  },
  {
    id: "web-dev-mastery",
    youtubeChannelId: "UCQVE2WU-h_dszY5If6oFvFg",
    name: "Web Dev Mastery",
    aliases: ["Web Dev Mastery", "WebDevMastery", "Web DevMastery"],
    language: "Hindi",
    subjects: [
      "programming",
      "web_development",
      "javascript",
      "react",
      "software_engineering",
    ],
    semesters: [1, 2, 3, 4, 5, 6],
    branches: ["software", "computer_science", "information_technology"],
    verified: true,
  },
  {
    id: "bro-code",
    youtubeChannelId: "UC4SVo0Ue36XCfOyb5Lh1viQ",
    name: "Bro Code",
    aliases: ["Bro Code", "BroCode"],
    language: "English",
    subjects: [
      "programming",
      "web_development",
      "javascript",
      "react",
      "python",
      "java",
      "object_oriented_programming",
      "software_engineering",
    ],
    semesters: [1, 2, 3, 4, 5, 6],
    branches: ["software", "computer_science", "information_technology"],
    verified: true,
  },
  {
    id: "wscube-tech",
    youtubeChannelId: "UC0T6MVd3wQDB5ICAe45OxaQ",
    name: "WsCube Tech",
    aliases: ["WsCube Tech", "Wscube Tech"],
    language: "Hindi",
    subjects: [
      "python",
      "data_science",
      "machine_learning",
      "programming",
    ],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    branches: [
      "software",
      "computer_science",
      "information_technology",
      "data_science",
      "machine_learning",
    ],
    verified: true,
  },
  {
    id: "wscube-cyber-security",
    youtubeChannelId: "UC9ESQKs98jVWjjUEWkvTMvA",
    name: "WsCube Cyber Security",
    aliases: ["WsCube Cyber Security", "Wscube Cyber Security", "WsCube Cyber SecurityVerified"],
    language: "Hindi",
    subjects: ["cyber_security", "computer_networks"],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    branches: ["cyber_security", "computer_science", "information_technology"],
    verified: true,
  },
  {
    id: "great-learning-hindi",
    youtubeChannelId: "UCObs0kLIrDjX2LLSybqNaEA",
    name: "Great Learning",
    aliases: ["Great Learning", "Great Learning Hindi", "Great LearningVerified"],
    language: "Hindi",
    subjects: [
      "python",
      "data_science",
      "machine_learning",
      "artificial_intelligence",
      "cyber_security",
      "database_management_systems",
    ],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    branches: [
      "data_science",
      "machine_learning",
      "artificial_intelligence",
      "cyber_security",
      "software",
      "computer_science",
      "information_technology",
    ],
    verified: true,
  },
  {
    id: "the-iscale",
    youtubeChannelId: "the-iscale",
    name: "The iScale",
    aliases: ["The iScale", "iScale"],
    language: "Hindi",
    subjects: ["artificial_intelligence"],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    branches: ["artificial_intelligence"],
    verified: true,
  },
  {
    id: "freecodecamp",
    youtubeChannelId: "UC8butISFwT-Wl7EV0hUK0BQ",
    name: "freeCodeCamp.org",
    aliases: ["freeCodeCamp", "freeCodeCamp.org", "freeCodeCamp.orgVerified"],
    language: "English",
    subjects: [
      "software_engineering",
      "programming",
      "web_development",
      "javascript",
      "react",
      "python",
      "database_management_systems",
      "machine_learning",
      "data_science",
      "artificial_intelligence",
      "cyber_security",
    ],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    branches: [
      "software",
      "computer_science",
      "information_technology",
      "data_science",
      "machine_learning",
      "artificial_intelligence",
      "cyber_security",
    ],
    verified: true,
  },
  {
    id: "traversy-media",
    youtubeChannelId: "UC29ju8bIPH5as8OGnQzwJyA",
    name: "Traversy Media",
    aliases: ["Traversy Media", "Traversy MediaVerified"],
    language: "English",
    subjects: ["web_development", "javascript", "programming", "software_engineering"],
    semesters: [1, 2, 3, 4],
    branches: ["software", "computer_science", "information_technology"],
    verified: true,
  },
  {
    id: "edureka",
    youtubeChannelId: "@edurekaIN",
    name: "edureka!",
    aliases: ["edureka!", "edureka", "edurekaIN"],
    language: "English",
    languages: ["English", "Hindi"],
    subjects: ["artificial_intelligence"],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    branches: ["artificial_intelligence"],
    verified: true,
  },
  {
    id: "intellipaat",
    youtubeChannelId: "@Intellipaat",
    name: "Intellipaat",
    aliases: ["Intellipaat"],
    language: "English",
    languages: ["English", "Hindi"],
    subjects: ["artificial_intelligence"],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    branches: ["artificial_intelligence"],
    verified: true,
  },
  {
    id: "web-dev-simplified",
    youtubeChannelId: "UCFbNIlppjAuEX4znoulh0Cw",
    name: "Web Dev Simplified",
    aliases: ["Web Dev Simplified", "Web Dev SimplifiedVerified"],
    language: "English",
    subjects: ["web_development", "javascript", "software_engineering"],
    semesters: [1, 2, 3, 4],
    branches: ["software", "computer_science", "information_technology"],
    verified: true,
  },
  {
    id: "statquest",
    youtubeChannelId: "UCtYLUTtgS3k1Fg4y5tAhLbw",
    name: "StatQuest",
    aliases: ["StatQuest", "StatQuestVerified", "StatQuest with Josh Starmer"],
    language: "English",
    subjects: ["machine_learning", "statistics", "data_science"],
    semesters: [3, 4, 5, 6, 7, 8],
    branches: ["data_science", "artificial_intelligence", "machine_learning"],
    verified: true,
  },
  {
    id: "3blue1brown",
    youtubeChannelId: "UCYO_jab_esuFRV4b17AJtAw",
    name: "3Blue1Brown",
    aliases: ["3Blue1Brown"],
    language: "English",
    subjects: ["machine_learning", "mathematics", "data_science"],
    semesters: [2, 3, 4, 5, 6],
    branches: ["data_science", "artificial_intelligence", "machine_learning"],
    verified: true,
  },
  {
    id: "corey-schafer",
    youtubeChannelId: "UCCezIgC97PvUuR4_gbFUs5g",
    name: "Corey Schafer",
    aliases: ["Corey Schafer"],
    language: "English",
    subjects: ["python", "programming"],
    semesters: [1, 2, 3, 4],
    branches: ["software", "computer_science", "information_technology", "data_science"],
    verified: true,
  },
];

const SUBJECT_ALIASES = {
  html_css_essentials: "web_development",
  html_css: "web_development",
  javascript_fundamentals: "javascript",
  react_basics: "react",
  react_router: "react",
  software_engineering_practices: "software_engineering",
  java_programming: "java",
  python_programming: "python",
  data_analysis: "data_science",
  machine_learning_basics: "machine_learning",
  database_foundations: "database_management_systems",
  network_security_basics: "cyber_security",
  security_fundamentals: "cyber_security",
  threat_modeling: "cyber_security",
  neural_networks: "machine_learning",
  data_science: "data_science",
  data_structures: "data_structures",
  operating_system: "operating_systems",
  operating_systems: "operating_systems",
  oop: "object_oriented_programming",
  oops: "object_oriented_programming",
  object_oriented_programming: "object_oriented_programming",
  computer_network: "computer_networks",
  computer_networks: "computer_networks",
  dbms: "database_management_systems",
  database_management_systems: "database_management_systems",
  software_engineering: "software_engineering",
  web_development: "web_development",
  java: "java",
  python: "python",
  react: "react",
  machine_learning: "machine_learning",
  artificial_intelligence: "artificial_intelligence",
  ai: "artificial_intelligence",
  llm: "artificial_intelligence",
};

const SUBJECTS = [
  { id: "data_structures", name: "Data Structures" },
  { id: "object_oriented_programming", name: "OOPS" },
  { id: "operating_systems", name: "Operating Systems" },
  { id: "database_management_systems", name: "DBMS" },
  { id: "software_engineering", name: "Software Engineering" },
  { id: "computer_networks", name: "Computer Networks" },
  { id: "web_development", name: "Web Development" },
  { id: "java", name: "Java" },
  { id: "python", name: "Python" },
  { id: "javascript", name: "JavaScript" },
  { id: "react", name: "React" },
  { id: "machine_learning", name: "Machine Learning" },
  { id: "data_science", name: "Data Science" },
  { id: "artificial_intelligence", name: "Artificial Intelligence" },
  { id: "cyber_security", name: "Cyber Security" },
  { id: "programming", name: "Programming" },
];

const SUBJECT_LABELS = SUBJECTS.reduce((lookup, subject) => {
  lookup.set(subject.id, subject.name);
  return lookup;
}, new Map());

const SUBJECT_KEYWORDS = [
  { match: ["operating system", "os", "memory management", "deadlock", "file system"], tag: "operating_systems" },
  { match: ["computer network", "networking", "tcp", "ip", "routing"], tag: "computer_networks" },
  { match: ["database", "dbms", "sql", "normalization"], tag: "database_management_systems" },
  { match: ["react"], tag: "react" },
  { match: ["javascript"], tag: "javascript" },
  { match: ["java"], tag: "java" },
  { match: ["html", "css", "web", "node", "express", "mongodb", "mongoose", "jwt", "full stack", "full-stack", "deployment"], tag: "web_development" },
  { match: ["data structure", "stack", "queue", "tree", "graph"], tag: "data_structures" },
  { match: ["oops", "oop", "object oriented"], tag: "object_oriented_programming" },
  { match: ["machine learning", "neural", "regression", "classification", "overfitting"], tag: "machine_learning" },
  { match: ["data science", "pandas", "visualization", "statistics", "analysis"], tag: "data_science" },
  { match: ["artificial intelligence", "ai foundations", "large language model", "llm", "transformer"], tag: "artificial_intelligence" },
  { match: ["cyber", "security", "threat"], tag: "cyber_security" },
  { match: ["python"], tag: "python" },
  { match: ["software engineering", "design", "testing", "git", "github", "authentication"], tag: "software_engineering" },
];

const containsSubjectKeyword = (haystack, keyword) => {
  const normalizedKeyword = keyword.toLowerCase();

  if (normalizedKeyword.length <= 4) {
    return new RegExp(`(^|[^a-z0-9])${normalizedKeyword}([^a-z0-9]|$)`).test(haystack);
  }

  return haystack.includes(normalizedKeyword);
};

const FALLBACK_CHANNELS_BY_SUBJECT = {
  Hindi: {
    operating_systems: [],
    database_management_systems: [],
    computer_networks: [],
    data_structures: ["apna-college", "college-wallah"],
    object_oriented_programming: ["codewithharry", "bro-code"],
    programming: [
      "apna-college",
      "codewithharry",
      "chai-aur-code",
      "college-wallah",
      "bro-code",
    ],
    python: ["codewithharry", "chai-aur-code", "college-wallah", "bro-code"],
    javascript: ["codewithharry", "apna-college", "chai-aur-code", "bro-code"],
    web_development: [
      "codewithharry",
      "apna-college",
      "chai-aur-code",
      "college-wallah",
      "web-dev-mastery",
    ],
    data_science: ["wscube-tech", "great-learning-hindi"],
    artificial_intelligence: [
      "the-iscale",
      "edureka",
      "intellipaat",
      "great-learning-hindi",
    ],
    cyber_security: ["wscube-cyber-security", "great-learning-hindi"],
    machine_learning: ["wscube-tech", "great-learning-hindi", "codewithharry", "sheryians"],
    software_engineering: [
      "chai-aur-code",
      "codewithharry",
      "college-wallah",
      "sheryians",
      "web-dev-mastery",
    ],
  },
  English: {
    computer_networks: ["neso-academy"],
    operating_systems: ["neso-academy"],
    database_management_systems: ["neso-academy", "freecodecamp"],
    object_oriented_programming: ["freecodecamp"],
    web_development: ["freecodecamp", "traversy-media", "web-dev-simplified", "bro-code"],
    javascript: ["freecodecamp", "traversy-media", "web-dev-simplified", "bro-code"],
    python: ["freecodecamp", "corey-schafer"],
    programming: ["freecodecamp", "corey-schafer"],
    machine_learning: ["statquest", "3blue1brown", "freecodecamp"],
    data_science: ["statquest", "3blue1brown", "freecodecamp"],
    artificial_intelligence: ["edureka", "intellipaat", "freecodecamp"],
    cyber_security: ["freecodecamp"],
  },
};

const VERIFIED_PLAYLISTS = CURATED_PLAYLISTS;

const VERIFIED_VIDEOS = CURATED_VIDEOS;

const CHANNEL_LOOKUP = CHANNELS.reduce((lookup, channel) => {
  [channel.id, channel.name, channel.youtubeChannelId, ...channel.aliases].forEach((key) => {
    lookup.set(normalizeKey(key), channel);
  });
  return lookup;
}, new Map());

const resolveSubjectTag = (subject = "", topic = "") => {
  const normalizedSubject = normalizeKey(subject);

  if (SUBJECT_ALIASES[normalizedSubject]) {
    return SUBJECT_ALIASES[normalizedSubject];
  }

  const haystack = `${subject} ${topic}`.toLowerCase();
  const keywordMatch = SUBJECT_KEYWORDS.find((entry) =>
    entry.match.some((keyword) => containsSubjectKeyword(haystack, keyword))
  );

  return keywordMatch?.tag || normalizedSubject || "general";
};

const resolveBranchTag = (course = "") => {
  const normalized = course.toLowerCase();

  if (normalized.includes("cyber")) {
    return "cyber_security";
  }

  if (normalized.includes("data")) {
    return "data_science";
  }

  if (normalized.includes("machine")) {
    return "machine_learning";
  }

  if (normalized.includes("artificial")) {
    return "artificial_intelligence";
  }

  if (normalized.includes("information")) {
    return "information_technology";
  }

  return "software";
};

const semesterFromYear = (year = 1) => Math.max(1, Math.min(8, Number(year) * 2 - 1));

const resolveChannel = (channel) => CHANNEL_LOOKUP.get(normalizeKey(channel));

const channelSupportsLanguage = (channel, language = "English") =>
  (channel.languages || [channel.language]).includes(language);

const getChannelsByLanguage = (language = "English") =>
  CHANNELS.filter((channel) => channelSupportsLanguage(channel, language) && channel.verified);

const getAllSubjects = () => SUBJECTS;

const getSubjectLabel = (subjectTag) => SUBJECT_LABELS.get(subjectTag) || subjectTag;

const getLearningCatalog = (language) =>
  (language ? getChannelsByLanguage(language) : CHANNELS.filter((channel) => channel.verified))
    .map((channel) => ({
      id: channel.id,
      youtubeChannelId: channel.youtubeChannelId,
      name: channel.name,
      language: channel.language,
      subjects: channel.subjects.map((subjectId) => ({
        id: subjectId,
        name: getSubjectLabel(subjectId),
      })),
    }));

const getFallbackChannels = ({ subjectTag, language, excludeChannelIds = [] }) => {
  const excluded = new Set(excludeChannelIds);
  const fallbackIds = FALLBACK_CHANNELS_BY_SUBJECT[language]?.[subjectTag] || [];

  return fallbackIds
    .map(resolveChannel)
    .filter(Boolean)
    .filter((channel) => !excluded.has(channel.youtubeChannelId))
    .filter((channel) => channelSupportsLanguage(channel, language) && channel.subjects.includes(subjectTag));
};

module.exports = {
  CHANNELS,
  FALLBACK_CHANNELS_BY_SUBJECT,
  SUBJECTS,
  VERIFIED_PLAYLISTS,
  VERIFIED_VIDEOS,
  getAllSubjects,
  getChannelsByLanguage,
  getFallbackChannels,
  getLearningCatalog,
  getSubjectLabel,
  channelSupportsLanguage,
  normalizeKey,
  resolveBranchTag,
  resolveChannel,
  resolveSubjectTag,
  semesterFromYear,
};
