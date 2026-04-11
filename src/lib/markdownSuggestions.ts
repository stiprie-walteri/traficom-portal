import {
  getIssueSuggestedInsertText,
  type NormalizedIssue,
} from "@/lib/documentService"

export type MarkdownHeading = {
  level: number
  title: string
  lineIndex: number
  startOffset: number
  contentStartOffset: number
  endOffset: number
}

export type SuggestionTarget = {
  offset: number
  lineIndex: number
  reason: "anchor" | "section" | "document-end"
  heading?: MarkdownHeading
}

export type LocalPatchResult = {
  markdown: string
  target: SuggestionTarget
  insertedText: string
}

function lineStartOffsets(markdown: string) {
  const offsets = [0]

  for (let i = 0; i < markdown.length; i += 1) {
    if (markdown[i] === "\n") {
      offsets.push(i + 1)
    }
  }

  return offsets
}

function offsetToLine(offsets: number[], offset: number) {
  let low = 0
  let high = offsets.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (offsets[mid] <= offset && (mid === offsets.length - 1 || offsets[mid + 1] > offset)) {
      return mid
    }
    if (offsets[mid] > offset) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  return 0
}

export function normalizeMarkdownTitle(value: string) {
  const parts = value.split("::")
  const lastProjectSeparator = value.includes("::")
    ? parts[parts.length - 1] || value
    : value

  return lastProjectSeparator
    .replace(/[#*_`[\]()]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase()
}

export function parseMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const starts = lineStartOffsets(markdown)
  const lines = markdown.split(/\n/)
  const headings: MarkdownHeading[] = []

  lines.forEach((line, lineIndex) => {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!match) return

    headings.push({
      level: match[1].length,
      title: match[2].trim(),
      lineIndex,
      startOffset: starts[lineIndex] ?? 0,
      contentStartOffset: (starts[lineIndex] ?? 0) + line.length + 1,
      endOffset: markdown.length,
    })
  })

  for (let i = 0; i < headings.length; i += 1) {
    const current = headings[i]
    const nextPeer = headings.slice(i + 1).find((candidate) => candidate.level <= current.level)
    current.endOffset = nextPeer ? nextPeer.startOffset : markdown.length
  }

  return headings
}

function findHeading(markdown: string, title?: string | null) {
  if (!title) return undefined

  const normalizedTarget = normalizeMarkdownTitle(title)
  if (!normalizedTarget) return undefined

  const headings = parseMarkdownHeadings(markdown)

  return headings.find((heading) => normalizeMarkdownTitle(heading.title) === normalizedTarget)
    ?? headings.find((heading) => normalizeMarkdownTitle(heading.title).includes(normalizedTarget))
    ?? headings.find((heading) => normalizedTarget.includes(normalizeMarkdownTitle(heading.title)))
}

function findNormalizedQuoteRange(markdown: string, quote: string) {
  const normalizedQuote = quote.replace(/\s+/g, " ").trim()
  if (!normalizedQuote) return null

  let normalizedMarkdown = ""
  const startMap: number[] = []
  const endMap: number[] = []

  for (let i = 0; i < markdown.length; i += 1) {
    const char = markdown[i]

    if (/\s/.test(char)) {
      if (!normalizedMarkdown.endsWith(" ")) {
        normalizedMarkdown += " "
        startMap.push(i)
        endMap.push(i + 1)
      } else {
        endMap[endMap.length - 1] = i + 1
      }
      continue
    }

    normalizedMarkdown += char
    startMap.push(i)
    endMap.push(i + 1)
  }

  const normalizedIndex = normalizedMarkdown.indexOf(normalizedQuote)
  if (normalizedIndex === -1) return null

  const endIndex = normalizedIndex + normalizedQuote.length - 1
  return {
    start: startMap[normalizedIndex],
    end: endMap[endIndex],
  }
}

function findQuoteRange(markdown: string, quote?: string | null) {
  if (!quote?.trim()) return null

  const exact = markdown.indexOf(quote)
  if (exact !== -1) return { start: exact, end: exact + quote.length }

  return findNormalizedQuoteRange(markdown, quote)
}

function formatInsertion(markdown: string, offset: number, text: string) {
  const before = markdown.slice(0, offset)
  const after = markdown.slice(offset)
  const prefix = before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n"
  const suffix = after.startsWith("\n") ? "" : "\n"

  return `${before}${prefix}${text.trim()}\n${suffix}${after}`
}

function replaceText(markdown: string, quote: string, replacement: string) {
  const range = findQuoteRange(markdown, quote)
  if (!range) return null

  return markdown.slice(0, range.start) + replacement + markdown.slice(range.end)
}

export function findSuggestionTarget(markdown: string, issue: NormalizedIssue): SuggestionTarget {
  const lineOffsets = lineStartOffsets(markdown)
  const location = issue.suggested_fix?.insert_location
  const quote = location?.anchor_quote || issue.current_section?.quote || issue.submission_excerpt
  const quoteRange = findQuoteRange(markdown, quote)

  if (quoteRange) {
    return {
      offset: quoteRange.end,
      lineIndex: offsetToLine(lineOffsets, quoteRange.start),
      reason: "anchor",
    }
  }

  const heading = findHeading(
    markdown,
    location?.target_section_title || location?.target_section_id || issue.current_section?.title || issue.current_section?.id
  )

  if (heading) {
    const action = location?.action || "append_to_section"
    const offset = action === "insert_after_section" || action === "create_new_section"
      ? heading.endOffset
      : heading.endOffset

    return {
      offset,
      lineIndex: offsetToLine(lineOffsets, heading.startOffset),
      reason: "section",
      heading,
    }
  }

  return {
    offset: markdown.length,
    lineIndex: Math.max(0, markdown.split(/\n/).length - 1),
    reason: "document-end",
  }
}

export function applyIssuePatch(markdown: string, issue: NormalizedIssue): LocalPatchResult | null {
  const insertedText = getIssueSuggestedInsertText(issue)
  if (!insertedText) return null

  const location = issue.suggested_fix?.insert_location
  const action = location?.action || "append_to_section"
  const target = findSuggestionTarget(markdown, issue)

  if (action === "replace_text") {
    const quote = location?.anchor_quote || issue.current_section?.quote || issue.submission_excerpt
    if (!quote) return null

    const replaced = replaceText(markdown, quote, insertedText)
    return replaced ? { markdown: replaced, target, insertedText } : null
  }

  if (markdown.includes(insertedText.trim())) {
    return { markdown, target, insertedText }
  }

  return {
    markdown: formatInsertion(markdown, target.offset, insertedText),
    target,
    insertedText,
  }
}

export function getPreviewLines(markdown: string, issue: NormalizedIssue | null) {
  if (!issue) {
    return markdown.split(/\n/)
  }

  const insertedText = getIssueSuggestedInsertText(issue)
  if (!insertedText) {
    return markdown.split(/\n/)
  }

  const target = findSuggestionTarget(markdown, issue)
  const lines = markdown.split(/\n/)
  const previewLines = insertedText.trim().split(/\n/)
  const insertAt = Math.min(lines.length, target.lineIndex + 1)

  return [
    ...lines.slice(0, insertAt),
    ...previewLines.map((line) => `+ ${line}`),
    ...lines.slice(insertAt),
  ]
}
