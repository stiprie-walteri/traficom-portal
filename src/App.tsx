import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { MainLayout } from "@/layouts/MainLayout"
import { LandingPage } from "@/pages/LandingPage"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Home } from "@/pages/dashboard/Home"
import { Upload } from "@/pages/dashboard/Upload"
import { DocumentView } from "@/pages/dashboard/DocumentView"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<MainLayout><LandingPage /></MainLayout>} />
        
        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Home />} />
          <Route path="upload" element={<Upload />} />
          <Route path="document/:id" element={<DocumentView />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App