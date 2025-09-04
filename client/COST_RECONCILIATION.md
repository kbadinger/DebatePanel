# Cost Reconciliation Strategy

This document outlines how we track real costs vs estimates for all AI providers to ensure accurate billing and prevent cost overruns.

## Provider Status Overview

| Provider | Real-Time Costs | Token Data | Reconciliation Method | Status |
|----------|-----------------|------------|----------------------|---------|
| **OpenAI** | ✅ Billing API | ✅ API Response | Automatic via API | **ACTIVE** |
| **Anthropic** | ✅ Billing API | ✅ API Response | Automatic via API | **ACTIVE** |
| **Perplexity** | ✅ API Response | ✅ API Response | Real-time in debates | **ACTIVE** |
| **Google Cloud** | 🔄 Calculated | ✅ API Response | Official pricing + usage | **ACTIVE** |
| **DeepSeek** | ❌ No API | ✅ API Response | Manual CSV import | **MANUAL** |
| **X.AI (Grok)** | ❌ No API | ✅ API Response | Manual CSV import | **MANUAL** |
| **Mistral** | ❌ No API | ❌ Dashboard only | Manual CSV import | **MANUAL** |
| **Meta (Llama)** | ❌ Third-party | 🔄 Via providers | Provider dashboards | **MANUAL** |

## Real-Time Cost Tracking (Automatic)

### 1. OpenAI - Full Billing API ✅
- **Method**: OpenAI Usage API + Cost reconciliation 
- **Endpoint**: `GET /v1/organization/usage/completions`
- **Data**: Model-specific usage with exact costs
- **Frequency**: Pull daily via admin dashboard
- **Status**: Fully implemented and active

### 2. Anthropic - Full Billing API ✅
- **Method**: Anthropic Console API
- **Endpoint**: `GET /v1/organizations/cost_report`
- **Data**: Exact costs from API billing
- **Frequency**: Pull daily via admin dashboard  
- **Status**: Fully implemented and active

### 3. Perplexity - Real-Time API Costs ✅
- **Method**: Cost data in every API response
- **Format**: `usage.total_cost`, `usage.request_cost`
- **Data**: Exact cost per request in USD
- **Frequency**: Real-time during debates
- **Status**: Fully implemented and active

### 4. Google Cloud - Calculated Costs ✅
- **Method**: Official pricing applied to usage
- **API**: Cloud Billing API for verification
- **Data**: Token usage + official Gemini pricing
- **Frequency**: Real-time during debates
- **Status**: Implemented with official pricing

## Manual Reconciliation (CSV Import)

