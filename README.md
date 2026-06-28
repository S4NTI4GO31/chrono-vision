# 🔭 CHRONO-VISION — El Dispositivo que Revela el Pasado

> Prototipo funcional para el Examen Final de Tecnologías Emergentes

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE WEB (A-Frame)                     │
│  index.html → A-Frame 3D Scene + HUD + Controls             │
└──────────────────┬──────────────────┬───────────────────────┘
                   │                  │
          Fetch API│                  │Firebase SDK
                   ▼                  ▼
┌──────────────────────┐   ┌──────────────────────────────────┐
│   CLAUDE API (ML)    │   │      FIREBASE                    │
│  claude-sonnet-4-6   │   │  ├── Realtime Database           │
│                      │   │  │   ├── locations/              │
│  INPUT:              │   │  │   ├── reconstructions/        │
│  • Foto base64       │   │  │   ├── history-events/         │
│  • Datos del dataset │   │  │   └── users/                  │
│  • Año objetivo      │   │  │                               │
│                      │   │  ├── Storage                     │
│  OUTPUT:             │   │  │   └── locations/photos/       │
│  • JSON A-Frame      │   │  │                               │
│    scene completa    │   │  └── Cloud Functions             │
└──────────────────────┘   │      ├── reconstructLocation     │
                           │      ├── getLocationData         │
                           │      └── onNewReconstruction     │
                           └──────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
chrono-vision/
├── public/
│   ├── index.html              ← App principal (A-Frame + HUD + ML)
│   └── js/
│       ├── firebase-config.js  ← Configuración Firebase
│       ├── firebase-service.js ← CRUD Firebase (locations, recs, users)
│       ├── ml-model.js         ← Motor ML (llama a Claude API)
│       └── aframe-renderer.js  ← Renderizador A-Frame desde JSON
├── functions/
│   ├── index.js               ← Cloud Functions (server-side ML)
│   └── package.json
├── dataset/
│   └── locations.js           ← Dataset de 4 ubicaciones históricas
├── firebase.json              ← Config hosting + functions
├── database.rules.json        ← Reglas seguridad Realtime DB
└── README.md
```

---

## 🧠 Modelo ML — Cómo Funciona

### Flujo del Modelo
```
Foto (base64) + locationId + año
        │
        ▼
  DATASET (locations.js)
  ─ Recupera: nombre, descripción actual, datos históricos del año
  ─ Incluye: arquitectura, atmósfera, vegetación, infraestructura
        │
        ▼
  CLAUDE API (claude-sonnet-4-6)
  ─ System prompt: "Eres el motor ML de Chrono-Vision..."
  ─ User prompt: datos históricos + foto (si hay)
  ─ Responde: JSON puro con la escena A-Frame completa
        │
        ▼
  JSON A-FRAME SCENE
  {
    sky: { color, fog, timeOfDay },
    ground: { color, texture, condition },
    buildings: [ { position, scale, color, windows, ... } ],
    vegetation: [ { type, position, health, ... } ],
    props: [ { type: "fountain|bench|lamppost|vehicle", ... } ],
    roads: [ { direction, width, markings, ... } ],
    atmosphere: { soundscape, population, era },
    metadata: { confidence, keyFeatures, ... }
  }
        │
        ▼
  aframe-renderer.js
  ─ Construye entidades A-Frame dinámicamente
  ─ Transición animada: ruinas → reconstrucción
  ─ Guarda en Firebase Realtime DB
