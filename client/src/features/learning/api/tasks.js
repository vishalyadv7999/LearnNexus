import api from "../../../services/apiClient";

export const fetchStudyPlan = (date) =>
  api.get("/study-plan", {
    params: date ? { date } : {},
  });

export const generateStudyPlan = (date) =>
  api.post("/study-plan/generate", date ? { date } : {});

export const fetchSubjects = () => api.get("/tasks/subjects");

export const solveProblem = (query) => api.post("/tasks/solve", { query });
