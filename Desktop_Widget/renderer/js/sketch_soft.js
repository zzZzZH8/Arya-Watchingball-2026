// --- GLOBALS ---
let mode = 'FLUID';
let effectMode = 'WANDERING';
let currentTheme = 'CYBER';
let focusMode = 'SCREEN';

// Toggles
let isVisionActive = true;
let isAudioActive = false;
let isAudioAllowed = false;

// States
let isLooking = false;
let fluidState = 0;

// Audio
let mic;

// Particles
let particles = [];
let uploadedImg = null;

// Settings
let fluidColor;
let particleSize = 130;

// Optimization
let lastVisionTime = 0;
const VISION_INTERVAL = 50;

const DEFAULT_COLOR = "#00ff41";

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(30);
    pixelDensity(1);

    mic = new p5.AudioIn();
    fluidColor = color(DEFAULT_COLOR);

    bindUI();
    createDefaultGrid();
    loadSettings();

    // Apply theme once on init, but don't overwrite image colors
    applyTheme(currentTheme, true);

    if (typeof window.startVision === 'function') window.startVision();
}

function draw() {
    clear(); // Transparent BG

    // 1. Vision Check
    if (isVisionActive) {
        if (millis() - lastVisionTime > VISION_INTERVAL) {
            if (window.manualPredict) window.manualPredict();
            lastVisionTime = millis();
        }
        let visionLooking = (typeof window.isLooking !== 'undefined') ? window.isLooking : false;
        let mouseLooking = dist(mouseX, mouseY, width / 2, height / 2) < 150;

        if (window.isModelLoaded) isLooking = visionLooking;
        else isLooking = mouseLooking;
    } else {
        isLooking = false;
    }

    // 2. Focus Logic
    let shouldStabilize = (focusMode === 'SCREEN') ? isLooking : !isLooking;

    // 3. Audio Logic
    let vol = 0;
    if (isAudioActive && isAudioAllowed && mic) {
        try { vol = mic.getLevel(); } catch (e) { }
    }

    // 4. Render
    push();
    translate(width / 2, height / 2);

    if (mode === 'PIXEL') {
        // Fallback: Default grid if no particles and no image
        if (particles.length === 0 && !uploadedImg) createDefaultGrid();
        drawParticles(shouldStabilize, vol * 5.0);
    } else {
        drawFluid(shouldStabilize, vol);
    }
    pop();
}

// --- FLUID DRAWING ---
function drawFluid(stabilized, vol) {
    let targetState = stabilized ? 1.0 : 0.0;
    fluidState = lerp(fluidState, targetState, 0.05);

    let targetCol = fluidColor;
    let alphaVal = map(fluidState, 0, 1, 255, 60); // Transparent when stable

    let finalCol = color(red(targetCol), green(targetCol), blue(targetCol), alphaVal);
    if (vol > 0.05) finalCol = lerpColor(finalCol, color(255), vol * 2.0);

    fill(finalCol); noStroke();

    beginShape();
    for (let a = 0; a < TWO_PI + 0.1; a += 0.1) {
        let xoff = map(cos(a), -1, 1, 0, 2);
        let yoff = map(sin(a), -1, 1, 0, 2);
        let n = noise(xoff, yoff, frameCount * 0.005);
        let audioAmp = (vol > 0.0) ? sin(a * 10 + frameCount * 0.1) * (vol * 100) : 0;

        let noiseMag = map(fluidState, 0, 1, 40, 5);
        let rMod = map(n, 0, 1, -noiseMag, noiseMag);

        let baseR = particleSize;
        if (stabilized) baseR = lerp(baseR, particleSize * 0.8, 0.1);

        let r = baseR + rMod + audioAmp;
        curveVertex(r * cos(a), r * sin(a));
    }
    endShape(CLOSE);
}

// --- PARTICLE DRAWING ---
function drawParticles(stabilized, vol) {
    for (let p of particles) {
        p.update(stabilized, vol);
        p.show(vol, stabilized);
    }
}

