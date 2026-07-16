const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/learnnexus-progress-test";
process.env.JWT_SECRET = "test_shared_secret_that_is_long_enough_for_progress_tests";
process.env.JWT_ACCESS_SECRET = "test_access_secret_that_is_long_enough_for_progress_tests";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.COOKIE_SECURE = "false";

const app = require("../src/app");
const Progress = require("../src/models/Progress");
const StudyActivity = require("../src/models/StudyActivity");
const StudyPlan = require("../src/models/StudyPlan");
const Task = require("../src/models/Task");
const User = require("../src/models/User");
const { signAccessToken } = require("../src/utils/jwt");
const { addDaysToDateKey, getLocalDateKey } = require("../src/utils/dateKeys");

let mongoServer;
let user;
let accessToken;

describe("progress, active days, streak, and study plan flow", () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: "learnnexus-progress-test" });
    user = await User.create({
      name: "Progress Student",
      email: "progress-student@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 2,
      emailVerified: true,
      createdAt: new Date("2026-06-20T08:00:00.000Z"),
      preferences: {
        preferredSubjects: ["JavaScript"],
        preferredChannels: ["Bro Code"],
        videoLanguage: "English",
      },
    });
    accessToken = signAccessToken(user);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("returns zero progress, active days, and streak for a new user with no study items", async () => {
    const freshUser = await User.create({
      name: "New Student",
      email: "new-progress-student@example.com",
      password: "StrongPass1",
      course: "Software Engineering",
      year: 1,
      emailVerified: true,
    });
    const freshToken = signAccessToken(freshUser);

    const summary = await request(app)
      .get("/api/progress/summary")
      .set("Authorization", `Bearer ${freshToken}`);

    assert.equal(summary.status, 200);
    assert.deepEqual(summary.body, {
      overallProgress: 0,
      activeDays: 0,
      currentStreak: 0,
      completedItems: 0,
      totalItems: 0,
      lastActiveDate: null,
    });
  });

  it("generates a persisted study plan with required task fields", async () => {
    const response = await request(app)
      .post("/api/study-plan/generate")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ date: "2026-06-25" });

    assert.equal(response.status, 201);
    assert.ok(response.body.studyPlan.planId);
    assert.equal(response.body.studyPlan.userId, String(user._id));
    assert.equal(response.body.studyPlan.course, "Software Engineering");
    assert.ok(response.body.studyPlan.subject);
    assert.ok(response.body.studyPlan.tasks.length > 0);

    const task = response.body.studyPlan.tasks[0];
    assert.ok(task.title);
    assert.equal(task.subject, response.body.studyPlan.subject);
    assert.equal(task.type, "video");
    assert.equal(typeof task.estimatedTime, "number");
    assert.equal(task.status, "pending");
    assert.equal(task.dueDate, "2026-06-25");
  });

  it("completing one task updates overall progress, active days, and persistence", async () => {
    const plan = await request(app)
      .get("/api/study-plan")
      .query({ date: "2026-06-25" })
      .set("Authorization", `Bearer ${accessToken}`);
    const taskId = plan.body.plan.tasks[0]._id;

    const completed = await request(app)
      .patch(`/api/study-plan/task/${taskId}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ dateKey: getLocalDateKey() });

    assert.equal(completed.status, 200);
    assert.equal(completed.body.progress.completedTasks, 1);
    assert.equal(completed.body.progress.completionRate, 100);

    const summary = await request(app)
      .get("/api/progress/summary")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(summary.body.overallProgress, 100);
    assert.equal(summary.body.completedItems, 1);
    assert.equal(summary.body.totalItems, 1);
    assert.equal(summary.body.activeDays, 1);
    assert.equal(summary.body.currentStreak, 1);

    const restored = await request(app)
      .get("/api/study-plan")
      .query({ date: "2026-06-25" })
      .set("Authorization", `Bearer ${accessToken}`);
    assert.equal(restored.body.progress.completedTasks, 1);
    assert.equal(restored.body.plan.tasks[0].completed, true);
  });

  it("multiple completed tasks on one date count as one active day", async () => {
    await request(app)
      .post("/api/study-plan/generate")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ date: "2026-06-26" });
    const plan = await StudyPlan.findOne({ user: user._id, dateKey: "2026-06-26" }).lean();
    const task = await Task.findOne({ studyPlan: plan._id });

    await request(app)
      .patch(`/api/study-plan/task/${task._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ dateKey: getLocalDateKey() });

    const summary = await request(app)
      .get("/api/progress/summary")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(summary.body.completedItems, 2);
    assert.equal(summary.body.totalItems, 2);
    assert.equal(summary.body.activeDays, 1);
  });

  it("calculates consecutive-day streaks and resets after missed days", async () => {
    await Promise.all([
      StudyActivity.deleteMany({ user: user._id }),
      Progress.deleteMany({ user: user._id }),
      StudyPlan.deleteMany({ user: user._id }),
      Task.deleteMany({ user: user._id }),
      User.findByIdAndUpdate(user._id, { currentStreak: 0 }),
    ]);

    const today = getLocalDateKey();
    const yesterday = addDaysToDateKey(today, -1);
    const twoDaysAgo = addDaysToDateKey(today, -2);
    const staleDay = addDaysToDateKey(today, -3);

    for (const dateKey of [twoDaysAgo, yesterday, today]) {
      await request(app)
        .post("/api/progress/activity")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ date: dateKey });
    }

    const consecutive = await request(app)
      .get("/api/progress/summary")
      .set("Authorization", `Bearer ${accessToken}`);
    assert.equal(consecutive.body.activeDays, 3);
    assert.equal(consecutive.body.currentStreak, 3);

    await StudyActivity.deleteMany({ user: user._id });
    await request(app)
      .post("/api/progress/activity")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ date: staleDay });

    const stale = await request(app)
      .get("/api/progress/summary")
      .set("Authorization", `Bearer ${accessToken}`);
    assert.equal(stale.body.activeDays, 1);
    assert.equal(stale.body.currentStreak, 0);
  });
});
