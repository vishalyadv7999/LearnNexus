const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const aliasPattern = (alias) =>
  new RegExp(`(^|[^a-z0-9+#])${escapeRegex(normalize(alias))}([^a-z0-9+#]|$)`, "i");

const topic = ({
  id,
  label,
  domain,
  aliases,
  answerTerms,
  allowedRelated = [],
  difficulty = "Beginner to intermediate",
}) => ({
  id,
  label,
  domain,
  aliases,
  answerTerms,
  allowedRelated,
  difficulty,
});

const TOPIC_CATALOG = [
  topic({
    id: "html",
    label: "HTML",
    domain: "Web Development",
    aliases: ["html", "hypertext markup language", "html5", "semantic html", "html tags", "markup"],
    answerTerms: ["html", "hypertext", "markup", "tag", "element", "semantic"],
    allowedRelated: ["css", "javascript", "react", "frontend"],
    difficulty: "Beginner",
  }),
  topic({
    id: "css",
    label: "CSS",
    domain: "Web Development",
    aliases: ["css", "cascading style sheets", "stylesheet", "style sheet", "flexbox", "grid", "responsive design"],
    answerTerms: ["css", "style", "selector", "property", "layout", "flexbox", "grid"],
    allowedRelated: ["html", "javascript", "react", "frontend"],
    difficulty: "Beginner",
  }),
  topic({
    id: "javascript",
    label: "JavaScript",
    domain: "Programming",
    aliases: ["javascript", "js", "closure", "closures", "promise", "async", "await", "event loop", "hoisting", "dom"],
    answerTerms: ["javascript", "function", "variable", "closure", "promise", "async", "event"],
    allowedRelated: ["html", "css", "react", "nodejs", "express"],
  }),
  topic({
    id: "react",
    label: "React",
    domain: "Web Development",
    aliases: ["react", "react.js", "jsx", "component", "props", "state", "hook", "hooks", "useeffect", "usestate"],
    answerTerms: ["react", "component", "props", "state", "jsx", "hook"],
    allowedRelated: ["html", "css", "javascript", "frontend"],
  }),
  topic({
    id: "nodejs",
    label: "Node.js",
    domain: "Backend Development",
    aliases: ["node", "node.js", "nodejs", "npm", "backend javascript", "event emitter"],
    answerTerms: ["node", "node.js", "runtime", "server", "javascript", "npm"],
    allowedRelated: ["javascript", "express", "mongodb"],
  }),
  topic({
    id: "express",
    label: "Express.js",
    domain: "Backend Development",
    aliases: ["express", "express.js", "expressjs", "middleware", "route", "routes", "api endpoint", "rest api"],
    answerTerms: ["express", "route", "middleware", "request", "response", "api"],
    allowedRelated: ["nodejs", "javascript", "mongodb"],
  }),
  topic({
    id: "mongodb",
    label: "MongoDB",
    domain: "Database",
    aliases: ["mongodb", "mongo", "mongoose", "document database", "schema", "collection", "objectid"],
    answerTerms: ["mongodb", "document", "collection", "database", "mongoose", "schema"],
    allowedRelated: ["nodejs", "express", "dbms"],
  }),
  topic({
    id: "java",
    label: "Java",
    domain: "Programming",
    aliases: ["java", "jvm", "oops", "object oriented", "inheritance", "polymorphism", "encapsulation"],
    answerTerms: ["java", "class", "object", "jvm", "method", "oop"],
    allowedRelated: ["dsa"],
  }),
  topic({
    id: "python",
    label: "Python",
    domain: "Programming",
    aliases: ["python", "django", "flask", "numpy", "pandas in python", "python programming"],
    answerTerms: ["python", "function", "list", "dictionary", "module", "library"],
    allowedRelated: ["datascience", "ml", "ai"],
  }),
  topic({
    id: "dsa",
    label: "DSA",
    domain: "Computer Science",
    aliases: ["dsa", "data structures", "data structure", "algorithm", "algorithms", "leetcode", "array", "arrays", "tree", "graph", "recursion", "linked list", "stack", "queue"],
    answerTerms: ["data structure", "algorithm", "array", "tree", "graph", "complexity", "dsa"],
    allowedRelated: ["java", "javascript", "python"],
  }),
  topic({
    id: "dbms",
    label: "DBMS",
    domain: "Database",
    aliases: ["dbms", "database management system", "database", "sql", "normalization", "transaction", "acid", "primary key", "foreign key", "joins"],
    answerTerms: ["dbms", "database", "table", "normalization", "sql", "key", "transaction"],
    allowedRelated: ["mongodb"],
  }),
  topic({
    id: "os",
    label: "Operating Systems",
    domain: "Computer Science",
    aliases: ["operating system", "operating systems", "os", "process", "thread", "deadlock", "memory management", "cpu scheduling", "paging"],
    answerTerms: ["operating system", "os", "process", "thread", "memory", "cpu", "file"],
    allowedRelated: ["cn"],
  }),
  topic({
    id: "cn",
    label: "Computer Networks",
    domain: "Computer Science",
    aliases: ["computer network", "computer networks", "networking", "cn", "tcp", "udp", "http", "https", "osi", "dns", "ip address"],
    answerTerms: ["network", "tcp", "udp", "http", "dns", "ip", "client"],
    allowedRelated: ["os", "web"],
  }),
  topic({
    id: "se",
    label: "Software Engineering",
    domain: "Computer Science",
    aliases: ["software engineering", "sdlc", "testing", "design pattern", "agile", "requirements engineering"],
    answerTerms: ["software engineering", "requirements", "design", "testing", "maintenance", "sdlc"],
    allowedRelated: ["projects"],
  }),
  topic({
    id: "ml",
    label: "Machine Learning",
    domain: "Artificial Intelligence",
    aliases: ["machine learning", "ml", "supervised learning", "unsupervised learning", "model training", "regression", "classification", "overfitting"],
    answerTerms: ["machine learning", "model", "training", "data", "features", "labels", "prediction"],
    allowedRelated: ["ai", "datascience", "python"],
  }),
  topic({
    id: "ai",
    label: "AI",
    domain: "Artificial Intelligence",
    aliases: ["artificial intelligence", "ai", "chatbot", "llm", "generative ai", "neural network", "prompt engineering"],
    answerTerms: ["ai", "artificial intelligence", "intelligent", "model", "reasoning", "generative"],
    allowedRelated: ["ml", "datascience", "python"],
  }),
  topic({
    id: "datascience",
    label: "Data Science",
    domain: "Data",
    aliases: ["data science", "data scientist", "eda", "exploratory data analysis", "statistics", "visualization", "pandas"],
    answerTerms: ["data science", "data", "analysis", "statistics", "visualization", "insight"],
    allowedRelated: ["ml", "ai", "python"],
  }),
  topic({
    id: "resume",
    label: "Resume",
    domain: "Career Preparation",
    aliases: ["resume", "cv", "ats", "portfolio", "linkedin profile", "project resume"],
    answerTerms: ["resume", "cv", "skills", "projects", "experience", "ats"],
    allowedRelated: ["internship", "projects"],
  }),
  topic({
    id: "internship",
    label: "Internship preparation",
    domain: "Career Preparation",
    aliases: ["internship", "internship preparation", "placement", "interview", "hr round", "technical round", "frontend internship", "backend internship"],
    answerTerms: ["internship", "interview", "resume", "projects", "skills", "preparation"],
    allowedRelated: ["resume", "html", "css", "javascript", "react", "nodejs", "dsa", "dbms", "os", "cn"],
  }),
  topic({
    id: "projects",
    label: "Projects",
    domain: "Career Preparation",
    aliases: ["project", "projects", "mini project", "major project", "portfolio project", "final year project"],
    answerTerms: ["project", "feature", "user", "tech stack", "implementation", "github"],
    allowedRelated: ["resume", "internship", "se"],
  }),
];

