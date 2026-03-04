import { Button } from "@/components/ui/button"
import { Logo } from "@/components/Logo"
import { FileStack, FileUp, FileText } from "lucide-react"
import { useNavigate } from "react-router-dom"
import checkMateImg from "@/assets/CheckMate.png"
import { useAuth, SignInButton } from "@clerk/clerk-react"

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
  const { isSignedIn } = useAuth()

  return (
    <div className="relative flex min-h-screen items-center bg-white overflow-hidden" style={{
      backgroundImage: 'radial-gradient(circle, rgba(209, 213, 219, 0.1) 2px, transparent 1px)',
      backgroundSize: '15px 15px',
      paddingTop: '80px',
      paddingBottom: '120px'
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

      {/* Two-column hero layout */}
      <div className="w-full relative z-10" style={{ paddingLeft: '10%', paddingRight: '4%' }}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start max-w-7xl mx-auto">
          {/* Left Column - 40-45% width */}
          <div className="md:col-span-5 relative z-10">
            {/* Logo at top-left */}
            <div className="w-64 sm:w-80 md:w-96 mb-8">
              <Logo />
            </div>

            {/* Headline - 32px gap after logo */}
            <h1 className="text-2xl sm:text-3xl md:text-3xl text-gray-700 font-['Courier_New',monospace] font-bold mb-4">
              Consider it Checked!
            </h1>

            {/* Sub-headline - 16px gap after headline */}
            <p className="text-base sm:text-lg text-gray-600 mb-6">
              {/* Add sub-headline text here if needed */}
            </p>

            {/* CTA Buttons - 24px gap before buttons */}
            <div className="flex flex-col gap-3 sm:gap-4 max-w-sm">
              <Button
                className="h-12 sm:h-14 text-sm sm:text-base bg-yellow-400 hover:bg-yellow-500 text-black justify-start"
                onClick={() => navigate('/dashboard/example-1')}
              >
                <FileStack className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Demo
              </Button>

              {isSignedIn ? (
                <Button
                  variant="outline"
                  className="h-12 sm:h-14 text-sm sm:text-base backdrop-blur-sm border-2 border-black text-black hover:bg-gray-100 justify-start"
                  onClick={() => navigate('/dashboard')}
                >
                  <FileUp className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Log In
                </Button>
              ) : (
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <Button
                    variant="outline"
                    className="h-12 sm:h-14 text-sm sm:text-base backdrop-blur-sm border-2 border-black text-black hover:bg-gray-100 justify-start"
                  >
                    <FileUp className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Log In
                  </Button>
                </SignInButton>
              )}
            </div>
          </div>

          {/* Right Column - 55-60% width */}
          <div className="hidden md:block md:col-span-7 relative z-0">
            {/* CheckMate Image - Anchored to right, aligned with logo top */}
            <div className="absolute right-0 pointer-events-none" style={{ width: '110%', top: '-100px' }}>
              <img src={checkMateImg} alt="CheckMate Documentation" className="w-full h-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
