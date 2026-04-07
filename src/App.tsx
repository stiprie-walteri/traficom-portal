import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { MainLayout } from "@/layouts/MainLayout"
import { LandingPage } from "@/pages/LandingPage"
import { env } from "@/lib/env"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { DemoLayout } from "@/layouts/DemoLayout"
import { Upload } from "@/pages/dashboard/Upload"
import { DocumentView } from "@/pages/dashboard/DocumentView"
import { ProjectView } from "@/pages/dashboard/ProjectView"
import { DashboardHome } from "@/pages/dashboard/DashboardHome"
import { Example1 } from "@/pages/dashboard/Example1"
import { DemoProjectView } from "@/pages/demo/DemoProjectView"
import { RealResults } from "@/pages/dashboard/RealResults"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { UnauthorizedPage } from "@/pages/UnauthorizedPage"


function App() {
  return (
    <BrowserRouter basename={env.BASE_PATH}>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<MainLayout><LandingPage /></MainLayout>} />

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Protected routes - require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route index element={<DashboardHome />} />
            <Route path="upload" element={<Upload />} />
            <Route path="project/:id" element={<ProjectView />} />
            <Route path="document/:id" element={<DocumentView />} />
            <Route path="real-results" element={<RealResults />} />
          </Route>
        </Route>

        <Route path="/demo" element={<DemoLayout />}>
          <Route index element={<Navigate to="/demo/project/jet-support" replace />} />
          <Route path="project/jet-support" element={<DemoProjectView />} />
          <Route path="document/jet-support" element={<Example1 />} />
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
