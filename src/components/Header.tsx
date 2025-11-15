import { Button } from "@/components/ui/button"
import { Logo } from "@/components/Logo"
import { useNavigate } from "react-router-dom"
import { Home, LogOut } from "lucide-react"

export function Header() {
  const navigate = useNavigate()

  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <div className="scale-50 origin-left">
            <Logo />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">LDDK Portāls</h1>
            <p className="text-xs text-gray-600">Sēžu pārvaldības sistēma</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <Home className="mr-2 h-4 w-4" />
            Galvenā
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/')}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Iziet
          </Button>
        </nav>
      </div>
    </header>
  )
}
