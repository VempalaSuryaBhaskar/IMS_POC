import React, { useEffect, useState } from "react";
import "../../Styles/VehicleComponentCss/VehicleManagement.css";
import { UseGlobalContext } from "../../Context/GlobalContext";
import axios from "axios";
import ToastNotification from "../../Utils/ToastNotification";

export default function VehicleManagement() {
  const { vehicles, setVehicles, API_URL, currentUser } = UseGlobalContext();

  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    variantName: "",
    branch: "",
    type: "",
    engine: "",
    transmission: "",
    seating: "",
    fuel: "",
    colors: "",
    features: "",
    price: "",
    colorStocks: {},
  });

  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const vehicleTypes = ["Hatchback", "Sedan", "SUV", "Coupe", "Convertible", "Crossover", "Pickup Truck", "Minivan", "Station Wagon", "Sports Car"];
  const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid"];
  const transmissions = ["Manual", "Automatic", "CVT", "Hybrid"];

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
  }

  // ================= to fetch Starting Data ===============
  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/vehicles/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log(res);
        setBranches(res?.data?.branches || []);
        setVehicles(res?.data?.vehicles || []);

        if (res?.data?.branches?.length == 0) {
          setToast({ type: "warning", message: "Branches are Empty First Add Branches!" });
        }
        else if (res?.data?.vehicles?.length == 0) {
          setToast({ type: "warning", message: "vehicles are Empty!" });
        }
        else {
          setToast({ type: "success", message: "Vehicles loaded successfully!" });
        }

      } catch (error) {
        console.log(error);
        setToast({
          type: "error",
          message: `${error?.response?.data?.message} || Failed to fetch vehicles. Please try again.`,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);





  // ============= change handler ===============
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "colors") {
      const colorArray = value.split(",").map(c => c.trim()).filter(Boolean);
      const newStocks = { ...formData.colorStocks };
      colorArray.forEach(c => { if (!(c in newStocks)) newStocks[c] = ""; });
      Object.keys(newStocks).forEach(c => { if (!colorArray.includes(c)) delete newStocks[c]; });
      setFormData({ ...formData, colors: value, colorStocks: newStocks });
      setErrors({ ...errors, colors: undefined, colorStocks: undefined });
      return;
    }
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: undefined });
  };

  const handleStockChange = (color, value) => {
    const sanitized = value === "" ? "" : Number(value);
    setFormData(prev => ({ ...prev, colorStocks: { ...prev.colorStocks, [color]: sanitized } }));
    if (errors.colorStocks && errors.colorStocks[color]) setErrors({ ...errors, colorStocks: { ...errors.colorStocks, [color]: undefined } });
  };

  const validate = () => {
    const newErrors = {};
    if (!branches || branches.length === 0) newErrors.branch = "No branches available!";
    if (!formData.brand.trim()) newErrors.brand = "Brand required";
    if (!formData.model.trim()) newErrors.model = "Model required";
    if (!formData.variantName.trim()) newErrors.variantName = "Variant required";
    if (!formData.branch) newErrors.branch = "Branch required";
    if (!formData.type) newErrors.type = "Type required";
    if (!formData.transmission) newErrors.transmission = "Transmission required";
    if (!formData.fuel) newErrors.fuel = "Fuel required";
    if (!formData.engine || Number(formData.engine) <= 99) newErrors.engine = "Engine > 99";
    if (!formData.seating || Number(formData.seating) <= 0) newErrors.seating = "Seating > 0";
    if (!formData.colors.trim()) newErrors.colors = "Colors required";
    if (!formData.price || Number(formData.price) < 100000) newErrors.price = "Price >= 100000";

    const stockErr = {};
    Object.entries(formData.colorStocks).forEach(([c, s]) => {
      if (s === "" || s === null || Number.isNaN(Number(s))) stockErr[c] = "Stock required number";
      else if (Number(s) < 0) stockErr[c] = "Stock >= 0";
    });
    if (Object.keys(stockErr).length) newErrors.colorStocks = stockErr;

    return newErrors;
  };



  //============= submit handler ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const colorsArr = Object.entries(formData.colorStocks)
      .map(([color, stock]) => ({ color: color.toLowerCase(), stock: Number(stock) }));

    const variantData = {
      name: formData.variantName.trim(),
      type: formData.type,
      engine: Number(formData.engine),
      transmission: formData.transmission,
      fuel: formData.fuel,
      seating: Number(formData.seating),
      colors: colorsArr,
      features: formData.features
        ? formData.features.split(",").map(f => f.trim()).filter(Boolean)
        : [],
      price: Number(formData.price),
    };

    if (isEditMode) {
      try {
        const res = await axios.put(
          `${API_URL}/vehicles/`,
          {
            vehicleId: formData.vehicleId,
            variantId: formData.variantId,
            branchId: formData.branch,
            variant: variantData,
            brand: formData.brand,
            model: formData.model
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        setToast({ type: "success", message: "Variant updated!" });

        setVehicles(prevVehicles => [
          res.data.populatedVehicle,
          ...prevVehicles.filter(v => v._id !== res.data.populatedVehicle._id)
        ]);

      } catch (err) {
        setToast({
          type: "error",
          message: err.response?.data?.message || "Failed to Update Variant"
        });

        return;
      }

    } else {
      try {
        const res = await axios.post(
          `${API_URL}/vehicles/`,
          {
            brand: formData.brand.trim(),
            model: formData.model.trim(),
            branch: formData.branch.trim(),
            variants: variantData
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        setToast({ type: "success", message: "Variant added!" });

        setVehicles(prevVehicles => [
          res.data.populatedVehicle,
          ...prevVehicles.filter(v => v._id !== res.data.populatedVehicle._id)
        ]);

      } catch (err) {
        if (err?.response?.data?.showErrors) {
          setErrors(err.response.data.showErrors);
          if (err?.response?.data?.showErrors?.variants?.general)
            setToast({ type: "error", message: `${err?.response?.data?.showErrors?.variants?.general}` });
        }
        return;
      }
    }

    setFormData({ brand: "", model: "", variantName: "", branch: "", type: "", engine: "", transmission: "", seating: "", fuel: "", colors: "", features: "", price: "", colorStocks: {} });
    setErrors({});
    setIsEditMode(false);
    setTimeout(() => setShowModal(false), 100);
  };




  // ================ Handle Edit Handler =================
  const handleEdit = (vehicleId, variantId, modelIdx, variantIdx) => {
    const vehicle = vehicles[modelIdx], variant = vehicle.variants[variantIdx];

    console.log(variantIdx);
    console.log(vehicle);
    console.log(variant)
    const colorStocks = {};
    (variant.colors || []).forEach(c => colorStocks[c.color] = c.stock);

    setFormData({
      vehicleId: vehicleId,
      variantId: variantId,
      brand: vehicle.brand,
      model: vehicle.model,
      variantName: variant.name,
      branch: vehicle.branch._id,
      type: variant.type,
      engine: variant.engine,
      transmission: variant.transmission,
      seating: variant.seating,
      fuel: variant.fuel,
      colors: (variant.colors || []).map(c => c.color).join(", "),
      features: (variant.features || []).join(", "),
      price: variant.price,
      colorStocks
    });
    setIsEditMode(true);
    setShowModal(true);
    setErrors({});
  };




  //=========== for delete vehicle =============
  const handleDelete = async (modelIdx, variantIdx) => {

    try {
      const res = await axios.delete(
        `${API_URL}/vehicles/${modelIdx}/${variantIdx}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setToast({ type: "success", message: `${res?.data?.message || "Variant Deleted Successfully!"}` });

      setVehicles(res?.data?.vehicles || []);

    } catch (err) {
      setToast({ type: "error", message: `${err?.response?.message || "Sorry Please Try Later!"}` })
    }
  };



  //=============Loading animation ===============
  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }


  return (
    <div className="vehicle-container">
      {toast && <ToastNotification {...toast} onClose={() => setToast(null)} />}
      <div className="top-bar">
        <h2>Vehicle Management</h2>
        {branches?.length ? (
          <>
            {currentUser?.permissions?.vehicleManagement?.includes("Create") && (
              <button className="add-branch-btn" onClick={() => setShowModal(true)}>
                <i className="fa-solid fa-plus"></i> Add Vehicle
              </button>
            )}
          </>
        ) : (
          <span className="error-msg">No branches available first add Branch</span>
        )}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Brand</th><th>Model</th><th>Variant</th><th>Branch</th><th>Type</th><th>Engine</th><th>Transmission</th><th>Fuel</th><th>Seating</th><th>Colors (stock)</th><th>Colors (BlockedStock)</th><th>Features</th><th>Price</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length ? vehicles.map((v, mIdx) =>
              v?.variants?.map((variant, vIdx) => (
                <tr key={`${mIdx}-${vIdx}`}>
                  <td>{v.brand}</td>
                  <td>{v.model}</td>
                  <td>{variant.name}</td>
                  <td>{v.branch?.name || "—"}</td>
                  <td>{variant.type}</td>
                  <td>{variant.engine}</td>
                  <td>{variant.transmission}</td>
                  <td>{variant.fuel}</td>
                  <td>{variant.seating}</td>
                  <td>{(variant.colors || []).map(c => `${c.color} (${c.stock})`).join(", ")}</td>
                  <td>{(variant.colors || []).map(c => `${c.color} (${c.blockedCount})`).join(", ")}</td>
                  <td>{(variant.features || []).join(", ")}</td>
                  <td>{variant.price}</td>
                  <td>
                    {currentUser?.permissions?.vehicleManagement?.includes("Update") && (
                      <button className="edit-btn" onClick={() => {
                        console.log(v._id, variant._id, mIdx, vIdx)
                        handleEdit(v._id, variant._id, mIdx, vIdx)
                      }}>
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                    )}
                    {currentUser?.permissions?.vehicleManagement?.includes("Delete") && (
                      <button className="delete-btn" onClick={() => handleDelete(v._id, variant._id)}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="12" className="no-data">
                  {currentUser?.permissions?.vehicleManagement?.includes("View")
                    ? "No Vehicles added yet"
                    : "Sorry, you don't have permission!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setIsEditMode(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{isEditMode ? "Edit Variant" : "Add Variant"}</h3>
            <form onSubmit={handleSubmit}>
              {["brand", "model", "variantName"].map(f => (
                <div key={f} className="form-group">
                  <label>{f[0].toUpperCase() + f.slice(1)} <span className="required-star">*</span></label>
                  <input name={f} value={formData[f]} onChange={handleChange} placeholder={f === "brand" ? "Ex: Hyundai" : f === "model" ? "Ex: Creta" : "Ex: SX(O)"} />
                  {errors[f] && <span className="error-msg">{errors[f]}</span>}
                </div>
              ))}

              <div className="form-group">
                <label>Branch <span className="required-star">*</span></label>
                <select name="branch" value={formData.branch || ""} onChange={handleChange}>
                  {!isEditMode && <option value="">Select Branch</option>}
                  {branches.map(b => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
                {errors.branch && <span className="error-msg">{errors.branch}</span>}
              </div>

              <div className="form-group">
                <label>Type <span className="required-star">*</span></label>
                <select name="type" value={formData.type} onChange={handleChange}>
                  <option value="">Select Type</option>
                  {vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.type && <span className="error-msg">{errors.type}</span>}
              </div>

              <div className="form-group">
                <label>Engine (cc) <span className="required-star">*</span></label>
                <input name="engine" type="number" value={formData.engine} onChange={handleChange} placeholder="Ex: 1400" min={100} />
                {errors.engine && <span className="error-msg">{errors.engine}</span>}
              </div>

              <div className="form-group">
                <label>Transmission <span className="required-star">*</span></label>
                <select name="transmission" value={formData.transmission} onChange={handleChange}>
                  <option value="">Select Transmission</option>
                  {transmissions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.transmission && <span className="error-msg">{errors.transmission}</span>}
              </div>

              <div className="form-group">
                <label>Seating Capacity <span className="required-star">*</span></label>
                <input name="seating" type="number" value={formData.seating} onChange={handleChange} placeholder="Ex: 5" min={1} />
                {errors.seating && <span className="error-msg">{errors.seating}</span>}
              </div>

              <div className="form-group">
                <label>Fuel Type <span className="required-star">*</span></label>
                <select name="fuel" value={formData.fuel} onChange={handleChange}>
                  <option value="">Select Fuel</option>
                  {fuelTypes.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                {errors.fuel && <span className="error-msg">{errors.fuel}</span>}
              </div>

              <div className="form-group">
                <label>Colors (comma separated) <span className="required-star">*</span></label>
                <input name="colors" value={formData.colors} onChange={handleChange} placeholder="Ex: Red, Black, White" />
                {errors.colors && <span className="error-msg">{errors.colors}</span>}
              </div>

              {Object.keys(formData.colorStocks).map(c => (
                <div className="form-group" key={c}>
                  <label>{c} Stock <span className="required-star">*</span></label>
                  <input type="number" value={formData.colorStocks[c]} onChange={e => handleStockChange(c, e.target.value)} placeholder={`Stock for ${c}`} min={0} />
                  {errors.colorStocks && errors.colorStocks[c] && <span className="error-msg">{errors.colorStocks[c]}</span>}
                </div>
              ))}

              <div className="form-group">
                <label>Features (comma separated)</label>
                <input name="features" value={formData.features} onChange={handleChange} placeholder="Ex: Sunroof, ABS, Bluetooth" />
              </div>

              <div className="form-group">
                <label>Price (₹) <span className="required-star">*</span></label>
                <input name="price" type="number" value={formData.price} onChange={handleChange} placeholder="Ex: 1200000" min={100000} />
                {errors.price && <span className="error-msg">{errors.price}</span>}
              </div>

              <button type="submit" className="submit-btn">{isEditMode ? "Update Variant" : "Add Variant"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
