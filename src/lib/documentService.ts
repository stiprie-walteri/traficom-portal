import axios from "axios";
import { apiClient } from "@/hooks/useApiClient";

// ParseRequest is no longer used because we send multipart/form-data

type RawApiResponse = {
  markdown?: string;
  parsed_codes?: {
    document_metadata?: Record<string, unknown>;
    sections?: Array<Record<string, unknown>>;
    all_found_codes?: string[];
    statistics?: Record<string, unknown>;
    issues?: {
      issues?: Array<Record<string, unknown>>;
    };
  };
  metrics?: Record<string, unknown>;
  issues?: {
    issues?: Array<Record<string, unknown>>;
  };
  [key: string]: unknown;
};

type JobStatusResponse = {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: RawApiResponse;
  error?: string;
};

export type NormalizedIssue = {
  id: string;
  issue_type?: string;
  title?: string;
  code?: string;
  main_code?: string;
  legislation_source?: string;
  submission_excerpt?: string;
  explanation?: string;
  problem?: string;
  solution?: string;
  current_section?: IssueSectionReference;
  suggested_fix?: SuggestedFix;
  submission_sections?: string[];
  severity?: string;
  raw?: Record<string, unknown>;
};

export type IssueSectionReference = {
  id?: string | null;
  title?: string | null;
  quote?: string | null;
};

export type SuggestedInsertLocation = {
  action?: string;
  target_section_id?: string | null;
  target_section_title?: string | null;
  anchor_quote?: string | null;
  placement?: string;
};

export type SuggestedFix = {
  insertable_text?: string;
  insert_location?: SuggestedInsertLocation;
};

export type ParsedSection = {
  section_number?: string;
  title?: string;
  legislation_codes?: Array<string | Record<string, unknown>>;
  text?: string;
  subsections?: ParsedSection[];
  raw?: Record<string, unknown>;
};

export type ParseResult = {
  ok: boolean;
  markdown: string;
  summary: {
    text: string;
    organization?: string;
    approval_number?: string;
    parsed_date?: string;
    raw?: Record<string, unknown>;
  };
  sections?: ParsedSection[];
  metrics?: Record<string, unknown>;
  issues: NormalizedIssue[];
  raw?: RawApiResponse;
  error?: string;
};

const safeString = (v: unknown) => (typeof v === "string" ? v : String(v ?? ""));