```

### Dataset de Ubicaciones
El dataset (`dataset/locations.js`) contiene 4 ubicaciones con:
- **Datos actuales** (2077): descripción de ruinas, template base A-Frame
- **Datos históricos**: por año (1980, 1990, 2010, etc.)
  - Descripción, atmósfera, arquitectura
  - Vegetación, infraestructura, sonidos
  - Color de cielo de referencia, condición de edificios

---

## 🚀 Setup e Instalación

### 1. Prerrequisitos
```bash
npm install -g firebase-tools
```

### 2. Crear proyecto Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea proyecto: **chrono-vision-app**
3. Activa: **Realtime Database**, **Storage**, **Hosting**, **Functions**

### 3. Configurar credenciales
Edita `public/js/firebase-config.js` con tus credenciales de Firebase.

### 4. Configurar API Key de Anthropic (para Cloud Functions)
```bash
firebase functions:config:set anthropic.api_key="sk-ant-YOUR_KEY"
```

### 5. Instalar dependencias de Functions
```bash
cd functions && npm install
```

### 6. Deploy
```bash
firebase deploy
```

O solo hosting para pruebas rápidas:
```bash
firebase deploy --only hosting
```

### 7. Seed de base de datos (opcional)
Descomenta y llama `seedDatabase(LOCATIONS_DATASET)` en el código del cliente una sola vez.

---

## 🎮 Cómo Usar la App

1. **Explorar las Ruinas**: usa `WASD` + mouse para moverte por la ciudad en ruinas (2077)
2. **Seleccionar Ubicación**: elige una de las 4 zonas en el panel izquierdo
3. **Elegir Año**: usa el slider para seleccionar el año a reconstruir (1960–2070)
4. **Cargar Foto** (opcional): sube una foto del lugar real para análisis visual con ML
5. **Iniciar Escaneo**: pulsa "◉ INICIAR ESCANEO ML"
   - El modelo ML analiza foto + datos históricos
   - Claude genera el JSON de la escena A-Frame
   - Transición animada: ruinas → reconstrucción histórica
6. **VR**: pulsa "⊕ ENTRAR EN VR" con gafas compatibles
7. **Volver al Presente**: pulsa "← VOLVER AL PRESENTE"

---

## 📊 Rúbrica Técnica

| Criterio | Implementación | % |
|---|---|---|
| **Firebase en tiempo real** | Realtime DB para locations, reconstructions, users, history-events. Cloud Functions con triggers. | 20% |
| **Machine Learning** | Claude claude-sonnet-4-6 como motor ML: analiza fotos con visión computacional + datos del dataset → genera JSON A-Frame. Fallback con datos del dataset. | 20% |
| **Experiencia en A-Frame** | Escena 3D explorable con WASD+mouse. Ruinas dinámicas. Reconstrucción procedural desde JSON ML. Transiciones animadas. Crosshair HUD. VR ready. | 20% |
| **Procesamiento en la nube** | Cloud Functions: reconstructLocation (ML server-side), getLocationData, onNewReconstruction (trigger). | 15% |
| **Arquitectura y diseño** | Modular: ml-model.js, aframe-renderer.js, firebase-service.js, dataset/locations.js. Separación de responsabilidades. | 10% |
| **Innovación y creatividad** | HUD estilo cyberpunk. Escáner animado. Múltiples años. Análisis de foto con visión. Dataset expandible. Transición temporal. | 10% |
| **Presentación** | README completo. Código documentado. Demo funcional. | 5% |

---

## 🔧 Extensiones Posibles

- Añadir más ubicaciones al dataset (ciudades reales, zonas arqueológicas)
- Integrar `ml5.js` para clasificación de objetos en la foto
- Audio 3D posicional con Web Audio API (soundscape del año seleccionado)
- Multijugador con Firebase Realtime para exploración colaborativa
- Modo AR con WebXR para superponer el pasado sobre el presente real

---

## 🛠️ Tech Stack

| Tecnología | Uso |
|---|---|
| **A-Frame 1.4** | Escena VR/3D, movimiento, entidades |
| **Claude claude-sonnet-4-6** | Motor ML de reconstrucción histórica |
| **Firebase Realtime DB** | Datos en tiempo real |
| **Firebase Storage** | Fotos de ubicaciones |
| **Firebase Cloud Functions** | Procesamiento server-side |
| **Firebase Hosting** | Deploy público |
| **Vanilla JS (ES Modules)** | Sin frameworks extra = máxima compatibilidad VR |
#   c h r o n o - v i s i o n  
 