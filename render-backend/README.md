# Backend para Render

Este servicio expone una API con Firebase Admin para consultar y enlazar clientes por teléfono sin depender de las reglas de Firestore del frontend.

## Endpoints

- `GET /health`
- `POST /api/clientes/phone-status`
- `POST /api/clientes/link-by-phone`
- `POST /api/clientes/link-google`

## Configuración en Render

En Render crea un `Web Service` nuevo con estos valores:

- `Root Directory`: `render-backend`
- `Build Command`: `npm install`
- `Start Command`: `npm start`
- `Environment`: `Node`

## Variables de entorno

Configura estas variables en Render:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ALLOWED_ORIGINS`

`FIREBASE_PRIVATE_KEY` debe pegarse con `\n` literales, igual que en `.env.example`.

## Variable en el frontend

En el frontend configura:

- `VITE_RENDER_API_URL=https://tu-api.onrender.com`

Puedes usar `.env.local` en desarrollo y la variable de entorno del servicio estático en producción.

## Ejemplos de payload

### Validar si existe el teléfono

```json
{
  "phone": "+526531301155"
}
```

### Enlazar después de verificar el SMS

Envía un `Authorization: Bearer <firebase-id-token>` y este body:

```json
{
  "phone": "+526531301155",
  "nombre": "Daniel"
}
```

### Enlazar o crear cliente con Google

Envía un `Authorization: Bearer <firebase-id-token>` y este body:

```json
{
  "nombre": "Daniel",
  "correo": "daniel@correo.com"
}
```