const TOPIC_BY_ID = new Map(TOPIC_CATALOG.map((entry) => [entry.id, entry]));

const detectLearningTopic = (message) => {
  const normalized = ` ${normalize(message)} `;
  const matches = [];

  for (const entry of TOPIC_CATALOG) {
    for (const alias of entry.aliases) {
      if (aliasPattern(alias).test(normalized)) {
        matches.push({
          ...entry,
          matchedAlias: alias,
          score: normalize(alias).length,
        });
      }
    }
  }

  if (!matches.length) {
    return null;
  }

  matches.sort((a, b) => b.score - a.score);
  const { score: _score, ...bestMatch } = matches[0];
  return bestMatch;
};

const CONTEXT_FOLLOW_UP_PATTERNS = [
  /\b(this|that|it|they|them|those|these)\b/i,
  /\b(previous|above|same topic|continue|go deeper|more detail|another example|explain again)\b/i,
  /\b(in this code|for this example|in the above|from earlier)\b/i,
];

const isContextRequired = (message) => CONTEXT_FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(message));

const hasTopicTerm = (text, terms) => {
  const normalized = ` ${normalize(text)} `;
  return terms.some((term) => aliasPattern(term).test(normalized));
};

const GENERIC_CONFLICT_TERMS = new Set([
  "array",
  "component",
  "database",
  "function",
  "interview",
  "model",
  "process",
  "project",
  "projects",
  "state",
  "testing",
  "thread",
]);

