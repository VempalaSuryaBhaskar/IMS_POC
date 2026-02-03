import React, { useState } from "react";
import "../Styles/PagesCss/Header.css";
import { useNavigate } from "react-router";
import { UseGlobalContext } from "../Context/GlobalContext"

export default function Header() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { setCurrentUserState ,currentUser, setToast } = UseGlobalContext();

  // Notifications state
  const [notifications, setNotifications] = useState([
    { by: "Surya Bhaskar", msg: "liked your post." },
    { by: "Branch A", msg: "report is ready." },
    { by: "Warehouse", msg: "New stock added." },
    { by: "Customer Order #123", msg: "is pending." },
    { by: "Finance", msg: "invoice #456 is paid." },
    { by: "Manufacturer", msg: "delivered new items." },
    { by: "Admin", msg: "updated your role." },
    { by: "MDDP", msg: "Performance report is ready." },
    { by: "Reminder", msg: "Meeting at 3 PM." },
    { by: "System", msg: "maintenance scheduled tomorrow." },
  ]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleDropdown = (label) =>
    setActiveDropdown(activeDropdown === label ? null : label);
  const toggleProfileDropdown = () =>
    setIsProfileDropdownOpen(!isProfileDropdownOpen);

  const openNotifications = () => {
    setIsNotificationOpen(true);
    requestAnimationFrame(() => setIsAnimating(true)); // trigger enter animation
  };

  const closeNotifications = () => {
    setIsAnimating(false); // trigger exit animation
    setTimeout(() => setIsNotificationOpen(false), 300); // remove after animation
  };

  const dropdowns = {

  };

  const navItems = [
    { icon: "fa-house", label: "Dashboard", route: "/" },
    { icon: "fa-users", label: "Manage Branches", route: "/Branches" },
    { icon: "fa-warehouse", label: "Vehicle Management", route: "/Vehicles" },
    { icon: "fa-house", label: "Mddp", route: "/Mddps" },
    { icon: "fa-truck", label: "Customer Orders", route: "/CustomerOrders" },
    { icon: "fa-piggy-bank", label: "Finance", route: "/" },
    // { icon: "fa-truck", label: "Manage Branches" },
    { icon: "fa-user-gear", label: "Manage Users", route: "/ManageUsers" },
  ];

  const handleLogout = () => {

    setToast({ type: "success", message: "Log Out Successfully" });
    setIsProfileDropdownOpen(false);
    setCurrentUserState(null);
    localStorage.removeItem("token");

    setTimeout(() => {
      window.location.href = "/login";
    }, 500);
  };

  return (
    <>
      {/* Header */}
      <div className="header">
        <div className="breadcrumb">
          <span className="company">{currentUser?.username}</span> &gt;{" "}
          <span className="section">VMS</span> &gt;{" "}
        </div>

        <div className="breadcrumb-2" onClick={toggleSidebar}>
          <i className="fa-solid fa-bars"></i>
        </div>

        <div className="header-right">
          {/* Notifications */}
          <div
            className="notification"
            style={{ cursor: "pointer" }}
            onClick={openNotifications}
          >
            <i className="fa-solid fa-bell"></i>
            <span className="badge">{notifications.length}</span>
          </div>

          <div className="vertical-line"></div>

          {/* Profile */}
          <div className="SU" onClick={toggleProfileDropdown}>
            <div className="profile">SU</div>
            <i
              className={`fa-solid fa-caret-${isProfileDropdownOpen ? "up" : "down"
                }`}
            ></i>
          </div>

          {isProfileDropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-info">
                <div className="profile-circle">SU</div>
                <div className="profile-details">
                  <div className="profile-name">Surya Bhaskar</div>
                  <div className="profile-role">
                    suryabhaskarvempala@gmail.com
                  </div>
                </div>
              </div>

              <div className="acc-details">My Account</div>
              <div className="dropdown-divider"></div>

              <button className="logout-btn" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket"></i> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Overlay */}
      <div className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-content">
          <div className="close-btn" onClick={closeSidebar}>
            <i className="fa-solid fa-xmark"></i>
          </div>

          <ul className="sidebar-menu">
            {navItems.map((item, index) => (
              <li key={index} className="menu-item">
                <div
                  className="menu-label"
                  onClick={() => {
                    if (dropdowns[item.label]) {
                      toggleDropdown(item.label);
                    } else {
                      navigate(item.route);
                      setIsSidebarOpen(false);
                    }
                  }}
                >
                  <i className={`fa-solid ${item.icon}`}></i>
                  <span>{item.label}</span>
                </div>

                {activeDropdown === item.label && dropdowns[item.label] && (
                  <ul className="submenu">
                    {dropdowns[item.label].map((subItem, subIndex) => (
                      <li
                        key={subIndex}
                        className="submenu-item"
                        onClick={() => {
                          toggleDropdown(item.label);
                          // navigate("/Branches")
                          setIsSidebarOpen(false);
                        }}
                      >
                        {subItem}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Notification Overlay */}
      {isNotificationOpen && (
        <>
          <div
            className={`notification-overlay ${isAnimating ? "fade-in" : "fade-out"}`}
            onClick={closeNotifications}
          ></div>

          <div
            className={`notification-drawer ${isAnimating ? "slide-in" : "slide-out"}`}
          >
            <div className="notification-header">
              <h3>Notifications</h3>
              <button className="notification-close-btn" onClick={closeNotifications}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="notification-content">
              {notifications.map((item, index) => (
                <div key={index} className="notification-item">
                  <strong>{item.by}:</strong> {item.msg}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
