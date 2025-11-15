import { useParams } from "react-router-dom"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getMockAnalysis } from "@/lib/mockData"
import { AlertCircle, CheckCircle2, AlertTriangle, Info, Download, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function DocumentView() {
  const { id } = useParams<{ id: string }>()
  const [analysis] = useState(getMockAnalysis(id || "1"))
  const [selectedFlaw, setSelectedFlaw] = useState<string | null>(null)

  const getFlawIcon = (type: "critical" | "warning" | "info") => {
    switch (type) {
      case "critical":
        return <AlertCircle className="h-4 w-4" />
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "info":
        return <Info className="h-4 w-4" />
    }
  }

  const getFlawBadgeVariant = (type: "critical" | "warning" | "info") => {
    switch (type) {
      case "critical":
        return "destructive"
      case "warning":
        return "default"
      case "info":
        return "secondary"
    }
  }

  const summaryCard = (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-lg">Analysis Summary</CardTitle>
          <Badge
            variant={
              analysis.complianceScore >= 90
                ? "default"
                : analysis.complianceScore >= 75
                ? "secondary"
                : "destructive"
            }
            className="text-sm px-3 py-1"
          >
            {analysis.complianceScore}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded">
            <div className="text-2xl font-bold text-destructive mb-1">
              {analysis.criticalFlaws}
            </div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded">
            <div className="text-2xl font-bold mb-1">{analysis.totalFlaws}</div>
            <div className="text-xs text-muted-foreground">Total Issues</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {analysis.missingSections.length}
            </div>
            <div className="text-xs text-muted-foreground">Missing</div>
          </div>
        </div>

        {analysis.missingSections.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                Missing Sections
              </h4>
              <ul className="space-y-1.5">
                {analysis.missingSections.map((section, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground pl-6 leading-relaxed">
                    • {section}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="h-px bg-border" />

        <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
      </CardContent>
    </Card>
  )

  return (
    <div className="w-full">
      {/* Header - Compact */}
      <div className="bg-muted/40 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold mb-1">{analysis.documentTitle}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Analysis completed • {analysis.totalFlaws} issues found</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-3.5 w-3.5" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-3.5 w-3.5" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Summary Card */}
        <div className="mb-8">{summaryCard}</div>

        {/* Main Document Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Content with Flaws */}
          <div className="lg:col-span-2">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Document Analysis</CardTitle>
                <CardDescription className="text-sm">
                  Click on highlighted issues to view detailed suggestions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mock Document Content with Flaws */}
                <div className="prose prose-sm max-w-none">
                  <h2 className="text-xl font-bold mb-4">1. Introduction</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    This document outlines the safety regulations and procedures for
                    transport operations in accordance with national and European standards.
                  </p>

                  <h2 className="text-xl font-bold mb-4">2. Regulatory Framework</h2>
                  
                  <h3 className="text-lg font-semibold mb-3">2.1 Legal References</h3>
                  <div
                    className={cn(
                      "p-4 border-l-4 border-destructive bg-destructive/5 hover:bg-destructive/10 cursor-pointer mb-4 transition-colors",
                      selectedFlaw === "f1" && "bg-destructive/15"
                    )}
                    onClick={() => setSelectedFlaw(selectedFlaw === "f1" ? null : "f1")}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="destructive" className="text-xs">
                        CRITICAL
                      </Badge>
                      <span className="text-xs text-muted-foreground">Section 2.1</span>
                    </div>
                    <p className="text-sm">
                      Transport operations must comply with all applicable national
                      regulations and standards for vehicle safety and operation.
                    </p>
                    <div className="mt-2 text-xs text-destructive font-medium">
                      ⚠ Missing mandatory reference to EU Regulation 2018/858
                    </div>
                  </div>

                  <h2 className="text-xl font-bold mb-4">3. Safety Requirements</h2>
                  
                  <h3 className="text-lg font-semibold mb-3">3.4 Operational Standards</h3>
                  <div
                    className={cn(
                      "p-4 border-l-4 border-destructive bg-destructive/5 hover:bg-destructive/10 cursor-pointer mb-4 transition-colors",
                      selectedFlaw === "f2" && "bg-destructive/15"
                    )}
                    onClick={() => setSelectedFlaw(selectedFlaw === "f2" ? null : "f2")}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="destructive" className="text-xs">
                        CRITICAL
                      </Badge>
                      <span className="text-xs text-muted-foreground">Section 3.4</span>
                    </div>
                    <div className="text-sm mb-2">
                      <p className="font-medium mb-2">Safety Threshold Values (Table 1):</p>
                      <table className="w-full text-xs border">
                        <thead>
                          <tr className="bg-muted">
                            <th className="p-2 text-left border">Parameter</th>
                            <th className="p-2 text-left border">Threshold</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-2 border">Maximum speed</td>
                            <td className="p-2 border">90 km/h</td>
                          </tr>
                          <tr>
                            <td className="p-2 border">Load capacity</td>
                            <td className="p-2 border">3500 kg</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-xs text-destructive font-medium">
                      ⚠ Threshold values do not match EN ISO 12345:2023 standards
                    </div>
                  </div>

                  <h2 className="text-xl font-bold mb-4">5. Implementation Procedures</h2>
                  
                  <h3 className="text-lg font-semibold mb-3">5.1 Process Overview</h3>
                  <div
                    className={cn(
                      "p-4 border-l-4 border-yellow-500 bg-yellow-50 hover:bg-yellow-100 cursor-pointer mb-4 transition-colors",
                      selectedFlaw === "f4" && "bg-yellow-100"
                    )}
                    onClick={() => setSelectedFlaw(selectedFlaw === "f4" ? null : "f4")}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="default" className="text-xs bg-yellow-600">
                        WARNING
                      </Badge>
                      <span className="text-xs text-muted-foreground">Section 5.1</span>
                    </div>
                    <p className="text-sm">
                      The implementation process follows established industry practices
                      and organizational procedures to ensure compliance.
                    </p>
                    <div className="mt-2 text-xs text-yellow-700 font-medium">
                      ⚠ Consider adding reference to ISO 39001 best practices
                    </div>
                  </div>

                  <h2 className="text-xl font-bold mb-4">6. Operational Guidelines</h2>
                  
                  <h3 className="text-lg font-semibold mb-3">6.2 Personnel Requirements</h3>
                  <div
                    className={cn(
                      "p-4 border-l-4 border-yellow-500 bg-yellow-50 hover:bg-yellow-100 cursor-pointer mb-4 transition-colors",
                      selectedFlaw === "f5" && "bg-yellow-100"
                    )}
                    onClick={() => setSelectedFlaw(selectedFlaw === "f5" ? null : "f5")}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="default" className="text-xs bg-yellow-600">
                        WARNING
                      </Badge>
                      <span className="text-xs text-muted-foreground">Section 6.2</span>
                    </div>
                    <p className="text-sm">
                      All drivers must hold valid certification. The operator must ensure
                      proper training and qualification records.
                    </p>
                    <div className="mt-2 text-xs text-yellow-700 font-medium">
                      ⚠ Terminology inconsistency: Use "vehicle operator" consistently
                    </div>
                  </div>

                  <h2 className="text-xl font-bold mb-4">8. Contact Information</h2>
                  
                  <h3 className="text-lg font-semibold mb-3">8.3 Support Details</h3>
                  <div
                    className={cn(
                      "p-4 border-l-4 border-blue-500 bg-blue-50 hover:bg-blue-100 cursor-pointer mb-4 transition-colors",
                      selectedFlaw === "f8" && "bg-blue-100"
                    )}
                    onClick={() => setSelectedFlaw(selectedFlaw === "f8" ? null : "f8")}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        INFO
                      </Badge>
                      <span className="text-xs text-muted-foreground">Section 8.3</span>
                    </div>
                    <p className="text-sm">
                      For inquiries: contact@example.com | +358 123 456
                    </p>
                    <div className="mt-2 text-xs text-blue-700 font-medium">
                      ℹ Use standardized contact format per organizational guidelines
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Flaw Details Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {selectedFlaw ? (
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Issue Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const flaw = analysis.flaws.find((f) => f.id === selectedFlaw)
                      if (!flaw) return null

                      return (
                        <div className="space-y-4">
                          <div>
                            <Badge variant={getFlawBadgeVariant(flaw.type)} className="mb-3">
                              {flaw.type.toUpperCase()}
                            </Badge>
                            <h4 className="font-semibold mb-2">{flaw.description}</h4>
                          </div>

                          <div className="h-px bg-border" />

                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Location
                            </div>
                            <div className="text-sm">{flaw.location}</div>
                          </div>

                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Section
                            </div>
                            <div className="text-sm">{flaw.section}</div>
                          </div>

                          <div className="h-px bg-border" />

                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <div className="text-sm font-semibold">Suggestion</div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {flaw.suggestion}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => setSelectedFlaw(null)}
                          >
                            Close
                          </Button>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              ) : (
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">All Issues ({analysis.flaws.length})</CardTitle>
                    <CardDescription className="text-xs">
                      Click to view details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5">
                      {analysis.flaws.map((flaw) => (
                        <div
                          key={flaw.id}
                          className="p-3 bg-muted/30 hover:bg-accent cursor-pointer transition-colors rounded"
                          onClick={() => setSelectedFlaw(flaw.id)}
                        >
                          <div className="flex items-start gap-2 mb-1">
                            {getFlawIcon(flaw.type)}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium line-clamp-2">
                                {flaw.description}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Section {flaw.section}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

