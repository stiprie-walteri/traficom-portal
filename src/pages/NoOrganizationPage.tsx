import { useClerk } from "@clerk/clerk-react"
import { Building2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NoOrganizationPage() {
    const { signOut } = useClerk()

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="p-5 bg-yellow-100 rounded-full">
                        <Building2 className="h-16 w-16 text-yellow-500" />
                    </div>
                </div>

                {/* Text */}
                <div className="space-y-3">
                    <h1 className="text-xl font-semibold text-gray-700">No Organization Access</h1>
                    <p className="text-gray-500 leading-relaxed">
                        Your account is not part of any organization. Please contact your administrator to be added to an organization before you can access the application.
                    </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <Button
                        size="lg"
                        variant="outline"
                        className="w-full gap-2 border-gray-300 hover:bg-gray-100"
                        onClick={() => signOut()}
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    )
}
