# Runtime module

Declara el backend Cloud Run, el Cloud Run Job offline, sus service accounts y
el bucket privado/versionado de artefactos KG. No habilita APIs, no crea
Scheduler/Eventarc/Cloud Tasks y no guarda secretos: esos elementos dependen
del worker de ingesta de ADR 0020 y de referencias a Secret Manager.

El Job no se programa directamente. El flujo final lo invocará sólo desde el
refresh serializado que sigue a una carga raw confirmada; configurar un
Scheduler que ejecute KDD cada quince minutos violaría ADR 0020.
