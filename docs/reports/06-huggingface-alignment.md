# Report 06 — Hugging Face alignment

**Language:** English first, then فارسی.

Production PetroOps does **not** call Hugging Face. `HttpAiGatewayAdapter` expects a private FastAPI: `POST /v1/anomaly/explain`, `GET /v1/rul`, `POST /v1/knowledge`.

## English

| Hub project | Space | Product method | Fit |
|---|---|---|---|
| RotaGuard | [rotaguard-predictive-maintenance](https://huggingface.co/spaces/alirezaaminzadeh/rotaguard-predictive-maintenance) | `estimateRemainingUsefulLife` | Demo on C-MAPSS/CWRU; not live `tag_name` series |
| RefineryGuard | [refineryguard-process-anomaly](https://huggingface.co/spaces/alirezaaminzadeh/refineryguard-process-anomaly) | `explainAnomaly` | 52 TEP channels; needs a feature map |
| PipelineWatch | [pipelinewatch-leak-detection](https://huggingface.co/spaces/alirezaaminzadeh/pipelinewatch-leak-detection) | none | No SPA module |

Gradio cold start vs 8 s timeout: same problem as SafeOps. Plant tag windows must not go to a public Space.

Correct product path: copy ONNX/joblib into the gateway host (or a third VPS), keep Nest pointed at `/v1`. Spaces stay sales demos.

---

## فارسی

`AI_GATEWAY_URL` را روی Space نگذارید. RotaGuard و RefineryGuard برای دموی Hubاند. بدون نگاشت ویژگی، تگ پترواپس به ورودی TEP معنی نمی‌دهد. نشت خط لوله اصلاً در محصول نیست.
