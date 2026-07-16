const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/learnnexus-test";
process.env.JWT_SECRET = "test_shared_secret_that_is_long_enough_for_auth_tests";
process.env.JWT_ACCESS_SECRET = "test_access_secret_that_is_long_enough_for_tests";
process.env.JWT_ACCESS_EXPIRES_IN = "2s";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAME_SITE = "lax";
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";

const app = require("../src/app");
const RefreshToken = require("../src/models/RefreshToken");
const User = require("../src/models/User");

let mongoServer;

describe("auth session flow", () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "learnnexus-auth-test",
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("registers, verifies, refreshes, and logs out with persistent refresh cookies", async () => {
    const agent = request.agent(app);
    const email = "student@example.com";

    const registerResponse = await agent.post("/api/auth/register").send({
      name: "Student One",
      email,
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
    });

    assert.equal(registerResponse.status, 201);
    assert.match(registerResponse.body.devVerificationCode, /^\d{6}$/);

    const verifyResponse = await agent.post("/api/auth/verify").send({
      email,
      code: registerResponse.body.devVerificationCode,
    });

    assert.equal(verifyResponse.status, 200);
    assert.ok(verifyResponse.body.accessToken);
    assert.ok(verifyResponse.headers["set-cookie"].some((item) => item.includes("HttpOnly")));

    const meResponse = await agent
      .get("/api/users/me")
      .set("Authorization", `Bearer ${verifyResponse.body.accessToken}`);

    assert.equal(meResponse.status, 200);
    assert.equal(meResponse.body.user.email, email);

    const refreshResponse = await agent.post("/api/auth/refresh").send();
    assert.equal(refreshResponse.status, 200);
    assert.ok(refreshResponse.body.accessToken);
    assert.notEqual(refreshResponse.body.accessToken, verifyResponse.body.accessToken);
    assert.ok(
      refreshResponse.headers["set-cookie"].some((item) => item.includes("Path=/api"))
    );

    const refreshTokens = await RefreshToken.find({ user: verifyResponse.body.user.id });
    assert.equal(refreshTokens.length, 1);
    assert.equal(refreshTokens[0].revokedAt, undefined);

    const v1RefreshResponse = await agent.post("/api/v1/auth/refresh").send();
    assert.equal(v1RefreshResponse.status, 200);
    assert.ok(v1RefreshResponse.body.accessToken);

    const logoutResponse = await agent.post("/api/auth/logout").send();
    assert.equal(logoutResponse.status, 200);

    const rejectedRefreshResponse = await agent.post("/api/auth/refresh").send();
    assert.equal(rejectedRefreshResponse.status, 401);
  });

  it("does not leak whether an email exists during login or recovery", async () => {
    const missingLogin = await request(app).post("/api/auth/login").send({
      email: "missing@example.com",
      password: "StrongPass1",
    });

    assert.equal(missingLogin.status, 401);
    assert.equal(missingLogin.body.message, "Incorrect email or password.");

    const recovery = await request(app).post("/api/auth/forgot-password").send({
      email: "missing@example.com",
    });

    assert.equal(recovery.status, 200);
    assert.match(recovery.body.message, /reset link/);
  });

  it("returns useful creator channels for selected course and language", async () => {
    const machineLearning = await request(app)
      .get("/api/auth/channels")
      .query({ language: "Hindi", course: "Machine Learning" });

    assert.equal(machineLearning.status, 200);
    const machineLearningCreators = machineLearning.body.channels.map((channel) => channel.name);
    assert.ok(machineLearningCreators.includes("CodeWithHarry"));
    assert.ok(machineLearningCreators.includes("Sheryians Coding School"));
    assert.ok(machineLearningCreators.includes("WsCube Tech"));
    assert.ok(machineLearningCreators.includes("Great Learning"));

    const englishMachineLearning = await request(app)
      .get("/api/auth/channels")
      .query({ language: "English", course: "Machine Learning" });

    assert.equal(englishMachineLearning.status, 200);
    assert.ok(
      englishMachineLearning.body.channels
        .map((channel) => channel.name)
        .includes("freeCodeCamp.org")
    );
    assert.ok(
      englishMachineLearning.body.channels
        .map((channel) => channel.name)
        .includes("StatQuest")
    );

    const englishDataScience = await request(app)
      .get("/api/auth/channels")
      .query({ language: "English", course: "Data Science" });

    assert.equal(englishDataScience.status, 200);
    assert.ok(
      englishDataScience.body.channels
        .map((channel) => channel.name)
        .includes("freeCodeCamp.org")
    );
    assert.ok(
      englishDataScience.body.channels
        .map((channel) => channel.name)
        .includes("StatQuest")
    );

    const artificialIntelligence = await request(app)
      .get("/api/auth/channels")
      .query({ language: "Hindi", course: "Artificial Intelligence" });

    assert.equal(artificialIntelligence.status, 200);
    assert.ok(artificialIntelligence.body.channels.length > 0);
    assert.ok(
      artificialIntelligence.body.channels
        .map((channel) => channel.name)
        .includes("The iScale")
    );
    assert.ok(
      artificialIntelligence.body.channels
        .map((channel) => channel.name)
        .includes("Great Learning")
    );
    assert.ok(
      artificialIntelligence.body.channels
        .map((channel) => channel.name)
        .includes("edureka!")
    );
    assert.ok(
      artificialIntelligence.body.channels
        .map((channel) => channel.name)
        .includes("Intellipaat")
    );
    assert.ok(
      !artificialIntelligence.body.channels
        .map((channel) => channel.name)
        .includes("WsCube Tech")
    );
    assert.deepEqual(
      artificialIntelligence.body.channels.slice(0, 3).map((channel) => channel.name),
      ["The iScale", "Great Learning", "edureka!"]
    );

    const cyberSecurity = await request(app)
      .get("/api/auth/channels")
      .query({ language: "Hindi", course: "Cyber Security" });

    assert.equal(cyberSecurity.status, 200);
    const cyberSecurityCreators = cyberSecurity.body.channels.map((channel) => channel.name);
    assert.ok(cyberSecurityCreators.includes("WsCube Cyber Security"));
    assert.ok(cyberSecurityCreators.includes("Great Learning"));
    assert.ok(!cyberSecurityCreators.includes("WsCube Tech"));

    const englishArtificialIntelligence = await request(app)
      .get("/api/auth/channels")
      .query({ language: "English", course: "Artificial Intelligence" });

    assert.equal(englishArtificialIntelligence.status, 200);
    const englishArtificialIntelligenceCreators = englishArtificialIntelligence.body.channels.map(
      (channel) => channel.name
    );
    assert.ok(englishArtificialIntelligenceCreators.includes("edureka!"));
    assert.ok(englishArtificialIntelligenceCreators.includes("Intellipaat"));
    assert.ok(englishArtificialIntelligenceCreators.includes("freeCodeCamp.org"));

    const englishSoftware = await request(app)
      .get("/api/auth/channels")
      .query({ language: "English", course: "Software Engineering" });

    assert.equal(englishSoftware.status, 200);
    assert.ok(englishSoftware.body.channels.length > 0);
    assert.ok(englishSoftware.body.channels.map((channel) => channel.name).includes("Bro Code"));
    assert.ok(
      englishSoftware.body.channels.map((channel) => channel.name).includes("freeCodeCamp.org")
    );
    assert.ok(
      englishSoftware.body.channels.map((channel) => channel.name).includes("Traversy Media")
    );
    assert.ok(
      englishSoftware.body.channels.map((channel) => channel.name).includes("Web Dev Simplified")
    );
  });

  it("keeps an older valid refresh session alive with sliding expiry", async () => {
    const agent = request.agent(app);
    const email = "older-session@example.com";
    const user = await User.create({
      name: "Older Session",
      email,
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
    });

    const loginResponse = await agent.post("/api/auth/login").send({
      email,
      password: "StrongPass1",
    });

    assert.equal(loginResponse.status, 200);

    const oldExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await RefreshToken.updateOne(
      { user: user._id },
      {
        $set: {
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          expiresAt: oldExpiry,
        },
      }
    );

    const refreshResponse = await agent.post("/api/auth/refresh").send();
    assert.equal(refreshResponse.status, 200);

    const renewed = await RefreshToken.findOne({ user: user._id });
    assert.ok(renewed.expiresAt > new Date(Date.now() + 20 * 24 * 60 * 60 * 1000));
  });

  it("logs in with case-insensitive email and invalidates refresh tokens after password reset", async () => {
    const agent = request.agent(app);
    const email = "reset@example.com";
    const user = await User.create({
      name: "Reset User",
      email,
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
    });

    const loginResponse = await agent.post("/api/auth/login").send({
      email: "RESET@EXAMPLE.COM",
      password: "StrongPass1",
    });

    assert.equal(loginResponse.status, 200);

    const forgotResponse = await agent.post("/api/auth/forgot-password").send({
      email,
    });

    assert.equal(forgotResponse.status, 200);
    assert.match(forgotResponse.body.devResetToken, /^[A-Za-z0-9_-]{32,}$/);
    assert.match(forgotResponse.body.devResetUrl, /\/reset-password\?/);

    const resetResponse = await agent.post("/api/auth/reset-password").send({
      email,
      token: forgotResponse.body.devResetToken,
      password: "NewStrongPass1",
    });

    assert.equal(resetResponse.status, 200);

    const refreshResponse = await agent.post("/api/auth/refresh").send();
    assert.equal(refreshResponse.status, 401);

    const reloaded = await User.findById(user._id).select("+password");
    assert.equal(await reloaded.comparePassword("NewStrongPass1"), true);
  });
});
