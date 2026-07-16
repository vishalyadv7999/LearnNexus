const { detectLearningTopic, validateTopicAnswer } = require("./topicGuard");

const FALLBACK_TOPICS = [
  "HTML",
  "CSS",
  "JavaScript",
  "React",
  "Node.js",
  "Express.js",
  "MongoDB",
  "Java",
  "DSA",
  "DBMS",
  "Operating Systems",
  "Computer Networks",
  "Software Engineering",
  "Machine Learning",
  "AI",
  "Data Science",
  "Python",
  "Resume",
  "Internship preparation",
];

const normalize = (value) => String(value || "").toLowerCase();

const section = (title, lines) => [
  title,
  ...lines,
];

const structuredAnswer = ({
  topic = "the topic",
  definition,
  basics,
  steps,
  example,
  usage,
  mistakes = [],
  syntax = [],
  mechanism = [],
  advantages = [],
  disadvantages = [],
  interviewQuestions = [],
  bestPractices = [],
  relatedConcepts = [],
  practiceQuestions = [],
  difficulty = "Beginner to intermediate",
  summary,
}) =>
  [
    ...section("Simple definition", [definition]),
    "",
    ...section("Why it exists", [
      `${topic} exists because it solves a practical problem: it helps developers or students handle this idea in a clear, repeatable way instead of guessing.`,
    ]),
    "",
    ...section("Real-world analogy", [
      `Think of ${topic} like a well-labeled tool in a toolbox. Once you know what it is for, you can choose it at the right time instead of using the wrong tool for the job.`,
    ]),
    "",
    ...(syntax.length ? [...section("Syntax or basic structure", syntax), ""] : []),
    ...section("From the basics", basics),
    "",
    ...section("Step-by-step explanation", steps),
    "",
    ...section("How it works internally", mechanism.length ? mechanism : [
      `At a simple level, ${topic} works by following a set of rules. First you define the important parts, then the system/runtime/database/browser uses those parts to produce the expected behavior.`,
    ]),
    "",
    ...(example?.length ? [...section("Example", example), ""] : []),
    ...section("Output or result explanation", [
      "The important thing is not only the final output, but why that output happens. Read the example line by line and connect each result back to the rule explained above.",
    ]),
    "",
    ...section("Advantages", advantages.length ? advantages : [
      "- Makes the concept easier to organize and reuse.",
      "- Helps you explain your work clearly in projects and interviews.",
      "- Reduces mistakes because you understand the reason behind the behavior.",
    ]),
    "",
    ...section("Disadvantages or limitations", disadvantages.length ? disadvantages : [
      "- It can feel confusing if you memorize definitions without examples.",
      "- It may be misused if you do not understand when it is actually needed.",
    ]),
    "",
    ...section("Interview-style questions", interviewQuestions.length ? interviewQuestions : [
      `- What is ${topic}?`,
      `- Why is ${topic} useful?`,
      `- Can you explain ${topic} with a small example?`,
    ]),
    "",
    ...section("Where it is used in real projects", usage),
    "",
    ...(mistakes.length ? [...section("Common mistakes", mistakes), ""] : []),
    ...section("Best practices", bestPractices.length ? bestPractices : [
      "- Start from the basic definition before jumping to advanced details.",
      "- Practice with one small example.",
      "- Connect the concept to a real project feature.",
    ]),
    "",
    ...section("Related concepts", relatedConcepts.length ? relatedConcepts : [
      "- Fundamentals of the same subject.",
      "- Project implementation details.",
      "- Interview-level explanation and examples.",
    ]),
    "",
    ...section("Practice questions", practiceQuestions.length ? practiceQuestions : [
      `- Explain ${topic} in your own words.`,
      `- Give one real-world use case of ${topic}.`,
      `- Build or write a small example using ${topic}.`,
    ]),
    "",
    ...section("Difficulty level", [difficulty]),
    "",
    ...section("Short summary", [summary]),
  ].join("\n");

const codeBlock = (language, lines) => [
  `\`\`\`${language}`,
  ...lines,
  "```",
];

