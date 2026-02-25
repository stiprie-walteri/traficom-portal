import { SignInButton } from "@clerk/clerk-react"
import { Link } from "react-router-dom"
import { ShieldX, LogIn, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="p-5 bg-red-100 rounded-full">
                        <ShieldX className="h-16 w-16 text-red-500" />
                    </div>
                </div>

                {/* Text */}
                <div className="space-y-3">
                    <h1 className="text-5xl font-bold text-gray-900 tracking-tight">401</h1>
                    <h2 className="text-xl font-semibold text-gray-700">Unauthorized</h2>
                    <p className="text-gray-500 leading-relaxed">
                        You need to sign in to access this page. Please authenticate to continue.
                    </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <SignInButton mode="modal">
                        <Button
                            size="lg"
                            className="w-full bg-black hover:bg-gray-800 text-white gap-2"
                        >
                            <LogIn className="h-4 w-4" />
                            Sign In
                        </Button>
                    </SignInButton>

                    <Link to="/dashboard/example-1">
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full gap-2 mt-2 border-gray-300 hover:bg-gray-100"
                        >
                            <FileText className="h-4 w-4" />
                            View Example Document
                        </Button>
                    </Link>
                </div>

                {/* Footer */}
                <p className="text-xs text-gray-400">
                    You can browse the example document without signing in.
                </p>
            </div>
        </div>
    )
}
