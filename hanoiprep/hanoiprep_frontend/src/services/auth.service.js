import axios from "axios";

const API_URL = "http://localhost:8080/api/auth/";

const register = (username, gmail, password, role) => {
  return axios.post(API_URL + "signup", {
    username,
    gmail,
    password,
    role,
  });
};

const login = (username, password) => {
  return axios
    .post(API_URL + "login", {
      username,
      password,
    })
    .then((response) => {
      const data = response.data && response.data.result ? response.data.result : response.data;
      if (data && data.token) {
        localStorage.setItem("user", JSON.stringify(data));
      }
      return data;
    });
};

const logout = () => {
  localStorage.removeItem("user");
};

const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem("user"));
};

const AuthService = {
  register,
  login,
  logout,
  getCurrentUser,
};

export default AuthService;
