import api from "../../../services/apiClient";

const getData = async (path) => {
  const response = await api.get(`/internship-prep/${path}`);
  return response.data.data;
};

export const fetchRoadmaps = () => getData("roadmaps");
export const fetchQuestions = () => getData("questions");
export const fetchResumeGuide = () => getData("resume-guide");
export const fetchAptitude = () => getData("aptitude");
export const fetchCompanyPrep = () => getData("company-prep");
