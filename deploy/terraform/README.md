# Terraform

Los módulos se dividen por capacidad (`backend`, `frontend`, `pipeline`,
`data`, `state`, `network`, `observability`) y los entornos por composición.
Cada entorno declara proyecto, región, nombres de recursos, cuentas de servicio
y referencias a secretos, nunca valores secretos.

Antes de aplicar cambios se ejecutan `terraform fmt -check` y
`terraform validate` desde el directorio del entorno.
