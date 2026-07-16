let accessToken = "";

export const getToken = () => accessToken;

export const setToken = (token) => {
  accessToken = token || "";
};

export const clearToken = () => {
  accessToken = "";
};
