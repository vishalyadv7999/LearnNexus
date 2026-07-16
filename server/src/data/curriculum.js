const youtubeWatch = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

const youtubeEmbed = (videoId) =>
  `https://www.youtube-nocookie.com/embed/${videoId}`;

const search = (query) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

const lessonFrames = (topic, outcome) => [
  {
    title: "Watch",
    summary: `Watch the lecture for ${topic} inside LearnNexus.`,
    points: [
      "Keep a notebook open.",
      "Pause when the instructor writes code or explains a formula.",
      "Replay the first confusing section before moving on.",
    ],
  },
  {
    title: "Build",
    summary: outcome,
    points: [
      "Recreate the example without copying blindly.",
      "Change one small thing and observe the result.",
      "Save the final work as proof of progress.",
    ],
  },
  {
    title: "Revise",
    summary: "End the session by writing what you learned in 5-6 lines.",
    points: [
      "Write the main idea.",
      "Write the mistake you made today.",
      "Write what the next lecture should connect to.",
    ],
  },
];

const topic = ({
  name,
  summary,
  videoId,
  channel,
  duration = 60,
  outcome,
  keywords,
}) => ({
  topic: name,
  summary,
  practiceTask: outcome,
  commonMistake:
    "Do not just watch passively. Pause the lecture, rebuild the example, and write one short recap before the task is counted as studied.",
  videoTitle: name,
  videoUrl: videoId ? youtubeWatch(videoId) : search(`${name} ${keywords}`),
  videoEmbedUrl: videoId ? youtubeEmbed(videoId) : "",
  videoChannel: channel,
  videoDurationLabel: `${duration} min`,
  notesText: `${summary} Today's output: ${outcome}`,
  notesPdfUrl: search(`${name} notes ${keywords}`),
  lessonDurationMinutes: duration,
  lessonFrames: lessonFrames(name, outcome),
  support: [
    {
      title: `More ${name} videos`,
      explanation:
        "Use this only if the main lecture does not match your preferred teaching style.",
      url: search(`${name} ${keywords} tutorial`),
    },
  ],
});

const buildSubject = (name, goal, topics) => ({
  name,
  goal,
  topics,
});

const softwareTopics = [
  topic({
    name: "HTML Foundations",
    summary: "Learn tags, page structure, headings, lists, links, forms, and semantic layout.",
    videoId: "pQN-pnXPaVg",
    channel: "freeCodeCamp.org",
    duration: 45,
    outcome: "Build a personal portfolio page with sections for about, skills, and contact.",
    keywords: "html full course web development",
  }),
  topic({
    name: "CSS Basics and Styling",
    summary: "Style pages with selectors, colors, spacing, typography, and responsive basics.",
    videoId: "OXGznpKZ_sA",
    channel: "freeCodeCamp.org",
    duration: 60,
    outcome: "Style the portfolio page and make it readable on mobile and desktop.",
    keywords: "css tutorial web development",
  }),
  topic({
    name: "Flexbox and CSS Grid",
    summary: "Use modern layout tools to create clean, responsive sections without layout hacks.",
    videoId: "JJSoEo8JSnc",
    channel: "freeCodeCamp.org",
    duration: 45,
    outcome: "Create a responsive project gallery using grid and flexbox.",
    keywords: "flexbox grid responsive layout",
  }),
  topic({
    name: "JavaScript Fundamentals",
    summary: "Learn variables, functions, arrays, objects, loops, and browser logic.",
    videoId: "PkZNo7MFNFg",
    channel: "freeCodeCamp.org",
    duration: 90,
    outcome: "Build small JavaScript exercises for calculator, counter, and list filtering.",
    keywords: "javascript full course beginners",
  }),
  topic({
    name: "DOM Events and Web Interactions",
    summary: "Connect buttons, inputs, and page state using JavaScript DOM events.",
    videoId: "0ik6X4DJKCc",
    channel: "freeCodeCamp.org",
    duration: 45,
    outcome: "Build a to-do app that adds, completes, and filters tasks.",
    keywords: "javascript dom tutorial",
  }),
  topic({
    name: "Git and GitHub",
    summary: "Track code, create commits, use branches, and publish projects on GitHub.",
    videoId: "RGOj5yH7evk",
    channel: "freeCodeCamp.org",
    duration: 50,
    outcome: "Push your portfolio and to-do app to GitHub with clean commit messages.",
    keywords: "git github tutorial",
  }),
  topic({
    name: "React Basics",
    summary: "Build reusable components, pass props, manage state, and render lists.",
    videoId: "bMknfKXIFA8",
    channel: "freeCodeCamp.org",
    duration: 90,
    outcome: "Convert the to-do app into React components with state.",
    keywords: "react full course",
  }),
  topic({
    name: "React Router and API Calls",
    summary: "Create multi-page app flows and fetch data from APIs.",
    videoId: "Law7wfdg_ls",
    channel: "Traversy Media",
    duration: 70,
    outcome: "Build a small dashboard with routes for home, projects, and profile.",
    keywords: "react router api tutorial",
  }),
  topic({
    name: "Node.js and Express",
    summary: "Create backend routes, middleware, and JSON APIs for frontend apps.",
    videoId: "Oe421EPjeBE",
    channel: "freeCodeCamp.org",
    duration: 90,
    outcome: "Build an Express API for tasks with create, read, update, and delete routes.",
    keywords: "node express full course",
  }),
  topic({
    name: "MongoDB and Mongoose",
    summary: "Store app data in MongoDB and model it safely with Mongoose.",
    videoId: "-56x56UppqQ",
    channel: "freeCodeCamp.org",
    duration: 75,
    outcome: "Connect your Express task API to MongoDB and save real tasks.",
    keywords: "mongodb mongoose tutorial",
  }),
  topic({
    name: "Authentication with JWT",
    summary: "Add signup, login, password hashing, protected routes, and JWT auth.",
    videoId: "mbsmsi7l3r4",
    channel: "Web Dev Simplified",
    duration: 45,
    outcome: "Protect your task API so only the logged-in user can access their data.",
    keywords: "jwt authentication node express",
  }),
  topic({
    name: "Full Stack Deployment",
    summary: "Prepare a full-stack project for production and deploy it.",
    videoId: "5r6kH8gE7z0",
    channel: "Traversy Media",
    duration: 60,
    outcome: "Deploy one full-stack project and add the live link to your portfolio.",
    keywords: "mern deployment tutorial",
  }),
];

