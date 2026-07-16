const assert = require("node:assert/strict");
const { after, afterEach, before, describe, it } = require("node:test");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/learnnexus-features-test";
process.env.JWT_SECRET = "test_shared_secret_that_is_long_enough_for_feature_tests";
process.env.JWT_ACCESS_SECRET = "test_access_secret_that_is_long_enough_for_feature_tests";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.COOKIE_SECURE = "false";
process.env.OPENAI_API_KEY = "";

const app = require("../src/app");
const env = require("../src/config/env");
const User = require("../src/models/User");
const { signAccessToken } = require("../src/utils/jwt");

let mongoServer;
let accessToken;
const originalFetch = global.fetch;
const originalAiProvider = env.aiProvider;
const originalOpenAiApiKey = env.openAiApiKey;
const originalOpenAiModel = env.openAiModel;
const originalLearningAssistantMaxRetries = env.learningAssistantMaxRetries;

describe("isolated internship prep and learning assistant modules", () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: "learnnexus-features-test" });
    const user = await User.create({
      name: "Feature Student",
      email: "feature-student@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 2,
      emailVerified: true,
    });
    accessToken = signAccessToken(user);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    global.fetch = originalFetch;
    env.aiProvider = originalAiProvider;
    env.openAiApiKey = originalOpenAiApiKey;
    env.openAiModel = originalOpenAiModel;
    env.learningAssistantMaxRetries = originalLearningAssistantMaxRetries;
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    env.aiProvider = "openai";
    env.openAiApiKey = "";
    env.openAiModel = "gpt-4.1-mini";
    env.learningAssistantMaxRetries = 0;
  });

  it("serves all internship preparation resources from static module data", async () => {
    const [roadmaps, questions, resume, aptitude, companies] = await Promise.all([
      request(app).get("/api/internship-prep/roadmaps"),
      request(app).get("/api/internship-prep/questions"),
      request(app).get("/api/internship-prep/resume-guide"),
      request(app).get("/api/internship-prep/aptitude"),
      request(app).get("/api/internship-prep/company-prep"),
    ]);

    assert.equal(roadmaps.status, 200);
    assert.equal(roadmaps.body.data.length, 6);
    assert.ok(questions.body.data.hr.length > 0);
    assert.ok(questions.body.data.technical.length > 0);
    assert.ok(resume.body.data.atsTips.length > 0);
    assert.ok(aptitude.body.data.length > 0);
    assert.ok(companies.body.data.campusPlan.length > 0);
  });

  it("exposes assistant health without auth and validates assistant input", async () => {
    const health = await request(app).get("/api/learning-assistant/health");
    assert.equal(health.status, 200);
    assert.equal(health.body.chatRoute, "POST /api/learning-assistant/chat");
    assert.equal(health.body.fallbackAvailable, true);
    assert.ok(health.body.fallbackTopics.includes("JavaScript"));

    const invalid = await request(app)
      .post("/api/learning-assistant/chat")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ message: "" });
    assert.equal(invalid.status, 422);

    const tooLong = await request(app)
      .post("/api/learning-assistant/chat")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ message: "a".repeat(2001) });
    assert.equal(tooLong.status, 422);
  });

  it("handles vague questions with one clarification", async () => {
    const vague = await request(app)
      .post("/api/learning-assistant/chat")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ message: "help" });
    assert.equal(vague.status, 201);
    assert.equal(vague.body.mode, "clarification");
    assert.equal(vague.body.messages.length, 2);
    assert.equal(vague.body.messages[1].role, "assistant");
    assert.match(vague.body.messages[1].content, /which topic/i);

    const history = await request(app)
      .get("/api/learning-assistant/history")
      .set("Authorization", `Bearer ${accessToken}`);
    assert.equal(history.status, 200);
    assert.equal(history.body.messages.length, 2);
  });

  it("returns a useful local fallback without an AI key and can clear history", async () => {
    env.openAiApiKey = "";

    const fallback = await request(app)
      .post("/api/learning-assistant/chat")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ message: "Explain JavaScript closures with an example." });
    assert.equal(fallback.status, 201);
    assert.equal(fallback.body.mode, "fallback");
    assert.equal(fallback.body.reason, "missing_key");
    assert.match(fallback.body.messages[1].content, /closure/i);
    assert.match(fallback.body.messages[1].content, /makeCounter/i);

    const cleared = await request(app)
      .delete("/api/learning-assistant/history")
      .set("Authorization", `Bearer ${accessToken}`);
    assert.equal(cleared.status, 200);

    const history = await request(app)
      .get("/api/learning-assistant/history")
      .set("Authorization", `Bearer ${accessToken}`);
    assert.deepEqual(history.body.messages, []);
  });

  it("uses the OpenAI Responses API shape when the provider is available", async () => {
    let capturedRequest;
    env.openAiApiKey = "sk-test-key";
    env.openAiModel = "gpt-4.1-mini";
    env.learningAssistantMaxRetries = 0;
    global.fetch = async (url, options) => {
      capturedRequest = {
        url,
        headers: options.headers,
        body: JSON.parse(options.body),
      };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          output_text: "A closure is a function remembering variables from its outer scope.",
        }),
      };
    };

    const response = await request(app)
      .post("/api/learning-assistant/chat")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ message: "Explain JavaScript closures with a simple example." });

    assert.equal(response.status, 201);
    assert.equal(response.body.mode, "ai");
    assert.equal(capturedRequest.url, "https://api.openai.com/v1/responses");
    assert.equal(capturedRequest.headers.Authorization, "Bearer sk-test-key");
    assert.equal(capturedRequest.body.model, "gpt-4.1-mini");
    assert.match(capturedRequest.body.instructions, /LearnNexus Learning Assistant/);
    assert.ok(Array.isArray(capturedRequest.body.input));
    assert.deepEqual(
      capturedRequest.body.input.at(-1),
      { role: "user", content: "Explain JavaScript closures with a simple example." }
    );
    assert.equal(capturedRequest.body.max_output_tokens, 2200);
    assert.equal(capturedRequest.body.temperature, 0.25);
    assert.match(response.body.messages[1].content, /closure/i);
  });

  it("isolates fresh questions from old topics and rejects wrong-topic AI answers", async () => {
    const capturedRequests = [];
    env.openAiApiKey = "sk-test-key";
    env.openAiModel = "gpt-4.1-mini";
    env.learningAssistantMaxRetries = 0;

    await request(app)
      .delete("/api/learning-assistant/history")
      .set("Authorization", `Bearer ${accessToken}`);

    global.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      capturedRequests.push(body);
      const latestQuestion = body.input.at(-1).content;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          output_text: latestQuestion.includes("HTML")
            ? "Machine Learning is a way for computers to learn from data using models and training."
            : "Machine Learning is a field where models learn patterns from data, features, labels, and training examples.",
        }),
      };
    };

    const machineLearning = await request(app)
      .post("/api/learning-assistant/chat")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ message: "What is machine learning?" });

    assert.equal(machineLearning.status, 201);
    assert.equal(machineLearning.body.mode, "ai");
    assert.equal(machineLearning.body.topic.id, "ml");

    const html = await request(app)
      .post("/api/learning-assistant/chat")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ message: "Explain HTML." });

    assert.equal(html.status, 201);
    assert.equal(html.body.mode, "fallback");
    assert.equal(html.body.reason, "topic_mismatch");
    assert.equal(html.body.topic.id, "html");
    assert.equal(html.body.validation.valid, true);
    assert.match(html.body.messages[1].content, /HTML/i);
    assert.match(html.body.messages[1].content, /HyperText Markup Language/i);
    assert.doesNotMatch(html.body.messages[1].content, /^Machine Learning is/i);

    const htmlProviderRequest = capturedRequests.at(-1);
    assert.equal(htmlProviderRequest.input.length, 1);
    assert.deepEqual(htmlProviderRequest.input[0], { role: "user", content: "Explain HTML." });
    assert.match(htmlProviderRequest.instructions, /Detected topic: HTML/i);
    assert.match(htmlProviderRequest.instructions, /Treat this as a fresh independent learning question/i);
    assert.doesNotMatch(JSON.stringify(htmlProviderRequest.input), /machine learning/i);
  });

  it("returns detailed structured fallback answers for common learning questions", async () => {
    env.openAiApiKey = "";
    await request(app)
      .delete("/api/learning-assistant/history")
      .set("Authorization", `Bearer ${accessToken}`);

    const checks = [
      {
        question: "Explain JavaScript closures with a simple example.",
        patterns: [/Simple definition/i, /Step-by-step explanation/i, /```js/i, /makeCounter/i, /Short summary/i],
      },
      {
        question: "What is DBMS normalization?",
        patterns: [/normalization/i, /1NF/i, /primary keys and foreign keys/i, /Short summary/i],
      },
      {
        question: "Explain React props and state.",
        patterns: [/props/i, /state/i, /```jsx/i, /Common mistakes/i],
      },
      {
        question: "What is machine learning?",
        patterns: [/features/i, /labels/i, /Training/i, /overfitting/i],
      },
      {
        question: "How should I prepare for frontend internship?",
        patterns: [/Frontend internship preparation/i, /HTML/i, /CSS/i, /JavaScript/i, /React/i],
      },
    ];

    for (const check of checks) {
      const response = await request(app)
        .post("/api/learning-assistant/chat")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ message: check.question });

      assert.equal(response.status, 201);
      assert.equal(response.body.mode, "fallback");
      const answer = response.body.messages[1].content;
      assert.ok(answer.length > 500, `Expected a detailed answer for: ${check.question}`);
      for (const pattern of check.patterns) {
        assert.match(answer, pattern);
      }
    }

    await request(app)
      .delete("/api/learning-assistant/history")
      .set("Authorization", `Bearer ${accessToken}`);
  });

  it("falls back instead of failing when the AI key is invalid", async () => {
    env.openAiApiKey = "sk-invalid";
    env.learningAssistantMaxRetries = 0;
    global.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: "invalid_api_key",
          message: "Incorrect API key provided.",
        },
      }),
    });

    const response = await request(app)
      .post("/api/learning-assistant/chat")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ message: "Explain JavaScript closures with a simple example." });

    assert.equal(response.status, 201);
    assert.equal(response.body.mode, "fallback");
    assert.equal(response.body.reason, "invalid_key");
    assert.match(response.body.messages[1].content, /closure/i);
  });
});
