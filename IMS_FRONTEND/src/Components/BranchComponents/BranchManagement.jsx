import React, { useEffect, useState } from "react";
import "../../Styles/BrachComponentCss/BranchManagement.css";
import { UseGlobalContext } from "../../Context/GlobalContext";
import axios from "axios";
import ToastNotification from "../../Utils/ToastNotification";

export default function BranchManagement() {
  const { branches, setBranches, API_URL, currentUser } = UseGlobalContext();

  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({ name: "", location: "", contact: "" });
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };


  //token check
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
  }


  // Fetch Branch Data
  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(`${API_URL}/branches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.branches) {
          setBranches(res.data.branches);
          if (res?.data?.branches?.length != 0) {
            setToast({ type: "success", message: "Branches loaded successfully!" });
          }
          else {
            setToast({ type: "warning", message: "Branches Empty Add Branches!" });
          }
        } else {
          setBranches([]);
          setToast({ type: "waarning", message: "Branches are Empty!" });
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
        setToast({
          type: "error",
          message: "Failed to fetch branches. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []); // runs once




  const validate = () => {
    const newErrors = {};
    if (formData.name.trim().length < 3) {
      newErrors.name = "Branch name must be at least 3 letters!";
    }
    const locationRegex = /^[A-Za-z\s]+$/;
    if (formData.location.trim().length < 3) {
      newErrors.location = "Location must be at least 3 letters!";
    } else if (!locationRegex.test(formData.location.trim())) {
      newErrors.location = "Location must contain only letters!";
    }
    const contactRegex = /^[0-9]{10}$/;
    if (formData.contact.trim().length !== 10) {
      newErrors.contact = "Contact must be exactly 10 digits!";
    } else if (!contactRegex.test(formData.contact.trim())) {
      newErrors.contact = "Only Numbers are allowed in contact!";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // 3. Run advanceCheck before update 
    if (isEditMode) {
      try {
        console.log(formData);
        const res = await axios.post(
          `${API_URL}/branches/advanceCheck/${formData._id}`,
          { ...formData },
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
    else {
      try {
        const res = await axios.post(
          `${API_URL}/branches/advanceCheck/`,
          { ...formData },
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

    if (isEditMode) {
      try {
        const res = await axios.put(
          `${API_URL}/branches/${formData._id}`,
          { ...formData },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setBranches(res.data.branches);
        setToast({ type: "success", message: "Branch updated successfully!" });

      } catch (err) {
        setToast({
          type: "error",
          message: err.response?.data?.message || "Failed to Update Branch",
        });
        return;
      }

    } else {

      // 5.new Branch created on server
      try {
        const res = await axios.post(
          `${API_URL}/branches/`,
          { ...formData },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(res);

        setBranches([...branches, res.data.savedBranch]);
        setToast({ type: "success", message: "Branch created successfully!" });

      } catch (err) {
        setToast({
          type: "error",
          message: err.response?.data?.message || "Failed to Create Branch",
        });
        return;
      }
    }

    setFormData({ name: "", location: "", contact: "" });
    setErrors({});
    setShowModal(false);
    setIsEditMode(false);
  };



  //Update Branch
  const handleEdit = (index) => {
    setFormData(branches[index]);
    setIsEditMode(true);
    setShowModal(true);
    setErrors({});
  };





  //Delete Branch
  const handleDelete = async (id) => {
    console.log(id);
    try {
      const res = await axios.delete(
        `${API_URL}/branches/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBranches(res.data.branches);

      setToast({ type: "success", message: "Branch Deleted successfully!" });

    }
    catch (err) {
      console.error("Failed to Delete Branch:", err);
      // Show server error message if available, else generic message
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to Delete Branch.",
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

    <div className="branch-container">
      {toast && <ToastNotification {...toast} onClose={() => setToast(null)} />}
      <div className="top-bar">
        <h2>Branches</h2>
        {currentUser?.permissions?.manageBranches?.includes("Create") && <button className="add-branch-btn" onClick={() => setShowModal(true)}>
          <i className="fa-solid fa-plus"></i> Add Branch
        </button>}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.length ? (
              branches.map((branch, idx) => (
                <tr key={branch.id}>
                  <td>{branch.name}</td>
                  <td>{branch.location}</td>
                  <td>{branch.contact}</td>
                  <td>
                    {currentUser?.permissions?.manageBranches?.includes("Update") && <button className="edit-btn" onClick={() => handleEdit(idx)}>
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>}
                    {currentUser?.permissions?.manageBranches?.includes("Delete") && <button className="delete-btn" onClick={() => handleDelete(branch._id)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="no-data">
                  {currentUser?.permissions?.manageBranches?.includes("Update")
                    ? "No branches added yet"
                    : "Sorry,You don't have permission!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {
        showModal && (
          <div className="modal-overlay" onClick={() => {
            setShowModal(false);
            setFormData({ name: "", location: "", contact: "" });
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>{isEditMode ? "Edit Branch" : "Create New Branch"}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>
                    Branch Name <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Branch Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                  {errors.name && <span className="error-msg">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label>
                    Location <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    placeholder="Location *"
                    value={formData.location}
                    onChange={handleChange}
                    required
                  />
                  {errors.location && <span className="error-msg">{errors.location}</span>}
                </div>

                <div className="form-group">
                  <label>
                    Contact <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    name="contact"
                    placeholder="Contact Number"
                    value={formData.contact}
                    onChange={handleChange}
                    required
                  />
                  {errors.contact && <span className="error-msg">{errors.contact}</span>}
                </div>

                <button type="submit" className="submit-btn">
                  <i className="fa-solid fa-circle-plus"></i>{" "}
                  {isEditMode ? "Update Branch" : "Add Branch"}
                </button>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
}
