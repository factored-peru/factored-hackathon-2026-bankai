# ADR 0010: Gobierno de datos de proveedores de IA

## Status

Accepted

## Context

Jev, Model Armor, Gemini y otros modelos son boundaries externos con regiones,
retención, logging y condiciones contractuales distintas. La minimización por
sí sola no reemplaza una decisión de gobierno de datos.

## Decision

La política por defecto es:

| Proveedor | Público | Interno | PII minimizada | Financiero | Secretos |
|---|---:|---:|---:|---:|---:|
| Gemini/Vertex | sí | sí | sí, con contrato/región | no crudo | no |
| Model Armor + SDP Advanced | sí | sí | sí, para inspección/redacción | no crudo | no |
| Jev | sí | sí | no | no | no |
| Langfuse Cloud US | sólo metadata saneada | sólo metadata saneada | no | no | no |
| OpenRouter/otro no aprobado | sí | no por defecto | no | no | no |
| Logs/telemetría | metadata | metadata | no | no | no |

Las integraciones externas solo se habilitan cuando existe registro de región,
residencia, retención, logging, entrenamiento, cifrado, DPA, subprocesadores y
fallback. La falta de esa información bloquea el uso de datos personales.

El sistema deshabilita contenido en logs por defecto. Model Armor se usa con
endpoint regional compatible con la política de residencia y sus plantillas.

La configuración de Model Armor debe registrar:

```text
provider
region
inspect_template
deidentify_template
template_version
supported_modalities
retention
logging
training_policy
dpa_status
failure_mode
```

Langfuse complementa OpenTelemetry como destino de observabilidad, no como
fuente de datos, autorización, memoria ni evaluación decisoria. Su única
instancia aprobada para el MVP es Cloud US. La activación requiere registrar
endpoint, región, retención, DPA, subprocesadores, versión del SDK y política
de exportación; sus claves viven sólo en Secret Manager. Si falta cualquiera
de esos registros o de las claves, el exportador queda deshabilitado.

El adaptador hacia Langfuse emite únicamente spans manuales y allowlisted.
Quedan prohibidos callbacks, auto-instrumentación o SDKs que capturen prompt,
respuesta, mensajes, argumentos, resultados de tools, filas, evidencia,
adjuntos o atributos equivalentes. Tenant, sesión, usuario y correlación se
exportan sólo como pseudónimos HMAC rotables y nunca como identificadores
recibidos desde el navegador.

Sensitive Data Protection Advanced será la configuración base. El
`inspectTemplate` define los infoTypes predefinidos y personalizados; el
`deidentifyTemplate` define las transformaciones. Los tipos usados para
desidentificar deben estar presentes en el template de inspección.

GLiNER2 queda únicamente como integración futura opcional para defensa
adicional, operación offline o tipos de datos que SDP no cubra
satisfactoriamente. No está instalado, no se invoca y no es requisito del
camino crítico.

La sanitización requiere endpoint regional compatible con el template. Las
limitaciones de modalidad, región, tamaño o invocación deben tratarse como
fallo del guardrail, nunca como autorización implícita.

## Consequences

- `decision_state` debe ser compatible con la matriz antes de cruzar cada
  boundary.
- Un cambio de proveedor, región, modelo o retention setting requiere revisión
  de esta ADR.
- Las garantías del proveedor no autorizan enviar secretos ni eliminan el
  control de divulgación determinista del backend.

## Referencias

- [Vertex AI zero data retention](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/vertex-ai-zero-data-retention)
- [Model Armor data residency](https://docs.cloud.google.com/model-armor/data-residency)
- [Model Armor data handling](https://docs.cloud.google.com/model-armor/overview)
- [Model Armor templates](https://docs.cloud.google.com/model-armor/manage-templates)
- [Sensitive Data Protection custom infoTypes](https://docs.cloud.google.com/sensitive-data-protection/docs/creating-custom-infotypes)
