import { Button } from "@/components/ui/button"
import { Logo } from "@/components/Logo"
import { LogIn, LayoutGrid } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center bg-white px-8 md:px-16 lg:px-24">
      <div className="w-full max-w-xl space-y-8">
        {/* Logo */}
        <div>
          <Logo />
        </div>

        {/* Title and Subtitle */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-black">
            LDDK sēžu pārvaldības portāls
          </h1>
          <p className="text-lg text-gray-700">
            LDDK parlamentāro un likumdošanas sēžu pārvaldība
          </p>
        </div>

        {/* Login Buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full h-11 text-sm bg-black hover:bg-gray-800 text-white"
            onClick={() => navigate('/dashboard')}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Autorizēties
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-11 text-sm border-2 border-black text-black hover:bg-gray-100"
            onClick={() => navigate('/dashboard')}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Ienākt bez autorizācijas
          </Button>
        </div>
      </div>
    </div>
  )
}
