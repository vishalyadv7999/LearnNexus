export const fallbackCourseGroups = [
  {
    group: "Career Fields",
    courses: [
      "Software Engineering",
      "Machine Learning",
      "Data Science",
      "Artificial Intelligence",
      "Cyber Security",
    ],
  },
];

export const groupCourses = (courses = []) => {
  const groups = new Map();

  courses.forEach((course) => {
    const current = groups.get(course.group) || [];
    current.push(course.name);
    groups.set(course.group, current);
  });

  return Array.from(groups.entries()).map(([group, names]) => ({
    group,
    courses: names,
  }));
};
