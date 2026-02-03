import React, { useState } from "react";
import "../Styles/PagesCss/Sidebar.css";
import { useNavigate } from "react-router";

export default function Sidebar() {
  const logo = "https://tsthr.jenveda.net/_next/static/media/logo.0bc1654e.svg";
  const navigate = useNavigate();

  const [hoveredItem, setHoveredItem] = useState(null);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0 });

  const dropdowns = {
    Branches: ["Hyderabad", "Vishaka", "Vijayavada", "Benglore"],
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

  const handleMouseEnter = (event, item) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dropdownHeight = Math.min(200, dropdowns[item].length * 40);
    const viewportHeight = window.innerHeight;

    let top = rect.top + rect.height / 2 - dropdownHeight / 2;

    // Make sure dropdown does not overflow bottom of viewport
    if (top + dropdownHeight > viewportHeight) {
      top = viewportHeight - dropdownHeight - 5;
    }
    if (top < 5) top = 5;

    setDropdownStyle({
      top: top + 20,
      left: rect.right - 10, // right next to sidebar
    });

    setHoveredItem(item);
  };

  const handleMouseLeave = () => setHoveredItem(null);

  return (
    <div className="sidebar">
      <div className="logo" onClick={() => (window.location.href = "/")}>
        <img src={logo} className="logo-img" alt="Logo" />
      </div>

      <ul className="nav">
        {navItems.map((item, index) => (
          <li
            key={index}
            className="nav-item"
            onClick={() => navigate(item.route)} // ✅ Use item.route dynamically
            onMouseEnter={(e) => handleMouseEnter(e, item.label)}
            onMouseLeave={handleMouseLeave}
          >
            <i className={`fa-solid ${item.icon}`}></i>
            <span>{item.label}</span>
          </li>
        ))}

      </ul>

      {
        hoveredItem && dropdowns[hoveredItem] && (
          <ul
            className="dropdown"
            style={{
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              position: "fixed", // fixed relative to viewport
            }}
            onMouseEnter={() => setHoveredItem(hoveredItem)}
            onMouseLeave={handleMouseLeave}
            onClick={() => window.location.href = "/"}
          >
            {dropdowns[hoveredItem].map((option, i) => (
              <li key={i}>{option}</li>
            ))}
          </ul>
        )
      }
    </div >
  );
}
