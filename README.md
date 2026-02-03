# 🚗 Inventory Management System (IMS) – Frontend

A modern, enterprise-grade **Inventory Management System** built for vehicle dealerships, enabling **multi-branch inventory tracking, customer order management, MDDP procurement, and role-based user control**.

**Tech Stack:** React 19 • Vite • Context API • JWT Auth  
**Domain:** Automotive Dealership Management  
**Architecture:** Modular, scalable, production-ready  

---

## 📌 Table of Contents

- Overview  
- Key Features  
- User Roles  
- Tech Stack  
- Project Structure  
- Core Modules  
- Authentication & Security  
- Workflows  
- State Management  
- UI/UX Highlights  
- API Integration  
- Setup & Installation  
- Future Enhancements  

---

## 📖 Overview

The **Inventory Management System (IMS) Frontend** is designed to streamline dealership operations by providing a **single unified dashboard** for:

- Managing multiple branches  
- Tracking vehicle inventory with variants & color-wise stock  
- Handling customer orders  
- Managing MDDP (Manufacturer Direct Purchase)  
- Enforcing role-based access control (RBAC)  

This application communicates with a **secure backend API** and uses **JWT authentication with protected routes**.

---

## ✨ Key Features

✅ Multi-branch inventory management  
✅ Vehicle & variant-level stock tracking  
✅ Color-wise stock control  
✅ Customer order lifecycle management  
✅ MDDP request & procurement workflow  
✅ Role-based permissions (RBAC)  
✅ Protected routes with JWT  
✅ Centralized global state (Context API)  
✅ Toast notifications & loading states  
✅ Responsive, dashboard-style UI  

---

## 👥 User Roles

### 🔑 Admin
- Full system access  
- User & permission management  

### 🏢 Branch Manager
- Branch-specific inventory control  

### 🧑‍💼 Sales Executive
- Customer order creation & tracking  

### 📦 Inventory Manager
- MDDP requests & stock updates  

---

## 🛠 Tech Stack

### Frontend
- React 19  
- Vite  
- React Router DOM  
- Axios  
- Context API  
- Font Awesome  

### Authentication
- JWT Token-based authentication  
- Protected routes  
- Permission-based UI rendering  

---

## 📁 Project Structure

```bash
src/
├── Components/
│   ├── AuthComponents/        # Login & User Management
│   ├── BranchComponents/      # Branch CRUD
│   ├── VehicleComponents/     # Vehicle & Variant Management
│   ├── OrderComponents/       # Customer Orders
│   ├── MddpComponents/        # MDDP Management
│   └── DashboardComponents/   # Dashboard UI
│
├── Context/                   # Global State Management
├── Routes/                    # Route Definitions
├── Pages/                     # Layout & Containers
├── Styles/                    # CSS
└── Utils/                     # Toast & Helpers

```


## 🧩 Core Modules

### 🏢 Branch Management
- Create, edit, delete branches  
- Duplicate & dependency validation  
- Permission-based actions  

### 🚗 Vehicle Management
- Vehicle & variant CRUD  
- Color-wise stock tracking  
- Branch-linked inventory  
- Engine, fuel, transmission, seating specs  

### 📦 Customer Orders
- Branch → Vehicle → Variant flow  
- Auto price population  
- Order & delivery status tracking  
- Finance type handling  
- Read-only protection for completed orders  

### 🏭 MDDP Management
- Manufacturer purchase requests  
- Status flow: `Requested → Approved → Completed`  
- Payment tracking  
- Automatic stock update on completion  

### 👥 User Management
- User CRUD  
- Module-level permission control  
- Role-based UI rendering  

---

## 🔐 Authentication & Security
- JWT-based login  
- Token stored in `localStorage`  
- Automatic token verification on app load  
- Protected routes  
- Auto logout on token expiry  
- Permission-based access control  

---

## 🔄 Workflows (High Level)

### 🔑 Login Flow
Login → Token → Context → Protected Routes → Dashboard


### 📦 Order Flow
Branch → Vehicle → Variant → Customer Details → Order Status → Delivery


### 🏭 MDDP Flow
Branch → Vehicle → Variant → Color → Stock → Status → Inventory Update

---

## 🔗 Major Endpoints Used
- /auth/login
- /branches
- /vehicles
- /orders
- /mddps
- /users



---

## ⚙️ Setup & Installation

### Prerequisites

- Node.js v16+
- Backend API running

### Installation

```bash
git clone <repository-url>
cd IMS_FRONTEND
npm install
npm run dev

```


---

## 🚀 Future Enhancements

- 📊 Analytics & reports dashboard
- 🔔 Real-time notifications (WebSockets)
- 🌙 Dark mode & theming
- 📱 Mobile app (React Native)
- 📈 Advanced filtering & search
- 📸 Vehicle image uploads
- 📧 Email & SMS notifications
- 🔐 Two-factor authentication


