import axios from "axios";

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

export type NormalizedIssue = {
  id: string;
  code?: string;
  main_code?: string;
  legislation_source?: string;
  submission_excerpt?: string;
  explanation?: string;
  submission_sections?: string[];
  raw?: Record<string, unknown>;
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

    // Use axios directly so browser sets the correct Content-Type with boundary
    const response = await axios.get<RawApiResponse>("/api/parse-legislation-mock");
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
    // Prefer canonical `res.issues.issues`, fall back to `parsed_codes.issues` for older responses
    const rawIssues = res.issues?.issues ?? res.parsed_codes?.issues?.issues ?? [];
    const issues: NormalizedIssue[] = (rawIssues || []).map((raw, i) => {
      const submission_excerpt = raw["submission_excerpt"] ?? raw["excerpt"] ?? undefined;
      const explanation = raw["explanation"] ?? raw["comment"] ?? undefined;
      const main_code = raw["main_code"] ?? raw["mainCode"] ?? raw["code"] ?? undefined;
      const code = raw["code"] ?? undefined;
      const legislation_source = raw["legislation_source"] ?? raw["legislationSource"] ?? undefined;
      const submission_sections = Array.isArray(raw["submission_sections"]) ? (raw["submission_sections"] as string[]) : undefined;

      const id = normalizeId(main_code, i);

      return {
        id,
        code: typeof code === "string" ? code : undefined,
        main_code: typeof main_code === "string" ? main_code : undefined,
        legislation_source: typeof legislation_source === "string" ? legislation_source : undefined,
        submission_excerpt: typeof submission_excerpt === "string" ? submission_excerpt : undefined,
        explanation: typeof explanation === "string" ? explanation : undefined,
        submission_sections: submission_sections,
        raw: raw,
      };
    });

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
  try {
    const form = new FormData();
    form.append("file", file, file.name);

    // Use axios directly so browser sets the correct Content-Type with boundary
    const response = await axios.post<RawApiResponse>("/api/parse-legislation", form);
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
    // Prefer canonical `res.issues.issues`, fall back to `parsed_codes.issues` for older responses
    const rawIssues = res.issues?.issues ?? res.parsed_codes?.issues?.issues ?? [];
    const issues: NormalizedIssue[] = (rawIssues || []).map((raw, i) => {
      const submission_excerpt = raw["submission_excerpt"] ?? raw["excerpt"] ?? undefined;
      const explanation = raw["explanation"] ?? raw["comment"] ?? undefined;
      const main_code = raw["main_code"] ?? raw["mainCode"] ?? raw["code"] ?? undefined;
      const code = raw["code"] ?? undefined;
      const legislation_source = raw["legislation_source"] ?? raw["legislationSource"] ?? undefined;
      const submission_sections = Array.isArray(raw["submission_sections"]) ? (raw["submission_sections"] as string[]) : undefined;

      const id = normalizeId(main_code, i);

      return {
        id,
        code: typeof code === "string" ? code : undefined,
        main_code: typeof main_code === "string" ? main_code : undefined,
        legislation_source: typeof legislation_source === "string" ? legislation_source : undefined,
        submission_excerpt: typeof submission_excerpt === "string" ? submission_excerpt : undefined,
        explanation: typeof explanation === "string" ? explanation : undefined,
        submission_sections: submission_sections,
        raw: raw,
      };
    });

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

export default {
  parseLegislation,
  parseReal,
};
