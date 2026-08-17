import React, { createContext, useState, useEffect } from "react";
import AuthService from "../services/auth.service";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(undefined);

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const login = (username, password) => {
    return AuthService.login(username, password).then((user) => {
      setCurrentUser(user);
      return user;
    });
  };

  const logout = () => {
    AuthService.logout();
    setCurrentUser(undefined);
  };

  const register = (username, gmail, password, role) => {
    return AuthService.register(username, gmail, password, role);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
