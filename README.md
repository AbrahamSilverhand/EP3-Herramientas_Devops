# 🐶 Tienda de Alimentos para Perritos — EP3 DevOps

Aplicación web de 3 capas desplegada en **AWS ECS (Fargate)**, con pipeline CI/CD completo en GitHub Actions: pruebas automatizadas, análisis de calidad (SonarCloud), escaneo de vulnerabilidades (Amazon ECR), y despliegue automatizado con políticas de cumplimiento (Branch Protection).

![Pipeline](https://github.com/AbrahamSilverhand/EP3-DevOps/actions/workflows/ci-cd.yml/badge.svg)

---

## 🏗️ Arquitectura

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│   MySQL DB  │
│ HTML + Nginx│     │ Node.js 18  │     │   MySQL 8   │
│  Port 80    │     │ + Express   │     │ Port 3306   │
│             │     │  Port 3001  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      └───────────── 1 Task Definition de AWS ECS (Fargate) ─────┘
                         networkMode: awsvpc
```

Los 3 contenedores corren juntos en una única **Task Definition** de Amazon ECS (Fargate), comunicándose vía `localhost` gracias al modo de red `awsvpc`. Cada contenedor tiene su propia imagen en **Amazon ECR**, con escaneo automático de vulnerabilidades activado.

---

## 🚀 Pipeline CI/CD

Cada `push` a `main` (vía Pull Request aprobado — ver Branch Protection) ejecuta automáticamente:

```text
push a main
      │
      ▼
┌─────────────────┐
│ 🧪 Pruebas       │  Jest + cobertura → artifact
│ Unitarias        │
└────────┬─────────┘
         │ needs: test
         ▼
┌─────────────────┐
│ 🔍 SonarCloud    │  Análisis de calidad → Quality Gate
│ Analysis         │  verificado vía API REST con reintentos
└────────┬─────────┘  ❌ Si falla → PIPELINE SE DETIENE
         │ needs: sonar
         ▼
┌─────────────────┐
│ 🐳 Build & Push  │  Build 3 imágenes → push a Amazon ECR
│ a ECR            │  → espera resultado del escaneo de vulnerabilidades
└────────┬─────────┘  ❌ Si hay CVE CRITICAL → PIPELINE SE DETIENE
         │ needs: build, solo en main
         ▼
┌─────────────────┐
│ 🚀 Deploy a ECS  │  Actualiza Task Definition → ECS Service
│                  │  → espera estabilidad (services-stable)
└──────────────────┘  ❌ Si no estabiliza → PIPELINE SE DETIENE
```

**Tiempo de ejecución completo:** ~5-7 minutos.

---

## 🛡️ Políticas de cumplimiento

| Mecanismo | Qué hace |
|---|---|
| **SonarCloud Quality Gate** | Bloquea el pipeline si el código nuevo no cumple cobertura, o tiene bugs/vulnerabilidades |
| **Escaneo de ECR** | Bloquea el pipeline si se detecta al menos 1 vulnerabilidad `CRITICAL` en las imágenes Docker |
| **Branch Protection (`main`)** | Exige Pull Request + 1 aprobación + los 3 checks del pipeline en verde antes de permitir merge |

📌 **Caso real documentado:** el 2 de julio de 2026, el pipeline detectó 2 vulnerabilidades `CRITICAL` (CVSS 9.8) en `openssl` dentro de la imagen base `node:18-alpine`, y detuvo el despliegue automáticamente. Ver detalle completo en `Documentacion_EP3_DevOps.docx` / `Informe_Evidencias_EP3_v2.docx`.

---

## 📊 Monitoreo y observabilidad (AWS CloudWatch)

- **Logs centralizados**: `/ecs/tienda-perritos` (streams separados por contenedor)
- **Container Insights**: métricas de CPU, memoria y disponibilidad (`RunningTaskCount` vs `DesiredTaskCount`)
- **Alarmas**: CPU > 70% y disponibilidad caída, notificando vía SNS/correo
- **Dashboard**: `tienda-perritos-dashboard` — CPU, memoria, disponibilidad y errores en un solo panel

---

## 📁 Estructura del repositorio

```text
.
├── backend/              # API Node.js + Express + MySQL2
│   ├── Dockerfile
│   ├── server.js
│   └── tests/
├── frontend/             # HTML/JS estático + Nginx
│   └── Dockerfile
├── db/                   # Imagen custom de MySQL con datos semilla
│   ├── Dockerfile
│   └── init.sql
├── .github/workflows/
│   └── ci-cd.yml         # Pipeline completo
├── task-definition.json  # Definición de la tarea de ECS
├── sonar-project.properties
└── Documentacion_EP3_DevOps.docx   # Documentación técnica completa
```

---

## 🧰 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML/JS + Nginx |
| Backend | Node.js 18, Express, mysql2 |
| Base de datos | MySQL 8 |
| Contenerización | Docker |
| Orquestación | AWS ECS (Fargate) |
| Registro de imágenes | Amazon ECR (con escaneo de vulnerabilidades) |
| CI/CD | GitHub Actions |
| Calidad de código | SonarCloud |
| Observabilidad | AWS CloudWatch (Logs, Container Insights, Alarms, Dashboards) |
| Notificaciones | Amazon SNS |

---

## ⚠️ Limitaciones conocidas (entorno AWS Academy)

- Las credenciales de AWS Academy expiran cada 3-4 horas y deben refrescarse manualmente (local + GitHub Secrets) — en producción se resolvería con autenticación OIDC.
- Se reutiliza el rol `LabRole` (no se pueden crear roles IAM nuevos en Academy).
- La base de datos corre dentro de la misma Task Definition en vez de Amazon RDS, por restricciones de tiempo/cupos de la cuenta educativa.

Ver el documento `Documentacion_EP3_DevOps.docx` para el detalle completo de decisiones arquitectónicas, incidentes resueltos, y evidencia de cada requisito de la evaluación.

---

## 🤖 Uso de Inteligencia Artificial

Durante el desarrollo de este proyecto se utilizó **Claude (Anthropic)** como herramienta de apoyo para:
- Generación de estructura base del pipeline CI/CD
- Configuración de SonarCloud con GitHub Actions
- Generación de tests unitarios con Jest

Todos los contenidos fueron revisados, validados y adaptados por el equipo según los requerimientos del proyecto.

Referencia: https://bibliotecas.duoc.cl/ia

