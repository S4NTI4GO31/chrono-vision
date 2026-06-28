// CHRONO-VISION — Historical Locations Dataset
// Each location has: current ruined state + historical reconstructed data
// The ML model (Claude) uses this + photo analysis to generate A-Frame JSON

const LOCATIONS_DATASET = [
  {
    id: "plaza_central",
    name: "Plaza Central",
    coordinates: { lat: 40.4168, lng: -3.7038 },
    currentState: "ruins",
    description: "La plaza principal de la ciudad, ahora en ruinas tras el colapso del 2077.",
    historicalData: {
      year2010: {
        description: "Plaza vibrante con fuente central, árboles frondosos y comercios activos.",
        atmosphere: "urbana, concurrida, luminosa",
        architecture: "neoclásica con elementos modernos",
        vegetation: "alta densidad, jardines cuidados",
        infrastructure: "pavimento intacto, señalización, iluminación LED",
        sounds: ["tráfico suave", "fuente de agua", "pájaros", "conversaciones"],
        skyColor: "#87CEEB",
        buildingCondition: "pristine",
        population: "alta densidad"
      },
      year1990: {
        description: "Plaza con arquitectura de los 90s, sin modernizaciones.",
        atmosphere: "tranquila, cotidiana",
        architecture: "posmoderna tardía",
        vegetation: "media densidad",
        infrastructure: "pavimento clásico, farolas antiguas",
        sounds: ["tráfico", "campanadas", "mercado"],
        skyColor: "#B0C4DE",
        buildingCondition: "good",
        population: "media densidad"
      }
    },
    aframeTemplate: {
      ground: { color: "#8B7355", texture: "stone_damaged" },
      buildings: [
        { position: "-15 5 -20", scale: "8 10 8", color: "#696969", damage: 0.8 },
        { position: "15 3 -18", scale: "6 6 6", color: "#708090", damage: 0.9 },
        { position: "0 4 -25", scale: "12 8 10", color: "#556B2F", damage: 0.7 }
      ],
      vegetation: { count: 3, health: 0.2 },
      sky: "#4A4A5A"
    }
  },
  {
    id: "barrio_norte",
    name: "Barrio Norte Industrial",
    coordinates: { lat: 40.4568, lng: -3.6838 },
    currentState: "ruins",
    description: "Zona industrial abandonada, estructuras metálicas oxidadas.",
    historicalData: {
      year2010: {
        description: "Barrio industrial activo con fábricas funcionando y obreros.",
        atmosphere: "industrial, funcional, activa",
        architecture: "industrial moderna, acero y vidrio",
        vegetation: "baja densidad, árboles de carretera",
        infrastructure: "vías de tren, grúas, almacenes",
        sounds: ["maquinaria", "trenes", "bocinas", "actividad fabril"],
        skyColor: "#708090",
        buildingCondition: "functional",
        population: "media-alta (trabajadores)"
      }
    },
    aframeTemplate: {
      ground: { color: "#5C5C5C", texture: "concrete_cracked" },
      buildings: [
        { position: "-20 8 -20", scale: "10 16 12", color: "#8B8680", damage: 0.85 },
        { position: "20 6 -22", scale: "14 12 10", color: "#696969", damage: 0.75 }
      ],
      vegetation: { count: 1, health: 0.1 },
      sky: "#3D3D4F"
    }
  },
  {
    id: "parque_memorial",
    name: "Parque Memorial",
    coordinates: { lat: 40.4068, lng: -3.7138 },
    currentState: "overgrown",
    description: "Parque ahora invadido por naturaleza salvaje, estatuas caídas.",
    historicalData: {
      year2010: {
        description: "Hermoso parque público con lago artificial, senderos y monumentos.",
        atmosphere: "serena, recreativa, verde",
        architecture: "paisajismo urbano contemporáneo",
        vegetation: "muy alta densidad, controlada",
        infrastructure: "senderos iluminados, bancos, fuentes",
        sounds: ["viento en árboles", "agua del lago", "niños jugando", "pájaros"],
        skyColor: "#98FB98",
        buildingCondition: "excellent",
        population: "media (recreativa)"
      }
    },
    aframeTemplate: {
      ground: { color: "#2D5A1B", texture: "overgrown" },
      buildings: [
        { position: "0 2 -15", scale: "4 4 4", color: "#808080", damage: 0.6 }
      ],
      vegetation: { count: 12, health: 0.8 },
      sky: "#2F4F2F"
    }
  },
  {
    id: "avenida_principal",
    name: "Gran Avenida",
    coordinates: { lat: 40.4268, lng: -3.6938 },
    currentState: "ruins",
    description: "La arteria principal de la ciudad, ahora bloqueada por escombros.",
    historicalData: {
      year2010: {
        description: "Avenida comercial con 8 carriles, tiendas de lujo y metro subterráneo.",
        atmosphere: "cosmopolita, dinámica, moderna",
        architecture: "internacional contemporánea",
        vegetation: "árboles ornamentales en línea",
        infrastructure: "6 carriles vehiculares, tranvía, metro, ciclovía",
        sounds: ["tráfico intenso", "metro", "publicidad", "multitudes"],
        skyColor: "#ADD8E6",
        buildingCondition: "pristine",
        population: "muy alta densidad"
      },
      year1980: {
        description: "Avenida con tráfico moderado, tiendas tradicionales, sin metro.",
        atmosphere: "activa, tradicional",
        architecture: "brutalista con toques clásicos",
        vegetation: "escasa",
        infrastructure: "4 carriles, sin ciclovía",
        sounds: ["tráfico", "comerciantes", "tranvía antiguo"],
        skyColor: "#C0C0C0",
        buildingCondition: "good",
        population: "alta densidad"
      }
    },
    aframeTemplate: {
      ground: { color: "#4A4A4A", texture: "asphalt_cracked" },
      buildings: [
        { position: "-25 10 -20", scale: "8 20 8", color: "#778899", damage: 0.7 },
        { position: "25 8 -20", scale: "8 16 8", color: "#696969", damage: 0.85 },
        { position: "-12 6 -30", scale: "6 12 8", color: "#808080", damage: 0.9 },
        { position: "12 7 -30", scale: "6 14 8", color: "#708090", damage: 0.75 }
      ],
      vegetation: { count: 4, health: 0.15 },
      sky: "#1A1A2E"
    }
  }
];

// Export for Node.js / Firebase Functions
if (typeof module !== 'undefined') {
  module.exports = { LOCATIONS_DATASET };
}
