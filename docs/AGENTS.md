# AGENTS

- Lee `README.md` y el índice `adr/README.md` antes de modificar documentación
  transversal. Los ADR aceptados son la única fuente de decisión normativa.
- Usa la sección **Guía de invocación** de la capa propietaria para documentar
  comandos; no presentes un comando futuro como disponible ni copies secretos,
  PII o valores operativos a Markdown.
- `planning/to-adopt/` conserva trazabilidad y no se reescribe para sustituir
  un ADR. Todo cambio arquitectónico se expresa primero en el ADR pertinente y
  luego se propaga a README, runbooks y código propietario.
- Esta carpeta no despliega, ejecuta jobs cloud ni aplica Terraform. Enlaces a
  fuentes externas deben ser primarios u oficiales cuando definan una
  invocación técnica.
