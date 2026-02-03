import React from "react";
import "../../Styles/DashBoardComponentCss/DashBoard.css";
import logo from "../../assets/Finance.png";

export default function FinanceComponent() {
  return (
    <div className="dashboard">
      <div className="dashboard-item">
        {/* Dummy Image for UnderStanding How DashBoards Look on this screen */}
        <img src={logo} alt="Finance Demo" className="dashboard-image" />

        <h2>Welcome To Jen Veda</h2>
        <p>
          IMS Application That Streamlines And Automates Every Aspect Of Inventory
          Management Into A Single Platform To Track, Control, And Optimize Your
          Most Valuable Assets – Products And Stock.
        </p>
      </div>
    </div>
  );
}
