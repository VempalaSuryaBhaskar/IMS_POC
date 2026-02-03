import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Pages/Sidebar";
import Header from "./Pages/Header";
import { UseGlobalContext } from "./Context/GlobalContext";

export default function App() {
  const { currentUser, loading } = UseGlobalContext();

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }


  if (!currentUser || currentUser == null) {
    console.log(currentUser);
    console.log("current user");
    console.log("No user found, redirecting to login...");
    return <Navigate to="/login" replace />;
  }

  if (currentUser) {
    console.log(currentUser);
    console.log("current user");
  }

  return (
    <div className="app-wrapper">
      <Sidebar />
      <div className="main-content">
        <Header />
        <Outlet />
      </div>
    </div>
  );
}
