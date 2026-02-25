import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { MainLayout } from "@/layouts/MainLayout"
import { LandingPage } from "@/pages/LandingPage"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Upload } from "@/pages/dashboard/Upload"
import { DocumentView } from "@/pages/dashboard/DocumentView"
import { Example1 } from "@/pages/dashboard/Example1"
import { RealResults } from "@/pages/dashboard/RealResults"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { UnauthorizedPage } from "@/pages/UnauthorizedPage"


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<MainLayout><LandingPage /></MainLayout>} />

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Public route - accessible without auth */}
          <Route path="example-1" element={<Example1 />} />

          {/* Protected routes - require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route index element={<Upload />} />
            <Route path="document/:id" element={<DocumentView />} />
            <Route path="real-results" element={<RealResults />} />
          </Route>
        </Route>

        {/* Unauthorized page */}
        <Route path="/unauthorized" element={<MainLayout><UnauthorizedPage /></MainLayout>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App