class Particle {
    constructor(x, y, c, s) {
        this.ox = x; this.oy = y;
        this.x = x + random(-500, 500); this.y = y + random(-500, 500);
        this.c = c; // 【Key】Stores original pixel color
        this.size = s;
        this.nx = random(100); this.ny = random(100);
    }
    update(stabilized, vol) {
        let tx = this.ox; let ty = this.oy;
        if (!stabilized) {
            let t = frameCount * 0.01;
            if (effectMode === 'WANDERING') {
                let nX = noise(this.ox * 0.01, t); let nY = noise(this.oy * 0.01, t);
                tx += map(nX, 0, 1, -150, 150); ty += map(nY, 0, 1, -150, 150);
            } else if (effectMode === 'NEBULA') {
                tx += map(noise(this.nx, t), 0, 1, -300, 300); ty += map(noise(this.ny, t), 0, 1, -300, 300);
            } else if (effectMode === 'VORTEX') {
                let ang = atan2(this.oy, this.ox) + t * 2;
                let rad = dist(0, 0, this.ox, this.oy) + 50;
                tx = cos(ang) * rad; ty = sin(ang) * rad;
            } else if (effectMode === 'GLITCH') {
                if (random(1) < 0.1) tx += random(-50, 50);
            } else if (effectMode === 'EXPLODE') {
                let angle = atan2(this.y, this.x);
                tx += cos(angle) * 600; ty += sin(angle) * 600;
            }
        }
        let ease = stabilized ? 0.15 : 0.05;
        this.x = lerp(this.x, tx, ease);
        this.y = lerp(this.y, ty, ease);
        if (dist(this.x, this.y, 0, 0) > width) { this.x = this.ox; this.y = this.oy; }
        if (vol > 0.05) { let s = vol * 30; this.x += random(-s, s); this.y += random(-s, s); }
    }

    show(vol, stabilized) {
        // 【Key Fix】Use this.c (own color) instead of fluidColor (global)
        let c = color(this.c);

        // Desktop transparency: slightly transparent when stable, solid when chaotic
        let alpha = stabilized ? 120 : 255;
        c.setAlpha(alpha);

        fill(c); noStroke();
        rect(this.x, this.y, this.size, this.size);
    }
}

// --- THEME & UI ---
function updateCSSVariables(theme) {
    let root = document.documentElement.style;
    if (theme === 'CYBER') {
        root.setProperty('--primary', '#00ff41');
        root.setProperty('--text-main', '#e0e0e0');
        root.setProperty('--bg-glass', 'rgba(5, 8, 10, 0.85)');
    } else if (theme === 'ZEN') {
        root.setProperty('--primary', '#ff5722');
        root.setProperty('--text-main', '#333');
        root.setProperty('--bg-glass', 'rgba(240, 240, 240, 0.9)');
    } else if (theme === 'SEA') {
        root.setProperty('--primary', '#38bdf8');
        root.setProperty('--text-main', '#38bdf8');
        root.setProperty('--bg-glass', 'rgba(15, 23, 42, 0.85)');
    }
}

function applyTheme(t, isInit = false) {
    currentTheme = t;
    updateCSSVariables(t);

    let hex = '#00ff41';
    if (t === 'ZEN') hex = '#ff5722';
    if (t === 'SEA') hex = '#38bdf8';

    fluidColor = color(hex);
    select('#fluid-color').value(hex);

    // 【Key Fix】Only overwrite particle color if NO image is uploaded
    // If image exists, theme only changes UI and Fluid color, not the image particles
    if (!uploadedImg && !isInit) {
        for (let p of particles) p.c = fluidColor;
    }
}

function bindUI() {
    select('#btn-vision').mousePressed(function () {
        isVisionActive = !isVisionActive;
        this.class(isVisionActive ? 'toggle-btn active' : 'toggle-btn');
        this.html(isVisionActive ? 'VISION: ON' : 'VISION: OFF');
        saveSettings();
    });

    select('#btn-mic').mousePressed(async function () {
        isAudioActive = !isAudioActive;
        this.class(isAudioActive ? 'toggle-btn active' : 'toggle-btn');
        this.html(isAudioActive ? 'MIC: ON' : 'MIC: OFF');
        if (isAudioActive) {
            try { await userStartAudio(); mic.start(); isAudioAllowed = true; } catch (e) { }
        } else if (mic) {
            mic.stop(); isAudioAllowed = false;
        }
        saveSettings();
    });

    select('#focus-screen').mousePressed(() => { setFocusMode('SCREEN'); saveSettings(); });
    select('#focus-reality').mousePressed(() => { setFocusMode('REALITY'); saveSettings(); });

    select('#mode-fluid').mousePressed(() => { setMode('FLUID'); saveSettings(); });
    select('#mode-pixel').mousePressed(() => { setMode('PIXEL'); saveSettings(); });

    select('#fluid-color').input(function () {
        fluidColor = color(this.value());
        // 【Key Fix】Only change particle color if NO image is uploaded
        if (!uploadedImg) {
            if (mode === 'PIXEL' && particles.length === 0) createDefaultGrid();
            for (let p of particles) p.c = fluidColor;
        }
        saveSettings();
    });

    select('#particle-size').input(function () { particleSize = float(this.value()); updateParticleSize(); });
    select('#effect-select').changed(function () { effectMode = this.value(); saveSettings(); });
    select('#img-upload').changed(handleImageUpload);
    select('#theme-select').changed(function () { applyTheme(this.value()); saveSettings(); });

    select('#slot-1').mousePressed(() => { loadPreset(1); });
    select('#slot-2').mousePressed(() => { loadPreset(2); });
    select('#slot-3').mousePressed(() => { loadPreset(3); });
    select('#btn-reset').mousePressed(resetSystem);
}