### 5. DeepSeek - Manual Import Required ❌
**Export Instructions:**
1. Go to [platform.deepseek.com](https://platform.deepseek.com)
2. Navigate to **Usage** section
3. Select date range 
4. Click **Export CSV**
5. Import via `/admin/usage/import`

**API Response Data:**
- Provides token counts in API responses
- Store `usage.prompt_tokens`, `usage.completion_tokens`
- Use for reconciliation when real costs imported

**Current Pricing (Jan 2025):**
- DeepSeek-Chat: $0.27/$1.10 per 1M tokens (input/output)
- DeepSeek-R1: $0.55/$2.19 per 1M tokens (input/output)

### 6. X.AI (Grok) - Manual Import Required ❌
**Export Instructions:**
1. Go to [console.x.ai](https://console.x.ai)
2. Navigate to **Billing** section
3. Select **Export Usage Data**
4. Download CSV for date range
5. Import via `/admin/usage/import`

**API Response Data:**
- Provides token counts in API responses
- Store `usage.prompt_tokens`, `usage.completion_tokens`
- Store `usage.cached_prompt_tokens` for cache tracking

### 7. Mistral - Manual Import Required ❌
**Export Instructions:**
1. Go to [console.mistral.ai](https://console.mistral.ai)
2. Navigate to **Usage** section  
3. View workspace-level usage
4. Export CSV data
5. Import via `/admin/usage/import`

**API Response:**
- Limited usage data in responses
- Must rely on dashboard export

### 8. Meta/Llama - Third-Party Provider Dependent ❌
**Together AI:**
1. Go to [api.together.xyz](https://api.together.xyz)
2. Navigate to **Billing** dashboard
3. Export usage data for Llama models
4. Import via `/admin/usage/import`

**Replicate:**
1. Go to [replicate.com](https://replicate.com) dashboard
2. Navigate to **Billing** section
3. Export usage for Llama models
4. Import via `/admin/usage/import`

## Technical Implementation

### Database Schema
```sql
-- Core usage tracking (already exists)
UsageRecord {
  inputTokens     Int    -- Our estimated tokens
  outputTokens    Int    -- Our estimated tokens  
  apiCost         Float  -- Billing cost (estimated or actual)
  platformFee     Float  -- Our markup
  totalCost       Float  -- What user pays
}

-- Provider reconciliation (newly added)
UsageRecord {
  providerInputTokens   Int?     -- Tokens reported by provider
  providerOutputTokens  Int?     -- Tokens reported by provider
  providerReportedCost  Float?   -- Real cost from provider
  importSource          String?  -- How cost was obtained
  providerCostFetched   Boolean  -- Whether we have real cost
  reconciliationNotes   String?  -- Details about reconciliation
}
```

### Cost Extraction Logic

**Real-Time (During Debates):**
```typescript
// usage-tracking.ts extracts costs from API responses
extractActualCost(providerUsage: any) {
  // Perplexity - REAL COSTS
  if (providerUsage.usage?.total_cost) return providerUsage.usage.total_cost;
  
  // OpenAI variations  
  if (providerUsage.total_cost) return providerUsage.total_cost;
  
  // Other providers...
}
```

**Manual Import (CSV):**
```typescript
// API endpoint matches CSV data to usage records
// Matches by: timestamp ± 5 minutes, provider, model name
// Updates: providerReportedCost, importSource, reconciliationNotes
```

## Reconciliation Process

### Daily Reconciliation Workflow
1. **Automatic Providers** (OpenAI, Anthropic):
   - Pull costs via admin dashboard
   - Match with usage records
   - Update with real costs

2. **Real-Time Providers** (Perplexity):
   - Costs captured during debates
   - No additional reconciliation needed

3. **Manual Providers** (DeepSeek, X.AI, Mistral, Meta):
   - Export CSV from provider dashboard  
   - Import via `/admin/usage/import`
   - Match and update records

### Cost Reconciliation Reports
Access via admin dashboard:
- **Usage Analytics** (`/admin/usage`): View estimated vs actual costs
- **Cost Reconciliation** (`/admin/usage/reconcile`): Pull real costs from APIs
- **Manual Import** (`/admin/usage/import`): Import CSV cost data

## Expected CSV Format

```csv
timestamp,model,cost,input_tokens,output_tokens
2025-01-19T10:30:00Z,deepseek-chat,0.0021,1500,200
2025-01-19T10:31:15Z,grok-2,0.0045,2000,150
2025-01-19T10:32:30Z,mistral-large,0.0032,1800,180
```

**Required Columns:**
- `timestamp/date`: ISO 8601 or readable date format
- `model`: Model name (flexible matching)
- `cost/amount`: Cost in USD

**Optional Columns:**
- `input_tokens/prompt_tokens`: Provider-reported input tokens
- `output_tokens/completion_tokens`: Provider-reported output tokens

## Monitoring & Alerts

### Cost Accuracy Tracking
- Track estimated vs actual cost delta
- Calculate accuracy percentage
- Alert on significant discrepancies (>20% difference)

### Coverage Metrics
- Track percentage of records with real cost data
- Monitor reconciliation success rates
- Identify providers needing more frequent reconciliation

## Getting Started

1. **Real-Time Providers**: Already active, no action needed
2. **API Providers**: Set up daily cost pulls via admin dashboard
3. **Manual Providers**: Set up weekly/monthly CSV import routine

## Future Enhancements

1. **Webhook Integration**: Set up cost alerts from providers that support them
2. **Automated Imports**: Automate CSV downloads where provider APIs allow
3. **Cost Forecasting**: Predict monthly costs based on usage trends
4. **Advanced Matching**: Improve CSV-to-record matching algorithms

---

**Last Updated**: January 2025
**Contact**: See admin dashboard for cost reconciliation tools