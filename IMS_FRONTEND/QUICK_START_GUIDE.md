# IMS Frontend - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Backend API running on port 5000

### Installation
```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd IMS_FRONTEND

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup
Create a `.env` file in the root directory:
```
VITE_API_URL=http://localhost:5000/api
```

---

## 📁 Project Structure

```
src/
├── Components/
│   ├── AuthComponents/          # Login & User Management
│   │   ├── Login.jsx
│   │   └── ManageUsers.jsx
│   ├── BranchComponents/        # Branch Management
│   │   └── BranchManagement.jsx
│   ├── VehicleComponents/       # Vehicle & Variant Management
│   │   └── VehicleManagement.jsx
│   ├── MddpComponents/          # MDDP Request Management
│   │   └── MddpManagement.jsx
│   ├── OrderComponents/          # Customer Order Management
│   │   └── CustomerOrders.jsx
│   └── DashBoradComponents/     # Dashboard
│       └── DashBorad.jsx
├── Context/
│   └── GlobalContext.jsx        # Global State Management
├── Pages/
│   ├── Header.jsx               # Top Navigation
│   ├── Sidebar.jsx              # Side Navigation
│   └── Footer.jsx
├── Routes/
│   └── routes.jsx               # Route Configuration
├── Styles/                       # CSS Files
└── Utils/
    └── ToastNotification.jsx    # Toast Component
```

---

## 🔑 Key Features Overview

### 1. Authentication
- **Login:** Secure JWT-based authentication
- **Token Management:** Automatic token verification
- **Protected Routes:** Auto-redirect to login

### 2. Branch Management
- Create, Read, Update, Delete branches
- Validation for name, location, contact
- Permission-based access

### 3. Vehicle Management
- Comprehensive vehicle inventory
- Multiple variants per model
- Color-based stock tracking
- Detailed specifications

### 4. Customer Orders
- End-to-end order processing
- Branch-based vehicle filtering
- Status tracking (Pending/Approved/Delivered)
- Customer details management

### 5. MDDP Management
- Manufacturer purchase requests
- Status workflow (Requested → Approved → Completed)
- Payment tracking
- Expected delivery dates

### 6. User Management
- Role-based access control
- Permission configuration
- User CRUD operations

---

## 🎯 Common Tasks

### Adding a New Branch
1. Navigate to **Branches** in sidebar
2. Click **"Add Branch"** button
3. Fill in:
   - Branch Name (min 3 characters)
   - Location (letters only)
   - Contact (exactly 10 digits)
4. Click **"Add Branch"**
5. See success toast notification

### Adding a Vehicle Variant
1. Navigate to **Vehicles** in sidebar
2. Click **"Add Branch"** button
3. Select branch from dropdown
4. Enter vehicle details:
   - Brand, Model, Variant Name
   - Type, Engine, Transmission, Fuel
   - Seating capacity
5. Add colors (comma-separated): "Red, Blue, White"
6. Enter stock for each color
7. Add features (comma-separated)
8. Set price (minimum ₹100,000)
9. Submit form

### Creating a Customer Order
1. Navigate to **Customer Orders**
2. Click **"Add Order"** button
3. Select branch → vehicle → variant
4. Enter customer details:
   - Name (required)
   - Phone (required)
   - Email, Address, City, State, Pincode
5. Set dates:
   - Order Date
   - Delivery Date (must be after order date)
6. Select finance type
7. Set order status and delivery status
8. Verify total amount (auto-filled from variant)
9. Submit order

### Creating MDDP Request
1. Navigate to **MDDP Management**
2. Click **"Add Mddp"** button
3. Select branch → vehicle → variant
4. Select color from available colors
5. Enter stock quantity to request
6. Set expected delivery date
7. Select payment status
8. Set MDDP status
9. Submit request

---

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

---

## 🌐 Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | Login | User authentication |
| `/` | Dashboard | Main dashboard |
| `/Branches` | BranchManagement | Branch CRUD |
| `/Vehicles` | VehicleManagement | Vehicle CRUD |
| `/Mddps` | MddpManagement | MDDP management |
| `/CustomerOrders` | CustomerOrders | Order management |
| `/ManageUsers` | ManageUsers | User management |

---

## 🔐 Authentication Flow

```javascript
// Login Process
1. User submits credentials
2. API call to /api/auth/login
3. Receive token + user data
4. Store token in localStorage
5. Store user in Context
6. Redirect to dashboard

// Token Verification
1. App loads
2. Check localStorage for token
3. If token exists, verify with API
4. If valid, set user in Context
5. If invalid, redirect to login
```

---

## 🎨 Styling

- **Component-specific CSS:** Each component has its own CSS file
- **Global Styles:** `src/index.css`
- **CSS Organization:** Separated by component type

### CSS File Locations:
```
Styles/
├── AuthComponentCss/
│   ├── Login.css
│   └── ManageUsers.css
├── BrachComponentCss/
│   └── BranchManagement.css
├── VehicleComponentCss/
│   └── VehicleManagement.css
├── DashBoardComponentCss/
│   └── DashBoard.css
└── PagesCss/
    ├── Header.css
    └── Sidebar.css
