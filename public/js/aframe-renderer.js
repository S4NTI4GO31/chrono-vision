// aframe-renderer.js — Builds A-Frame scene from ML-generated JSON
// Handles: initial ruins scene + historical reconstruction transition

export class ChronoVisionRenderer {
  constructor(sceneEl) {
    this.scene = sceneEl;
    this.currentObjects = [];
    this.isTransitioning = false;
  }

  // ─────────────────────────────────────────────
  // RUINS SCENE (year 2077 - current state)
  // ─────────────────────────────────────────────
  buildRuinsScene() {
    this.clearScene();
    const ruinsHTML = `
      <!-- SKY: Post-apocalyptic -->
      <a-sky id="cv-sky" color="#1A1A2E" fog="true"></a-sky>
      
      <!-- GROUND: Cracked earth -->
      <a-plane id="cv-ground"
        position="0 0 0" rotation="-90 0 0"
        width="200" height="200"
        color="#3D2B1F"
        material="roughness:0.9; metalness:0.1">
      </a-plane>
      
      <!-- AMBIENT LIGHT: Dark -->
      <a-light type="ambient" color="#4A4A5A" intensity="0.4"></a-light>
      <a-light type="directional" color="#8B7355" intensity="0.5"
        position="-1 2 0.5"></a-light>
      
      <!-- RUINS: Broken buildings -->
      <a-entity id="ruins-group">
        <!-- Left building ruin -->
        <a-box position="-15 4 -20" scale="8 8 8" color="#555555"
          material="roughness:1; metalness:0">
        </a-box>
        <a-box position="-13 6 -18" scale="3 4 3" color="#444444"
          rotation="5 0 -8">
        </a-box>
        
        <!-- Right building ruin -->
        <a-box position="15 3 -18" scale="10 6 8" color="#4A4A4A"
          material="roughness:1">
        </a-box>
        <a-box position="18 5 -16" scale="4 6 4" color="#3A3A3A"
          rotation="-3 5 12">
        </a-box>
        
        <!-- Background ruins -->
        <a-box position="0 5 -30" scale="20 10 8" color="#5A5050"
          material="roughness:1">
        </a-box>
        <a-box position="-8 7 -28" scale="5 10 5" color="#4A4040"
          rotation="0 0 -5">
        </a-box>
        
        <!-- Debris on ground -->
        <a-box position="5 0.3 -8" scale="3 0.5 2" color="#666" rotation="0 25 0"></a-box>
        <a-box position="-7 0.2 -12" scale="2 0.4 1.5" color="#555" rotation="0 -15 0"></a-box>
        <a-box position="10 0.25 -5" scale="1.5 0.4 1" color="#444" rotation="0 40 0"></a-box>
        <a-box position="-4 0.2 -7" scale="2.5 0.5 1.8" color="#606060" rotation="0 10 0"></a-box>
        
        <!-- Dead trees -->
        <a-entity position="-10 0 -10">
          <a-cylinder height="4" radius="0.2" color="#3D2B1F"></a-cylinder>
          <a-sphere position="0 3 0" radius="1.5" color="#2D2D1A" opacity="0.6"></a-sphere>
        </a-entity>
        <a-entity position="8 0 -14">
          <a-cylinder height="3" radius="0.15" color="#3D2B1F" rotation="0 0 -15"></a-cylinder>
        </a-entity>
      </a-entity>
      
      <!-- PARTICLES: Dust & ash -->
      <a-entity id="dust-particles"
        particle-system="preset:dust; color:#8B7355,#555555; particleCount:200;
          size:0.05; maxAge:5; velocityValue:0.1 0.2 0.1">
      </a-entity>
      
      <!-- CHRONO-VISION DEVICE: Targeting reticle -->
      <a-entity id="cv-device" camera look-controls wasd-controls>
        <a-entity cursor="fuse:false; rayOrigin:mouse"
          raycaster="objects:.scannable">
        </a-entity>
        <!-- HUD -->
        <a-entity id="hud" position="0 0 -2">
          <a-ring color="#00FF88" radius-inner="0.02" radius-outer="0.04"
            material="shader:flat; opacity:0.8">
          </a-ring>
        </a-entity>
      </a-entity>
      
      <!-- SCANNABLE MARKERS on ruins -->
      <a-entity class="scannable" id="scan-zone-1"
        position="-15 4 -20"
        geometry="primitive:sphere; radius:0.5"
        material="shader:flat; color:#00FF88; opacity:0.3; wireframe:true"
        animation="property:scale; to:1.2 1.2 1.2; dur:1000; loop:true; dir:alternate"
        data-location-id="plaza_central">
      </a-entity>
      <a-entity class="scannable" id="scan-zone-2"
        position="15 3 -18"
        geometry="primitive:sphere; radius:0.5"
        material="shader:flat; color:#00FF88; opacity:0.3; wireframe:true"
        animation="property:scale; to:1.2 1.2 1.2; dur:1200; loop:true; dir:alternate"
        data-location-id="barrio_norte">
      </a-entity>
    `;

    this.injectHTML(ruinsHTML);
  }

