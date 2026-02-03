import React, { useEffect, useState } from "react";
import "../../Styles/AuthComponentCss/ManageUsers.css";
import { UseGlobalContext } from "../../Context/GlobalContext";
import axios from "axios";
import ToastNotification from "../../Utils/ToastNotification";

export default function ManageUsers() {

  //token check
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
  }

  //states and context
  const { users, setUsers, currentUser } = UseGlobalContext();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "",
    phone: "",
    email: "",
    permissions: {},
  });

  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(null);

  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;


  //fetch all users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Fetched users:", res.data);
        setUsers(res.data.users);

        if (res?.data?.users?.length == 0) {
          setToast({ type: "warning", message: "Users are Empty!" });
        }
        else {
          setToast({ type: "success", message: "Users Loaded Successfully!" });
        }

      } catch (err) {
        console.error("Failed to fetch users:", err);
        setToast({ type: "error", message: "Failed to fetch Users. Please try again." });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []); // Empty dependency array → fetch only when this component mounts


  //drop down data for permissions
  const permissionSections = [
    "manageBranches",
    "vehicleManagement",
    "mddpManagement",
    "customerOrders",
    "finance",
    "manageUsers",
  ];
  const actions = ["View", "Update", "Delete", "Create"];


  //handlers for form inputs and submission
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };


  //form validation
  const validate = () => {
    const newErrors = {};
    const phoneRegex = /^[6-9]\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.username.trim()) newErrors.username = "Username is required!";
    else if (formData.username.length < 3)
      newErrors.username = "Username must be at least 3 characters!";

    if (!isEditMode && (!formData.password || formData.password.length < 6))
      newErrors.password = "Password must be at least 6 characters!";

    if (!formData.role.trim()) newErrors.role = "Role is required!";

    if (!formData.phone.trim()) newErrors.phone = "Phone number is required!";
    else if (!phoneRegex.test(formData.phone))
      newErrors.phone = "Invalid Indian phone number!";

    if (!formData.email.trim()) newErrors.email = "Email is required!";
    else if (!emailRegex.test(formData.email))
      newErrors.email = "Invalid email format!";

    return newErrors;
  };



  //permission handlers for permissions checkboxes
  const handlePermissionChange = (section, action) => {
    setFormData((prev) => {
      const current = new Set(prev.permissions[section] || []);
      current.has(action) ? current.delete(action) : current.add(action);
      return {
        ...prev,
        permissions: { ...prev.permissions, [section]: Array.from(current) },
      };
    });
  };



  const handleAllPermissions = (section, checked) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [section]: checked ? [...actions] : [],
      },
    }));
  };



  //form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Local validation first
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    // 2. Prepare permissions (default to View if nothing selected)
    let updatedPermissions = { ...formData.permissions };
    if (!Object.keys(updatedPermissions).length || Object.values(updatedPermissions).every(arr => arr.length === 0)) {
      updatedPermissions = {};
      permissionSections.forEach(sec => (updatedPermissions[sec] = ["View"]));
    }


    if (!isEditMode) {
      // 3. Run advanceCheck before update or create
      try {
        const res = await axios.post(
          `${API_URL}/users/advanceCheck`,
          { ...formData, permissions: updatedPermissions },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // If the server returns 200, continue
        console.log("Advance check passed:", res.data);

      } catch (err) {
        console.log("Advance check failed:", err?.response?.data);

        // Set form errors for each field if showErrors is returned
        if (err?.response?.data?.showErrors) {
          const showErrors = err.response.data.showErrors;

          // Only set errors for fields that are not empty
          const fieldErrors = {};
          Object.keys(showErrors).forEach((key) => {
            if (showErrors[key]) fieldErrors[key] = showErrors[key];
          });

          setErrors(fieldErrors); // set in form state
        }
        return; // stop submission if advanceCheck fails
      }
    }



    // 4. If edit mode → PUT request
    if (isEditMode) {
      try {
        const res = await axios.put(
          `${API_URL}/users/${formData._id}`,
          { ...formData, permissions: updatedPermissions },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setToast({ type: "success", message: "User updated successfully!" });

        setTimeout(() => {
          setUsers(res.data.users);
        }, 500); // 0.5 seconds delay
      } catch (err) {
        setToast({
          type: "error",
          message: err.response?.data?.message || "Failed to update user",
        });
        return;
      }
    } else {

      // 5. Create new user on server
      try {
        const res = await axios.post(
          `${API_URL}/users/`,
          { ...formData, permissions: updatedPermissions },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(res);

        setToast({ type: "success", message: "User created successfully!" });

        setTimeout(() => {
          setUsers([...users, res.data.savedUser]);
        }, 500); // 0.5 seconds delay

      } catch (err) {
        setToast({
          type: "error",
          message: err.response?.data?.message || "Failed to update user",
        });
        return;
      }

    }

    // 6. Reset form
    setFormData({
      username: "",
      password: "",
      role: "",
      phone: "",
      email: "",
      permissions: {},
    });
    setIsEditMode(false);
    setShowModal(false);
    setErrors({});
  };



  //edit and delete handlers
  const handleEdit = (idx) => {
    const user = users[idx];
    setFormData({ ...user });
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (idx) => {
    console.log(idx);
    try {
      const res = await axios.delete(
        `${API_URL}/users/${idx}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setToast({ type: "success", message: "User Deleted successfully!" });

      setTimeout(() => {
        setUsers(res.data.users);
      }, 500); // 0.5 seconds delay

    }
    catch (err) {
      console.error("Failed to Delete user:", err);
      // Show server error message if available, else generic message
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to Delete user.",
      });
      return;
    }
  };


  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }


  return (
    <div className="user-container">
      {toast && <ToastNotification {...toast} onClose={() => setToast(null)} />}
      <div className="top-bar">
        <h2>User Management</h2>
        {currentUser?.permissions?.manageUsers?.includes("Create") && <button className="add-branch-btn" onClick={() => setShowModal(true)}>
          <i className="fa-solid fa-plus"></i> Add User
        </button>}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Created By</th>
              <th>Permissions</th>
              <th>Created At</th>
              <th>Updated At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="loading">
                  Loading...
                </td>
              </tr>
            ) : users.length ? (
              users.map((user, idx) => (
                <tr key={user.id || idx}>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>{user.phone}</td>
                  <td>{user.email}</td>
                  <td>{user.createdBy}</td>
                  <td className="permissions-cell">
                    {Object.entries(user.permissions || {})
                      .map(
                        ([feature, perms]) =>
                          `${feature}(${perms.map((p) => p[0]).join(",")})`
                      )
                      .join(" | ")}
                  </td>
                  <td>{new Date(user.createdAt).toLocaleString()}</td>
                  <td>{new Date(user.updatedAt).toLocaleString()}</td>
                  <td>
                    {currentUser?.permissions?.manageUsers?.includes("Update") && <button className="edit-btn" onClick={() => handleEdit(idx)}>
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>}
                    {currentUser?.permissions?.manageUsers?.includes("Delete") && <button className="delete-btn" onClick={() => handleDelete(user._id)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="no-data">
                  {currentUser?.permissions?.manageUsers?.includes("Update")
                    ? "No Users added yet"
                    : "Sorry,You don't have permission!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false);
          setFormData({
            username: "",
            password: "",
            role: "",
            phone: "",
            email: "",
            permissions: {},
          });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{isEditMode ? "Edit User" : "Add User"}</h3>
            <form onSubmit={handleSubmit}>
              {/* Required fields with red * */}
              <div className="form-group">
                <label>
                  Username <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter username"
                  disabled={isEditMode}
                  required
                />
                {errors.username && <span className="error-msg">{errors.username}</span>}
              </div>

              {!isEditMode && (
                <div className="form-group">
                  <label>
                    Password <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    required
                  />
                  {errors.password && <span className="error-msg">{errors.password}</span>}
                </div>
              )}

              <div className="form-group">
                <label>
                  Role <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  name="role"
                  type="text"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="Enter role"
                  required
                />
                {errors.role && <span className="error-msg">{errors.role}</span>}
              </div>

              <div className="form-group">
                <label>
                  Phone <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isEditMode}
                  placeholder="Enter phone number"
                  required
                />
                {errors.phone && <span className="error-msg">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label>
                  Email <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isEditMode}
                  placeholder="Enter email address"
                  required
                />
                {errors.email && <span className="error-msg">{errors.email}</span>}
              </div>

              {/* Permissions section - no * */}
              <h4>Permissions</h4>
              <div className="permissions">
                {permissionSections.map((section) => (
                  <div key={section} className="permission-group">
                    <h5>{section}</h5>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.permissions[section]?.length === actions.length}
                        onChange={(e) => handleAllPermissions(section, e.target.checked)}
                      />
                      All
                    </label>
                    <div className="actions">
                      {actions.map((action) => (
                        <label key={action}>
                          <input
                            type="checkbox"
                            checked={formData.permissions[section]?.includes(action) || false}
                            onChange={() => handlePermissionChange(section, action)}
                          />
                          {action}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button type="submit" className="submit-btn">
                {isEditMode ? "Update User" : "Add User"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
