import { useAuth } from "@clerk/clerk-react"
import { Navigate, Outlet, useOutletContext } from "react-router-dom"

export function ProtectedRoute() {
    const { isSignedIn, isLoaded } = useAuth()
    const context = useOutletContext()

    if (!isLoaded) {
        return null
    }

    if (!isSignedIn) {
        return <Navigate to="/unauthorized" replace />
    }

    return <Outlet context={context} />
}