const machineLearningTopics = [
  topic({
    name: "Python for Machine Learning",
    summary: "Refresh Python syntax, functions, lists, dictionaries, and notebooks.",
    videoId: "rfscVS0vtbw",
    channel: "freeCodeCamp.org",
    duration: 75,
    outcome: "Write Python notebooks for loops, functions, and file reading.",
    keywords: "python for beginners",
  }),
  topic({
    name: "NumPy and Pandas",
    summary: "Handle arrays, tables, missing data, grouping, and basic analysis.",
    videoId: "vmEHCJofslg",
    channel: "freeCodeCamp.org",
    duration: 90,
    outcome: "Clean a small CSV dataset and produce summary statistics.",
    keywords: "numpy pandas tutorial",
  }),
  topic({
    name: "Machine Learning Basics",
    summary: "Understand features, labels, training, testing, overfitting, and evaluation.",
    videoId: "GwIo3gDZCVQ",
    channel: "freeCodeCamp.org",
    duration: 90,
    outcome: "Train your first classification model and explain the accuracy.",
    keywords: "machine learning full course",
  }),
  topic({
    name: "Linear Regression",
    summary: "Predict continuous values and learn how model error is measured.",
    videoId: "PaFPbb66DxQ",
    channel: "StatQuest",
    duration: 30,
    outcome: "Build a simple marks or price prediction model.",
    keywords: "linear regression machine learning",
  }),
  topic({
    name: "Classification Models",
    summary: "Use logistic regression, decision trees, and confusion matrices.",
    videoId: "yIYKR4sgzI8",
    channel: "StatQuest",
    duration: 30,
    outcome: "Classify a dataset and explain precision, recall, and confusion matrix.",
    keywords: "classification machine learning",
  }),
  topic({
    name: "Neural Networks",
    summary: "Learn layers, weights, activation, backpropagation, and training loops.",
    videoId: "aircAruvnKk",
    channel: "3Blue1Brown",
    duration: 30,
    outcome: "Explain a neural network visually and build one small model.",
    keywords: "neural networks beginner",
  }),
];

const dataScienceTopics = [
  topic({
    name: "Python and Notebooks",
    summary: "Use Python and notebooks as your daily data science workspace.",
    videoId: "rfscVS0vtbw",
    channel: "freeCodeCamp.org",
    duration: 60,
    outcome: "Create a notebook with clean sections, markdown notes, and Python cells.",
    keywords: "python jupyter notebook",
  }),
  topic({
    name: "Pandas Data Analysis",
    summary: "Load, clean, filter, group, and summarize real tabular data.",
    videoId: "vmEHCJofslg",
    channel: "freeCodeCamp.org",
    duration: 90,
    outcome: "Analyze a student performance dataset and write five insights.",
    keywords: "pandas data analysis",
  }),
  topic({
    name: "Data Visualization",
    summary: "Use charts to compare, explain, and communicate patterns.",
    videoId: "3Xc3CA655Y4",
    channel: "Corey Schafer",
    duration: 45,
    outcome: "Create bar, line, and scatter charts for one dataset.",
    keywords: "matplotlib data visualization",
  }),
  topic({
    name: "Statistics for Data Science",
    summary: "Understand mean, variance, probability, sampling, and correlation.",
    videoId: "xxpc-HPKN28",
    channel: "freeCodeCamp.org",
    duration: 90,
    outcome: "Write a simple statistical report for a dataset.",
    keywords: "statistics data science",
  }),
  topic({
    name: "SQL for Data Analysis",
    summary: "Query, filter, join, and aggregate data like an analyst.",
    videoId: "HXV3zeQKqGY",
    channel: "freeCodeCamp.org",
    duration: 80,
    outcome: "Answer ten business questions using SQL queries.",
    keywords: "sql data analysis",
  }),
  topic({
    name: "Data Science Project",
    summary: "Combine cleaning, visualization, statistics, and storytelling.",
    videoId: "ua-CiDNNj30",
    channel: "freeCodeCamp.org",
    duration: 90,
    outcome: "Publish one end-to-end data analysis project on GitHub.",
    keywords: "data science project",
  }),
];

