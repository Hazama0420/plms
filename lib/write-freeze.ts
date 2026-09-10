export const PHASE12_WRITE_FREEZE_ENV = "NEXT_PUBLIC_PHASE12_WRITE_FREEZE";
export const PHASE12_WRITE_FREEZE_CODE = "PHASE12_WRITE_FREEZE_ACTIVE";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MUTATING_GET_PATHS = new Set([
  "/api/followups/process-overdue",
  "/api/surveys/reminders",
]);
const FROZEN_API_PREFIXES = [
  "/api/leads",
  "/api/followups",
  "/api/properties",
  "/api/media",
  "/api/surveys",
  "/api/admin/logs",
  "/api/admin/users",
];
const SERVER_ACTION_PAGE_PREFIXES = ["/crm", "/invoices", "/properties", "/surveys"];
const FROZEN_REST_RESOURCES = new Set([
  "crm_contacts",
  "crm_leads",
  "crm_interests",
  "crm_followups",
  "crm_activities",
  "properties",
  "property_owners",
  "property_address",
  "property_price",
  "property_specifications",
  "property_land",
  "property_building",
  "property_media",
  "invoices",
  "invoice_items",
  "commission_ledger",
  "surveys",
  "survey_requests",
]);
const FROZEN_RPCS = new Set([
  "claim_crm_lead_atomic",
  "process_deal_closing_atomic",
  "next_listing_number",
]);

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPhase12WriteFreezeEnabled(
  value = process.env.NEXT_PUBLIC_PHASE12_WRITE_FREEZE
): boolean {
  return ["1", "true", "on"].includes(String(value ?? "").toLowerCase().trim());
}

export function isFrozenApplicationRequest(input: {
  method: string;
  pathname: string;
  isServerAction?: boolean;
  freezeEnabled?: boolean;
}): boolean {
  if (!(input.freezeEnabled ?? isPhase12WriteFreezeEnabled())) return false;

  const method = input.method.toUpperCase();
  if (method === "GET" && MUTATING_GET_PATHS.has(input.pathname)) return true;
  if (!MUTATION_METHODS.has(method)) return false;

  if (FROZEN_API_PREFIXES.some((prefix) => matchesPrefix(input.pathname, prefix))) {
    return true;
  }

  return Boolean(input.isServerAction)
    && SERVER_ACTION_PAGE_PREFIXES.some((prefix) => matchesPrefix(input.pathname, prefix));
}

export function isFrozenSupabaseRequest(input: {
  method: string;
  url: string;
  freezeEnabled?: boolean;
}): boolean {
  if (!(input.freezeEnabled ?? isPhase12WriteFreezeEnabled())) return false;
  if (!MUTATION_METHODS.has(input.method.toUpperCase())) return false;

  let pathname: string;
  try {
    pathname = new URL(input.url).pathname;
  } catch {
    return false;
  }

  const marker = "/rest/v1/";
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex < 0) return false;

  const resourcePath = decodeURIComponent(pathname.slice(markerIndex + marker.length));
  if (resourcePath.startsWith("rpc/")) {
    return FROZEN_RPCS.has(resourcePath.slice(4).split("/")[0]);
  }

  return FROZEN_REST_RESOURCES.has(resourcePath.split("/")[0]);
}

export function phase12GuardedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  const url = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

  if (isFrozenSupabaseRequest({ method, url })) {
    return Promise.resolve(Response.json(
      {
        code: PHASE12_WRITE_FREEZE_CODE,
        message: "Perubahan data dihentikan sementara untuk pemeliharaan keamanan.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "60",
          "X-PLMS-Write-Freeze": "phase12",
        },
      }
    ));
  }

  return fetch(input, init);
}
