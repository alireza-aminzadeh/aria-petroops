# 6) AI gateway — Aria PetroOps

English technical manual. Persian original: [`../06-ai-gateway-placeholder.md`](../06-ai-gateway-placeholder.md).

## 6.1 Decision

This 2 vCPU VPS does **not** serve PyTorch LSTM-AE. Default: `OnPremAiGatewayAdapter` (Isolation Forest + engineering RUL + keyword pack). If `AI_GATEWAY_URL` is set, `HttpAiGatewayAdapter` calls a central FastAPI.

The Persian file still shows a historical stub snippet; **runtime uses the on-prem adapter** unless disabled.

## 6.2 Port

```typescript
interface AiGatewayPort {
  isEnabled(): boolean;
  explainAnomaly(eventId: string, context?: Record<string, unknown>): Promise<AiAnswer>;
  estimateRemainingUsefulLife(equipmentId: string): Promise<AiRulEstimate>;
  askKnowledgeBase(query: string, context?: Record<string, unknown>): Promise<AiAnswer>;
}
```

## 6.3 Honesty

| Method | On-prem | HTTP |
|---|---|---|
| explain | Isolation Forest + text pack | LSTM-AE / RefineryGuard-style service |
| RUL | ISO 10816-style formula | Optional C-MAPSS model host |
| knowledge | Keywords | RAG host (not built here) |

RotaGuard RMSE figures on Hugging Face must not be pasted onto this RUL endpoint until that model is actually served.

## 6.4 Logging

`AiQueryLog` stores calls for audit. Do not log raw plant historian dumps to a shared HTTP vendor.