const aiTopics = [
  topic({
    name: "AI Foundations",
    summary: "Understand what AI is, where ML fits, and how modern AI systems are built.",
    videoId: "ad79nYk2keg",
    channel: "Simplilearn",
    duration: 50,
    outcome: "Write a one-page map of AI, ML, deep learning, and generative AI.",
    keywords: "artificial intelligence basics",
  }),
  ...machineLearningTopics.slice(2, 6),
  topic({
    name: "Large Language Models",
    summary: "Learn how transformer-based language models process text.",
    videoId: "kCc8FmEb1nY",
    channel: "Andrej Karpathy",
    duration: 90,
    outcome: "Explain tokenization, next-token prediction, and why prompts matter.",
    keywords: "large language models beginner",
  }),
];

const cyberSecurityTopics = [
  topic({
    name: "Networking Basics",
    summary: "Understand IP, ports, DNS, HTTP, and how systems communicate.",
    videoId: "qiQR5rTSshw",
    channel: "freeCodeCamp.org",
    duration: 70,
    outcome: "Draw a request path from browser to server with ports and protocols.",
    keywords: "computer networking basics",
  }),
  topic({
    name: "Linux Command Line",
    summary: "Use the terminal, files, permissions, processes, and common commands.",
    videoId: "sWbUDq4S6Y8",
    channel: "freeCodeCamp.org",
    duration: 75,
    outcome: "Complete basic Linux navigation, file, and permission exercises.",
    keywords: "linux command line beginner",
  }),
  topic({
    name: "Web Security Basics",
    summary: "Learn common web risks like injection, XSS, auth mistakes, and insecure configs.",
    videoId: "u6FhOJ9w-vQ",
    channel: "freeCodeCamp.org",
    duration: 90,
    outcome: "Write a checklist for securing a student web project.",
    keywords: "web security full course",
  }),
];

const curriculumCatalog = {
  software: {
    label: "Software Engineering",
    keywords: ["software", "web", "frontend", "backend", "mern"],
    years: {
      1: {
        theme: "Start from HTML and grow into full-stack web development.",
        subjects: [
          buildSubject(
            "Web Development Roadmap",
            "Follow one clear path from HTML to full-stack deployment.",
            softwareTopics
          ),
        ],
      },
    },
  },
  machineLearning: {
    label: "Machine Learning",
    keywords: ["machine learning", "ml"],
    years: {
      1: {
        theme: "Build Python, data handling, and ML model skills in order.",
        subjects: [
          buildSubject(
            "Machine Learning Roadmap",
            "Move from Python to real ML models without jumping ahead.",
            machineLearningTopics
          ),
        ],
      },
    },
  },
  dataScience: {
    label: "Data Science",
    keywords: ["data science", "analytics", "data"],
    years: {
      1: {
        theme: "Learn Python, analysis, visualization, SQL, and projects.",
        subjects: [
          buildSubject(
            "Data Science Roadmap",
            "Turn raw data into clean analysis and simple portfolio projects.",
            dataScienceTopics
          ),
        ],
      },
    },
  },
  artificialIntelligence: {
    label: "Artificial Intelligence",
    keywords: ["artificial intelligence", "ai", "llm"],
    years: {
      1: {
        theme: "Understand AI fundamentals, ML, neural networks, and LLMs.",
        subjects: [
          buildSubject(
            "Artificial Intelligence Roadmap",
            "Build the foundation needed before advanced AI projects.",
            aiTopics
          ),
        ],
      },
    },
  },
  cyberSecurity: {
    label: "Cyber Security",
    keywords: ["cyber security", "security"],
    years: {
      1: {
        theme: "Learn networking, Linux, and web security basics first.",
        subjects: [
          buildSubject(
            "Cyber Security Roadmap",
            "Build the base before tools, labs, and advanced attacks.",
            cyberSecurityTopics
          ),
        ],
      },
    },
  },
};

module.exports = {
  curriculumCatalog,
};
