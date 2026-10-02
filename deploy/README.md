# Deploy

Infraestructura y operación del monorepo.

```text
local/                  composición local de backend y Valkey
terraform/modules/      módulos reutilizables de infraestructura
terraform/environments/ entornos dev, staging y prod
```

Terraform debe aprovisionar Firebase/App Hosting, Cloud Run para backend,
Cloud Run Jobs para el pipeline, GCS, BigQuery, Firestore, Memorystore for
Valkey, IAM, red privada, secretos y observabilidad. Las imágenes de cada
servicio se definen junto a su código; esta carpeta solo las referencia.
