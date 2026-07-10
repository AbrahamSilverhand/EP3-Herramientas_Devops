# 🐶 Tienda de Alimentos para Perritos — DevOps con Amazon EKS

Aplicación web de 3 capas (Frontend · Backend · MySQL) desplegada en **Amazon EKS (Kubernetes)**, con pipeline CI/CD completo en GitHub Actions: pruebas automatizadas, build y publicación de imágenes en Amazon ECR, y despliegue automático mediante `kubectl`.

![Pipeline](https://github.com/AbrahamSilverhand/EP3-Herramientas_Devops/actions/workflows/ci-cd.yml/badge.svg)

> 📌 Este proyecto migró desde una arquitectura original en **Amazon ECS/Fargate** hacia **Amazon EKS**, para aplicar prácticas de orquestación de contenedores con Kubernetes: auto-escalamiento (HPA), auto-recuperación (ReplicaSet + Probes) y despliegue continuo declarativo (manifiestos YAML).

---

## 🏗️ Arquitectura

```text
                              INTERNET
                                  │
                                  ▼
                          Internet Gateway
                                  │
        ┌─────────────────────────────────────────────┐
        │           VPC 10.0.0.0/16                     │
        │  ┌───────────────────────────────────────┐   │
        │  │  Subredes Públicas (2 AZ)               │   │
        │  │  NAT Gateway · Load Balancer             │   │
        │  └───────────────────────────────────────┘   │
        │  ┌───────────────────────────────────────┐   │
        │  │  Subredes Privadas (2 AZ)                │   │
        │  │  ┌─────────────────────────────────┐  │   │
        │  │  │  Amazon EKS — Namespace: tienda    │  │   │
        │  │  │                                    │  │   │
        │  │  │  Frontend ──/api/──▶ Backend ──▶ MySQL │  │   │
        │  │  │  (Nginx)   proxy    (Node.js)    (MySQL 8)│  │   │
        │  │  │  LoadBalancer   ClusterIP      ClusterIP  │  │   │
        │  │  └─────────────────────────────────┘  │   │
        │  └───────────────────────────────────────┘   │
        └─────────────────────────────────────────────┘
                                  │
                    Amazon ECR · Amazon CloudWatch
```

Los 3 componentes corren como **Pods independientes** en el clúster EKS. El Frontend (Nginx) es el único expuesto públicamente vía un Service `LoadBalancer`; hace de proxy inverso hacia el Backend (`/api/` → `backend:3001`), que a su vez se conecta a MySQL (`mysql:3306`) — ambos como Services `ClusterIP`, inaccesibles desde fuera del clúster. La resolución de nombres es vía DNS interno de Kubernetes (CoreDNS).

---

## 🚀 Pipeline CI/CD

Cada `push` a `main` ejecuta automáticamente:

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
│ 🐳 Build & Push  │  Build 3 imágenes (frontend/backend/db)
│ a Amazon ECR     │  → tag = SHA del commit → push a ECR
└────────┬─────────┘
         │ needs: build, solo en main
         ▼
┌─────────────────┐
│ 🚀 Deploy a EKS  │  kubectl apply (manifiestos k8s/)
│                  │  → kubectl set image (nuevo SHA)
│                  │  → kubectl rollout status (confirma éxito)
└──────────────────┘  ❌ Si el rollout no se estabiliza → PIPELINE SE DETIENE
```

**Autenticación:** las credenciales de AWS (temporales, de AWS Academy) y los parámetros del clúster se gestionan como **GitHub Secrets** encriptados — nunca expuestos en el código.

---

## ☸️ Recursos de Kubernetes (`k8s/`)

| Archivo | Recurso | Función |
|---|---|---|
| `namespace.yaml` | Namespace `tienda` | Aísla todos los recursos del proyecto |
| `mysql-secret.yaml.example` | Secret (plantilla) | Estructura de credenciales de BD — el archivo real (`mysql-secret.yaml`) está excluido del repo vía `.gitignore` |
| `mysql-deployment.yaml` / `mysql-service.yaml` | Deployment + Service ClusterIP | Base de datos MySQL 8 |
| `backend-deployment.yaml` / `backend-service.yaml` | Deployment + Service ClusterIP | API REST (Node.js/Express) |
| `frontend-deployment.yaml` / `frontend-service.yaml` | Deployment + Service LoadBalancer | Interfaz web (Nginx + proxy) |
| `backend-hpa.yaml` / `frontend-hpa.yaml` | HorizontalPodAutoscaler | Autoescalado (min:1, max:3, CPU objetivo 70%) |

Para desplegar manualmente (fuera del pipeline):
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mysql-secret.yaml   # usar tu propia copia, no versionada
kubectl apply -f k8s/
```

---

## 🔒 Seguridad y buenas prácticas aplicadas

- **Imágenes base minimalistas**: `nginx:alpine` y `node:18-alpine`, reduciendo la superficie de ataque.
- **Dependencias de producción only**: el backend usa `npm ci --omit=dev`.
- **Exposición mínima de puertos**: solo el Frontend es público (Service `LoadBalancer`); Backend y MySQL son `ClusterIP`.
- **Secretos protegidos**: credenciales de BD en un Kubernetes `Secret` (Base64), excluido del control de versiones; plantilla pública (`.example`) para referencia.
- **Mínimo privilegio en IAM**: roles separados para el Control Plane (Cluster Role) y los nodos (Node Role) de EKS.
- **Probes de salud**: Liveness y Readiness configuradas en los 3 componentes (`/api/health` en el backend).

---

## 📊 Observabilidad

- **Logs del pipeline**: disponibles en la pestaña *Actions* de GitHub (build, test, deploy).
- **Logs del clúster**: Control Plane logging habilitado hacia Amazon CloudWatch (`/aws/eks/tienda-perritos-eks/cluster`).
- **Métricas**: namespace `AWS/EKS` en CloudWatch (requests al API Server, estado del scheduler).
- **Alarma**: `tienda-perritos-nodo-cpu-alta` — CPU del nodo > 80% durante 10 minutos.

---

## ⚙️ Escalabilidad y resiliencia

- **Horizontal Pod Autoscaler**: min 1 / max 3 réplicas, umbral de CPU 70%, validado con carga real (escalamiento 1→3 en menos de 1 minuto).
- **Auto Healing**: los ReplicaSets recrean automáticamente cualquier Pod eliminado o caído.
- **Node Group en Auto Scaling**: instancias EC2 Spot (t3.large), reemplazadas automáticamente ante interrupciones (comportamiento validado en producción durante el desarrollo).
- **RollingUpdate sin downtime**: las actualizaciones de imagen no interrumpen el servicio.

---

## 📁 Estructura del repositorio

```text
.
├── backend/                # API Node.js + Express + MySQL2
│   ├── Dockerfile
│   ├── server.js
│   └── tests/
├── frontend/                # HTML/JS estático + Nginx (proxy /api/)
│   ├── Dockerfile
│   ├── nginx.conf
│   └── app.js
├── db/                      # Imagen custom de MySQL con datos semilla
│   ├── Dockerfile
│   └── init.sql
├── k8s/                      # Manifiestos de Kubernetes (ver tabla arriba)
├── .github/workflows/
│   └── ci-cd.yml             # Pipeline CI/CD (test → build/push → deploy)
├── docker-compose.yml         # Entorno de desarrollo local
└── .gitignore                 # Excluye k8s/mysql-secret.yaml (credenciales reales)
```

---

## 🖥️ Desarrollo local

```bash
docker-compose up
```

Levanta los 3 servicios en una red local, accesible en `http://localhost`.

---

## 🌐 Despliegue en la nube

La aplicación corre en un clúster Amazon EKS (`tienda-perritos-eks`, región `us-east-1`), accesible públicamente a través del Service `LoadBalancer` del Frontend. La URL pública se obtiene con:

```bash
kubectl get svc frontend -n tienda
```
