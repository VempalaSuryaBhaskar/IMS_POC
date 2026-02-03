import React, { useState, useEffect } from "react";
import axios from "axios";
import { UseGlobalContext } from "../../Context/GlobalContext";
import "../../Styles/VehicleComponentCss/VehicleManagement.css";
import ToastNotification from "../../Utils/ToastNotification";

export default function MDDPManagement() {
  const { mddp, setMddp, API_URL, currentUser } = UseGlobalContext();
  const token = localStorage.getItem("token");
  if (!token) window.location.href = "/login";

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false); // false => create, true => edit
  const [branches, setBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [availableVariants, setAvailableVariants] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [selectedVariantDetails, setSelectedVariantDetails] = useState(null);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const mddpStatuses = ["Requested", "Approved", "Completed", "Rejected"];
  const paymentOptions = ["Pending", "Completed"];

  // ------------------ Form Data ------------------
  const [createFormData, setCreateFormData] = useState({
    branchId: "",
    vehicleId: "",
    variantId: "",
    color: "",
    stock: 0,                 // default 0
    expectedDate: "",
    status: "Requested",      // default to avoid unnecessary error
    payment: "Pending",       // default to avoid unnecessary error
  });

  const [editFormData, setEditFormData] = useState({
    mddpId: "",
    color: "",
    stock: 0,
    expectedDate: "",
    status: "",
    payment: ""
  });

  // ------------------ Fetch initial data ------------------
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/mddps/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBranches(res?.data?.branches || []);
        setMddp(res?.data?.result || []);

        if (!res?.data?.branches?.length)
          setToast({ type: "warning", message: "Branches are empty. Please add branches first!" });
        else if (!res?.data?.result?.length)
          setToast({ type: "warning", message: "No MDDP entries yet." });
        else
          setToast({ type: "success", message: "MDDP data loaded successfully!" });
      } catch (err) {
        console.error(err);
        setToast({ type: "error", message: "Failed to load data. Please try again." });
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // ------------------ Fetch vehicles on branch change ------------------
  useEffect(() => {
    const fetchVehiclesByBranch = async () => {
      if (!createFormData.branchId) {
        setVehicles([]);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/mddps/getvehicles/${createFormData.branchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicles(res?.data?.vehicles || []);
      } catch (err) {
        console.error(err);
        setToast({ type: "error", message: "Failed to fetch vehicles for selected branch." });
      }
    };
    fetchVehiclesByBranch();
  }, [createFormData.branchId]);

  // ------------------ Update variants when vehicle changes ------------------
  useEffect(() => {
    if (createFormData.vehicleId) {
      const selectedVehicle = vehicles.find(
        (v) => v._id.toString() === createFormData.vehicleId.toString()
      );
      if (selectedVehicle) setAvailableVariants(selectedVehicle.variants || []);
      else setAvailableVariants([]);
      setCreateFormData((prev) => ({ ...prev, variantId: "", color: "" }));
      setAvailableColors([]);
      setSelectedVariantDetails(null);
    } else {
      setAvailableVariants([]);
      setAvailableColors([]);
      setSelectedVariantDetails(null);
    }
  }, [createFormData.vehicleId, vehicles]);

  // ------------------ Update colors when variant changes ------------------
  useEffect(() => {
    if (createFormData.variantId && availableVariants.length) {
      const selectedVariant = availableVariants.find((v) => v._id === createFormData.variantId);
      if (selectedVariant) {
        setAvailableColors(selectedVariant.colors || []);
        setSelectedVariantDetails(selectedVariant);
      } else {
        setAvailableColors([]);
        setSelectedVariantDetails(null);
      }
    } else {
      setAvailableColors([]);
      setSelectedVariantDetails(null);
    }
  }, [createFormData.variantId, availableVariants]);

  // ------------------ Handlers ------------------
  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ------------------ Validations ------------------
  const validateCreate = () => {
    const newErrors = {};
    const today = new Date().toISOString().split("T")[0];

    if (!createFormData.branchId) newErrors.branchId = "Branch is required.";
    if (!createFormData.vehicleId) newErrors.vehicleId = "Vehicle is required.";
    if (!createFormData.variantId) newErrors.variantId = "Variant is required.";
    if (createFormData.variantId && !createFormData.color)
      newErrors.color = "Color is required.";
    if (createFormData.stock === "" || Number(createFormData.stock) < 0)
      newErrors.stock = "Stock must be ≥ 0.";
    if (!createFormData.status) newErrors.status = "Status is required.";
    if (!createFormData.payment) newErrors.payment = "Payment is required.";
    if (createFormData.status !== "Completed" && createFormData.expectedDate) {
      if (createFormData.expectedDate <= today)
        newErrors.expectedDate = "Expected date must be greater than today.";
    }

    return newErrors;
  };

  const validateEdit = () => {
    const newErrors = {};
    const today = new Date().toISOString().split("T")[0];

    if (!editFormData.color) newErrors.color = "Color is required.";
    if (editFormData.stock === "" || Number(editFormData.stock) < 0)
      newErrors.stock = "Stock must be ≥ 0.";
    if (!editFormData.status) newErrors.status = "Status is required.";
    if (editFormData.status !== "Completed" && editFormData.expectedDate) {
      if (editFormData.expectedDate <= today)
        newErrors.expectedDate = "Expected date must be greater than today.";
    }

    if (!editFormData.payment) newErrors.payment = "Payment is required.";

    return newErrors;
  };

  // ------------------ Submit handlers ------------------
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateCreate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/mddps/`, createFormData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToast({ type: "success", message: "MDDP created successfully!" });
      setMddp(res?.data?.result || []);
      setShowModal(false);
      setCreateFormData({
        branchId: "",
        vehicleId: "",
        variantId: "",
        color: "",
        stock: 0,
        expectedDate: "",
        status: "Requested",
        payment: "Pending",
      });
      setSelectedVariantDetails(null);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Failed to create MDDP." });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateEdit();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    try {
      const res = await axios.put(
        `${API_URL}/mddps/${editFormData.mddpId}`,
        {
          color: editFormData.color,
          stock: editFormData.stock,
          expectedDate: editFormData.expectedDate,
          status: editFormData.status,
          payment: editFormData.payment
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToast({ type: "success", message: "MDDP updated successfully!" });
      setMddp(res?.data?.result || []);
      setShowModal(false);
      setEditing(false);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: `${err?.response?.data?.message}` || "Failed to update MDDP." });
    }
  };

  // ------------------ Delete ------------------
  const handleDelete = async (id) => {
    try {
      const res = await axios.delete(`${API_URL}/mddps/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ type: "success", message: "MDDP deleted successfully!" });
      setMddp(res?.data?.result || []);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: `${err?.response?.data?.message}` || "Failed to delete MDDP." });
    }
  };

  // ------------------ Edit click ------------------
  const handleEditClick = (m) => {
    setEditing(true);
    setEditFormData({
      mddpId: m._id,
      color: m.color,
      stock: m.stock,
      expectedDate: m.expectedDate ? new Date(m.expectedDate).toISOString().split("T")[0] : "",
      status: m.status,
      payment: m.payment
    });
    setShowModal(true);
  };


  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }



  
  // ------------------ JSX ------------------
  return (
    <div className="vehicle-container">
      {toast && <ToastNotification {...toast} onClose={() => setToast(null)} />}

      <div className="top-bar">
        <h2>MDDP Management</h2>
        {!loading && (
          branches?.length ? (
            <>
              {currentUser?.permissions?.mddpManagement?.includes("Create") && (
                <button className="add-branch-btn" onClick={() => setShowModal(true)}>
                  <i className="fa-solid fa-plus"></i> Add Mddp
                </button>
              )}
            </>
          ) : (
            <span className="error-msg">No Branches available first Add Branch</span>
          )
        )}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Variant</th>
              <th>Type</th>
              <th>Engine</th>
              <th>Fuel</th>
              <th>Price</th>
              <th>Seating</th>
              <th>Transmission</th>
              <th>Features</th>
              <th>Branch</th>
              <th>MDDP Color</th>
              <th>MDDP Stock</th>
              <th>MDDP Blocked Stock</th>
              <th>Payment Status</th>
              <th>Expected Date</th>
              <th>MDDP Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mddp?.length ? (
              mddp.map((m) => {
                const variant = m.variant;
                const vehicle = m.vehicleId;
                return (
                  <tr key={m._id}>
                    <td>{vehicle?.brand}, {vehicle?.model}</td>
                    <td>{variant?.name}</td>
                    <td>{variant?.type}</td>
                    <td>{variant?.engine}</td>
                    <td>{variant?.fuel}</td>
                    <td>{variant?.price?.toLocaleString()}</td>
                    <td>{variant?.seating}</td>
                    <td>{variant?.transmission}</td>
                    <td>{variant?.features?.join(", ")}</td>
                    <td>{vehicle?.branch?.name}</td>
                    <td>{m.color}</td>
                    <td>{m.stock}</td>
                    <td>{m.blockedCount}</td>
                    <td>{m.payment}</td>
                    <td>{m.expectedDate ? `${new Date(m.expectedDate).toLocaleDateString()}` : "-"}</td>
                    <td>{m.status}</td>
                    <td>
                      <>
                        {(m.status !== "Completed" && m.status !== "Rejected") &&
                          currentUser?.permissions?.mddpManagement?.includes("Update") && (
                            <button className="edit-btn" onClick={() => handleEditClick(m)}>
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                          )
                        }

                        {currentUser?.permissions?.mddpManagement?.includes("Delete") && (
                          <button className="delete-btn" onClick={() => handleDelete(m._id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        )}
                      </>

                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="15" className="no-data">
                  {currentUser?.permissions?.mddpManagement?.includes("View")
                    ? "No MDDPs added yet"
                    : "Sorry, you don't have permission!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false);
          setEditFormData({
            mddpId: "",
            color: "",
            stock: 0,
            expectedDate: "",
            status: "",
          });

          setEditing(false);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? "Edit MDDP" : "Add MDDP"}</h3>

            {!editing ? (
              <form onSubmit={handleCreateSubmit}>
                {/* Branch */}
                <div className="form-group">
                  <label>Branch  <span className="required-star">*</span></label>
                  <select name="branchId" value={createFormData.branchId} onChange={handleCreateChange}>
                    <option value="">Select Branch</option>
                    {branches.map((b) => (<option key={b._id} value={b._id}>{b.name}</option>))}
                  </select>
                  {errors.branchId && <span className="error-text">{errors.branchId}</span>}
                </div>

                {/* Vehicle */}
                <div className="form-group">
                  <label>Vehicle  <span className="required-star">*</span></label>
                  <select name="vehicleId" value={createFormData.vehicleId} onChange={handleCreateChange}>
                    <option value="">Select Vehicle</option>
                    {vehicles.map((v) => (<option key={v._id} value={v._id}>{v.brand} {v.model}</option>))}
                  </select>
                  {errors.vehicleId && <span className="error-text">{errors.vehicleId}</span>}
                </div>

                {/* Variant */}
                <div className="form-group">
                  <label>Variant  <span className="required-star">*</span></label>
                  <select name="variantId" value={createFormData.variantId} onChange={handleCreateChange}>
                    <option value="">Select Variant</option>
                    {availableVariants.map((v) => (<option key={v._id} value={v._id}>{v.name}</option>))}
                  </select>
                  {errors.variantId && <span className="error-text">{errors.variantId}</span>}
                </div>

                {/* Variant Details */}
                {selectedVariantDetails && (
                  <>
                    <div className="form-group"><label>Type</label><input type="text" value={selectedVariantDetails.type} readOnly /></div>
                    <div className="form-group"><label>Engine</label><input type="text" value={selectedVariantDetails.engine} readOnly /></div>
                    <div className="form-group"><label>Fuel</label><input type="text" value={selectedVariantDetails.fuel} readOnly /></div>
                    <div className="form-group"><label>Seating</label><input type="text" value={selectedVariantDetails.seating} readOnly /></div>
                    <div className="form-group"><label>Transmission</label><input type="text" value={selectedVariantDetails.transmission} readOnly /></div>
                    <div className="form-group"><label>Features</label><input type="text" value={selectedVariantDetails.features?.join(", ")} readOnly /></div>
                  </>
                )}

                {/* Color */}
                <div className="form-group">
                  <label>Color  <span className="required-star">*</span></label>
                  <select
                    name="color"
                    value={createFormData.color}
                    onChange={handleCreateChange}
                  >
                    <option value="">Select Color</option>
                    {availableColors.map((c) => (
                      <option key={c.color} value={c.color}>
                        {c.color} ({c.stock})
                      </option>
                    ))}
                  </select>
                  {errors.color && <span className="error-text">{errors.color}</span>}
                </div>


                {/* Stock */}
                <div className="form-group">
                  <label>Stock <span className="required-star">*</span></label>
                  <input type="number" name="stock" value={createFormData.stock} onChange={handleCreateChange} />
                  {errors.stock && <span className="error-text">{errors.stock}</span>}
                </div>

                {/* Expected Date */}
                <div className="form-group">
                  <label>Expected Date <span className="required-star">*</span></label>
                  <input type="date" name="expectedDate" value={createFormData.expectedDate} onChange={handleCreateChange} />
                  {errors.expectedDate && <span className="error-text">{errors.expectedDate}</span>}
                </div>

                {/* Payment */}
                <div className="form-group">
                  <label>Payment <span className="required-star">*</span></label>
                  <select name="payment" value={createFormData.payment} onChange={handleCreateChange}>
                    {paymentOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>
                  {errors.payment && <span className="error-text">{errors.payment}</span>}
                </div>

                {/* Status */}
                <div className="form-group">
                  <label>Status <span className="required-star">*</span></label>
                  <select name="status" value={createFormData.status} onChange={handleCreateChange}>
                    {mddpStatuses.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                  {errors.status && <span className="error-text">{errors.status}</span>}
                </div>

                <button className="submit-btn" type="submit">Add MDDP</button>
              </form>
            ) : (
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label>Color  <span className="required-star">*</span></label>
                  <input type="text" name="color" value={editFormData.color} onChange={handleEditChange} disabled />
                  {errors.color && <span className="error-text">{errors.color}</span>}
                </div>
                <div className="form-group">
                  <label>Stock  <span className="required-star">*</span></label>
                  <input type="number" name="stock" value={editFormData.stock} onChange={handleEditChange} />
                  {errors.stock && <span className="error-text">{errors.stock}</span>}
                </div>
                <div className="form-group">
                  <label>Expected Date  <span className="required-star">*</span></label>
                  <input type="date" name="expectedDate" value={editFormData.expectedDate} onChange={handleEditChange} />
                  {errors.expectedDate && <span className="error-text">{errors.expectedDate}</span>}
                </div>
                <div className="form-group">
                  <label>Payment Status  <span className="required-star">*</span></label>
                  <select
                    name="payment"
                    value={editFormData.payment}
                    onChange={handleEditChange}
                  >
                    {paymentOptions.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {errors.payment && <span className="error-text">{errors.payment}</span>}
                </div>

                <div className="form-group">
                  <label>Status  <span className="required-star">*</span></label>
                  <select name="status" value={editFormData.status} onChange={handleEditChange}>
                    {mddpStatuses.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                  {errors.status && <span className="error-text">{errors.status}</span>}
                </div>

                <button className="submit-btn" type="submit">Update MDDP</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
