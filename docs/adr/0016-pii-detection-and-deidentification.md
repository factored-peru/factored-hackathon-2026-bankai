# ADR 0016: Detección y desidentificación de PII

## Status

Accepted

## Context

El agente procesa texto de usuarios, resultados de herramientas y respuestas
generadas. La autorización para divulgar un campo y la detección técnica de
datos sensibles son problemas diferentes. Model Armor integra Sensitive Data
Protection y puede aplicar templates de inspección y desidentificación.

Un detector basado en modelo propio agrega complejidad y no forma parte de esta
implementación. Debe existir un firewall determinista del backend antes de
cualquier boundary externo. La detección avanzada basada en modelo queda como
extensión futura para casos donde los datos no puedan cruzar el boundary o SDP
no cubra un identificador del banco.

## Decision

Usar un firewall determinista mínimo del backend para impedir el cruce
accidental de secretos y PII cruda, y Google Model Armor + Sensitive Data
Protection Advanced como detector y redactor externo principal.

```text
inspectTemplate
  → infoTypes predefinidos y custom

deidentifyTemplate
  → redact, tokenize o transform
```

El template cubrirá como mínimo PII, información financiera, credenciales y
formatos internos del banco mediante custom infoTypes.

### Orden de responsabilidades

```text
DisclosurePolicy determinista del backend
  → decide qué puede ver el usuario

Sensitive Data Protection Advanced
  → detecta y transforma tipos sensibles

Model Armor security filters
  → prompt injection, jailbreak, URLs maliciosas y seguridad de contenido
```

SDP no autoriza negocio. Un dato detectado puede ser permitido parcialmente por
la política determinista del backend, como los últimos cuatro dígitos de una
cuenta.

### Reglas de transformación

- Secretos y credenciales: eliminar siempre.
- Documentos de identidad: eliminar por defecto.
- Cuentas y tarjetas: tokenizar o enmascarar.
- Identificadores internos: transformar con surrogate controlado.
- Datos necesarios para tool calls: mantenerlos en `PrivateDataBroker` del
  backend.
- Resultado permitido por la sesión: enviar solo la proyección mínima.

### Detector basado en modelo propio (no habilitado)

El firewall determinista del backend forma parte del camino crítico. GLiNER2 u
otro detector basado en modelo propio no se instala ni se invoca en el flujo
actual. Solo podría incorporarse detrás de un puerto explícito como:

- detector adicional cuando la política exige cobertura superior;
- fallback cuando Model Armor está indisponible;
- detector offline;
- defensa adicional;
- detector de tipos propios no cubiertos por SDP.

Si la organización prohíbe enviar PII cruda a un proveedor externo, el firewall
determinista del backend sigue siendo obligatorio y debe ejecutarse antes de
Model Armor. Eso no habilita por sí mismo ningún modelo de IA local.

### Streaming y límites

Cuando se requiere de-identification, usar modo buffered. El streaming no puede
considerarse cubierto para redacción SDP. Solo se permite streaming de contenido
previamente clasificado como no sensible.

Los endpoints deben ser regionales y coincidir con la ubicación de los
templates. Limitaciones de región, modalidad, tamaño o invocación producen
`FAILURE`; el flujo sensible falla cerrado.

## Consequences

- La arquitectura mantiene un solo detector principal para la hackathon.
- Se pueden agregar tipos bancarios sin cambiar el código del agente.
- La política de divulgación sigue siendo determinista y se ejecuta en el
  backend.
- Model Armor agrega latencia y dependencia regional.
- Un cambio de infoTypes o transformaciones requiere versionar templates y
  repetir la suite de evaluación.

## Criterios de aceptación

- Detectar identificadores bancarios custom.
- Redactar secretos y credenciales.
- Mostrar solo campos explícitamente autorizados.
- No liberar contenido ante `FAILURE` o sanitización incompleta.
- No enviar session state privado a Model Armor.
- Verificar que streaming sensible no se habilita.
- Registrar verdict y template version sin guardar valores detectados.

## Referencias

- [Model Armor overview](https://docs.cloud.google.com/model-armor/overview)
- [Create and manage Model Armor templates](https://docs.cloud.google.com/model-armor/manage-templates)
- [Sanitize prompts and responses](https://docs.cloud.google.com/model-armor/sanitize-prompts-responses)
- [Sensitive Data Protection custom infoTypes](https://docs.cloud.google.com/sensitive-data-protection/docs/creating-custom-infotypes)