const normalizeId = (mainCode: unknown, index: number) => {
  const mc = typeof mainCode === "string" ? mainCode : "issue";
  return `${mc.replace(/[^a-zA-Z0-9_-]/g, "_")}-${index + 1}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringOrUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : undefined;

const normalizeSectionReference = (value: unknown): IssueSectionReference | undefined => {
  if (!isRecord(value)) return undefined;

  return {
    id: typeof value["id"] === "string" ? value["id"] : null,
    title: typeof value["title"] === "string" ? value["title"] : null,
    quote: typeof value["quote"] === "string" ? value["quote"] : null,
  };
};

const normalizeSuggestedFix = (value: unknown): SuggestedFix | undefined => {
  if (!isRecord(value)) return undefined;

  const insertLocation = isRecord(value["insert_location"])
    ? {
        action: stringOrUndefined(value["insert_location"]["action"]),
        target_section_id: typeof value["insert_location"]["target_section_id"] === "string"
          ? value["insert_location"]["target_section_id"]
          : null,
        target_section_title: typeof value["insert_location"]["target_section_title"] === "string"
          ? value["insert_location"]["target_section_title"]
          : null,
        anchor_quote: typeof value["insert_location"]["anchor_quote"] === "string"
          ? value["insert_location"]["anchor_quote"]
          : null,
        placement: stringOrUndefined(value["insert_location"]["placement"]),
      }
    : undefined;

  return {
    insertable_text: stringOrUndefined(value["insertable_text"]),
    insert_location: insertLocation,
  };
};

export const normalizeIssue = (raw: Record<string, unknown>, index: number): NormalizedIssue => {
  const current_section = normalizeSectionReference(raw["current_section"]);
  const suggested_fix = normalizeSuggestedFix(raw["suggested_fix"]);
  const title = stringOrUndefined(raw["title"]);
  const problem = stringOrUndefined(raw["problem"]);
  const solution = stringOrUndefined(raw["solution"]);
  const submission_excerpt = stringOrUndefined(raw["submission_excerpt"])
    ?? stringOrUndefined(raw["excerpt"])
    ?? stringOrUndefined(current_section?.quote);
  const explanation = stringOrUndefined(raw["explanation"])
    ?? stringOrUndefined(raw["comment"])
    ?? problem
    ?? title;
  const main_code = stringOrUndefined(raw["main_code"])
    ?? stringOrUndefined(raw["mainCode"])
    ?? stringOrUndefined(raw["code"])
    ?? stringOrUndefined(raw["legislation_reference"]);
  const code = stringOrUndefined(raw["code"]);
  const legislation_source = stringOrUndefined(raw["legislation_source"])
    ?? stringOrUndefined(raw["legislationSource"])
    ?? stringOrUndefined(raw["legislation_reference"]);
  const submission_sections = Array.isArray(raw["submission_sections"])
    ? raw["submission_sections"].filter((item): item is string => typeof item === "string")
    : undefined;
  const severity = stringOrUndefined(raw["severity"]);
  const issue_type = stringOrUndefined(raw["issue_type"]);
  const id = stringOrUndefined(raw["id"]) ?? normalizeId(main_code ?? title ?? problem, index);

  return {
    id,
    issue_type,
    title,
    code,
    main_code,
    legislation_source,
    submission_excerpt,
    explanation,
    problem,
    solution,
    current_section,
    suggested_fix,
    submission_sections,
    severity,
    raw,
  };
};

function collectIssueRecords(payload: unknown, output: Record<string, unknown>[]): void {
  if (Array.isArray(payload)) {
    payload.forEach((item) => collectIssueRecords(item, output));
    return;
  }

  if (!isRecord(payload)) return;

  const directIssues = payload["issues"];
  if (Array.isArray(directIssues)) {
    directIssues.forEach((issue) => {
      if (isRecord(issue)) output.push(issue);
    });
  } else if (isRecord(directIssues) && Array.isArray(directIssues["issues"])) {
    directIssues["issues"].forEach((issue) => {
      if (isRecord(issue)) output.push(issue);
    });
  }

  const parsedCodes = payload["parsed_codes"];
  if (isRecord(parsedCodes) && isRecord(parsedCodes["issues"]) && Array.isArray(parsedCodes["issues"]["issues"])) {
    parsedCodes["issues"]["issues"].forEach((issue) => {
      if (isRecord(issue)) output.push(issue);
    });
  }

  const complianceResult = payload["compliance_result"];
  if (complianceResult) {
    collectIssueRecords(complianceResult, output);
  }

  const results = payload["results"];
  if (Array.isArray(results)) {
    results.forEach((result) => collectIssueRecords(result, output));
  }

  const legislations = payload["legislations"];
  if (Array.isArray(legislations)) {
    legislations.forEach((group) => {
      if (isRecord(group)) collectIssueRecords(group["results"], output);
    });
  }
}

export function extractNormalizedIssues(payload: unknown): NormalizedIssue[] {
  const issueRecords: Record<string, unknown>[] = [];
  collectIssueRecords(payload, issueRecords);
  return dedupeNormalizedIssues(issueRecords.map((issue, index) => normalizeIssue(issue, index)));
}

function normalizeIssueKeyPart(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() || "";
}

function getIssueRawId(issue: NormalizedIssue) {
  return typeof issue.raw?.["id"] === "string" ? issue.raw["id"] : undefined;
}

function getIssueDedupeKeys(issue: NormalizedIssue) {
  const rawId = getIssueRawId(issue);
  const title = normalizeIssueKeyPart(issue.title || issue.main_code || issue.code);
  const problem = normalizeIssueKeyPart(issue.problem || issue.explanation);
  const quote = normalizeIssueKeyPart(issue.current_section?.quote || issue.submission_excerpt);
  const insertableText = normalizeIssueKeyPart(getIssueSuggestedInsertText(issue));
  const targetSection = normalizeIssueKeyPart(
    issue.suggested_fix?.insert_location?.target_section_title
    || issue.suggested_fix?.insert_location?.target_section_id
    || issue.current_section?.title
    || issue.current_section?.id
  );
  const legislation = normalizeIssueKeyPart(issue.legislation_source || issue.main_code);
  const keys = new Set<string>();

  if (rawId) keys.add(`id:${rawId}`);
  if (title && insertableText) keys.add(`title-insert:${title}|${insertableText}`);
  if (title && problem) keys.add(`title-problem:${title}|${problem}`);
  if (title && quote) keys.add(`title-quote:${title}|${quote}`);
  if (problem && quote) keys.add(`problem-quote:${problem}|${quote}`);
  if (legislation && targetSection && insertableText) {
    keys.add(`legislation-target-insert:${legislation}|${targetSection}|${insertableText}`);
  }

  return [...keys];
}

function issueCompleteness(issue: NormalizedIssue) {
  return [
    getIssueRawId(issue),
    issue.title,
    issue.problem,
    issue.solution,
    issue.current_section?.quote || issue.submission_excerpt,
    issue.current_section?.title,
    getIssueSuggestedInsertText(issue),
    issue.suggested_fix?.insert_location?.target_section_title,
  ].filter(Boolean).length;
}

function mergeSectionReference(
  preferred?: IssueSectionReference,
  fallback?: IssueSectionReference
): IssueSectionReference | undefined {
  if (!preferred && !fallback) return undefined;

  return {
    id: preferred?.id ?? fallback?.id ?? null,
    title: preferred?.title ?? fallback?.title ?? null,
    quote: preferred?.quote ?? fallback?.quote ?? null,
  };
}

function mergeSuggestedFix(preferred?: SuggestedFix, fallback?: SuggestedFix): SuggestedFix | undefined {
  if (!preferred && !fallback) return undefined;

  return {
    insertable_text: preferred?.insertable_text || fallback?.insertable_text,
    insert_location: preferred?.insert_location || fallback?.insert_location,
  };
}

function mergeIssues(existing: NormalizedIssue, incoming: NormalizedIssue): NormalizedIssue {
  const preferred = issueCompleteness(incoming) > issueCompleteness(existing) ? incoming : existing;
  const fallback = preferred === incoming ? existing : incoming;

  return {
    ...fallback,
    ...preferred,
    id: preferred.id || fallback.id,
    issue_type: preferred.issue_type || fallback.issue_type,
    title: preferred.title || fallback.title,
    code: preferred.code || fallback.code,
    main_code: preferred.main_code || fallback.main_code,
    legislation_source: preferred.legislation_source || fallback.legislation_source,
    submission_excerpt: preferred.submission_excerpt || fallback.submission_excerpt,
    explanation: preferred.explanation || fallback.explanation,
    problem: preferred.problem || fallback.problem,
    solution: preferred.solution || fallback.solution,
    current_section: mergeSectionReference(preferred.current_section, fallback.current_section),
    suggested_fix: mergeSuggestedFix(preferred.suggested_fix, fallback.suggested_fix),
    submission_sections: preferred.submission_sections || fallback.submission_sections,
    severity: preferred.severity || fallback.severity,
    raw: {
      ...(fallback.raw || {}),
      ...(preferred.raw || {}),
    },
  };
}

export function dedupeNormalizedIssues(issues: NormalizedIssue[]): NormalizedIssue[] {
  const deduped: NormalizedIssue[] = [];
  const keyToIndex = new Map<string, number>();

  for (const issue of issues) {
    const keys = getIssueDedupeKeys(issue);
    const existingKey = keys.find((key) => keyToIndex.has(key));

    if (existingKey) {
      const existingIndex = keyToIndex.get(existingKey);
      if (existingIndex === undefined) continue;

      deduped[existingIndex] = mergeIssues(deduped[existingIndex], issue);
      for (const key of getIssueDedupeKeys(deduped[existingIndex])) {
        keyToIndex.set(key, existingIndex);
      }
      continue;
    }

    const nextIndex = deduped.length;
    deduped.push(issue);
    const usableKeys = keys.length > 0 ? keys : [`fallback:${issue.id}`];
    for (const key of usableKeys) {
      keyToIndex.set(key, nextIndex);
    }
  }

  return deduped;
}

function getProjectResults(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) return [];

  const resultGroups = Array.isArray(payload["legislations"])
    ? payload["legislations"].flatMap((group) => {
        if (!isRecord(group) || !Array.isArray(group["results"])) return [];
        return group["results"].filter(isRecord);
      })
    : [];

  const topLevelResults = Array.isArray(payload["results"])
    ? payload["results"].filter(isRecord)
    : [];

  return [...resultGroups, ...topLevelResults];
}

export function buildIssuesFromProjectCompliance(compliance: unknown): NormalizedIssue[] {
  const structuredIssues = extractNormalizedIssues(compliance);
  if (structuredIssues.length > 0) return structuredIssues;

  const legacyIssues: NormalizedIssue[] = [];

  for (const result of getProjectResults(compliance)) {
    const incorrectSections = Array.isArray(result["incorrect_sections"])
      ? result["incorrect_sections"].filter(isRecord)
      : [];

    for (const section of incorrectSections) {
      const quote = stringOrUndefined(section["Quote"]) ?? stringOrUndefined(section["quote"]);
      if (!quote) continue;

      const legislationId = stringOrUndefined(result["legislation_id"])
        ?? stringOrUndefined(result["legislation_name"])
        ?? "issue";
      const task = Array.isArray(result["task"])
        ? result["task"].filter((item): item is string => typeof item === "string").join(" / ")
        : undefined;

      legacyIssues.push({
        id: `project-${legislationId}-${legacyIssues.length}`,
        submission_excerpt: quote,
        explanation: stringOrUndefined(section["Comment"])
          ?? stringOrUndefined(section["comment"])
          ?? stringOrUndefined(result["explanation"]),
        main_code: task,
        legislation_source: stringOrUndefined(result["legislation_name"]),
        severity: "error",
      });
    }
  }

  return dedupeNormalizedIssues(legacyIssues);
}

export function getIssueTitle(issue: NormalizedIssue): string {
  return issue.title?.trim()
    || issue.main_code?.trim()
    || issue.code?.trim()
    || issue.legislation_source?.trim()
    || "Warning";
}

export function getIssueProblem(issue: NormalizedIssue): string {
  return issue.problem?.trim()
    || issue.explanation?.trim()
    || issue.title?.trim()
    || "No problem details returned by the API.";
}

export function getIssueSolution(issue: NormalizedIssue): string {
  return issue.solution?.trim() || "";
}

export function getIssueSuggestedInsertText(issue: NormalizedIssue): string {
  return issue.suggested_fix?.insertable_text?.trim() || "";
}

export function getIssueFixLocation(issue: NormalizedIssue): string | null {
  const location = issue.suggested_fix?.insert_location;
  if (!location) return null;

  const placement = location.placement?.trim() || "after";
  const target = location.target_section_title?.trim()
    || location.target_section_id?.trim()
    || issue.current_section?.title?.trim()
    || issue.current_section?.id?.trim();
  const anchor = location.anchor_quote?.trim();

  if (target && anchor) return `Insert ${placement} "${anchor}" in ${target}.`;
  if (target) return `Insert ${placement} ${target}.`;
  if (anchor) return `Insert ${placement} "${anchor}".`;

  return null;
}

export function getIssueReferences(issue: NormalizedIssue): string[] {
  const references = [
    issue.legislation_source,
    issue.main_code,
    issue.code,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return Array.from(new Set(references));
}

const parseLegislation = async (): Promise<ParseResult> => {
  try {
    // Build multipart/form-data with a fake file named `file`
    const fakeBytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // ASCII for 'Hello'
    let file: File | Blob;
    try {
      file = new File([fakeBytes], "file", { type: "application/octet-stream" });
    } catch {
      // Fallback if File constructor is not available
      file = new Blob([fakeBytes], { type: "application/octet-stream" });
    }

    const form = new FormData();
    form.append("file", file as Blob, "file");

    const response = await apiClient.get<RawApiResponse>("/parse-legislation-mock",{
        timeout: 3000000 
    });
    const res: RawApiResponse = response.data ?? {};

    const markdown = safeString(res.markdown ?? "");

    const metadata = res.parsed_codes?.document_metadata ?? {};
    const organization = metadata["organization"] as string | undefined;
    const approval_number = metadata["approval_number"] as string | undefined;
    const parsed_date = metadata["parsed_date"] as string | undefined;

    const summaryTextParts: string[] = [];
    if (organization) summaryTextParts.push(`Organization: ${organization}`);
    if (approval_number) summaryTextParts.push(`Approval: ${approval_number}`);
    if (parsed_date) summaryTextParts.push(`Parsed: ${parsed_date}`);
    const summaryText = summaryTextParts.join(" — ") || "";
    const issues = extractNormalizedIssues(res);

    // Normalize sections if present
    const rawSections = Array.isArray(res.parsed_codes?.sections) ? (res.parsed_codes!.sections as Array<Record<string, unknown>>) : [];
    const normalizeSection = (s: Record<string, unknown> | undefined): ParsedSection => {
      if (!s) return {};
      const subsectionsRaw = Array.isArray(s["subsections"]) ? (s["subsections"] as Array<Record<string, unknown>>) : [];
      return {
        section_number: typeof s["section_number"] === "string" ? s["section_number"] : typeof s["sectionNumber"] === "string" ? s["sectionNumber"] : undefined,
        title: typeof s["title"] === "string" ? s["title"] : undefined,
          legislation_codes: Array.isArray(s["legislation_codes"]) ? (s["legislation_codes"] as Array<string | Record<string, unknown>>) : Array.isArray(s["legislationCodes"]) ? (s["legislationCodes"] as Array<string | Record<string, unknown>>) : [],
        text: typeof s["text"] === "string" ? s["text"] : undefined,
        subsections: subsectionsRaw.map(ss => normalizeSection(ss)),
        raw: s,
      };
    };
    
    const sections: ParsedSection[] = (rawSections || []).map(s => normalizeSection(s));

    const metrics = (res.metrics && typeof res.metrics === 'object')
      ? (res.metrics as Record<string, unknown>)
      : (res.parsed_codes && typeof res.parsed_codes === 'object' && typeof (res.parsed_codes as Record<string, unknown> & { metrics?: unknown }).metrics === 'object')
        ? ((res.parsed_codes as Record<string, unknown> & { metrics?: Record<string, unknown> }).metrics as Record<string, unknown>)
        : undefined;

    return {
      ok: true,
      markdown,
      summary: {
        text: summaryText,
        organization,
        approval_number,
        parsed_date,
        raw: metadata as Record<string, unknown>,
      },
      issues,
      sections,
      metrics,
      raw: res,
    };
  } catch (e) {
    // axios error.response was normalized earlier in api wrapper
    if (e && typeof e === "object" && "data" in e) {
      const maybe = e as { data?: unknown };
      const data = (maybe.data && typeof maybe.data === "object") ? (maybe.data as RawApiResponse) : undefined;
      return { ok: false, markdown: "", summary: { text: "", raw: {} }, issues: [], raw: data, error: "server error" };
    }
    return { ok: false, markdown: "", summary: { text: "", raw: {} }, issues: [], error: "Network or unknown error" };
  }
};

const parseReal = async (file: File): Promise<ParseResult> => {
  const POLLING_INTERVAL = 5000; // 5 seconds
  const MAX_TIMEOUT = 3000000; // 50 minutes
  const startTime = Date.now();

  try {
    // Step 1: Start the job by uploading the file
    const form = new FormData();
    form.append("file", file, file.name);

    const startResponse = await apiClient.post<{ job_id: string; status: string }>("/parse-legislation", form, {
      timeout: 60000, // 1 minute for initial upload
    });

    const { job_id } = startResponse.data;
    if (!job_id) {
      return { ok: false, markdown: "", summary: { text: "", raw: {} }, issues: [], error: "Failed to start job: no job_id returned" };
    }

    // Step 2: Poll for status until completed or failed
    while (true) {
      // Check timeout
      if (Date.now() - startTime > MAX_TIMEOUT) {
        return { ok: false, markdown: "", summary: { text: "", raw: {} }, issues: [], error: "Timeout: job did not complete within the allowed time" };
      }

      // Poll the status endpoint
      const statusResponse = await apiClient.get<JobStatusResponse>(`/parse-legislation-status/${job_id}`, {
        timeout: 30000, // 30 seconds per poll
      });

      const { status, result, error: jobError } = statusResponse.data;

      if (status === "completed" && result) {
        // Job completed successfully, process the result
        const res: RawApiResponse = result;

        const markdown = safeString(res.markdown ?? "");

        const metadata = res.parsed_codes?.document_metadata ?? {};
        const organization = metadata["organization"] as string | undefined;
        const approval_number = metadata["approval_number"] as string | undefined;
        const parsed_date = metadata["parsed_date"] as string | undefined;

        const summaryTextParts: string[] = [];
        if (organization) summaryTextParts.push(`Organization: ${organization}`);
        if (approval_number) summaryTextParts.push(`Approval: ${approval_number}`);
        if (parsed_date) summaryTextParts.push(`Parsed: ${parsed_date}`);
        const summaryText = summaryTextParts.join(" — ") || "";

        const issues = extractNormalizedIssues(res);

        const rawSections = Array.isArray(res.parsed_codes?.sections) ? (res.parsed_codes!.sections as Array<Record<string, unknown>>) : [];
        const normalizeSection = (s: Record<string, unknown> | undefined): ParsedSection => {
          if (!s) return {};
          const subsectionsRaw = Array.isArray(s["subsections"]) ? (s["subsections"] as Array<Record<string, unknown>>) : [];
          return {
            section_number: typeof s["section_number"] === "string" ? s["section_number"] : typeof s["sectionNumber"] === "string" ? s["sectionNumber"] : undefined,
            title: typeof s["title"] === "string" ? s["title"] : undefined,
            legislation_codes: Array.isArray(s["legislation_codes"]) ? (s["legislation_codes"] as Array<string | Record<string, unknown>>) : Array.isArray(s["legislationCodes"]) ? (s["legislationCodes"] as Array<string | Record<string, unknown>>) : [],
            text: typeof s["text"] === "string" ? s["text"] : undefined,
            subsections: subsectionsRaw.map(ss => normalizeSection(ss)),
            raw: s,
          };
        };

        const sections: ParsedSection[] = (rawSections || []).map(s => normalizeSection(s));

        const metrics = (res.metrics && typeof res.metrics === 'object')
          ? (res.metrics as Record<string, unknown>)
          : (res.parsed_codes && typeof res.parsed_codes === 'object' && typeof (res.parsed_codes as Record<string, unknown> & { metrics?: unknown }).metrics === 'object')
            ? ((res.parsed_codes as Record<string, unknown> & { metrics?: Record<string, unknown> }).metrics as Record<string, unknown>)
            : undefined;

        return {
          ok: true,
          markdown,
          summary: {
            text: summaryText,
            organization,
            approval_number,
            parsed_date,
            raw: metadata as Record<string, unknown>,
          },
          issues,
          sections,
          metrics,
          raw: res,
        };
      } else if (status === "failed") {
        return { ok: false, markdown: "", summary: { text: "", raw: {} }, issues: [], error: jobError || "Job failed" };
      } else if (status === "pending" || status === "processing") {
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      } else {
        return { ok: false, markdown: "", summary: { text: "", raw: {} }, issues: [], error: `Unknown status: ${status}` };
      }
    }
  } catch (e) {
    // Handle network or other errors
    if (axios.isAxiosError(e) && e.response) {
      const data = e.response.data as JobStatusResponse | undefined;
      return { ok: false, markdown: "", summary: { text: "", raw: {} }, issues: [], raw: data?.result, error: data?.error || "Server error" };
    }
    return { ok: false, markdown: "", summary: { text: "", raw: {} }, issues: [], error: "Network or unknown error" };
  }
};

export default {
  parseLegislation,
  parseReal,
};
