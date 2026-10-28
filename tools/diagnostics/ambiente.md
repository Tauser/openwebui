# Diagnóstico local

Gerado em 2026-10-27T14:02:57.986Z. Execute novamente com `node tools/diagnostics/diagnostico.mjs`.

- Node: v22.22.0 (win32/x64)
- RAM total: 31.1 GiB
- GPU: AMD Radeon(TM) Graphics
NVIDIA GeForce RTX 4070
- Codex: codex-cli 0.164.0-alpha.11.1
- Ollama: conectado (0.40.11)
- Modelos: hf.co/prithivMLmods/Qwen-Image-2.1-PE-I2I-GGUF:Q4_K_M, COMPANION-BASE:latest, JANA:latest, qwen3.5-9b-coder:latest, qwen3.5-codex:9b, gemma4:12b


## Inferência local real

Probe: 2026-10-27T14:01:30.825Z, modelo qwen3.5-9b-coder:latest, HTTP 200, sucesso true, duração 61799 ms. Veja inferencia.json. Posteriormente, a gerência comprovou streaming, persistência e cancelamento reais no chat integrado, com think:false; veja ../../docs/ACEITE.md e ../../docs/evidencias/i01.json. Codex CLI disponível não comprova integração app-server. A Fase 0 completa ainda não está aceita.

