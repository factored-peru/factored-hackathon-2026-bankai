# Terraform

Los módulos se dividen por capacidad (`backend`, `frontend`, `pipeline`,
`data`, `state`, `network`, `observability`) y los entornos por composición.
Cada entorno declara proyecto, región, nombres de recursos, cuentas de servicio
y referencias a secretos, nunca valores secretos.

Antes de aplicar cambios se ejecutan `terraform fmt -check` y
`terraform validate` desde el directorio del entorno.

`environments/dev` y `modules/runtime` declaran el primer contrato aplicable
para P0-37: backend Cloud Run, Job offline, cuentas de servicio y bucket KG.
Sus valores de imagen y nombre de bucket son obligatorios, no contienen
secretos y no habilitan APIs. Scheduler, Storage Transfer, Eventarc, Cloud
Tasks, ledger y refresh siguen deliberadamente fuera de este módulo hasta que
la implementación de ingesta ADR 0020 exista.
