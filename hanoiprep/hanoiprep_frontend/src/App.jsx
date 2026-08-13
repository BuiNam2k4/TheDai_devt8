import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import UserManagement from "./components/UserManagement";
import LessonUpload from "./components/LessonUpload";
import LessonView from "./components/LessonView";
import "./index.css"; // Ensure global CSS is loaded

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/provider/lessons/upload" element={<LessonUpload />} />
              <Route path="/learner/lessons" element={<LessonView />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
