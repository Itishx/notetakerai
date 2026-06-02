import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_API_BASE = "https://api.openai.com/v1";
const DEFAULT_TRACKING_START_DATE = "2024-01-01";

type OpenAiCostResult = {
  amount?: {
    value?: number;
    currency?: string;
  } | null;
  line_item?: string | null;
  project_id?: string | null;
};

type OpenAiCompletionUsageResult = {
  model?: string | null;
  num_model_requests?: number;
  input_tokens?: number;
  output_tokens?: number;
  input_audio_tokens?: number;
  output_audio_tokens?: number;
};

type OpenAiBucket<T> = {
  object?: string;
  start_time?: number;
  end_time?: number;
  results?: T[] | null;
};

type OpenAiPage<T> = {
  object?: string;
  data?: Array<OpenAiBucket<T>>;
  has_more?: boolean;
  next_page?: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return json({ error: "Method not allowed." }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Sign in required." }, 401);
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const openAiAdminKey = Deno.env.get("OPENAI_ADMIN_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    const projectIds = parseCsvList(Deno.env.get("OPENAI_COSTS_PROJECT_IDS"));

    if (!anonKey || !supabaseUrl) {
      return json({ error: "Missing Supabase configuration." }, 500);
    }
    if (!openAiAdminKey) {
      return json({ error: "Missing OpenAI cost API configuration." }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Sign in required." }, 401);
    }

    const now = new Date();
    const nowUnix = Math.floor(now.getTime() / 1000);
    const trackingStartDate = normalizeTrackingStartDate(
      Deno.env.get("OPENAI_COSTS_START_DATE") || DEFAULT_TRACKING_START_DATE,
      now,
    );
    const trackingStartUnix = toUtcDayStartUnix(trackingStartDate);
    const currentMonthStartUnix = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
    const last30DaysStartUnix = Math.max(trackingStartUnix, toUtcDayStartUnix(shiftUtcDays(now, -29)));

    const [costBuckets, lineItemBuckets, completionBuckets] = await Promise.all([
      fetchOpenAiBuckets<OpenAiCostResult>({
        apiKey: openAiAdminKey,
        path: "/organization/costs",
        params: {
          start_time: String(trackingStartUnix),
          end_time: String(nowUnix),
          bucket_width: "1d",
          limit: "180",
        },
        projectIds,
      }),
      fetchOpenAiBuckets<OpenAiCostResult>({
        apiKey: openAiAdminKey,
        path: "/organization/costs",
        params: {
          start_time: String(last30DaysStartUnix),
          end_time: String(nowUnix),
          bucket_width: "1d",
          limit: "31",
        },
        groupBy: ["line_item"],
        projectIds,
      }),
      fetchOpenAiBuckets<OpenAiCompletionUsageResult>({
        apiKey: openAiAdminKey,
        path: "/organization/usage/completions",
        params: {
          start_time: String(last30DaysStartUnix),
          end_time: String(nowUnix),
          bucket_width: "1d",
          limit: "31",
        },
        groupBy: ["model"],
        projectIds,
      }),
    ]);

    const dailyCosts = costBuckets
      .map((bucket) => ({
        startTime: safeNumber(bucket.start_time),
        date: new Date(safeNumber(bucket.start_time) * 1000).toISOString().slice(0, 10),
        amount: sumCostResults(bucket.results),
        currency: firstCurrency(bucket.results) || "usd",
      }))
      .filter((bucket) => bucket.startTime > 0)
      .sort((left, right) => left.startTime - right.startTime);

    const trackedTotalUsd = roundCurrency(
      dailyCosts.reduce((sum, bucket) => sum + bucket.amount, 0),
    );
    const currentMonthUsd = roundCurrency(
      dailyCosts
        .filter((bucket) => bucket.startTime >= currentMonthStartUnix)
        .reduce((sum, bucket) => sum + bucket.amount, 0),
    );
    const last30DaysUsd = roundCurrency(
      dailyCosts
        .filter((bucket) => bucket.startTime >= last30DaysStartUnix)
        .reduce((sum, bucket) => sum + bucket.amount, 0),
    );

    const lineItemCurrency = firstCurrencyFromBuckets(lineItemBuckets) || "usd";
    const lineItemBreakdownLast30Days = Array.from(
      lineItemBuckets.reduce((totals, bucket) => {
        for (const result of bucket.results || []) {
          const lineItem = (result.line_item || "Other").trim() || "Other";
          totals.set(lineItem, (totals.get(lineItem) || 0) + safeNumber(result.amount?.value));
        }
        return totals;
      }, new Map<string, number>()),
    )
      .map(([lineItem, costUsd]) => ({
        lineItem,
        costUsd: roundCurrency(costUsd),
        currency: lineItemCurrency,
      }))
      .sort((left, right) => right.costUsd - left.costUsd)
      .slice(0, 6);

    const aggregatedModelUsage = Array.from(
      completionBuckets.reduce((totals, bucket) => {
        for (const result of bucket.results || []) {
          const model = (result.model || "unknown").trim() || "unknown";
          const previous = totals.get(model) || {
            model,
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            inputAudioTokens: 0,
            outputAudioTokens: 0,
          };

          previous.requests += safeNumber(result.num_model_requests);
          previous.inputTokens += safeNumber(result.input_tokens);
          previous.outputTokens += safeNumber(result.output_tokens);
          previous.inputAudioTokens += safeNumber(result.input_audio_tokens);
          previous.outputAudioTokens += safeNumber(result.output_audio_tokens);

          totals.set(model, previous);
        }
        return totals;
      }, new Map<string, {
        model: string;
        requests: number;
        inputTokens: number;
        outputTokens: number;
        inputAudioTokens: number;
        outputAudioTokens: number;
      }>()),
    );

    const requestCountLast30Days = aggregatedModelUsage.reduce((sum, item) => sum + item.requests, 0);

    const modelBreakdownLast30Days = aggregatedModelUsage
      .map((entry) => ({
        ...entry,
        requests: Math.round(entry.requests),
        inputTokens: Math.round(entry.inputTokens),
        outputTokens: Math.round(entry.outputTokens),
        inputAudioTokens: Math.round(entry.inputAudioTokens),
        outputAudioTokens: Math.round(entry.outputAudioTokens),
      }))
      .sort((left, right) => {
        if (right.requests !== left.requests) return right.requests - left.requests;
        const rightTotalTokens = right.inputTokens + right.outputTokens + right.inputAudioTokens + right.outputAudioTokens;
        const leftTotalTokens = left.inputTokens + left.outputTokens + left.inputAudioTokens + left.outputAudioTokens;
        return rightTotalTokens - leftTotalTokens;
      })
      .slice(0, 8);

    return json({
      currency: firstCurrencyFromBuckets(costBuckets) || "usd",
      trackedTotalUsd,
      currentMonthUsd,
      last30DaysUsd,
      trackingStartDate: trackingStartDate.toISOString().slice(0, 10),
      requestCountLast30Days,
      dailyCosts: dailyCosts
        .filter((bucket) => bucket.startTime >= last30DaysStartUnix)
        .map(({ date, amount, currency }) => ({
          date,
          costUsd: roundCurrency(amount),
          currency,
        })),
      lineItemBreakdownLast30Days,
      modelBreakdownLast30Days,
      scopedProjectIds: projectIds,
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("openai-cost-overview error:", error);
    if (isUsageScopeError(error)) {
      return json({
        error: "OpenAI usage access is not configured for dashboard costs.",
        userMessage:
          "OpenAI cost dashboard needs an admin or usage-read key. Add OPENAI_ADMIN_API_KEY in Supabase using an OpenAI key with the api.usage.read scope.",
        setupUrl: "https://platform.openai.com/settings/organization/admin-keys",
      }, 403);
    }
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchOpenAiBuckets<T>({
  apiKey,
  path,
  params,
  groupBy = [],
  projectIds = [],
}: {
  apiKey: string;
  path: string;
  params: Record<string, string>;
  groupBy?: string[];
  projectIds?: string[];
}) {
  const buckets: Array<OpenAiBucket<T>> = [];
  let nextPage: string | null = null;

  do {
    const url = new URL(`${OPENAI_API_BASE}${path}`);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    groupBy.forEach((field) => {
      url.searchParams.append("group_by", field);
    });
    projectIds.forEach((projectId) => {
      url.searchParams.append("project_ids", projectId);
    });
    if (nextPage) {
      url.searchParams.set("page", nextPage);
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(await extractOpenAiError(response));
    }

    const payload = await response.json() as OpenAiPage<T>;
    buckets.push(...(payload.data || []));
    nextPage = payload.has_more ? payload.next_page || null : null;
  } while (nextPage);

  return buckets;
}

async function extractOpenAiError(response: Response) {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || parsed?.message || raw;
  } catch {
    return raw || `OpenAI request failed with status ${response.status}.`;
  }
}

function normalizeTrackingStartDate(value: string, now: Date) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? `${value.trim()}T00:00:00.000Z`
    : value.trim();
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(`${DEFAULT_TRACKING_START_DATE}T00:00:00.000Z`);
  }
  if (parsed.getTime() > now.getTime()) {
    return now;
  }
  return parsed;
}

function parseCsvList(value: string | undefined | null) {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function shiftUtcDays(date: Date, amount: number) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + amount,
  ));
}

function toUtcDayStartUnix(date: Date) {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000);
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 10000) / 10000;
}

function sumCostResults(results: OpenAiCostResult[] | null | undefined) {
  return (results || []).reduce((sum, result) => sum + safeNumber(result.amount?.value), 0);
}

function firstCurrency(results: OpenAiCostResult[] | null | undefined) {
  return (results || []).find((result) => typeof result.amount?.currency === "string")?.amount?.currency || null;
}

function firstCurrencyFromBuckets(buckets: Array<OpenAiBucket<OpenAiCostResult>>) {
  for (const bucket of buckets) {
    const currency = firstCurrency(bucket.results);
    if (currency) return currency;
  }
  return null;
}

function isUsageScopeError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message || "";
  return message.includes("api.usage.read") || message.includes("insufficient permissions");
}
