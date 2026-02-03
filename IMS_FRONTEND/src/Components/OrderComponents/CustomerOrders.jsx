import React, { useState, useEffect } from "react";
import axios from "axios";
import { UseGlobalContext } from "../../Context/GlobalContext";
import "../../Styles/VehicleComponentCss/VehicleManagement.css";
import ToastNotification from "../../Utils/ToastNotification";

export default function CustomerOrders() {
  const { orders, setOrders, API_URL, currentUser } = UseGlobalContext();
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
  const [submitting, setSubmitting] = useState(false);


  const financeStatuses = ["Pending", "Completed", "Declined"];
  const orderStatuses = ["Pending", "Dispatched", "Delivered", "Cancelled"];

  // ------------------ Form Data ------------------
  const initialCreate = {
    _id: "", // used for edit
    branchId: "",
    vehicleId: "",
    variantId: "",
    color: "",
    customerDetails: {
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      aadharNumber: "",
      panNumber: "",
    },
    orderDate: "", // will set to today when needed
    expectedDate: "",
    deliveryDate: "",
    financeType: "",
    financeStatus: "Pending",
    orderStatus: "Pending",
    totalAmount: "",
    totalCount: "",
  };

  const [formData, setFormData] = useState(initialCreate);

  // ------------------ Helpers & Validation Regex ------------------
  const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const rePhone = /^[0-9]{10}$/;
  const reAadhar = /^[0-9]{12}$/;
  const rePAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
  const rePincode = /^[0-9]{6}$/;

  // helper: today's date in YYYY-MM-DD
  const todayISO = new Date().toISOString().split("T")[0];

  useEffect(() => {
    console.log("FormData changed:", formData);
  }, [formData]);

  // ------------------ Fetch initial data ------------------
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/customerOrders/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log({ ...res?.data?.result });
        setBranches(res?.data?.branches || []);
        setOrders([...res?.data?.result || []]);

        if (!res?.data?.branches?.length)
          setToast({ type: "warning", message: "Branches are empty. Please add branches first!" });
        else if (!res?.data?.result?.length)
          setToast({ type: "warning", message: "No orders yet." });
        else setToast({ type: "success", message: "Orders loaded successfully!" });
      } catch (err) {
        console.error(err);
        setToast({ type: "error", message: "Failed to load order data. Please try again." });
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // ------------------ Fetch vehicles on branch change ------------------
  useEffect(() => {
    const fetchVehiclesByBranch = async () => {
      if (!formData.branchId) {
        setVehicles([]);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/customerOrders/getvehicles/${formData.branchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicles(res?.data?.vehicles || []);
      } catch (err) {
        console.error(err);
        setToast({ type: "error", message: "Failed to fetch vehicles for selected branch." });
      }
    };
    fetchVehiclesByBranch();
  }, [formData.branchId, API_URL, token]);


  // ------------------ Update variants when vehicle changes ------------------
  useEffect(() => {
    if (formData.vehicleId) {
      const selectedVehicle = vehicles.find(
        (v) => v._id.toString() === formData.vehicleId.toString()
      );
      if (selectedVehicle) setAvailableVariants(selectedVehicle.variants || []);
      else setAvailableVariants([]);
      if (!editing) setFormData((prev) => ({ ...prev, variantId: "", color: "" }));
      setAvailableColors([]);
      setSelectedVariantDetails(null);
    } else {
      setAvailableVariants([]);
      setAvailableColors([]);
      setSelectedVariantDetails(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.vehicleId, vehicles, editing]);


  // ------------------ Update colors when variant changes ------------------
  useEffect(() => {
    if (formData.variantId && availableVariants.length) {
      const selectedVariant = availableVariants.find(
        (v) =>
          v._id === formData.variantId ||
          v._id.toString() === formData.variantId.toString()
      );
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
  }, [formData.variantId, availableVariants]);



  // ------------------ Sync logic (edge-case) ------------------
  // If one side becomes Declined/Cancelled, keep the other in sync.
  useEffect(() => {
    // If order cancelled, mark finance as Declined
    if (formData.orderStatus === "Cancelled" && formData.financeStatus !== "Declined") {
      setFormData((prev) => ({ ...prev, financeStatus: "Declined" }));
    }
    // If finance declined, mark order as Cancelled
    else if (formData.financeStatus === "Declined" && formData.orderStatus !== "Cancelled") {
      setFormData((prev) => ({ ...prev, orderStatus: "Cancelled" }));
    }
    // If delivered, ensure finance Completed
    else if (formData.orderStatus === "Delivered" && formData.financeStatus !== "Completed") {
      setFormData((prev) => ({ ...prev, financeStatus: "Completed" }));
    }
  }, [formData.orderStatus, formData.financeStatus]);




  // Helper to determine if cancelled lock should be applied (only lock when NOT editing)
  const cancelledLock = () =>
    !editing && (formData.orderStatus === "Cancelled" || formData.financeStatus === "Declined");



  // When editing we want to prevent changing base details (branch/vehicle/variant/color/customer)
  // but allow changing statuses/dates/amounts.

  // ------------------ Handlers ------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("customerDetails")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        customerDetails: { ...prev.customerDetails, [key]: value },
      }));
      setErrors((prev) => ({ ...prev, [name]: "" }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ------------------ Validations ------------------
  const validate = () => {
    const newErrors = {};
    const today = new Date().toISOString().split("T")[0];

    // Branch/vehicle/variant/color required when creating (or always required depending on backend)
    if (!formData.branchId) newErrors.branchId = "Branch is required.";
    if (!formData.vehicleId) newErrors.vehicleId = "Vehicle is required.";
    if (!formData.variantId) newErrors.variantId = "Variant is required.";
    if (formData.variantId && !formData.color) newErrors.color = "Color is required.";

    const cd = formData.customerDetails || {};
    if (!cd.name || !cd.name.trim()) newErrors["customerDetails.name"] = "Customer name is required.";
    if (!cd.phone || !rePhone.test(cd.phone)) newErrors["customerDetails.phone"] = "Phone must be 10 digits.";
    if (!cd.email || !reEmail.test(cd.email)) newErrors["customerDetails.email"] = "Valid email is required.";
    if (!cd.address || cd.address.trim().length < 5) newErrors["customerDetails.address"] = "Address is required (min 5 chars).";
    if (!cd.city || cd.city.trim().length < 2) newErrors["customerDetails.city"] = "City is required.";
    if (!cd.state || cd.state.trim().length < 2) newErrors["customerDetails.state"] = "State is required.";
    if (!cd.pincode || !rePincode.test(cd.pincode)) newErrors["customerDetails.pincode"] = "Pincode must be 6 digits.";
    if (!cd.aadharNumber || !reAadhar.test(cd.aadharNumber)) newErrors["customerDetails.aadharNumber"] = "Aadhar must be 12 digits.";
    if (!cd.panNumber || !rePAN.test(cd.panNumber)) newErrors["customerDetails.panNumber"] = "PAN must be in format ABCDE1234F.";

    // expectedDate required (schema indicates required) and must be >= orderDate(today)
    if (!formData.expectedDate) newErrors.expectedDate = "Expected date is required.";
    else if (formData.expectedDate < today) newErrors.expectedDate = "Expected date must be today or later.";

    // deliveryDate is optional — but if provided must be >= orderDate(today)
    // if (formData.deliveryDate) {
    //   if (formData.deliveryDate < today) newErrors.deliveryDate = "Delivery date must be today or later.";
    // }

    if (!formData.financeType || !formData.financeType.trim()) newErrors.financeType = "Finance Type is required.";

    if (!formData.totalCount || !Number.isInteger(Number(formData.totalCount)) || Number(formData.totalCount) <= 0)
      newErrors.totalCount = "Total count must be a positive integer.";

    // If cancelled or declined, show a global info message
    if (formData.orderStatus === "Cancelled" && formData.financeStatus !== "Declined") {
      newErrors.global = "Order is cancelled: finance will be marked as Declined automatically.";
      setToast({ type: "warning", message: "Order is cancelled: finance will be marked as Declined automatically." });
    }
    if (formData.financeStatus === "Declined" && formData.orderStatus !== "Cancelled") {
      newErrors.global = "Finance is declined: order will be marked as Cancelled automatically.";
      setToast({ type: "warning", message: "Finance is declined: order will be marked as Cancelled automatically." })
    }

    if (formData.financeStatus === "Completed" && formData.orderStatus == "Delivered") {
      if (formData.deliveryDate == "") {
        newErrors.deliveryDate = "Delivery Date Required when payment and order completed"
      }
    }

    return newErrors;
  };




  // ------------------ Submit handlers ------------------
  const handleSubmit = async (e) => {
    console.log("FormData : ");
    console.log(formData);
    e.preventDefault();

    // Ensure orderDate is set (use today)
    const payloadOrderDate = formData.orderDate || todayISO;
    setFormData((prev) => ({ ...prev, orderDate: payloadOrderDate }));

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    console.log(formData);

    setSubmitting(true);
    const payload = {
      branchId: formData.branchId,
      createdBy: currentUser?.username || "system",
      vehicleId: formData.vehicleId,
      variantId: formData.variantId,
      color: formData.color,
      customerDetails: formData.customerDetails,
      orderDate: payloadOrderDate,
      expectedDate: formData.expectedDate,
      deliveryDate: formData.deliveryDate || null,
      financeType: formData.financeType,
      financeStatus: formData.financeStatus,
      orderStatus: formData.orderStatus,
      totalAmount: Number(formData.totalCount * 10000000),
      totalCount: Number(formData.totalCount),
    };

    let res;
    if (editing && formData._id) {
      try {
        res = await axios.put(`${API_URL}/customerOrders/${formData._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setOrders([...res?.data?.result || []]);
        setToast({ type: "success", message: "Order updated successfully!" });
      }
      catch (err) {
        console.log(err);
        setToast({ type: "error", message: `${err?.response?.data?.message || "Failed Internal Server!"}` });
        return;
      }
    } else {

      console.log(payload);

      try {
        res = await axios.post(`${API_URL}/customerOrders/`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("res", res);
        setOrders([...res?.data?.result || []]);

        setToast({ type: "success", message: "Order created successfully!" });
      }
      catch (err) {
        console.log(err);
        setToast({ type: "error", message: `${err?.response?.data?.message || "Failed Internal Server!"}` });
        return;
      }
    }

    setShowModal(false);
    setFormData(initialCreate);
    setEditing(false);
    setErrors({});
    setSubmitting(false);
  };





  // ------------------ Delete ------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await axios.delete(`${API_URL}/customerOrders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ type: "success", message: "Order deleted successfully!" });
      setOrders(orders.filter((o) => o._id !== id));
      
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: `${err?.response?.data?.message || "Failed to delete order."}` });
    }
  };


  // ------------------ Edit click ------------------
  const handleEditClick = (o) => {
    console.log("o : ");
    console.log(o.variant._id, o.color);
    // Populate form using server-provided fields; map fields to our form
    setFormData({
      _id: o._id,
      branchId: o?.branchId,
      vehicleId: o?.vehicleId?._id,
      variantId: o?.variant?._id,
      color: o?.color,
      customerDetails: {
        name: o.customerDetails?.name,
        phone: o.customerDetails?.phone,
        email: o.customerDetails?.email,
        address: o.customerDetails?.address,
        city: o.customerDetails?.city,
        state: o.customerDetails?.state,
        pincode: o.customerDetails?.pincode,
        aadharNumber: o.customerDetails?.aadharNumber,
        panNumber: o.customerDetails?.panNumber,
      },
      orderDate: o.orderDate ? new Date(o.orderDate).toISOString().split("T")[0] : "",
      expectedDate: o.expectedDate ? new Date(o.expectedDate).toISOString().split("T")[0] : "",
      deliveryDate: o.deliveryDate ? new Date(o.deliveryDate).toISOString().split("T")[0] : "",
      financeType: o?.financeType,
      financeStatus: o?.financeStatus,
      orderStatus: o?.orderStatus,
      totalAmount: o?.totalAmount,
      totalCount: o?.totalCount,
    });


    console.log(formData);

    setEditing(true);
    setShowModal(true);
    setErrors({});
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
        <h2>Customer Orders</h2>
        {!loading && (
          branches?.length ? (
            <>
              {currentUser?.permissions?.customerOrders?.includes("Create") && (
                <button
                  className="add-branch-btn"
                  onClick={() => {
                    setShowModal(true);
                    setFormData(initialCreate);
                    setEditing(false);
                    setErrors({});
                  }}
                >
                  <i className="fa-solid fa-plus"></i> Add Order
                </button>
              )}
            </>
          ) : (
            <span className="error-msg">No Branches available first Add Branch</span>
          )
        )}
      </div>

      <div className="table-card">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order#</th>
              <th>Vehicle</th>
              <th>Variant</th>
              <th>Color</th>
              <th>Branch</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Expected</th>
              <th>Delivery</th>
              <th>Finance</th>
              <th>Order Status</th>
              <th>Total</th>
              <th>Total Count</th>
              <th>From Vehicle Stock</th>
              <th>From MDDP Stock</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders?.length ? (
              orders.map((o) => {
                const notAvailable =
                  (o?.mddpStock?.stock > 0 && !o?.mddpStock?.available) || (o?.vehicleStock?.stock > 0 && !o?.vehicleStock?.available);

                return (
                  <tr
                    key={o._id}
                    className={notAvailable ? "not-available-row" : ""}
                  >
                    <td>{String(o._id).slice(-6)}</td>
                    <td>
                      {o.vehicleId?.brand}, {o.vehicleId?.model}
                    </td>
                    <td>{o.variant?.name}</td>
                    <td>{o?.color}</td>
                    <td>{o.vehicleId?.branch?.name}</td>
                    <td>{o.customerDetails?.name}</td>
                    <td>{o.customerDetails?.phone}</td>
                    <td>
                      {o.expectedDate
                        ? new Date(o.expectedDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>
                      {o.deliveryDate
                        ? new Date(o.deliveryDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>
                      {o.financeType} ({o.financeStatus})
                    </td>
                    <td>{o.orderStatus}</td>
                    <td>{o.totalAmount?.toLocaleString()}</td>
                    <td>{o.totalCount}</td>
                    <td>{o?.vehicleStock?.stock}</td>
                    <td>{o?.mddpStock?.stock}</td>
                    <td>
                      <>
                        {/* how Edit button only if user has Update permission AND 
         NOT (payment == "Completed" && orderStatus == "Delivered") */}
                        {currentUser?.permissions?.customerOrders?.includes("Update") &&
                          !(o.financeStatus === "Completed" && o.orderStatus === "Delivered") && (
                            <button className="edit-btn" onClick={() => {
                              console.log(o);
                              handleEditClick(o);
                            }}>
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                          )}

                        {/*  Show Delete button normally if user has Delete permission */}
                        {currentUser?.permissions?.customerOrders?.includes("Delete") && (
                          <button className="delete-btn" onClick={() => handleDelete(o._id)}>
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
                <td colSpan="16" className="no-data">
                  {currentUser?.permissions?.customerOrders?.includes("View")
                    ? "No orders added yet"
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
          setFormData(initialCreate);
          setEditing(false);
          setErrors({});
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? "Edit Order" : "Add Order"}</h3>

            <form onSubmit={handleSubmit}>
              {/* Branch */}
              <div className="form-group">
                <label>Branch  <span className="required-star">*</span></label>
                <select
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  disabled={editing}
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (<option key={b._id} value={b._id}>{b.name}</option>))}
                </select>
                {errors.branchId && <span className="error-text">{errors.branchId}</span>}
              </div>

              {/* Vehicle */}
              <div className="form-group">
                <label>Vehicle  <span className="required-star">*</span></label>
                <select
                  name="vehicleId"
                  value={formData.vehicleId}
                  onChange={handleChange}
                  disabled={editing}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((v) => (<option key={v._id} value={v._id}>{v.brand} {v.model}</option>))}
                </select>
                {errors.vehicleId && <span className="error-text">{errors.vehicleId}</span>}
              </div>

              {/* Variant */}
              <div className="form-group">
                <label>Variant  <span className="required-star">*</span></label>
                <select
                  name="variantId"
                  value={formData.variantId}
                  onChange={handleChange}
                  disabled={editing}
                >
                  <option value="">Select Variant</option>
                  {availableVariants.map((v) => (<option key={v._id} value={v._id}>{v.name}</option>))}
                </select>
                {errors.variantId && <span className="error-text">{errors.variantId}</span>}
              </div>

              {/* Variant Details */}
              {selectedVariantDetails && (
                <>
                  <div className="form-group"><label>Type</label><input type="text" value={selectedVariantDetails.type} readOnly /></div>
                  <div className="form-group"><label>Engine</label><input type="text" value={`${selectedVariantDetails.engine} cc`} readOnly /></div>
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
                  value={formData.color}
                  onChange={handleChange}
                  disabled={editing}
                >

                  <option value="">Select Color</option>
                  {availableColors.map((c) => (
                    <option key={c.color} value={c.color}>
                      {c.color}
                    </option>
                  ))}
                </select>
                {errors.color && <span className="error-text">{errors.color}</span>}
              </div>

              <div className="form-group">
                <label>Total Count <span className="required-star">*</span></label>
                <input
                  type="number"
                  name="totalCount"
                  min={1}
                  value={formData.totalCount}
                  onChange={handleChange}
                  placeholder="Enter total vehicles count"
                />
                {errors.totalCount && <span className="error-text">{errors.totalCount}</span>}
              </div>

              <div className="form-group">
                <label>Total Amount <span className="required-star">*</span></label>
                <input
                  type="number"
                  name="totalAmount"
                  value={10000000 * formData.totalCount}
                  disabled={true}
                  placeholder="Enter final amount in ₹"
                />
              </div>

              {/* Customer Details */}
              <h4>Customer Details</h4>
              <div className="form-group">
                <label>Name <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="customerDetails.name"
                  value={formData.customerDetails.name}
                  onChange={handleChange}
                  placeholder="Enter full name (as per ID)"
                  disabled={editing}
                />
                {errors["customerDetails.name"] && <span className="error-text">{errors["customerDetails.name"]}</span>}
              </div>

              <div className="form-group">
                <label>Phone <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="customerDetails.phone"
                  value={formData.customerDetails.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  disabled={editing}
                />
                {errors["customerDetails.phone"] && <span className="error-text">{errors["customerDetails.phone"]}</span>}
              </div>

              <div className="form-group">
                <label>Email <span className="required-star">*</span></label>
                <input
                  type="email"
                  name="customerDetails.email"
                  value={formData.customerDetails.email}
                  onChange={handleChange}
                  placeholder="example@gmail.com"
                  disabled={editing}
                />
                {errors["customerDetails.email"] && <span className="error-text">{errors["customerDetails.email"]}</span>}
              </div>

              <div className="form-group">
                <label>Address <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="customerDetails.address"
                  value={formData.customerDetails.address}
                  onChange={handleChange}
                  placeholder="House no, Street, Landmark"
                  disabled={editing}
                />
                {errors["customerDetails.address"] && <span className="error-text">{errors["customerDetails.address"]}</span>}
              </div>

              <div className="form-group">
                <label>City <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="customerDetails.city"
                  value={formData.customerDetails.city}
                  onChange={handleChange}
                  placeholder="Enter city name"
                  disabled={editing}
                />
                {errors["customerDetails.city"] && <span className="error-text">{errors["customerDetails.city"]}</span>}
              </div>

              <div className="form-group">
                <label>State <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="customerDetails.state"
                  value={formData.customerDetails.state}
                  onChange={handleChange}
                  placeholder="Enter state name"
                  disabled={editing}
                />
                {errors["customerDetails.state"] && <span className="error-text">{errors["customerDetails.state"]}</span>}
              </div>

              <div className="form-group">
                <label>Pincode <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="customerDetails.pincode"
                  value={formData.customerDetails.pincode}
                  onChange={handleChange}
                  placeholder="6-digit area code"
                  disabled={editing}
                />
                {errors["customerDetails.pincode"] && <span className="error-text">{errors["customerDetails.pincode"]}</span>}
              </div>

              <div className="form-group">
                <label>Aadhar Number <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="customerDetails.aadharNumber"
                  value={formData.customerDetails.aadharNumber}
                  onChange={handleChange}
                  placeholder="12-digit Aadhar number"
                  disabled={editing}
                />
                {errors["customerDetails.aadharNumber"] && <span className="error-text">{errors["customerDetails.aadharNumber"]}</span>}
              </div>

              <div className="form-group">
                <label>PAN Number <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="customerDetails.panNumber"
                  value={formData.customerDetails.panNumber}
                  onChange={handleChange}
                  placeholder="ABCDE1234F"
                  disabled={editing}
                />
                {errors["customerDetails.panNumber"] && <span className="error-text">{errors["customerDetails.panNumber"]}</span>}
              </div>

              {/* Dates & Finance */}
              <div className="form-group">
                <label>Order Date</label>
                <input
                  type="date"
                  name="orderDate"
                  value={formData.orderDate || todayISO}
                  onChange={handleChange}
                  disabled
                />
                <small className="muted">Order date is set to today and not editable.</small>
              </div>

              <div className="form-group">
                <label>Expected Date <span className="required-star">*</span></label>
                <input
                  type="date"
                  name="expectedDate"
                  value={formData.expectedDate}
                  onChange={handleChange}
                  min={todayISO}
                  placeholder="Expected delivery date (>= today)"
                />
                {errors.expectedDate && <span className="error-text">{errors.expectedDate}</span>}
              </div>

              <div className="form-group">
                <label>Finance Type <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="financeType"
                  value={formData.financeType}
                  onChange={handleChange}
                  placeholder="Ex: EMI, Loan, Cash"
                  disabled={false}
                />
                {errors.financeType && <span className="error-text">{errors.financeType}</span>}
              </div>

              <div className="form-group">
                <label>Finance Status <span className="required-star">*</span></label>
                <select
                  name="financeStatus"
                  value={formData.financeStatus}
                  onChange={handleChange}
                  disabled={cancelledLock()}
                >
                  {financeStatuses.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
                {errors.financeStatus && <span className="error-text">{errors.financeStatus}</span>}
              </div>

              <div className="form-group">
                <label>Order Status <span className="required-star">*</span></label>
                <select
                  name="orderStatus"
                  value={formData.orderStatus}
                  onChange={handleChange}
                  disabled={cancelledLock()}
                >
                  {orderStatuses.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
                {errors.orderStatus && <span className="error-text">{errors.orderStatus}</span>}
              </div>

              {(formData.financeStatus == "Completed") && (formData.orderStatus == "Delivered") && <div className="form-group">
                <label>Delivery Date</label>
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleChange}
                  min={formData.orderDate || todayISO}
                  placeholder="Actual delivery date (optional)"
                />
                {errors.deliveryDate && <span className="error-text">{errors.deliveryDate}</span>}
              </div>}

              {errors.global && <div className="error-text" style={{ marginBottom: 12 }}>{errors.global}</div>}

              <button className="submit-btn" type="submit">
                {submitting ? (editing ? "Updating..." : "Placing...") : (editing ? "Update Order" : "Place Order")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
