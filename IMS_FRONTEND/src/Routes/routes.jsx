import React from 'react'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router-dom'
import App from '../App'
import Login from '../Components/AuthComponents/Login'
import BranchManagement from '../Components/BranchComponents/BranchManagement'
import VehicleManagement from '../Components/VehicleComponents/VehicleManagement'
import MddpManagement from '../Components/MddpComponents/MddpManagement'
import ManageUsers from '../Components/AuthComponents/ManageUsers'
import CustomerOrders from '../Components/OrderComponents/CustomerOrders'
import DashBoard from "../Components/DashBoradComponents/DashBorad"
import FinanceComponent from '../Components/FinanceComponents/FinanceComponent'

export default function routes() {

    const router = createBrowserRouter([
        {
            path: '/',
            element: <App />,
            children: [
                { path: '/', element: <DashBoard /> },
                { path: '/Branches', element: <BranchManagement /> },
                { path: '/Vehicles', element: <VehicleManagement /> },
                { path: '/Mddps', element: <MddpManagement /> },
                { path: '/ManageUsers', element: <ManageUsers /> },
                { path: '/CustomerOrders', element: <CustomerOrders /> },
                {path: '/Finance', element: <FinanceComponent />}
            ],
        },
        {
            path: '/login',
            element: <Login />,
        }
    ])
    return <RouterProvider router={router}></RouterProvider>
}




