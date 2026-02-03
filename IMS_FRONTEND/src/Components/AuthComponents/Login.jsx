import React, { useState } from "react";
import { UseGlobalContext } from "../../Context/GlobalContext";

import "../../Styles/AuthComponentCss/Login.css";
import axios from "axios";
import { useNavigate } from "react-router";

export default function Login() {
  const navigate = useNavigate();
  const { setCurrentUserState , setToast } = UseGlobalContext();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({ username: "", password: "" });

  const bgLoginImage =
    "https://static.vecteezy.com/system/resources/thumbnails/024/165/157/original/galaxy-and-nebula-abstract-space-background-endless-universe-with-stars-and-galaxies-in-outer-space-cosmos-art-motion-design-free-video.jpg";
  const jenveda_logo =
    "https://jenstoragespace.blob.core.windows.net/images/jv-red.svg";

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Handle Submit with Validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, password } = formData;
    const newErrors = {};

    if (!username.trim()) newErrors.username = "Username is required!";
    else if (username.trim().length <= 3)
      newErrors.username = "Username must be more than 3 characters!";

    if (!password.trim()) newErrors.password = "Password is required!";
    else if (password.trim().length <= 5)
      newErrors.password = "Password must be more than 5 characters!";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;


    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", formData);
      console.log(response);

      const { token, user } = response.data;
      console.log(token, user);

      //  Test case: If token or user missing, show error toast and stop execution
      if (!token || !user) {
        setToast({
          type: "error",
          message: "Login failed: Invalid response from server. Please try again.",
        });
        return; // stop further code
      }

      //  Normal successful login flow
      localStorage.setItem("token", token);
      setToast({ type: "success", message: "Login successful!" });
      setCurrentUserState(user);

      
      setTimeout(() => navigate("/"), 1000); // small delay so toast is visible
    } catch (err) {
      console.error(err);

      //  If backend sends a message, use it; otherwise show fallback
      const errorMessage =
        err?.response?.data?.message || "Internal Server Error. Please try again.";

      setToast({ type: "error", message: errorMessage });
    }

  };

  return (
    <section
      className="login"
      style={{
        backgroundImage: `url(${bgLoginImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="jenveda-logo">
        <img src={jenveda_logo} alt="Jenveda Logo" />
      </div>

      <div className="login-card">
        <h2 className="login-title">User Login</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          {/* Username Field */}
          <div className="form-group">
            <label>
              Username or Email <span>*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`input-box ${errors.username ? "input-error" : ""}`}
              placeholder="Enter your username"
            />
            {errors.username && (
              <p className="error-text">{errors.username}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label>
              Password <span>*</span>
            </label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`input-box ${errors.password ? "input-error" : ""}`}
                placeholder="Enter your password"
              />
              <i
                className={`fa ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: "pointer", color: "#777" }}
                title={showPassword ? "Hide Password" : "Show Password"}
              ></i>
            </div>
            {errors.password && (
              <p className="error-text">{errors.password}</p>
            )}
          </div>

          <div className="options">
            <label className="remember">
              <input type="checkbox" /> Remember Me
            </label>
            <a href="#" className="forgot">
              Forgot password?
            </a>
          </div>

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        <div className="footer-text">
          <p>
            If you have difficulty resetting your password refer to <br />
            <b>Login Troubleshooting</b> Tips for ways to get help.
          </p>
        </div>
      </div>
    </section>
  );
}