  // ─────────────────────────────────────────────
  // HISTORICAL SCENE from ML JSON
  // ─────────────────────────────────────────────
  buildHistoricalScene(mlData) {
    if (!mlData || !mlData.scene) {
      console.error("Invalid ML data");
      return;
    }

    const { scene } = mlData;
    this.clearHistoricalObjects();

    // Sky
    const skyEl = document.getElementById("cv-sky");
    if (skyEl) {
      this.animateAttribute(skyEl, "color", scene.sky?.color || "#87CEEB");
    }

    // Ground
    const groundEl = document.getElementById("cv-ground");
    if (groundEl) {
      this.animateAttribute(groundEl, "color", scene.ground?.color || "#5C7A3E");
    }

    // Lighting
    this.updateLighting(scene.ambientLight, scene.directionalLight);

    // Build historical elements container
    const historicalGroup = document.createElement("a-entity");
    historicalGroup.setAttribute("id", "historical-group");
    historicalGroup.setAttribute("visible", "false");
    this.scene.appendChild(historicalGroup);
    this.currentObjects.push(historicalGroup);

    // Buildings
    (scene.buildings || []).forEach(b => {
      historicalGroup.appendChild(this.createBuilding(b));
    });

    // Vegetation
    (scene.vegetation || []).forEach(v => {
      historicalGroup.appendChild(this.createVegetation(v));
    });

    // Props
    (scene.props || []).forEach(p => {
      historicalGroup.appendChild(this.createProp(p));
    });

    // Roads
    (scene.roads || []).forEach(r => {
      historicalGroup.appendChild(this.createRoad(r));
    });

    return historicalGroup;
  }

  // ─────────────────────────────────────────────
  // TRANSITION: Ruins → Historical
  // ─────────────────────────────────────────────
  async transitionToHistorical(mlData, duration = 3000) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Build historical scene (hidden)
    const historicalGroup = this.buildHistoricalScene(mlData);
    const ruinsGroup = document.getElementById("ruins-group");

    // Phase 1: White flash effect
    await this.flashEffect("#FFFFFF", 500);

    // Phase 2: Fade out ruins
    if (ruinsGroup) {
      ruinsGroup.setAttribute("animation", `property:opacity; to:0; dur:${duration/2}`);
    }

    await this.delay(duration / 2);

    // Phase 3: Show historical
    if (historicalGroup) {
      historicalGroup.setAttribute("visible", "true");
      historicalGroup.setAttribute("animation", `property:opacity; from:0; to:1; dur:${duration/2}`);
    }

    // Phase 4: Update sky + ground with animation
    const { scene } = mlData;
    const skyEl = document.getElementById("cv-sky");
    const groundEl = document.getElementById("cv-ground");

    if (skyEl) skyEl.setAttribute("color", scene.sky?.color || "#87CEEB");
    if (groundEl) groundEl.setAttribute("color", scene.ground?.color || "#5C7A3E");

