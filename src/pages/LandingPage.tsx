import { Button } from "@/components/ui/button"
import { Logo } from "@/components/Logo"
import { FileStack, FileUp, FileText } from "lucide-react"
import { useNavigate } from "react-router-dom"
import checkMateImg from "@/assets/CheckMate.png"

interface FallingDocument {
  id: number
  left: number
  delay: number
  duration: number
}

// Generate static documents array with more documents
const documents: FallingDocument[] = Array.from({ length: 120 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 20 - 20, // Negative delays to start some animations mid-cycle
  duration: 15 + Math.random() * 4,
}))

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-screen items-center bg-white px-4 sm:px-8 md:px-16 lg:px-24 overflow-hidden" style={{
      backgroundImage: 'radial-gradient(circle, rgba(209, 213, 219, 0.1) 2px, transparent 1px)',
      backgroundSize: '15px 15px'
    }}>

      <div className="absolute inset-0 pointer-events-none z-0">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="absolute animate-fall opacity-20"
            style={{
              left: `${doc.left}%`,
              top: "-10rem",
              animationDelay: `${doc.delay}s`,
              animationDuration: `${doc.duration}s`,
            }}
          >
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
        ))}
      </div>

      {/* CheckMate Image - Right Side - Hidden on mobile */}
      <div className="hidden md:block absolute right-0 top-1/2 -translate-y-3/9 w-[60%] max-w-none pointer-events-none z-0">
        <img src={checkMateImg} alt="CheckMate Documentation" className="w-full h-auto" />
      </div>

      <div className="w-full max-w-xl relative z-10">
        {/* Title and Subtitle */}
        <div className="space-y-2 my-6">
          <div className="w-64 sm:w-80 md:w-96">
            <Logo />
          </div>
          <p className="text-2xl text-gray-700 font-['Courier_New',monospace] font-bold pl-2">
            Consider it Checked!        
          </p>
        </div>

        {/* Login Buttons */}
        <div className="flex flex-col gap-3 sm:gap-4 max-w-xs">
          <Button 
            className="h-12 sm:h-14 text-sm sm:text-base bg-black hover:bg-gray-800 text-white justify-start"
            onClick={() => navigate('/dashboard')}
          >
          <FileStack className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            See in action
          </Button>
          
          <Button 
            variant="outline" 
            className="h-12 sm:h-14 text-sm sm:text-base border-2 border-black text-black hover:bg-gray-100 justify-start"
            onClick={() => navigate('/dashboard')}
          >
            <FileUp className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Test upload
          </Button>
        </div>
      </div>
    </div>
  )
}
