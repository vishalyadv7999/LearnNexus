const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const {
  TOPIC_CATALOG,
  detectLearningTopic,
  validateTopicAnswer,
} = require("../src/modules/learningAssistant/topicGuard");
const {
  FALLBACK_TOPICS,
  generateFallbackResponse,
} = require("../src/modules/learningAssistant/learningAssistant.fallback");

const supportedFallbackTopics = new Set(FALLBACK_TOPICS);
const validationTemplates = [
  "Explain {alias}",
  "What is {alias}?",
  "Teach me {alias}",
  "Learn {alias}",
  "{alias}",
  "Give a simple example of {alias}",
  "Explain {alias} from basics",
];

const buildValidationCases = () => {
  const cases = [];
  const supportedTopics = TOPIC_CATALOG.filter((topic) => supportedFallbackTopics.has(topic.label));

  for (const topic of supportedTopics) {
    for (const alias of topic.aliases) {
      for (const template of validationTemplates) {
        cases.push({
          expectedTopic: topic,
          question: template.replace("{alias}", alias),
        });
      }
    }
  }

  return cases.slice(0, 520);
};

describe("Learning Assistant topic guard", () => {
  it("maps HTML input variations to HTML instead of Machine Learning", () => {
    const questions = [
      "Explain HTML",
      "What is HTML",
      "Teach HTML",
      "Learn HTML",
      "HTML",
      "Explain HyperText Markup Language",
    ];

    for (const question of questions) {
      const detected = detectLearningTopic(question);
      assert.equal(detected.id, "html", `Expected HTML for "${question}"`);
      assert.notEqual(detected.id, "ml", `HTML must never be detected as ML for "${question}"`);
    }
  });

  it("rejects common wrong-topic answer patterns before they reach the frontend", () => {
    const mismatches = [
      {
        question: "Explain HTML",
        wrongAnswer: "Machine Learning is a way for computers to learn from data using models and training.",
        expectedTopic: "html",
      },
      {
        question: "Explain CSS",
        wrongAnswer: "Java is an object-oriented programming language that runs on the JVM.",
        expectedTopic: "css",
      },
      {
        question: "Explain DBMS",
        wrongAnswer: "Computer Networks use TCP, UDP, DNS, and HTTP to connect devices.",
        expectedTopic: "dbms",
      },
      {
        question: "Explain DSA",
        wrongAnswer: "Artificial Intelligence builds systems that perform human-like reasoning tasks.",
        expectedTopic: "dsa",
      },
      {
        question: "Explain Operating System",
        wrongAnswer: "HTML uses tags and elements to structure web pages.",
        expectedTopic: "os",
      },
    ];

    for (const mismatch of mismatches) {
      const detected = detectLearningTopic(mismatch.question);
      const validation = validateTopicAnswer({
        question: mismatch.question,
        answer: mismatch.wrongAnswer,
        topic: detected,
      });

      assert.equal(detected.id, mismatch.expectedTopic);
      assert.equal(validation.valid, false, `Expected rejection for "${mismatch.question}"`);
    }
  });

  it("generates and validates at least 500 topic-specific fallback answers", () => {
    const cases = buildValidationCases();
    assert.ok(cases.length >= 500, `Expected at least 500 generated cases, got ${cases.length}`);

    for (const testCase of cases) {
      const detected = detectLearningTopic(testCase.question);
      assert.ok(detected, `Expected a detected topic for "${testCase.question}"`);
      assert.equal(
        detected.id,
        testCase.expectedTopic.id,
        `Wrong detected topic for "${testCase.question}"`
      );

      const answer = generateFallbackResponse({
        message: testCase.question,
        topic: detected,
      });
      const validation = validateTopicAnswer({
        question: testCase.question,
        answer,
        topic: detected,
      });

      assert.equal(
        validation.valid,
        true,
        `Fallback answer failed validation for "${testCase.question}" with reason "${validation.reason}"`
      );
      assert.ok(answer.length > 500, `Expected detailed fallback answer for "${testCase.question}"`);
    }
  });
});
