const User = require("../models/User");
const { connectDatabase } = require("../config/db");
const { getStudyPlanBundle, setTaskProgress } = require("../services/studyPlanService");

const seed = async () => {
  await connectDatabase();

  await User.deleteOne({ email: "demo@learnnexus.app" });

  const demoUser = await User.create({
    name: "Demo Student",
    email: "demo@learnnexus.app",
    password: "DemoPass123",
    course: "Computer Science and Engineering",
    year: 2,
  });

  const bundle = await getStudyPlanBundle(demoUser, new Date());
  await setTaskProgress(demoUser, bundle.plan.tasks[0]._id, { completed: true });

  console.log("Demo student seeded");
  console.log("Email: demo@learnnexus.app");
  console.log("Password: DemoPass123");

  process.exit(0);
};

seed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
