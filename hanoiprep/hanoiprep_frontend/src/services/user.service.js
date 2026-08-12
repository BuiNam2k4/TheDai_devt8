import axios from "axios";
import AuthService from "./auth.service";

const API_URL = "http://localhost:8080/api/users";

const authHeader = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: "Bearer " + user.token };
  } else {
    return {};
  }
};

const getAllUsers = () => {
  return axios.get(API_URL, { headers: authHeader() });
};

const deleteUser = (id) => {
  return axios.delete(API_URL + "/" + id, { headers: authHeader() });
};

const activateUser = (id) => {
  return axios.put(API_URL + "/" + id + "/activate", {}, { headers: authHeader() });
};

const UserService = {
  getAllUsers,
  deleteUser,
  activateUser,
};

export default UserService;
