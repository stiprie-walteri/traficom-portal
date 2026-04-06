# Regulatory Compliance Platform

A rules-as-code platform that streamlines regulatory compliance for companies and auditors by automating document review and validation against legislation.

## How to run locally!!!
Install dependencies
```
pnpm i
```

Copy .env.example to .env and fill in the values

run 
```
pnpm run dev
```

## Overview

**In Simple Terms**

Companies need to submit documents to the government to obtain licenses and approvals. Government requirements are complex and strict—they demand comprehensive, compliant documentation before allowing companies to operate. This system helps companies prepare their applications faster and more accurately with their auditors, reducing the time and effort required for regulatory submissions.

**Example Use Case**

An aviation company needs a license to operate, but each revision cycle takes **weeks**, wasting valuable time for both the auditor and the company. With revisions happening on average **3 times per year**, this creates significant operational delays. Our system can reduce revision time from weeks to just **3 days**, dramatically improving efficiency.

## What It Does

A rules-as-code system that converts legislation into executable checks and applies them directly to various applications. The system:

- **Scans every submission** for missing sections, incorrect or incomplete statements, and non-compliant clauses
- **Highlights exact text fragments** with severity levels (info, warning, or error)
- **Generates precise, legislation-based recommendations** describing what must be corrected and why
- **Includes original legislative source references** for each issue, allowing auditors to verify logic instantly

## Key Features

### For Clients
- Upload documents and receive instant feedback
- See exactly which sections are missing or non-compliant
- Get clear, actionable recommendations with legislative references
- Understand what needs to be fixed before formal review

### For Auditors
- Hand the system directly to clients before formal review
- Receive cleaner, more structured submissions
- Reduce back-and-forth communication
- Ensure consistent, legislation-aligned document reviews
- Lower audit workload while maintaining quality

## How It Works

1. **Client uploads document** → System analyzes the submission against encoded legislation
2. **System highlights issues** → Missing sections, weak statements, and non-compliant clauses are flagged
3. **Recommendations generated** → Each issue includes:
   - Severity level (info/warning/error)
   - Exact text fragment location
   - Clear explanation of what's wrong
   - Specific legislative clause reference
   - Actionable fix recommendation
4. **Client revises** → Major gaps are resolved before auditor review
5. **Faster review** → Auditor receives a structured, legislation-aligned draft

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Modern, responsive design with accessibility in mind
- **Architecture**: Rules-as-code engine for legislation processing

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Roadmap

### Next Steps
- [ ] Transform prototype into full rules-as-code platform
- [ ] Expand legislation coverage
- [ ] Refine accuracy through real pilot data
- [ ] Add bulk processing capabilities
- [ ] Implement versioned rulebooks
- [ ] Build white-label client portal

### Future Expansion
- [ ] Onboard early audit firms for validation
- [ ] Expand into fintech sector
- [ ] Automate rule change-management
- [ ] Build usage-based reseller model
- [ ] Enable auditors to distribute tool directly to clients

## Vision

We believe this solution has real potential in the RegTech space. Our goal is to transform regulatory compliance from a time-consuming, error-prone process into a streamlined, automated workflow that benefits both companies and auditors.