const topicRules = [
  {
    topic: "HTML",
    aliases: ["html", "hypertext markup language", "html5", "semantic html", "html tags", "markup"],
    answer: () =>
      structuredAnswer({
        topic: "HTML",
        definition:
          "HTML, or HyperText Markup Language, is the standard markup language used to create the structure and content of web pages.",
        syntax: [
          "- HTML uses elements written with tags, such as `<h1>`, `<p>`, `<a>`, `<img>`, and `<form>`.",
          "- Most elements have an opening tag, content, and a closing tag.",
          "- Example structure: `<tagname>content</tagname>`.",
        ],
        basics: [
          "- HTML is not a programming language because it does not perform logic like loops or conditions.",
          "- It describes what content exists on a page: headings, paragraphs, links, images, forms, lists, tables, and sections.",
          "- Browsers read HTML and create a page structure called the DOM.",
          "- CSS is usually added for styling, and JavaScript is added for interactivity.",
          "- Semantic HTML uses meaningful tags like `<header>`, `<main>`, `<article>`, and `<footer>` so browsers, search engines, and assistive tools understand the page better.",
        ],
        steps: [
          "1. Write the document structure with `<!DOCTYPE html>`, `<html>`, `<head>`, and `<body>`.",
          "2. Put page information like title and metadata inside `<head>`.",
          "3. Put visible content inside `<body>`.",
          "4. Use headings and paragraphs to organize text.",
          "5. Use links, images, lists, forms, and semantic sections based on the page requirement.",
          "6. Connect CSS and JavaScript when you need styling or behavior.",
        ],
        mechanism: [
          "- The browser downloads the HTML file from the server.",
          "- It parses tags from top to bottom.",
          "- It builds the DOM tree, where each element becomes a node.",
          "- CSS styles are applied to those nodes, and JavaScript can later read or modify them.",
        ],
        example: [
          ...codeBlock("html", [
            "<!DOCTYPE html>",
            "<html>",
            "  <head>",
            "    <title>My First Page</title>",
            "  </head>",
            "  <body>",
            "    <header>",
            "      <h1>Welcome to LearnNexus</h1>",
            "    </header>",
            "",
            "    <main>",
            "      <p>HTML gives this page its structure.</p>",
            "      <a href=\"/courses\">View courses</a>",
            "    </main>",
            "  </body>",
            "</html>",
          ]),
          "`<h1>` creates the main heading, `<p>` creates a paragraph, and `<a>` creates a clickable link.",
        ],
        usage: [
          "- Landing pages and dashboards.",
          "- Forms for login, registration, search, and feedback.",
          "- Blog pages, course pages, portfolios, and documentation.",
          "- React apps still render HTML-like elements through JSX.",
        ],
        advantages: [
          "- Easy for beginners to start.",
          "- Supported by every browser.",
          "- Provides semantic structure for accessibility and SEO.",
          "- Works with CSS and JavaScript to build complete web apps.",
        ],
        disadvantages: [
          "- HTML alone cannot create dynamic logic.",
          "- Poorly structured HTML can hurt accessibility and maintainability.",
          "- Styling and interactivity need CSS and JavaScript.",
        ],
        interviewQuestions: [
          "- What is HTML and why is it called a markup language?",
          "- What is the difference between HTML elements and tags?",
          "- What is semantic HTML?",
          "- Why are forms important in web applications?",
        ],
        mistakes: [
          "- Using only `<div>` tags instead of semantic tags.",
          "- Forgetting `alt` text for images.",
          "- Skipping labels for form inputs.",
          "- Thinking HTML is the same as CSS or JavaScript.",
        ],
        bestPractices: [
          "- Use semantic tags whenever possible.",
          "- Keep heading order logical: `<h1>`, then `<h2>`, then `<h3>`.",
          "- Add accessible labels and image `alt` text.",
          "- Keep structure in HTML, styling in CSS, and behavior in JavaScript.",
        ],
        relatedConcepts: [
          "- CSS for styling HTML.",
          "- JavaScript for interactivity.",
          "- DOM, accessibility, semantic tags, forms, and SEO basics.",
        ],
        practiceQuestions: [
          "- Create a personal portfolio page using semantic HTML.",
          "- Build a login form with labels and required fields.",
          "- Explain the difference between `<div>`, `<section>`, and `<article>`.",
        ],
        difficulty: "Beginner",
        summary:
          "HTML is the foundation of every web page. It gives content structure using tags and elements, while CSS and JavaScript build on top of it for styling and interactivity.",
      }),
  },
  {
    topic: "CSS",
    aliases: ["css", "cascading style sheets", "stylesheet", "style sheet", "flexbox", "grid", "responsive design"],
    answer: () =>
      structuredAnswer({
        topic: "CSS",
        definition:
          "CSS, or Cascading Style Sheets, is the language used to style HTML pages by controlling colors, spacing, layout, fonts, and responsiveness.",
        syntax: [
          "- CSS is usually written as `selector { property: value; }`.",
          "- Example: `p { color: blue; font-size: 16px; }`.",
          "- Selectors choose HTML elements; properties describe what to style.",
        ],
        basics: [
          "- HTML creates the structure; CSS controls how that structure looks.",
          "- CSS rules can target elements, classes, IDs, states, and screen sizes.",
          "- The cascade decides which rule wins when multiple rules target the same element.",
          "- Layout tools like Flexbox and Grid help arrange content cleanly.",
          "- Responsive design makes pages work on mobile, tablet, and desktop screens.",
        ],
        steps: [
          "1. Select the element you want to style.",
          "2. Add properties like color, margin, padding, width, display, or font-size.",
          "3. Use classes for reusable styles.",
          "4. Use Flexbox or Grid for layout.",
          "5. Add media queries for responsive design.",
          "6. Test the page on different screen sizes.",
        ],
        mechanism: [
          "- The browser loads HTML and CSS.",
          "- It matches CSS selectors to HTML elements.",
          "- It calculates the final styles using specificity, cascade order, inheritance, and default browser styles.",
          "- It paints the styled layout on the screen.",
        ],
        example: [
          ...codeBlock("css", [
            ".card {",
            "  padding: 16px;",
            "  border-radius: 12px;",
            "  background: white;",
            "  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);",
            "}",
            "",
            ".card-title {",
            "  font-size: 20px;",
            "  color: #1f2937;",
            "}",
          ]),
          "This styles a card with spacing, rounded corners, background color, shadow, and a clear title.",
        ],
        usage: [
          "- Responsive dashboards.",
          "- Portfolio pages.",
          "- Buttons, forms, cards, navbars, modals, and layouts.",
          "- React components styled with CSS modules, Tailwind classes, or normal CSS.",
        ],
        advantages: [
          "- Separates design from HTML structure.",
          "- Makes UI reusable and maintainable.",
          "- Supports responsive layouts.",
          "- Gives control over visual identity and user experience.",
        ],
        disadvantages: [
          "- Specificity conflicts can become confusing.",
          "- Large CSS files can become hard to maintain without structure.",
          "- Cross-browser differences sometimes need testing.",
        ],
        interviewQuestions: [
          "- What is the CSS box model?",
          "- What is specificity?",
          "- What is the difference between Flexbox and Grid?",
          "- How do media queries help responsive design?",
        ],
        mistakes: [
          "- Using fixed widths everywhere instead of responsive units.",
          "- Adding too many `!important` rules.",
          "- Confusing margin and padding.",
          "- Not testing mobile layouts.",
        ],
        bestPractices: [
          "- Use meaningful class names.",
          "- Keep spacing and colors consistent.",
          "- Prefer Flexbox/Grid over layout hacks.",
          "- Design mobile-friendly screens early.",
        ],
        relatedConcepts: [
          "- HTML structure.",
          "- JavaScript interactivity.",
          "- Box model, Flexbox, Grid, media queries, and accessibility.",
        ],
        practiceQuestions: [
          "- Build a responsive card grid.",
          "- Explain the box model with an example.",
          "- Convert a simple desktop navbar into a mobile-friendly navbar.",
        ],
        difficulty: "Beginner to intermediate",
        summary:
          "CSS styles HTML pages. It controls layout, spacing, colors, fonts, and responsiveness, making plain structure look like a real user interface.",
      }),
  },
  {
    topic: "JavaScript",
    aliases: ["javascript", "js", "closure", "promise", "async", "event loop", "hoist"],
    answer: (message) => {
      if (normalize(message).includes("closure")) {
        return structuredAnswer({
          definition:
            "A JavaScript closure is when a function remembers variables from the scope where it was created, even after that outer scope has finished running.",
          basics: [
            "- In JavaScript, functions can be created inside other functions.",
            "- The inner function can use variables from the outer function.",
            "- When the outer function returns, JavaScript keeps the needed variables alive if the inner function still uses them.",
            "- That remembered access is called a closure.",
          ],
          steps: [
            "1. `makeCounter()` creates a local variable called `count`.",
            "2. It returns the inner function `increment()`.",
            "3. Normally, local variables disappear after a function finishes.",
            "4. But `increment()` still needs `count`, so JavaScript keeps `count` available.",
            "5. Every time `counter()` runs, it updates the same remembered `count` value.",
          ],
          example: [
            ...codeBlock("js", [
              "function makeCounter() {",
              "  let count = 0;",
              "",
              "  return function increment() {",
              "    count += 1;",
              "    return count;",
              "  };",
              "}",
              "",
              "const counter = makeCounter();",
              "",
              "console.log(counter()); // 1",
              "console.log(counter()); // 2",
              "console.log(counter()); // 3",
            ]),
            "Here, `increment()` remembers `count`. That is why the value becomes 1, then 2, then 3 instead of resetting to 0 every time.",
          ],
          usage: [
            "- Keeping private state, like counters or cached values.",
            "- Event handlers that remember data from the component or page.",
            "- Callback functions, timers, and async logic.",
            "- React hooks and custom hooks often depend on closure behavior.",
          ],
          mistakes: [
            "- Thinking the outer variable is copied; it is remembered by reference-like access.",
            "- Accidentally using stale values in async callbacks or React effects.",
            "- Creating closures inside loops without understanding which variable is being remembered.",
          ],
          summary:
            "A closure is a function plus the variables it remembers from where it was created. It is useful for private data, callbacks, and real-world JavaScript app behavior.",
        });
      }

      return structuredAnswer({
        definition:
          "JavaScript is the programming language used to add logic and interactivity to websites and many backend applications.",
        basics: [
          "- It runs in browsers and also on servers through Node.js.",
          "- The core building blocks are variables, functions, arrays, objects, conditions, loops, and events.",
          "- Modern JavaScript uses promises, async/await, modules, and APIs heavily.",
        ],
        steps: [
          "1. Learn values and variables.",
          "2. Learn functions and scope.",
          "3. Practice arrays and objects.",
          "4. Understand DOM events for browser work.",
          "5. Learn async JavaScript for API calls.",
        ],
        example: [
          ...codeBlock("js", [
            "const name = \"Student\";",
            "",
            "function greet(userName) {",
            "  return `Hello, ${userName}!`;",
            "}",
            "",
            "console.log(greet(name));",
          ]),
        ],
        usage: [
          "- Form validation.",
          "- Interactive dashboards.",
          "- React applications.",
          "- Node.js APIs.",
          "- Fetching and displaying data from a backend.",
        ],
        mistakes: [
          "- Memorizing syntax without building small projects.",
          "- Skipping scope, closures, and async behavior.",
          "- Mixing up `==` and `===`.",
        ],
        summary:
          "JavaScript is essential for web development. Learn the basics first, then practice DOM, async code, and small projects.",
      });
    },
  },
  {
    topic: "React",
    aliases: ["react", "jsx", "component", "props", "state", "hook", "useeffect", "usestate"],
    answer: (message) => {
      const asksPropsState =
        normalize(message).includes("props") || normalize(message).includes("state");

      return structuredAnswer({
        definition: asksPropsState
          ? "In React, props are data passed from a parent component to a child component, while state is data managed inside a component that can change over time."
          : "React is a JavaScript library for building user interfaces using reusable components.",
        basics: [
          "- A component is a small piece of UI, like a button, card, navbar, or form.",
          "- Props are read-only inputs. A child should not directly change its props.",
          "- State belongs to a component and changes when users interact with the UI or data updates.",
          "- When state changes, React re-renders the component so the screen matches the new data.",
        ],
        steps: [
          "1. Create a component.",
          "2. Pass data into it using props.",
          "3. Store changing data using state.",
          "4. Update state using the state setter function.",
          "5. Let React re-render the UI automatically.",
        ],
        example: [
          ...codeBlock("jsx", [
            "import { useState } from \"react\";",
            "",
            "function WelcomeCard({ name }) {",
            "  const [likes, setLikes] = useState(0);",
            "",
            "  return (",
            "    <div>",
            "      <h2>Hello, {name}</h2>",
            "      <p>Likes: {likes}</p>",
            "      <button onClick={() => setLikes(likes + 1)}>Like</button>",
            "    </div>",
            "  );",
            "}",
          ]),
          "`name` is a prop because it comes from outside. `likes` is state because it changes inside the component.",
        ],
        usage: [
          "- Props are used to make reusable UI components.",
          "- State is used for forms, counters, modals, filters, search inputs, tabs, and API-loaded data.",
          "- Together, props and state help keep large apps organized.",
        ],
        mistakes: [
          "- Trying to directly modify props.",
          "- Updating state like a normal variable instead of using the setter.",
          "- Storing everything in state even when it can be calculated from props.",
        ],
        summary:
          "Props pass data into components; state stores data that changes. Understanding this difference is one of the most important React basics.",
      });
    },
  },
  {
    topic: "Node.js",
    aliases: ["node", "node.js", "npm", "backend javascript"],
    answer: () =>
      structuredAnswer({
        definition:
          "Node.js is a runtime that lets JavaScript run outside the browser, usually on a server.",
        basics: [
          "- It is commonly used to build backend APIs.",
          "- It uses npm packages to add features quickly.",
          "- It is strong for I/O work like databases, files, and network requests.",
        ],
        steps: [
          "1. Receive a request from the frontend.",
          "2. Run backend logic in JavaScript.",
          "3. Read or write data from a database.",
          "4. Send a response back to the client.",
        ],
        example: [
          ...codeBlock("js", [
            "console.log(\"Node.js can run JavaScript on the server\");",
          ]),
        ],
        usage: [
          "- REST APIs.",
          "- Authentication systems.",
          "- Real-time apps.",
          "- Background jobs.",
        ],
        mistakes: [
          "- Blocking the event loop with heavy synchronous work.",
          "- Keeping secrets directly in code instead of environment variables.",
        ],
        summary:
          "Node.js is server-side JavaScript, useful for APIs and backend services.",
      }),
  },
  {
    topic: "Express.js",
    aliases: ["express", "express.js", "route", "middleware", "api endpoint"],
    answer: () =>
      structuredAnswer({
        definition:
          "Express.js is a lightweight Node.js framework for building web servers and APIs.",
        basics: [
          "- A route matches an HTTP method and URL, like `GET /users`.",
          "- Middleware runs before route handlers for auth, validation, logging, or error handling.",
          "- Controllers handle request and response logic.",
        ],
        steps: [
          "1. Client sends a request.",
          "2. Express runs middleware.",
          "3. A route handler or controller runs.",
          "4. The server sends JSON, HTML, or an error response.",
        ],
        example: [
          ...codeBlock("js", [
            "app.get(\"/api/health\", (req, res) => {",
            "  res.json({ status: \"ok\" });",
            "});",
          ]),
        ],
        usage: [
          "- Login/register APIs.",
          "- CRUD dashboards.",
          "- Backend services for React apps.",
          "- API gateways and small web apps.",
        ],
        mistakes: [
          "- Not validating request body data.",
          "- Forgetting centralized error handling.",
          "- Putting too much business logic directly in route files.",
        ],
        summary:
          "Express organizes backend request handling through routes, middleware, controllers, and responses.",
      }),
  },
  {
    topic: "MongoDB",
    aliases: ["mongodb", "mongoose", "document database", "schema", "collection"],
    answer: () =>
      structuredAnswer({
        definition:
          "MongoDB is a document database that stores data in flexible JSON-like documents.",
        basics: [
          "- Data is stored in collections.",
          "- Each item is a document.",
          "- Documents can have nested objects and arrays.",
          "- Mongoose adds schemas and validation for Node.js apps.",
        ],
        steps: [
          "1. Design what data each document needs.",
          "2. Create a schema/model if using Mongoose.",
          "3. Insert, read, update, or delete documents.",
          "4. Add indexes for frequently searched fields.",
        ],
        example: [
          ...codeBlock("js", [
            "const userSchema = new mongoose.Schema({",
            "  name: String,",
            "  email: String,",
            "  course: String,",
            "});",
          ]),
        ],
        usage: [
          "- User profiles.",
          "- Chat history.",
          "- Product catalogs.",
          "- Flexible app data that may evolve over time.",
        ],
        mistakes: [
          "- Not adding indexes for important queries.",
          "- Embedding too much data in one document.",
          "- Skipping validation.",
        ],
        summary:
          "MongoDB is flexible and project-friendly, especially when paired with good schema design and indexes.",
      }),
  },
  {
    topic: "Java",
    aliases: ["java", "oops", "object oriented", "jvm", "inheritance", "polymorphism"],
    answer: () =>
      structuredAnswer({
        definition:
          "Java is a strongly typed, object-oriented programming language used for backend systems, Android apps, and interview DSA.",
        basics: [
          "- Java code is organized into classes and objects.",
          "- The JVM helps Java run on different platforms.",
          "- OOP concepts include encapsulation, inheritance, polymorphism, and abstraction.",
        ],
        steps: [
          "1. Learn syntax and data types.",
          "2. Practice classes and objects.",
          "3. Use collections like ArrayList, HashMap, Stack, and Queue.",
          "4. Solve DSA problems using Java.",
        ],
        example: [
          ...codeBlock("java", [
            "class Student {",
            "  String name;",
            "",
            "  Student(String name) {",
            "    this.name = name;",
            "  }",
            "}",
          ]),
        ],
        usage: [
          "- Enterprise backend services.",
          "- Android development.",
          "- Banking and large-scale systems.",
          "- DSA interviews.",
        ],
        mistakes: [
          "- Memorizing OOP definitions without examples.",
          "- Ignoring Java collections.",
          "- Not practicing time complexity.",
        ],
        summary:
          "Java is powerful for backend and interviews when you understand OOP, collections, and DSA.",
      }),
  },
  {
    topic: "DSA",
    aliases: ["dsa", "data structure", "algorithm", "leetcode", "array", "tree", "graph", "recursion"],
    answer: () =>
      structuredAnswer({
        definition:
          "DSA means Data Structures and Algorithms: ways to store data and solve problems efficiently.",
        basics: [
          "- Data structures organize data, like arrays, stacks, queues, trees, and graphs.",
          "- Algorithms are step-by-step methods to solve problems.",
          "- Efficiency is measured with time and space complexity.",
        ],
        steps: [
          "1. Understand the brute-force solution.",
          "2. Identify what makes it slow.",
          "3. Choose a better structure or pattern.",
          "4. Analyze time and space complexity.",
          "5. Practice similar problems.",
        ],
        example: [
          "For finding duplicates, a nested loop works but is slow. A hash set can track seen values faster.",
        ],
        usage: [
          "- Coding interviews.",
          "- Search and recommendation features.",
          "- Scheduling, routing, caching, and optimization.",
        ],
        mistakes: [
          "- Jumping to hard problems too early.",
          "- Ignoring dry runs.",
          "- Not learning patterns like two pointers, sliding window, BFS, DFS, and DP.",
        ],
        summary:
          "DSA helps you solve problems faster and explain your thinking clearly in interviews.",
      }),
  },
  {
    topic: "DBMS",
    aliases: ["dbms", "sql", "normalization", "transaction", "acid", "database"],
    answer: (message) => {
      if (normalize(message).includes("normalization")) {
        return structuredAnswer({
          definition:
            "DBMS normalization is the process of organizing database tables to reduce duplicate data and avoid update, insert, and delete problems.",
          basics: [
            "- A database table should store one clear type of information.",
            "- Repeating the same data in many rows can cause inconsistency.",
            "- Normalization splits data into related tables and connects them using keys.",
            "- The most common levels are 1NF, 2NF, and 3NF.",
          ],
          steps: [
            "1. Identify repeating groups or multi-value columns.",
            "2. Put each value in a proper row and column. This is 1NF.",
            "3. Remove partial dependency, where a column depends on only part of a composite key. This is 2NF.",
            "4. Remove transitive dependency, where non-key data depends on other non-key data. This is 3NF.",
            "5. Connect tables using primary keys and foreign keys.",
          ],
          example: [
            "Bad design:",
            "",
            "| StudentId | StudentName | Course1 | Course2 | DepartmentName |",
            "| --- | --- | --- | --- | --- |",
            "| 1 | Asha | DBMS | OS | Computer Science |",
            "",
            "Better normalized idea:",
            "",
            "- `Students(StudentId, StudentName, DepartmentId)`",
            "- `Departments(DepartmentId, DepartmentName)`",
            "- `Courses(CourseId, CourseName)`",
            "- `StudentCourses(StudentId, CourseId)`",
            "",
            "Now the department name is stored once, and a student can have many courses without adding `Course1`, `Course2`, etc.",
          ],
          usage: [
            "- Student management systems.",
            "- E-commerce orders and products.",
            "- Banking systems.",
            "- Any app where data consistency matters.",
          ],
          mistakes: [
            "- Thinking normalization means making many tables randomly.",
            "- Over-normalizing simple read-heavy data without performance needs.",
            "- Forgetting foreign keys or relationships.",
          ],
          summary:
            "Normalization keeps database data clean, reduces duplication, and prevents inconsistency by splitting data into well-related tables.",
        });
      }

      return structuredAnswer({
        definition:
          "DBMS is software that helps store, manage, and retrieve structured data safely and efficiently.",
        basics: [
          "- Data is commonly stored in tables.",
          "- Keys identify records and connect tables.",
          "- SQL is used to query relational databases.",
          "- Transactions protect data correctness.",
        ],
        steps: [
          "1. Design entities and relationships.",
          "2. Create tables with keys.",
          "3. Query data using SQL.",
          "4. Use transactions and indexes where needed.",
        ],
        example: [
          "`Students`, `Courses`, and `Enrollments` can be separate tables connected by IDs.",
        ],
        usage: [
          "- Login systems.",
          "- Payments.",
          "- College records.",
          "- Inventory and order management.",
        ],
        mistakes: [
          "- Ignoring keys.",
          "- Not understanding joins.",
          "- Skipping normalization basics.",
        ],
        summary:
          "DBMS is the foundation for reliable data storage and querying in most software systems.",
      });
    },
  },
  {
    topic: "Operating Systems",
    aliases: ["operating system", "os", "process", "thread", "deadlock", "memory management"],
    answer: () =>
      structuredAnswer({
        definition:
          "An Operating System is system software that manages hardware and provides services for applications.",
        basics: [
          "- It manages CPU, memory, files, and devices.",
          "- A process is a running program.",
          "- A thread is a smaller unit of execution inside a process.",
          "- Memory management decides how programs get and use memory.",
        ],
        steps: [
          "1. A program requests resources.",
          "2. The OS schedules CPU time.",
          "3. It allocates memory.",
          "4. It handles file/device access.",
          "5. It protects programs from interfering with each other.",
        ],
        example: [
          "When you open a browser, the OS creates processes, gives memory, schedules CPU time, and handles network/device operations.",
        ],
        usage: [
          "- Understanding performance issues.",
          "- Debugging crashes.",
          "- Backend concurrency.",
          "- Interview fundamentals.",
        ],
        mistakes: [
          "- Confusing process and thread.",
          "- Memorizing scheduling algorithms without understanding why scheduling is needed.",
        ],
        summary:
          "The OS is the manager between applications and hardware.",
      }),
  },
  {
    topic: "Computer Networks",
    aliases: ["computer network", "networking", "cn", "tcp", "udp", "http", "osi", "dns"],
    answer: () =>
      structuredAnswer({
        definition:
          "Computer Networks are systems that allow computers and devices to communicate and share data.",
        basics: [
          "- IP addresses identify devices.",
          "- DNS converts domain names into IP addresses.",
          "- TCP provides reliable communication.",
          "- HTTP/HTTPS is used by web apps to exchange data.",
        ],
        steps: [
          "1. Browser asks DNS for the server IP.",
          "2. Browser connects to the server.",
          "3. Browser sends an HTTP request.",
          "4. Server returns a response.",
          "5. Browser displays or processes the result.",
        ],
        example: [
          "Opening a website involves DNS lookup, connection setup, request, response, and rendering.",
        ],
        usage: [
          "- Web development.",
          "- API debugging.",
          "- Cloud deployment.",
          "- Security and HTTPS understanding.",
        ],
        mistakes: [
          "- Confusing TCP and UDP.",
          "- Ignoring status codes.",
          "- Not understanding client-server flow.",
        ],
        summary:
          "Networking explains how your frontend, backend, and external services communicate.",
      }),
  },
  {
    topic: "Software Engineering",
    aliases: ["software engineering", "sdlc", "testing", "design pattern", "agile"],
    answer: () =>
      structuredAnswer({
        definition:
          "Software Engineering is the disciplined process of designing, building, testing, deploying, and maintaining software.",
        basics: [
          "- Good software is not only working code; it should be maintainable and reliable.",
          "- Requirements explain what to build.",
          "- Design explains how it will be structured.",
          "- Testing helps catch mistakes.",
        ],
        steps: [
          "1. Understand the problem.",
          "2. Design the solution.",
          "3. Implement cleanly.",
          "4. Test important behavior.",
          "5. Deploy and maintain.",
        ],
        example: [
          "For a task app, software engineering includes user requirements, database schema, API routes, UI screens, tests, deployment, and future bug fixes.",
        ],
        usage: [
          "- Team projects.",
          "- Production apps.",
          "- Internships.",
          "- Long-term maintainable codebases.",
        ],
        mistakes: [
          "- Writing code before understanding requirements.",
          "- Ignoring tests and documentation.",
          "- Mixing all logic into one file.",
        ],
        summary:
          "Software engineering helps turn code into reliable software that people can use and maintain.",
      }),
  },
  {
    topic: "Machine Learning",
    aliases: ["machine learning", "ml", "supervised", "unsupervised", "model training", "regression"],
    answer: () =>
      structuredAnswer({
        definition:
          "Machine Learning is a way for computers to learn patterns from data and make predictions or decisions without being explicitly programmed for every rule.",
        basics: [
          "- Data is the foundation of ML.",
          "- Features are input values used by the model.",
          "- Labels are target answers in supervised learning.",
          "- Training means the model learns patterns from examples.",
          "- Testing checks how well the model works on unseen data.",
        ],
        steps: [
          "1. Collect useful data.",
          "2. Clean and prepare the data.",
          "3. Choose features and labels.",
          "4. Train a model.",
          "5. Evaluate it using metrics.",
          "6. Improve data, features, or model if results are weak.",
        ],
        example: [
          "If you want to predict house prices, features might be area, number of rooms, city, and age of the house. The label is the actual price. The model learns from past house data and predicts prices for new houses.",
        ],
        usage: [
          "- Recommendation systems.",
          "- Spam detection.",
          "- Fraud detection.",
          "- Image classification.",
          "- Demand or price prediction.",
        ],
        mistakes: [
          "- Training on poor-quality data.",
          "- Testing on the same data used for training.",
          "- Thinking a high training score always means a good model.",
          "- Ignoring overfitting.",
        ],
        summary:
          "Machine Learning learns patterns from data. A good ML workflow needs clean data, correct evaluation, and honest handling of mistakes.",
      }),
  },
  {
    topic: "AI",
    aliases: ["artificial intelligence", " ai ", "chatbot", "llm", "generative ai"],
    answer: () =>
      structuredAnswer({
        definition:
          "Artificial Intelligence is the field of building systems that can perform tasks that usually need human-like intelligence.",
        basics: [
          "- AI includes reasoning, language, vision, planning, and decision-making.",
          "- Machine Learning is one approach inside AI.",
          "- Generative AI creates text, code, images, or other outputs from learned patterns.",
        ],
        steps: [
          "1. Define the intelligent task.",
          "2. Choose rules, ML, or another AI approach.",
          "3. Provide data or knowledge.",
          "4. Evaluate the system carefully.",
          "5. Add safeguards for mistakes.",
        ],
        example: [
          "A chatbot uses AI to understand a question and generate a useful response.",
        ],
        usage: [
          "- Chatbots.",
          "- Search assistants.",
          "- Medical image support.",
          "- Fraud detection.",
          "- Recommendation systems.",
        ],
        mistakes: [
          "- Assuming AI is always correct.",
          "- Confusing AI with only robots.",
          "- Trusting generated facts without verification.",
        ],
        summary:
          "AI is a broad field for intelligent systems; ML and generative AI are important parts of it.",
      }),
  },
  {
    topic: "Data Science",
    aliases: ["data science", "pandas", "visualization", "eda", "statistics"],
    answer: () =>
      structuredAnswer({
        definition:
          "Data Science is the process of using data, statistics, programming, and domain knowledge to find insights and support decisions.",
        basics: [
          "- Data must often be cleaned before it is useful.",
          "- EDA means exploring data to find patterns.",
          "- Visualization helps explain findings.",
          "- Machine learning may be used when prediction is needed.",
        ],
        steps: [
          "1. Ask a clear question.",
          "2. Collect data.",
          "3. Clean missing or incorrect values.",
          "4. Explore patterns.",
          "5. Visualize findings.",
          "6. Build models if needed.",
          "7. Communicate the result clearly.",
        ],
        example: [
          "For student performance data, you might analyze attendance, study hours, previous marks, and final scores to find which factors relate to better results.",
        ],
        usage: [
          "- Business dashboards.",
          "- Product analytics.",
          "- Forecasting.",
          "- Experiment analysis.",
        ],
        mistakes: [
          "- Starting with ML before understanding the data.",
          "- Ignoring missing values.",
          "- Making charts that do not answer the question.",
        ],
        summary:
          "Data Science turns raw data into useful insight through cleaning, analysis, visualization, and sometimes ML.",
      }),
  },
  {
    topic: "Python",
    aliases: ["python", "django", "flask", "numpy"],
    answer: () =>
      structuredAnswer({
        definition:
          "Python is a beginner-friendly programming language used in scripting, backend development, data science, AI, and automation.",
        basics: [
          "- Python syntax is readable and concise.",
          "- Lists, dictionaries, functions, and modules are core concepts.",
          "- It has strong libraries for web, data, and ML work.",
        ],
        steps: [
          "1. Learn variables and data types.",
          "2. Practice conditions and loops.",
          "3. Learn functions.",
          "4. Work with lists and dictionaries.",
          "5. Use files, modules, and packages.",
        ],
        example: [
          ...codeBlock("python", [
            "def greet(name):",
            "    return f\"Hello, {name}!\"",
            "",
            "print(greet(\"Student\"))",
          ]),
        ],
        usage: [
          "- Automation scripts.",
          "- Flask/Django backend apps.",
          "- Data analysis with Pandas.",
          "- Machine learning with scikit-learn or related libraries.",
        ],
        mistakes: [
          "- Only watching tutorials without writing code.",
          "- Skipping data structures.",
          "- Not using virtual environments for projects.",
        ],
        summary:
          "Python is a practical first language and a strong tool for backend, data, and AI projects.",
      }),
  },
  {
    topic: "Resume",
    aliases: ["resume", "cv", "ats", "portfolio"],
    answer: () =>
      structuredAnswer({
        definition:
          "A resume is a short professional document that shows your education, skills, projects, experience, and achievements.",
        basics: [
          "- For students, one page is usually best.",
          "- Recruiters scan resumes quickly, so clarity matters.",
          "- Projects should prove skills, not just list technologies.",
        ],
        steps: [
          "1. Add contact details and links.",
          "2. Add education.",
          "3. Add technical skills you can explain.",
          "4. Add 2-3 strong projects with impact.",
          "5. Add internships, achievements, or certifications if relevant.",
          "6. Proofread and keep formatting clean.",
        ],
        example: [
          "Weak: `Made a React app.`",
          "Better: `Built a React task manager with JWT login, MongoDB storage, and progress filters; improved task tracking for daily study workflow.`",
        ],
        usage: [
          "- Internship applications.",
          "- Placement drives.",
          "- LinkedIn profile building.",
          "- Project discussions in interviews.",
        ],
        mistakes: [
          "- Adding skills you cannot explain.",
          "- Writing long paragraphs.",
          "- Using fake metrics or fake experience.",
          "- Forgetting GitHub/portfolio links for projects.",
        ],
        summary:
          "A good resume is honest, clear, one-page, and project-focused.",
      }),
  },
  {
    topic: "Internship preparation",
    aliases: ["internship", "placement", "interview", "hr round", "technical round", "frontend"],
    answer: (message) => {
      const asksFrontend = normalize(message).includes("frontend");

      return structuredAnswer({
        definition: asksFrontend
          ? "Frontend internship preparation means building the skills needed to create user interfaces and explain your work clearly in interviews."
          : "Internship preparation means preparing your technical skills, projects, resume, and interview communication for entry-level real-world work.",
        basics: asksFrontend
          ? [
              "- Frontend work mainly uses HTML, CSS, JavaScript, and often React.",
              "- Interviewers check whether you understand UI basics, JavaScript logic, components, API calls, and project explanation.",
              "- A strong project matters more than many half-finished tutorials.",
            ]
          : [
              "- You need fundamentals, projects, resume clarity, and interview confidence.",
              "- DSA and CS basics help in technical rounds.",
              "- Projects help prove practical skill.",
            ],
        steps: asksFrontend
          ? [
              "1. Revise HTML: semantic tags, forms, accessibility basics.",
              "2. Revise CSS: flexbox, grid, responsive design, spacing, and clean layouts.",
              "3. Strengthen JavaScript: arrays, objects, functions, DOM, async/await, fetch, closures, and events.",
              "4. Learn React basics: components, props, state, effects, routing, forms, and API integration.",
              "5. Build 2 projects: one polished frontend app and one full-stack/API-connected app.",
              "6. Prepare project explanations: problem, features, tech stack, your role, challenges, and improvements.",
              "7. Practice common interview questions and small coding tasks.",
            ]
          : [
              "1. Pick the internship role you want.",
              "2. Prepare role-specific fundamentals.",
              "3. Build and polish projects.",
              "4. Practice DSA or coding questions regularly.",
              "5. Improve resume and project explanations.",
              "6. Practice HR and technical mock answers.",
            ],
        example: asksFrontend
          ? [
              "Good frontend project idea: a study planner dashboard with login UI, task cards, filters, progress chart, and API integration.",
              "When explaining it, say what problem it solves, which components you built, how state is managed, how API data is loaded, and how you handled loading/error states.",
            ]
          : [
              "For a full-stack internship, a good project might include authentication, CRUD APIs, database models, validation, and a clean frontend.",
            ],
        usage: [
          "- Campus internships.",
          "- Startup intern roles.",
          "- Portfolio projects.",
          "- Technical and HR interview rounds.",
        ],
        mistakes: [
          "- Applying with only tutorial projects.",
          "- Not being able to explain your own code.",
          "- Ignoring responsive design and error states.",
          "- Listing too many skills without proof.",
        ],
        summary: asksFrontend
          ? "For a frontend internship, master HTML/CSS/JavaScript, learn React well, build polished projects, and practice explaining your decisions clearly."
          : "Internship preparation is a mix of fundamentals, projects, resume, coding practice, and communication.",
      });
    },
  },
];

