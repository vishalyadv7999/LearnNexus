const roadmaps = [
  {
    id: "dsa",
    title: "DSA Roadmap",
    description: "Build interview-ready problem-solving skills from complexity basics to timed practice.",
    duration: "12-16 weeks",
    stages: [
      { title: "Foundations", topics: ["Time and space complexity", "Arrays", "Strings", "Recursion"] },
      { title: "Core structures", topics: ["Linked lists", "Stacks and queues", "Hashing", "Trees", "Heaps"] },
      { title: "Problem-solving patterns", topics: ["Two pointers", "Sliding window", "Binary search", "Backtracking", "Greedy"] },
      { title: "Advanced practice", topics: ["Graphs", "Dynamic programming", "Mixed timed sets", "Mock interviews"] },
    ],
  },
  {
    id: "frontend",
    title: "Frontend Interview Preparation",
    description: "Prepare for browser, JavaScript, React, accessibility, and UI problem-solving rounds.",
    duration: "8-10 weeks",
    stages: [
      { title: "Web foundations", topics: ["Semantic HTML", "CSS layout", "Responsive design", "Accessibility"] },
      { title: "JavaScript", topics: ["Scope and closures", "Async JavaScript", "DOM", "Event loop"] },
      { title: "React", topics: ["Components and state", "Hooks", "Rendering", "Performance basics"] },
      { title: "Interview practice", topics: ["UI coding tasks", "Frontend system design", "Testing", "Project walkthroughs"] },
    ],
  },
  {
    id: "backend",
    title: "Backend Interview Preparation",
    description: "Strengthen API design, databases, security, testing, and service fundamentals.",
    duration: "8-12 weeks",
    stages: [
      { title: "Server foundations", topics: ["HTTP", "REST APIs", "Node.js runtime", "Express middleware"] },
      { title: "Data layer", topics: ["SQL fundamentals", "MongoDB", "Indexes", "Transactions"] },
      { title: "Production basics", topics: ["Authentication", "Validation", "Caching", "Logging", "Error handling"] },
      { title: "Interview practice", topics: ["API design exercises", "Backend debugging", "Testing", "Service design basics"] },
    ],
  },
  {
    id: "full-stack",
    title: "Full-Stack Preparation",
    description: "Connect frontend and backend skills into a deployable, explainable product.",
    duration: "10-14 weeks",
    stages: [
      { title: "Client skills", topics: ["Responsive UI", "React state", "Forms", "API integration"] },
      { title: "Server skills", topics: ["REST design", "Authentication", "Database modeling", "Validation"] },
      { title: "Integration", topics: ["Error states", "Security basics", "Testing", "Performance"] },
      { title: "Portfolio readiness", topics: ["Deployment", "README", "Architecture diagram", "Project explanation"] },
    ],
  },
  {
    id: "ai-ml",
    title: "AI/ML Internship Preparation",
    description: "Cover the math, modeling workflow, evaluation, and practical ML discussion expected from interns.",
    duration: "12-16 weeks",
    stages: [
      { title: "Prerequisites", topics: ["Python", "NumPy and pandas", "Probability", "Linear algebra basics"] },
      { title: "Machine learning", topics: ["Regression", "Classification", "Feature engineering", "Model evaluation"] },
      { title: "Applied AI", topics: ["Neural network basics", "NLP overview", "Responsible AI", "Experiment tracking"] },
      { title: "Interview practice", topics: ["Case studies", "Metric selection", "Model trade-offs", "Project walkthroughs"] },
    ],
  },
  {
    id: "data-science",
    title: "Data Science Preparation",
    description: "Practice analysis, statistics, SQL, visualization, and decision-focused communication.",
    duration: "10-14 weeks",
    stages: [
      { title: "Data foundations", topics: ["Python", "SQL", "Data cleaning", "Exploratory analysis"] },
      { title: "Statistics", topics: ["Distributions", "Hypothesis testing", "Confidence intervals", "Experiment basics"] },
      { title: "Modeling and insight", topics: ["Regression", "Classification", "Metrics", "Visualization"] },
      { title: "Interview practice", topics: ["SQL exercises", "Product cases", "Insight storytelling", "Portfolio review"] },
    ],
  },
];

