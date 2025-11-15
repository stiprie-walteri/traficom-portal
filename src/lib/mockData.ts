export interface Document {
  id: string
  title: string
  uploadDate: string
  status: "analyzed" | "analyzing" | "pending"
  complianceScore?: number
}

export interface DocumentAnalysis {
  id: string
  documentTitle: string
  complianceScore: number
  totalFlaws: number
  criticalFlaws: number
  missingSections: string[]
  summary: string
  flaws: Flaw[]
}

export interface Flaw {
  id: string
  type: "critical" | "warning" | "info"
  section: string
  description: string
  location: string
  suggestion: string
}

export interface DashboardStats {
  documentsAnalyzed: number
  totalFlaws: number
  flawsSolved: number
  averageCompliance: number
}

// Mock documents for sidebar
export const mockDocuments: Document[] = [
  {
    id: "1",
    title: "Safety Regulation 2024-01",
    uploadDate: "2024-11-10",
    status: "analyzed",
    complianceScore: 87,
  },
  {
    id: "2",
    title: "Transport Guidelines Q3",
    uploadDate: "2024-11-12",
    status: "analyzed",
    complianceScore: 92,
  },
  {
    id: "3",
    title: "Vehicle Standards Document",
    uploadDate: "2024-11-13",
    status: "analyzed",
    complianceScore: 78,
  },
  {
    id: "4",
    title: "Environmental Compliance",
    uploadDate: "2024-11-14",
    status: "analyzing",
  },
]

// Mock dashboard stats
export const mockDashboardStats: DashboardStats = {
  documentsAnalyzed: 247,
  totalFlaws: 1429,
  flawsSolved: 1243,
  averageCompliance: 85,
}

// Mock document analysis
export const mockAnalysis: DocumentAnalysis = {
  id: "1",
  documentTitle: "Safety Regulation 2024-01",
  complianceScore: 87,
  totalFlaws: 8,
  criticalFlaws: 2,
  missingSections: ["Section 4.3 - Emergency Procedures", "Appendix B - Risk Assessment"],
  summary:
    "The document largely follows the required guidelines with good structural compliance. However, there are 2 critical issues that need immediate attention and 6 minor corrections required. Two mandatory sections are missing from the document structure.",
  flaws: [
    {
      id: "f1",
      type: "critical",
      section: "2.1",
      description: "Missing mandatory reference to EU Regulation 2018/858",
      location: "Page 3, Paragraph 2",
      suggestion:
        "Add explicit reference: 'In accordance with EU Regulation 2018/858 on the approval and market surveillance of motor vehicles...'",
    },
    {
      id: "f2",
      type: "critical",
      section: "3.4",
      description: "Safety threshold values do not match current standards",
      location: "Page 7, Table 1",
      suggestion:
        "Update threshold values according to EN ISO 12345:2023. Current values are outdated by 2 years.",
    },
    {
      id: "f3",
      type: "warning",
      section: "1.2",
      description: "Formatting inconsistency in section numbering",
      location: "Page 2",
      suggestion: "Use consistent numbering format throughout (e.g., 1.2.1 instead of 1.2a)",
    },
    {
      id: "f4",
      type: "warning",
      section: "5.1",
      description: "Recommended best practice not mentioned",
      location: "Page 12, Paragraph 3",
      suggestion: "Consider adding reference to ISO 39001 for road traffic safety management",
    },
    {
      id: "f5",
      type: "warning",
      section: "6.2",
      description: "Terminology inconsistency",
      location: "Page 15",
      suggestion:
        "Use standardized term 'vehicle operator' instead of alternating between 'driver' and 'operator'",
    },
    {
      id: "f6",
      type: "info",
      section: "2.3",
      description: "Abbreviation used without definition",
      location: "Page 4, Line 8",
      suggestion: "Define 'ADR' on first use: 'ADR (European Agreement on Dangerous Goods)'",
    },
    {
      id: "f7",
      type: "info",
      section: "7.1",
      description: "Optional annexure could improve clarity",
      location: "Page 18",
      suggestion: "Consider adding a visual flowchart to illustrate the approval process",
    },
    {
      id: "f8",
      type: "info",
      section: "8.3",
      description: "Contact information format suggestion",
      location: "Page 22",
      suggestion: "Use standardized contact format as per organizational guidelines",
    },
  ],
}

// Function to get mock analysis by document ID
export const getMockAnalysis = (documentId: string): DocumentAnalysis => {
  // In a real app, this would fetch from an API
  // For now, return the same mock data for all documents
  const doc = mockDocuments.find((d) => d.id === documentId)
  if (!doc) {
    throw new Error("Document not found")
  }
  
  return {
    ...mockAnalysis,
    id: documentId,
    documentTitle: doc.title,
  }
}

