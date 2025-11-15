import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/Header"

export function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <div className="flex flex-1">
        {/* Left Sidebar */}
        <aside className="w-64 border-r bg-muted/40 p-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Navigation</h2>
            <nav className="space-y-2">
              <Button variant="ghost" className="w-full justify-start">Item 1</Button>
              <Button variant="ghost" className="w-full justify-start">Item 2</Button>
              <Button variant="ghost" className="w-full justify-start">Item 3</Button>
              <Button variant="ghost" className="w-full justify-start">Item 4</Button>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col">
          {/* Content with Right Sidebar */}
          <div className="flex flex-1">
            {/* Main Content */}
            <main className="flex-1 p-6">
              <div className="space-y-6">
                {/* Top Row */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Card 1</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Content for card 1</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Card 2</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Content for card 2</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Card 3</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Content for card 3</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Bottom Row */}
                <Card>
                  <CardHeader>
                    <CardTitle>Large Content Area</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This is a larger content area that spans the full width.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </main>

            {/* Right Sidebar */}
            <aside className="w-80 border-l bg-muted/40 p-4">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Side Panel</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>Info 1</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Side panel content</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Info 2</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">More information</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Info 3</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Additional details</p>
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
