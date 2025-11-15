import { Link, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { mockDashboardStats } from "@/lib/mockData"
import { FileText, CheckCircle2, AlertCircle, TrendingUp, Upload, ChevronDown, Target, Shield} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import logoPng from "@/assets/logo.png"

export function Home() {
  const stats = mockDashboardStats
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      question: "What types of documents can I analyze?",
      answer: "Our system supports PDF and Word documents (.pdf, .doc, .docx). We analyze regulatory documents, safety guidelines, transport regulations, and compliance documentation against Finnish and EU standards.",
    },
    {
      question: "How long does the analysis take?",
      answer: "Most documents are analyzed within 2-5 minutes, depending on document length and complexity. You'll receive a notification when the analysis is complete, and you can view real-time progress on the upload page.",
    },
    {
      question: "What regulations do you check against?",
      answer: "We check compliance with Traficom regulations, EU transport directives (including EU 2018/858), ISO standards, and Finnish national transport and safety requirements. Our database is regularly updated to reflect the latest regulatory changes.",
    },
    {
      question: "Can I export the analysis results?",
      answer: "Yes, you can export detailed analysis reports in PDF format, including all identified flaws, suggestions, and compliance scores. This feature will be available soon in the document view.",
    },
    {
      question: "How accurate is the analysis?",
      answer: "Our AI-powered analysis achieves 95%+ accuracy in identifying regulatory compliance issues. However, we recommend having critical documents reviewed by a compliance specialist for final approval.",
    },
  ]

  return (
    <div className="w-full">
      {/* Hero Section - Compact */}
      <div className="bg-muted/40 border-b border-slate-300">
        <div className="container mx-auto px-6 py-8">
          <button 
            className="flex items-center gap-2 mb-2 hover:opacity-70 transition-opacity"
            onClick={() => navigate('/')}
            title="Go to home"
          >
            <img src={logoPng} alt="Logo" className="h-8 w-8 object-contain" />
            <h1 className="text-3xl font-bold">Checkmate</h1>
          </button>
          <p className="text-base text-muted-foreground max-w-2xl mb-5">
            Ensure your regulatory documents comply with Traficom standards. 
            Get instant analysis with detailed feedback on flaws and missing sections.
          </p>
          <Link to="/dashboard/upload">
            <Button size="lg" className="gap-2">
              <Upload className="h-4 w-4" />
              Analyze Document
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-6 py-10">
        <h2 className="text-xl font-bold mb-5">Your Analysis Overview</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 mb-10">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Documents Analyzed
              </CardTitle>
              <div className="p-2 bg-blue-100 rounded">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.documentsAnalyzed}</div>
              <Progress value={75} className="h-1.5 mb-1" />
              <p className="text-xs text-muted-foreground">
                +12 this month
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Flaws Found
              </CardTitle>
              <div className="p-2 bg-orange-100 rounded">
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.totalFlaws}</div>
              <Progress value={60} className="h-1.5 mb-1" />
              <p className="text-xs text-muted-foreground">
                Identified issues
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Flaws Resolved
              </CardTitle>
              <div className="p-2 bg-green-100 rounded">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.flawsSolved}</div>
              <Progress value={Math.round((stats.flawsSolved / stats.totalFlaws) * 100)} className="h-1.5 mb-1" />
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.flawsSolved / stats.totalFlaws) * 100)}% resolution rate
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Compliance
              </CardTitle>
              <div className="p-2 bg-purple-100 rounded">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.averageCompliance}%</div>
              <Progress value={stats.averageCompliance} className="h-1.5 mb-1" />
              <p className="text-xs text-muted-foreground">
                Across all documents
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How We Solve Section */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-5">How Checkmate Works</h2>
          <div className="grid gap-5 md:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded">
                    <Upload className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Upload & Parse</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  Upload your document and our AI parses content, structure, and references to understand the context—like analyzing every piece on the chessboard.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded">
                    <Target className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Analyze & Compare</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  We compare your document against current regulations and standards, identifying gaps and violations—making strategic moves for compliance.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Report & Solve</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  Receive a detailed report with highlighted issues and actionable suggestions for compliance—checkmate on compliance issues.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <Card className="mb-10 bg-primary text-primary-foreground hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <button 
              className="flex items-center gap-2 mb-2 hover:opacity-70 transition-opacity"
              onClick={() => navigate('/')}
              title="Go to home"
            >
              <img src={logoPng} alt="Logo" className="h-6 w-6 object-contain" />
              <CardTitle className="text-2xl">Checkmate</CardTitle>
            </button>
            <CardDescription className="text-primary-foreground/90 text-base">
              Upload a document now and get instant compliance analysis with detailed feedback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/upload">
              <Button size="lg" variant="secondary" className="gap-2 hover:scale-105 transition-transform">
                <Upload className="h-4 w-4" />
                Start Analysis
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div>
          <h2 className="text-xl font-bold mb-5">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader
                  className="cursor-pointer hover:bg-accent/30 transition-colors py-4"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold pr-4">
                      {faq.question}
                    </CardTitle>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 flex-shrink-0 transition-transform duration-300",
                        openFaq === index && "rotate-180"
                      )}
                    />
                  </div>
                </CardHeader>
                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out overflow-hidden",
                    openFaq === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <CardContent className="pt-0 pb-4">
                    <div className="h-px bg-border mb-3" />
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