const questions = {
  hr: [
    { question: "Tell me about yourself.", guidance: "Use a 60-90 second present-past-future structure tied to the internship." },
    { question: "Why do you want this internship?", guidance: "Connect the role to skills you have practiced and one clear learning goal." },
    { question: "Describe a challenge you faced.", guidance: "Answer with Situation, Task, Action, and Result; be specific about your contribution." },
    { question: "What is one weakness you are improving?", guidance: "Choose a real, non-critical gap and show the system you use to improve it." },
  ],
  technical: [
    { question: "How would you debug a slow API?", guidance: "Clarify symptoms, measure latency, isolate layers, inspect queries, then verify the fix." },
    { question: "What is the difference between a process and a thread?", guidance: "Compare memory isolation, communication, creation cost, and failure boundaries." },
    { question: "When would you use a database index?", guidance: "Explain faster reads, extra storage, write cost, and the need to inspect query patterns." },
    { question: "How does a hash table work?", guidance: "Cover hashing, buckets, collisions, average complexity, and a practical use case." },
  ],
  projectExplanation: [
    { question: "What problem does your project solve?", guidance: "Start with the user, pain point, and measurable outcome before naming technologies." },
    { question: "Why did you choose this architecture?", guidance: "State constraints, alternatives considered, trade-offs, and what you would change at scale." },
    { question: "What was your individual contribution?", guidance: "Separate team outcomes from the code, decisions, tests, and debugging you owned." },
    { question: "What failure taught you the most?", guidance: "Explain the failure, diagnosis, fix, and the prevention you added afterward." },
  ],
  campusPlacement: [
    { question: "How are you preparing across aptitude, coding, and interviews?", guidance: "Describe a repeatable weekly plan and how you measure weak areas." },
    { question: "Are you open to learning a new technology for this role?", guidance: "Give evidence of learning something quickly rather than only saying yes." },
    { question: "How do you balance placement preparation with coursework?", guidance: "Show prioritization, time blocks, and realistic contingency planning." },
  ],
};

const resumeGuide = {
  checklist: [
    "Keep contact details professional and easy to find.",
    "Use a focused one-page resume when your experience fits comfortably.",
    "Match the skills section to tools you can explain or demonstrate.",
    "Write project bullets with action, implementation, and outcome.",
    "Add working portfolio or repository links only after checking access.",
    "Use consistent dates, headings, spacing, and verb tense.",
    "Proofread for spelling, grammar, and unsupported claims.",
    "Export to PDF and verify selectable text and readable formatting.",
  ],
  atsTips: [
    "Use standard headings such as Education, Skills, Experience, and Projects.",
    "Mirror relevant keywords from the role description naturally and truthfully.",
    "Prefer a simple single-column structure over tables, icons, or text boxes.",
    "Write common abbreviations beside the full term when useful, such as Machine Learning (ML).",
    "Avoid keyword stuffing and never claim a skill you cannot discuss.",
    "Use descriptive link text and include the visible URL when a parser may need it.",
  ],
  projectExplanation: [
    "Problem: Who had the problem and why did it matter?",
    "Approach: What did you build and why did you choose that approach?",
    "Ownership: Which parts did you personally implement or decide?",
    "Challenge: What broke or became difficult, and how did you diagnose it?",
    "Result: What changed, and how did you validate the outcome?",
    "Next step: What would you improve with more time or users?",
  ],
};

const aptitude = [
  { id: "quantitative", title: "Quantitative aptitude", topics: ["Percentages", "Ratio and proportion", "Profit and loss", "Time and work", "Probability basics"], practiceTip: "Learn one method, then solve short timed sets and review every incorrect step." },
  { id: "logical", title: "Logical reasoning", topics: ["Series", "Syllogisms", "Arrangements", "Coding-decoding", "Data sufficiency"], practiceTip: "Write constraints clearly before attempting options; avoid solving only in your head." },
  { id: "verbal", title: "Verbal ability", topics: ["Reading comprehension", "Sentence correction", "Vocabulary in context", "Para-jumbles"], practiceTip: "Practice accuracy first, then reduce time while keeping an error log." },
  { id: "data-interpretation", title: "Data interpretation", topics: ["Tables", "Bar and line charts", "Pie charts", "Caselets", "Approximation"], practiceTip: "Scan units and totals before calculating, and estimate when options are far apart." },
];

const companyPrep = {
  note: "Hiring formats change by role, location, and season. Treat these as preparation focus areas and verify the current job posting and official company communication.",
  companies: [
    { id: "service-based", name: "Large IT services roles", focus: ["Quantitative aptitude", "Communication", "Programming fundamentals", "Core CS basics"], plan: "Practice mixed aptitude sets, one coding problem daily, and concise project explanations." },
    { id: "product-startup", name: "Product companies and startups", focus: ["DSA", "Practical coding", "CS fundamentals", "Project depth"], plan: "Combine pattern-based DSA practice with code reviews, debugging, and architecture trade-offs." },
    { id: "frontend-role", name: "Frontend-focused roles", focus: ["JavaScript", "Browser fundamentals", "React", "UI coding"], plan: "Build small accessible interfaces under time limits and explain rendering and state decisions." },
    { id: "backend-role", name: "Backend-focused roles", focus: ["APIs", "Databases", "Authentication", "Service design"], plan: "Design and test small APIs, inspect query behavior, and practice failure handling." },
    { id: "data-ai-role", name: "Data and AI roles", focus: ["Python and SQL", "Statistics", "Model evaluation", "Case studies"], plan: "Practice end-to-end analysis and explain why each metric and model fits the problem." },
  ],
  campusPlan: [
    "Weeks 1-2: take a baseline test and identify the two weakest areas.",
    "Weeks 3-6: rotate aptitude, coding, CS fundamentals, and communication practice.",
    "Weeks 7-8: complete timed mocks and revise from an error log.",
    "Before each drive: read the current role description and tailor resume and preparation priorities.",
  ],
};

module.exports = { aptitude, companyPrep, questions, resumeGuide, roadmaps };