const ruleByTopicId = {
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  react: "React",
  nodejs: "Node.js",
  express: "Express.js",
  mongodb: "MongoDB",
  java: "Java",
  dsa: "DSA",
  dbms: "DBMS",
  os: "Operating Systems",
  cn: "Computer Networks",
  se: "Software Engineering",
  ml: "Machine Learning",
  ai: "AI",
  datascience: "Data Science",
  python: "Python",
  resume: "Resume",
  internship: "Internship preparation",
};

const fallbackAliasPattern = (alias) => {
  const escaped = String(alias).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i");
};

const detectTopic = (message, providedTopic) => {
  const guardedTopic = providedTopic || detectLearningTopic(message);
  const expectedRuleTopic = guardedTopic ? ruleByTopicId[guardedTopic.id] : null;

  if (expectedRuleTopic) {
    const rule = topicRules.find((entry) => entry.topic === expectedRuleTopic);
    if (rule) {
      return rule;
    }
  }

  const normalized = ` ${normalize(message)} `;
  return topicRules.find((rule) =>
    rule.aliases.some((alias) => fallbackAliasPattern(normalize(alias)).test(normalized))
  );
};

const generateFallbackResponse = ({ message, topic }) => {
  const rule = detectTopic(message, topic);
  if (rule) {
    const answer = rule.answer(message);
    const validation = validateTopicAnswer({ question: message, answer, topic });
    if (validation.valid) {
      return answer;
    }
  }

  return structuredAnswer({
    topic: "the requested learning topic",
    definition:
      "This is a learning question, so the best approach is to break the topic into meaning, basics, example, usage, and summary.",
    basics: [
      "- Start by identifying the exact concept being asked.",
      "- Learn the simplest definition first.",
      "- Then connect it to a small example.",
      "- Finally, understand where it appears in projects or interviews.",
    ],
    steps: [
      "1. Write the topic in one sentence.",
      "2. List the key parts of the topic.",
      "3. Study one small example.",
      "4. Ask how it is used in a real project.",
      "5. Practice explaining it in your own words.",
    ],
    example: [
      "If the topic is React state, start with: state is changing data inside a component. Then build a counter example. Then explain how state is used in forms, filters, modals, and API-loaded pages.",
    ],
    usage: [
      "- Interview preparation.",
      "- Project explanation.",
      "- Debugging real code.",
      "- Building a stronger foundation before advanced topics.",
    ],
    mistakes: [
      "- Jumping to advanced details before basics.",
      "- Memorizing definitions without examples.",
      "- Not connecting the concept to real project usage.",
    ],
    summary:
      "Ask the topic with one specific question, and I can explain it from basics with examples and project usage.",
  });
};

module.exports = {
  FALLBACK_TOPICS,
  detectTopic,
  generateFallbackResponse,
};
