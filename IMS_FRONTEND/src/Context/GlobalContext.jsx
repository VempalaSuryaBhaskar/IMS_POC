import axios from "axios";
import React, { createContext, useContext, useEffect, useState } from "react";
import ToastNotification from "../Utils/ToastNotification";

// Create Context
const GlobalContext = createContext();

// Custom hook to use Global Context
export const UseGlobalContext = () => useContext(GlobalContext);

// Provider component
export const GlobalContextProvider = ({ children }) => {

  const API_URL = import.meta.env.VITE_API_URL;

  // Current Users
  const [currentUser, setCurrentUserState] = useState(null);
  //global toast
  const [toast, setToast] = useState(null);
  // Users
  const [users, setUsers] = useState([]);
  // Branches
  const [branches, setBranches] = useState([]);
  // Vehicles
  const [vehicles, setVehicles] = useState([]);
  // MDDP
  const [mddp, setMddp] = useState([]);
  //Orders or CustomerOrders
  const [orders,setOrders] = useState([]);

  // Verify token on mount
  const [loading, setLoading] = useState(true); 


  //Authentication At Mount 
  useEffect(() => {
    const verifyToken = async () => {
      console.log("Verifying token on mount...");
      const token = localStorage.getItem("token");

      if (!token) {
        console.log("No token found");
        setCurrentUserState(null);
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${API_URL}/auth/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data && res.data.user) {
          console.log("Token valid");
          console.log(res);
          setCurrentUserState(res.data.user);
        } else {
          console.log("Token invalid");
          localStorage.removeItem("token");
          setCurrentUserState(null);
        }
      } catch (err) {
        console.error("Token verification failed:", err);
        localStorage.removeItem("token");
        setCurrentUserState(null);
      } finally {
        setLoading(false); //  mark done
      }
    };

    verifyToken();
  }, []);



  return (
    <GlobalContext.Provider
      value={{
        vehicles,
        setVehicles,
        mddp,
        setMddp,
        currentUser,
        setCurrentUserState,
        users,
        setUsers,
        orders,
        setOrders,
        loading,
        setLoading,
        toast,
        setToast,
        branches,
        setBranches,
        API_URL
      }}
    >
      {children}
      {toast && <ToastNotification {...toast} onClose={() => setToast(null)} />}
    </GlobalContext.Provider>
  );
};


















// {
//       id: 1,
//       brand: "Hyundai",
//       model: "Creta",
//       branch: {
//         id: 2,
//         name: "North Branch",
//         location: "Tirupati",
//         contact: "9876501234",
//       },
//       variants: [
//         {
//           id: 1,
//           name: "SX(O)",
//           type: "SUV",
//           engine: 1498,
//           transmission: "Automatic",
//           fuel: "Petrol",
//           seating: 5,
//           features: ["Sunroof", "ABS"],
//           colors: [
//             { color: "White", stock: 20 },
//             { color: "Black", stock: 15 },
//           ],
//           price: 1450000,
//         },
//         {
//           id: 2,
//           name: "S",
//           type: "SUV",
//           engine: 1498,
//           transmission: "Manual",
//           fuel: "Petrol",
//           seating: 5,
//           features: ["ABS"],
//           colors: [
//             { color: "Red", stock: 15 },
//             { color: "Grey", stock: 10 },
//           ],
//           price: 1350000,
//         },
//       ],
//     },
//     {
//       id: 2,
//       brand: "Toyota",
//       model: "Fortuner",
//       branch: {
//         id: 1,
//         name: "Central Branch",
//         location: "Madanapalle",
//         contact: "9876543210",
//       },
//       variants: [
//         {
//           id: 3,
//           name: "S1",
//           type: "SUV",
//           engine: 2755,
//           transmission: "Automatic",
//           fuel: "Diesel",
//           seating: 7,
//           features: ["Cruise Control", "ABS"],
//           colors: [
//             { color: "White", stock: 10 },
//             { color: "Black", stock: 5 },
//           ],
//           price: 3500000,
//         },
//       ],
//     },