const conflictTermsFor = (entry) => [
  entry.label,
  ...entry.aliases.filter((alias) => !GENERIC_CONFLICT_TERMS.has(normalize(alias))),
];

const findConflictingTopics = (answer, requestedTopic) => {
  const opening = answer.slice(0, 450);
  return TOPIC_CATALOG.filter((entry) => {
    if (entry.id === requestedTopic.id || requestedTopic.allowedRelated.includes(entry.id)) {
      return false;
    }

    return hasTopicTerm(opening, conflictTermsFor(entry));
  }).map((entry) => entry.id);
};

const validateTopicAnswer = ({ question, answer, topic: providedTopic }) => {
  const topic = providedTopic || detectLearningTopic(question);

  if (!topic) {
    return {
      valid: true,
      reason: "topic_not_detected",
      topic: null,
      conflictingTopics: [],
    };
  }

  const hasRequestedTopic = hasTopicTerm(answer, [topic.label, ...topic.answerTerms]);
  const conflictingTopics = findConflictingTopics(answer, topic);

  if (!hasRequestedTopic) {
    return {
      valid: false,
      reason: "missing_requested_topic",
      topic,
      conflictingTopics,
    };
  }

  if (conflictingTopics.length) {
    return {
      valid: false,
      reason: "conflicting_topic_in_opening",
      topic,
      conflictingTopics,
    };
  }

  return {
    valid: true,
    reason: "topic_aligned",
    topic,
    conflictingTopics: [],
  };
};

const buildTopicGuardInstructions = ({ topic, contextRequired }) => {
  const contextRule = contextRequired
    ? "Use previous messages only if they clearly refer to this same detected topic."
    : "Treat this as a fresh independent learning question. Do not use previous unrelated conversation.";

  if (!topic) {
    return [
      "Topic guard:",
      "- Detect the exact topic from the user's latest question before answering.",
      "- If the latest question is unclear, ask one short clarification question.",
      "- Never switch to a different subject just because earlier conversation mentioned it.",
      `- ${contextRule}`,
    ].join("\n");
  }

  return [
    "Topic guard:",
    `- Detected topic: ${topic.label}.`,
    `- Domain: ${topic.domain}.`,
    `- Answer only about ${topic.label} unless the user explicitly asks for a comparison.`,
    "- If previous conversation is about a different topic, ignore it.",
    `- ${contextRule}`,
    "- Before finalizing, verify your answer clearly discusses the detected topic and not another subject.",
  ].join("\n");
};

const filterHistoryForTopic = (history, topic) => {
  if (!topic) {
    return [];
  }

  const filtered = [];
  for (let index = 0; index < history.length; index += 2) {
    const userMessage = history[index];
    const assistantMessage = history[index + 1];
    const detected = userMessage?.role === "user" ? detectLearningTopic(userMessage.content) : null;

    if (detected?.id !== topic.id) {
      continue;
    }

    if (userMessage) filtered.push(userMessage);
    if (assistantMessage?.role === "assistant") filtered.push(assistantMessage);
  }

  return filtered;
};

module.exports = {
  TOPIC_CATALOG,
  TOPIC_BY_ID,
  buildTopicGuardInstructions,
  detectLearningTopic,
  filterHistoryForTopic,
  isContextRequired,
  validateTopicAnswer,
};
