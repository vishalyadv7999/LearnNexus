export const fallbackSubjectOptions = [
  { id: "data_structures", name: "Data Structures" },
  { id: "operating_systems", name: "Operating Systems" },
  { id: "database_management_systems", name: "DBMS" },
  { id: "software_engineering", name: "Software Engineering" },
  { id: "computer_networks", name: "Computer Networks" },
  { id: "web_development", name: "Web Development" },
  { id: "java", name: "Java" },
  { id: "python", name: "Python" },
  { id: "react", name: "React" },
  { id: "machine_learning", name: "Machine Learning" },
];

export const getSubjectName = (subjects = [], subjectId) =>
  subjects.find((subject) => subject.id === subjectId)?.name || subjectId;

export const normalizeCatalogSubjects = (channels = [], subjects = []) => {
  if (subjects.length) {
    return subjects;
  }

  const byId = new Map();

  channels.forEach((channel) => {
    (channel.subjectOptions || []).forEach((subject) => {
      byId.set(subject.id, subject);
    });
  });

  return Array.from(byId.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
};