    await this.delay(duration / 2);

    this.isTransitioning = false;
    return true;
  }

  // ─────────────────────────────────────────────
  // TRANSITION: Historical → Ruins
  // ─────────────────────────────────────────────
  async transitionToRuins(duration = 2000) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    await this.flashEffect("#FF4444", 300);

    const historicalGroup = document.getElementById("historical-group");
    const ruinsGroup = document.getElementById("ruins-group");

    if (historicalGroup) {
      historicalGroup.setAttribute("animation", `property:opacity; to:0; dur:${duration/2}`);
    }

    await this.delay(duration / 2);

    this.clearHistoricalObjects();

    if (ruinsGroup) {
      ruinsGroup.setAttribute("visible", "true");
      ruinsGroup.setAttribute("animation", `property:opacity; from:0; to:1; dur:${duration/2}`);
    }

    const skyEl = document.getElementById("cv-sky");
    const groundEl = document.getElementById("cv-ground");
    if (skyEl) skyEl.setAttribute("color", "#1A1A2E");
    if (groundEl) groundEl.setAttribute("color", "#3D2B1F");

    await this.delay(duration / 2);
    this.isTransitioning = false;
  }

  // ─────────────────────────────────────────────
  // ELEMENT BUILDERS
  // ─────────────────────────────────────────────
  createBuilding(b) {
    const el = document.createElement("a-entity");

    // Main structure
    const box = document.createElement("a-box");
    box.setAttribute("position", `${b.position.x} ${b.position.y} ${b.position.z}`);
    box.setAttribute("scale", `${b.scale.x} ${b.scale.y} ${b.scale.z}`);
    box.setAttribute("color", b.color || "#D4C5A9");
    box.setAttribute("material", "roughness:0.7; metalness:0.1");

    el.appendChild(box);

    // Windows (grid pattern using detail boxes)
    if (b.windowColor) {
      const rows = Math.floor(b.scale.y / 1.5);
      const cols = Math.floor(b.scale.x / 1.5);
      for (let r = 0; r < Math.min(rows, 4); r++) {
        for (let c = 0; c < Math.min(cols, 3); c++) {
          const win = document.createElement("a-box");
          win.setAttribute("position", `
            ${b.position.x - b.scale.x / 2 + 1 + c * 1.5}
            ${b.position.y - b.scale.y / 2 + 1.5 + r * 1.8}
            ${b.position.z + b.scale.z / 2 + 0.05}
          `);
          win.setAttribute("scale", "0.6 0.8 0.05");
          win.setAttribute("color", b.windowColor);
          win.setAttribute("material", "shader:flat; opacity:0.8");
          el.appendChild(win);
        }
      }
    }

    // Rooftop details
    if (b.hasRoof) {
      const roof = document.createElement("a-box");
      roof.setAttribute("position",
        `${b.position.x} ${b.position.y + b.scale.y / 2 + 0.3} ${b.position.z}`);
      roof.setAttribute("scale", `${b.scale.x + 0.5} 0.6 ${b.scale.z + 0.5}`);
      roof.setAttribute("color", this.darkenColor(b.color || "#D4C5A9", 0.8));
      el.appendChild(roof);
    }

    return el;
  }

  createVegetation(v) {
    const el = document.createElement("a-entity");
    const { x, y, z } = v.position;

    if (v.type === "tree") {
      // Trunk
      const trunk = document.createElement("a-cylinder");
      trunk.setAttribute("position", `${x} ${y + v.scale.y / 2} ${z}`);
      trunk.setAttribute("height", v.scale.y);
      trunk.setAttribute("radius", "0.2");
      trunk.setAttribute("color", "#5C3D1E");
      el.appendChild(trunk);

      // Canopy
      const canopy = document.createElement("a-sphere");
      canopy.setAttribute("position", `${x} ${y + v.scale.y + 1} ${z}`);
      canopy.setAttribute("radius", `${v.scale.x * 0.8}`);
      canopy.setAttribute("color", v.color || "#228B22");
      canopy.setAttribute("material", `opacity:${0.7 + v.health * 0.3}`);
      el.appendChild(canopy);
    } else if (v.type === "bush") {
      const bush = document.createElement("a-sphere");
      bush.setAttribute("position", `${x} ${y + 0.5} ${z}`);
      bush.setAttribute("scale", `${v.scale.x} ${v.scale.y * 0.5} ${v.scale.z}`);
      bush.setAttribute("color", v.color || "#2E7D32");
      el.appendChild(bush);
    }

    return el;
  }

  createProp(p) {
    const el = document.createElement("a-entity");
    const { x, y, z } = p.position;
    const { x: sx, y: sy, z: sz } = p.scale;

    switch (p.type) {
      case "fountain":
        // Base
        const fBase = document.createElement("a-cylinder");
        fBase.setAttribute("position", `${x} ${y} ${z}`);
        fBase.setAttribute("height", sy * 0.3);
        fBase.setAttribute("radius", sx);
        fBase.setAttribute("color", p.color || "#C0C0C0");
        el.appendChild(fBase);
        // Water
        if (p.active) {
          const fWater = document.createElement("a-cylinder");
          fWater.setAttribute("position", `${x} ${y + 0.2} ${z}`);
          fWater.setAttribute("height", "0.1");
          fWater.setAttribute("radius", `${sx * 0.8}`);
          fWater.setAttribute("color", "#4A90D9");
          fWater.setAttribute("material", "opacity:0.7; shader:flat");
          el.appendChild(fWater);
          // Spout
          const spout = document.createElement("a-cylinder");
          spout.setAttribute("position", `${x} ${y + 0.8} ${z}`);
          spout.setAttribute("height", "1");
          spout.setAttribute("radius", "0.1");
          spout.setAttribute("color", p.color || "#C0C0C0");
          el.appendChild(spout);
        }
        break;

      case "lamppost":
        const pole = document.createElement("a-cylinder");
        pole.setAttribute("position", `${x} ${y + sy / 2} ${z}`);
        pole.setAttribute("height", sy);
        pole.setAttribute("radius", "0.08");
        pole.setAttribute("color", p.color || "#444");
        el.appendChild(pole);
        const lamp = document.createElement("a-sphere");
        lamp.setAttribute("position", `${x} ${y + sy} ${z}`);
        lamp.setAttribute("radius", "0.25");
        lamp.setAttribute("color", p.active ? "#FFFACD" : "#888");
        lamp.setAttribute("material", p.active ? "shader:flat; emissive:#FFFACD; emissiveIntensity:0.5" : "");
        el.appendChild(lamp);
        break;

      case "bench":
        const seat = document.createElement("a-box");
        seat.setAttribute("position", `${x} ${y + 0.4} ${z}`);
        seat.setAttribute("scale", `${sx * 2} 0.1 0.5`);
        seat.setAttribute("color", "#8B6914");
        el.appendChild(seat);
        break;

      case "vehicle":
        const car = document.createElement("a-box");
        car.setAttribute("position", `${x} ${y + 0.5} ${z}`);
        car.setAttribute("scale", `${sx * 2} 0.8 1`);
        car.setAttribute("color", p.color || "#CC3333");
        el.appendChild(car);
        const roof = document.createElement("a-box");
        roof.setAttribute("position", `${x} ${y + 1.1} ${z}`);
        roof.setAttribute("scale", `${sx * 1.2} 0.6 0.8`);
        roof.setAttribute("color", this.darkenColor(p.color || "#CC3333", 0.9));
        el.appendChild(roof);
        break;

      default:
        const generic = document.createElement("a-box");
        generic.setAttribute("position", `${x} ${y + sy / 2} ${z}`);
        generic.setAttribute("scale", `${sx} ${sy} ${sz}`);
        generic.setAttribute("color", p.color || "#808080");
        el.appendChild(generic);
    }

    return el;
  }

  createRoad(r) {
    const road = document.createElement("a-plane");
    road.setAttribute("position", `${r.position.x} ${r.position.y} ${r.position.z}`);
    road.setAttribute("rotation", "-90 0 0");

    if (r.direction === "horizontal") {
      road.setAttribute("width", r.length || 100);
      road.setAttribute("height", r.width || 8);
    } else {
      road.setAttribute("width", r.width || 8);
      road.setAttribute("height", r.length || 100);
    }

    road.setAttribute("color", r.color || "#333333");
    road.setAttribute("material", "roughness:0.9");

    // Lane markings
    if (r.hasMarkings) {
      const parent = document.createElement("a-entity");
      parent.appendChild(road);
      const marking = document.createElement("a-plane");
      marking.setAttribute("position",
        `${r.position.x} ${r.position.y + 0.01} ${r.position.z}`);
      marking.setAttribute("rotation", "-90 0 0");
      marking.setAttribute("width", r.direction === "horizontal" ? r.length || 100 : 0.3);
      marking.setAttribute("height", r.direction === "horizontal" ? 0.3 : r.length || 100);
      marking.setAttribute("color", "#FFFF00");
      marking.setAttribute("material", "shader:flat; opacity:0.8");
      parent.appendChild(marking);
      return parent;
    }

    return road;
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────
  updateLighting(ambient, directional) {
    const lights = this.scene.querySelectorAll("a-light");
    lights.forEach(l => l.parentNode?.removeChild(l));

    if (ambient) {
      const aLight = document.createElement("a-light");
      aLight.setAttribute("type", "ambient");
      aLight.setAttribute("color", ambient.color || "#ffffff");
      aLight.setAttribute("intensity", ambient.intensity || 0.5);
      this.scene.appendChild(aLight);
      this.currentObjects.push(aLight);
    }

    if (directional) {
      const dLight = document.createElement("a-light");
      dLight.setAttribute("type", "directional");
      dLight.setAttribute("color", directional.color || "#ffffff");
      dLight.setAttribute("intensity", directional.intensity || 0.8);
      const p = directional.position;
      dLight.setAttribute("position", `${p?.x || 1} ${p?.y || 2} ${p?.z || 1}`);
      this.scene.appendChild(dLight);
      this.currentObjects.push(dLight);
    }
  }

  clearHistoricalObjects() {
    const group = document.getElementById("historical-group");
    if (group) group.parentNode?.removeChild(group);
    this.currentObjects = this.currentObjects.filter(o => o !== group);
  }

  clearScene() {
    this.currentObjects.forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    this.currentObjects = [];
  }

  injectHTML(html) {
    const container = document.createElement("a-entity");
    container.innerHTML = html;
    Array.from(container.children).forEach(child => {
      this.scene.appendChild(child);
      this.currentObjects.push(child);
    });
  }

  async flashEffect(color, duration) {
    // Create overlay
    const flash = document.createElement("a-plane");
    flash.setAttribute("position", "0 0 -0.1");
    flash.setAttribute("width", "3");
    flash.setAttribute("height", "2");
    flash.setAttribute("color", color);
    flash.setAttribute("material", "shader:flat; opacity:0");

    const cameraEl = document.querySelector("[camera]");
    if (cameraEl) {
      cameraEl.appendChild(flash);
      flash.setAttribute("animation__in", "property:material.opacity; to:0.8; dur:150");
      await this.delay(150);
      flash.setAttribute("animation__out", "property:material.opacity; to:0; dur:350");
      await this.delay(duration);
      cameraEl.removeChild(flash);
    }
  }

  animateAttribute(el, attr, value) {
    el.setAttribute("animation", `property:${attr}; to:${value}; dur:2000; easing:easeInOutQuad`);
  }

  darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `#${Math.floor(r * factor).toString(16).padStart(2, "0")}${Math.floor(g * factor).toString(16).padStart(2, "0")}${Math.floor(b * factor).toString(16).padStart(2, "0")}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