```

---

## 🔔 Toast Notifications

Toast notifications are used throughout the app for user feedback:

```javascript
// Usage in components
const { setToast } = UseGlobalContext();

// Success
setToast({ type: "success", message: "Operation successful!" });

// Error
setToast({ type: "error", message: "Operation failed!" });

// Warning
setToast({ type: "warning", message: "Please check input!" });
```

---

## 🛠️ State Management

Global state is managed via Context API:

```javascript
// Accessing global state
import { UseGlobalContext } from "../Context/GlobalContext";

const MyComponent = () => {
  const {
    currentUser,
    branches,
    vehicles,
    mddp,
    customerOrders,
    setBranches,
    setVehicles,
    API_URL
  } = UseGlobalContext();

  // Use state values
  return <div>{currentUser.username}</div>;
};
```

---

## 📡 API Integration

All API calls use Axios with authentication:

```javascript
import axios from "axios";

// GET request
const response = await axios.get(`${API_URL}/branches`, {
  headers: { Authorization: `Bearer ${token}` }
});

// POST request
const response = await axios.post(
  `${API_URL}/branches`,
  { name, location, contact },
  { headers: { Authorization: `Bearer ${token}` } }
);

// PUT request
const response = await axios.put(
  `${API_URL}/branches/${id}`,
  { name, location, contact },
  { headers: { Authorization: `Bearer ${token}` } }
);

// DELETE request
const response = await axios.delete(
  `${API_URL}/branches/${id}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## 🚨 Error Handling

```javascript
try {
  const response = await axios.post(`${API_URL}/endpoint`, data);
  setToast({ type: "success", message: "Success!" });
  // Handle success
} catch (error) {
  console.error(error);
  
  // Handle specific errors
  if (error.response) {
    // Server responded with error
    setToast({
      type: "error",
      message: error.response.data.message || "Error occurred"
    });
  } else if (error.request) {
    // Request made but no response
    setToast({ type: "error", message: "Network error" });
  } else {
    // Something else happened
    setToast({ type: "error", message: "Unknown error" });
  }
}
```

---

## 🎯 Permission System

Permissions are checked before rendering UI elements:

```javascript
// Example: Conditionally render edit button
{currentUser?.permissions?.manageBranches?.includes("Update") && (
  <button className="edit-btn" onClick={handleEdit}>
    <i className="fa-solid fa-pen-to-square"></i>
  </button>
)}
```

### Permission Structure:
```javascript
{
  manageBranches: ["Create", "Read", "Update", "Delete"],
  vehicleManagement: ["Create", "Read", "Update", "Delete"],
  mddpManagement: ["Create", "Read", "Update", "Delete"],
  orderManagement: ["Create", "Read", "Update", "Delete"],
  userManagement: ["Create", "Read", "Update", "Delete"]
}
```

---

## 🐛 Troubleshooting

### Common Issues:

**1. API Connection Error**
- Check if backend is running
- Verify `VITE_API_URL` in `.env`
- Check network connectivity

**2. Authentication Issues**
- Clear localStorage
- Check token expiration
- Verify backend auth endpoint

**3. Permission Errors**
- Check user permissions in backend
- Verify permission structure
- Check GlobalContext state

**4. CORS Errors**
- Configure backend CORS
- Check API URL configuration

**5. Build Errors**
- Clear node_modules and reinstall
- Check Node.js version
- Verify all dependencies

---

## 📝 Code Examples

### Creating a Modal:
```javascript
const [showModal, setShowModal] = useState(false);

return (
  <>
    <button onClick={() => setShowModal(true)}>Open Modal</button>
    
    {showModal && (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Modal content */}
          <button onClick={() => setShowModal(false)}>Close</button>
        </div>
      </div>
    )}
  </>
);
```

### Form Validation:
```javascript
const validate = () => {
  const errors = {};
  
  if (!formData.name.trim()) {
    errors.name = "Name is required";
  }
  
  if (formData.contact.length !== 10) {
    errors.contact = "Contact must be 10 digits";
  }
  
  return errors;
};
```

### Form Submission:
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const errors = validate();
  if (Object.keys(errors).length > 0) {
    setErrors(errors);
    return;
  }
  
  try {
    const response = await axios.post(`${API_URL}/endpoint`, formData);
    setToast({ type: "success", message: "Success!" });
    // Handle success
  } catch (error) {
    setToast({ type: "error", message: error.response.data.message });
  }
};
```

---

## 📚 Additional Resources

- **React Documentation:** https://react.dev
- **Vite Documentation:** https://vitejs.dev
- **React Router:** https://reactrouter.com
- **Axios Documentation:** https://axios-http.com

---

## 🎉 Quick Tips

1. **Always validate forms** before submission
2. **Use toast notifications** for user feedback
3. **Check permissions** before rendering sensitive UI
4. **Handle errors gracefully** with try-catch blocks
5. **Use loading states** during API calls
6. **Clear form data** after successful submission
7. **Update state** after API operations
8. **Check token** before API calls

---

**Happy Coding! 🚀**