function setFocusMode(m) {
    focusMode = m;
    select('#focus-screen').class(m === 'SCREEN' ? 'mode-btn active' : 'mode-btn');
    select('#focus-reality').class(m === 'REALITY' ? 'mode-btn active' : 'mode-btn');
    let desc = select('#focus-desc');
    if (desc) desc.html(m === 'SCREEN' ? "Keep eyes on screen to stabilize." : "Look AWAY from screen to stabilize.");
}

function setMode(m) {
    mode = m;
    select('#mode-fluid').class(m === 'FLUID' ? 'mode-btn active' : 'mode-btn');
    select('#mode-pixel').class(m === 'PIXEL' ? 'mode-btn active' : 'mode-btn');
    if (m === 'FLUID') {
        select('#controls-fluid').style('display', 'block'); select('#controls-pixel').style('display', 'none');
    } else {
        select('#controls-fluid').style('display', 'none'); select('#controls-pixel').style('display', 'block');
        if (particles.length === 0 && !uploadedImg) createDefaultGrid();
    }
}

function handleImageUpload() {
    const file = select('#img-upload').elt.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        loadImage(url, img => {
            uploadedImg = img;
            initParticles();
            saveSettings();
        });
    }
}

function createDefaultGrid() {
    particles = [];
    let step = 15;
    let c = fluidColor;
    for (let x = -100; x <= 100; x += step) {
        for (let y = -100; y <= 100; y += step) {
            if (dist(x, y, 0, 0) < 100) particles.push(new Particle(x, y, c, 6));
        }
    }
}

function initParticles() {
    if (!uploadedImg) return;
    let w = uploadedImg.width; let h = uploadedImg.height;
    let aspect = w / h;

    // 【Optimization】Increase sampling density for clearer images (1200 -> 2500)
    let targetPixels = 2500;
    let targetH = sqrt(targetPixels / aspect);
    let targetW = targetH * aspect;

    uploadedImg.resize(round(targetW), round(targetH));
    uploadedImg.loadPixels();
    particles = [];

    let displayArea = 220;
    let spacing = displayArea / max(uploadedImg.width, uploadedImg.height);
    let startX = - (uploadedImg.width * spacing) / 2;
    let startY = - (uploadedImg.height * spacing) / 2;

    // Use smaller default size for finer image detail
    let defaultSize = map(particleSize, 50, 300, 3, 6);

    for (let y = 0; y < uploadedImg.height; y++) {
        for (let x = 0; x < uploadedImg.width; x++) {
            let idx = (x + y * uploadedImg.width) * 4;
            let r = uploadedImg.pixels[idx]; let g = uploadedImg.pixels[idx + 1]; let b = uploadedImg.pixels[idx + 2]; let a = uploadedImg.pixels[idx + 3];
            if (a > 20) {
                particles.push(new Particle(startX + x * spacing, startY + y * spacing, color(r, g, b), defaultSize));
            }
        }
    }
}

function updateParticleSize() { for (let p of particles) p.size = map(particleSize, 50, 300, 2, 8); }

function saveSettings() {
    let data = { mode, focusMode, effectMode, fluidColor: fluidColor.toString(), isVisionActive, isAudioActive, particleSize, currentTheme };
    localStorage.setItem('anti_vibe_soft_v5', JSON.stringify(data));
}
function loadSettings() {
    let raw = localStorage.getItem('anti_vibe_soft_v5');
    if (!raw) return;
    let data = JSON.parse(raw);
    if (data.currentTheme) applyTheme(data.currentTheme, true);
    if (data.mode) setMode(data.mode);
    if (data.focusMode) setFocusMode(data.focusMode);
    if (data.effectMode) { effectMode = data.effectMode; select('#effect-select').value(effectMode); }
    if (data.fluidColor) { fluidColor = color(data.fluidColor); select('#fluid-color').value(data.fluidColor); }
    if (data.particleSize) { particleSize = data.particleSize; select('#particle-size').value(particleSize); }
    isVisionActive = data.isVisionActive;
    let vb = select('#btn-vision'); vb.class(isVisionActive ? 'toggle-btn active' : 'toggle-btn'); vb.html(isVisionActive ? 'VISION: ON' : 'VISION: OFF');
    // Audio reset off
    if (data.isAudioActive) {
        isAudioActive = false; select('#btn-mic').class('toggle-btn'); select('#btn-mic').html('MIC: OFF');
    }
}
function loadPreset(n) {
    if (n === 1) { applyTheme('ZEN'); setMode('FLUID'); }
    if (n === 2) { applyTheme('CYBER'); setMode('PIXEL'); effectMode = 'GLITCH'; select('#effect-select').value('GLITCH'); createDefaultGrid(); }
    if (n === 3) { applyTheme('SEA'); setMode('FLUID'); }
    saveSettings();
}
function resetSystem() { localStorage.removeItem('anti_vibe_soft_v5'); location.reload(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
