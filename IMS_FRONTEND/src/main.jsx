import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Routes from "./Routes/routes.jsx"
import './index.css'
import App from './App.jsx'
import { GlobalContextProvider } from './Context/GlobalContext.jsx';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalContextProvider >
      <Routes/>
    </GlobalContextProvider>
  </StrictMode>,
)
