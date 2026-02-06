// --- CONFIG ---
const QUOTES = [
  "L'enfer, c'est les autres.",
  "Esse est percipi.",
  "The limits of my language mean the limits of my world.",
  "Stare into the abyss and the abyss stares back.",
  "Man is condemned to be free.",
  "I think, therefore I am.",
  "Anxiety is the dizziness of freedom.",
  "God is dead."
];

// --- GLOBALS ---
let mode = 'FLUID';
let effectMode = 'WANDERING';
let currentTheme = 'CYBER';
let focusMode = 'SCREEN'; // 新增：专注模式状态 ('SCREEN' or 'REALITY')

// Functional Toggles
let isVisionActive = true;
let isAudioActive = false;
let isAudioAllowed = false;

// States
let isLooking = false;
let wasLooking = false;
let fluidState = 0;

// Audio
let mic;

// Physics
let lookStartTime = 0;

// Particles
let particles = [];
let uploadedImg = null;

// Settings
let fluidColor;
let particleSize = 200;
let bgColor;

// Typewriter
let currentQuote = "";
let displayedQuote = "";
let typeWriterIndex = 0;
let lastTypeTime = 0;

// OPTIMIZATION GATES
let lastVisionTime = 0;
const VISION_INTERVAL = 100; // 10fps

const DEFAULT_COLOR = "#00ff41";

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 1. PERFORMANCE SETTINGS
  frameRate(30);       // Cap to 30fps
  pixelDensity(1);     // Ignore Retina

  mic = new p5.AudioIn();
  currentQuote = random(QUOTES);
  fluidColor = color(DEFAULT_COLOR);

  bindUI();

  // LOAD SAVED SETTINGS (Auto-Resume)
  loadSettings();

  let btn = select('#force-start-btn');
  if (btn) btn.mousePressed(startSystem);
}

function startSystem() {
  select('#start-screen').style('display', 'none');

  // Audio
  userStartAudio().then(() => {
    isAudioAllowed = true;
    console.log("AUDIO: Context Started");
    if (isAudioActive) mic.start();
  });

  // Vision
  if (typeof window.startVision === 'function') {
    window.startVision();
  }
}

function updateThemeColors() {
  let style = getComputedStyle(document.body);
  let bgStr = style.getPropertyValue('--bg-color').trim();
  bgColor = color(bgStr);
}

// --- PERSISTENCE LOGIC ---
function saveSettings() {
  let data = {
    theme: currentTheme,
    mode: mode,
    focusMode: focusMode, // 保存专注模式
    effect: effectMode,
    fluidColor: fluidColor.toString(),
    size: particleSize,
    vision: isVisionActive,
    audio: isAudioActive,
    mini: select('body').hasClass('mini-mode')
  };

  if (uploadedImg) {
    let tmp = createGraphics(200, 200 * (uploadedImg.height / uploadedImg.width));
    tmp.image(uploadedImg, 0, 0, tmp.width, tmp.height);
    data.imgData = tmp.canvas.toDataURL();
    tmp.remove();
  }

  localStorage.setItem('anti_vibe_config_v4', JSON.stringify(data));
}

function loadSettings() {
  let raw = localStorage.getItem('anti_vibe_config_v4');
  if (!raw) return;

  try {
    let data = JSON.parse(raw);

    setTheme(data.theme);
    setMode(data.mode);
    setFocusMode(data.focusMode || 'SCREEN'); // 恢复专注模式

    effectMode = data.effect || 'WANDERING';
    select('#effect-select').value(effectMode);

    fluidColor = color(data.fluidColor || DEFAULT_COLOR);
    select('#fluid-color').value(data.fluidColor || DEFAULT_COLOR);

    particleSize = data.size || 200;
    select('#particle-size').value(particleSize);

    isVisionActive = data.vision;
    updateToggleButton(select('#btn-vision'), isVisionActive, 'VISION: ON', 'VISION: OFF');

    isAudioActive = data.audio;
    updateToggleButton(select('#btn-mic'), isAudioActive, 'MIC: ON', 'MIC: OFF');

    if (data.mini) toggleMiniMode(true);

    if (data.imgData) {
      loadImage(data.imgData, (img) => {
        uploadedImg = img;
        if (mode === 'PIXEL') initParticles();
      });
    }
  } catch (e) {
    console.error("LOAD ERROR", e);
  }
}


// --- UI LOGIC ---
function bindUI() {
  select('#btn-vision').mousePressed(function () {
    isVisionActive = !isVisionActive;
    updateToggleButton(this, isVisionActive, 'VISION: ON', 'VISION: OFF');
    saveSettings();
  });

  select('#btn-mic').mousePressed(function () {
    isAudioActive = !isAudioActive;
    updateToggleButton(this, isAudioActive, 'MIC: ON', 'MIC: OFF');
    if (isAudioActive && isAudioAllowed) mic.start();
    else if (!isAudioActive && mic) mic.stop();
    saveSettings();
  });

  // FOCUS MODE BUTTONS
  select('#focus-screen').mousePressed(() => { setFocusMode('SCREEN'); saveSettings(); });
  select('#focus-reality').mousePressed(() => { setFocusMode('REALITY'); saveSettings(); });

  select('#theme-select').changed(function () {
    setTheme(this.value());
    saveSettings();
  });

  select('#mode-fluid').mousePressed(() => { setMode('FLUID'); saveSettings(); });
  select('#mode-pixel').mousePressed(() => { setMode('PIXEL'); saveSettings(); });

  select('#fluid-color').input(function () {
    fluidColor = color(this.value());
    // 实时更新默认粒子的颜色
    if (mode === 'PIXEL' && !uploadedImg && particles.length > 0) {
      initDefaultGrid();
    }
    saveSettings();
  });

  select('#effect-select').changed(function () {
    effectMode = this.value();
    saveSettings();
  });

  select('#particle-size').changed(function () {
    particleSize = float(this.value());
    updateParticleSize();
    saveSettings();
  });
  select('#particle-size').input(function () {
    particleSize = float(this.value());
    updateParticleSize();
  });

  select('#img-upload').changed(handleImageUpload);

  select('#slot-1').mousePressed(() => { loadPreset(1); saveSettings(); });
  select('#slot-2').mousePressed(() => { loadPreset(2); saveSettings(); });
  select('#slot-3').mousePressed(() => { loadPreset(3); saveSettings(); });

  select('#btn-reset').mousePressed(resetSystem);
  select('#btn-collapse').mousePressed(togglePanel);

  let miniBtn = select('#btn-mini-mode');
  if (miniBtn) miniBtn.mousePressed(() => toggleMiniMode(true));

  let restoreBtn = select('#mini-restore-btn');
  if (restoreBtn) restoreBtn.mousePressed(() => toggleMiniMode(false));

  let exitMiniBtn = select('#mini-exit-btn');
  if (exitMiniBtn) exitMiniBtn.mousePressed(() => toggleMiniMode(false));
}

function toggleMiniMode(active) {
  let body = select('body');
  if (active) body.addClass('mini-mode');
  else body.removeClass('mini-mode');
}


function updateToggleButton(btn, state, onText, offText) {
  if (state) {
    btn.addClass('active');
    btn.html(onText);
  } else {
    btn.removeClass('active');
    btn.html(offText);
  }
}

function togglePanel() {
  let panel = select('#controls-panel');
  let btn = select('#btn-collapse');
  if (panel.hasClass('collapsed')) {
    panel.removeClass('collapsed');
    btn.html('[ - ]');
  } else {
    panel.addClass('collapsed');
    btn.html('[ + ]');
  }
}

function setMode(newMode) {
  mode = newMode;
  if (mode === 'FLUID') {
    select('#mode-fluid').addClass('active');
    select('#mode-pixel').removeClass('active');
    select('#controls-fluid').style('display', 'block');
    select('#controls-pixel').style('display', 'none');
  } else {
    select('#mode-pixel').addClass('active');
    select('#mode-fluid').removeClass('active');
    select('#controls-pixel').style('display', 'block');
    select('#controls-fluid').style('display', 'none');
    if (particles.length === 0 && !uploadedImg) {
      initDefaultGrid();
    }
  }
}

// 新增：设置专注模式
function setFocusMode(newMode) {
  focusMode = newMode;
  let desc = select('#focus-desc');

  if (focusMode === 'SCREEN') {
    select('#focus-screen').addClass('active');
    select('#focus-reality').removeClass('active');
    if (desc) desc.html("Keep eyes on screen to stabilize.");
  } else {
    // REALITY
    select('#focus-reality').addClass('active');
    select('#focus-screen').removeClass('active');
    if (desc) desc.html("Look AWAY from screen to stabilize.");
  }
}

function initDefaultGrid() {
  particles = [];
  let step = 15;
  let cols = width / step;
  let rows = height / step;
  let c = fluidColor; // 使用当前颜色

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = i * step;
      let y = j * step;
      if (dist(x, y, width / 2, height / 2) < min(width, height) * 0.3) {
        particles.push(new Particle(x, y, c, 6));
      }
    }
  }
}

function setTheme(themeName) {
  currentTheme = themeName;
  let body = select('body');
  body.removeClass('theme-cyber'); body.removeClass('theme-zen'); body.removeClass('theme-sea');
  if (themeName === 'ZEN') body.addClass('theme-zen');
  else if (themeName === 'SEA') body.addClass('theme-sea');
  else body.addClass('theme-cyber');
  select('#theme-select').value(themeName);
  updateThemeColors();
}

function loadPreset(slot) {
  if (slot === 1) {
    setTheme('ZEN'); setMode('FLUID'); fluidColor = color('#ff5722');
    select('#fluid-color').value('#ff5722'); particleSize = 200; select('#particle-size').value(200);
  } else if (slot === 2) {
    setTheme('CYBER'); setMode('PIXEL'); effectMode = 'GLITCH';
    select('#effect-select').value('GLITCH');
    initDefaultGrid();
  } else if (slot === 3) {
    setTheme('SEA'); setMode('FLUID'); fluidColor = color('#38bdf8');
    select('#fluid-color').value('#38bdf8'); particleSize = 300; select('#particle-size').value(300);
  }
}

function resetSystem() {
  localStorage.removeItem('anti_vibe_config_v4');
  setTheme('CYBER'); setMode('FLUID'); setFocusMode('SCREEN');
  fluidColor = color(DEFAULT_COLOR);
  select('#fluid-color').value(DEFAULT_COLOR);
  particleSize = 200; select('#particle-size').value(200);
  isVisionActive = true; updateToggleButton(select('#btn-vision'), true, 'VISION: ON', 'VISION: OFF');
  isAudioActive = false; updateToggleButton(select('#btn-mic'), false, 'MIC: ON', 'MIC: OFF');
  particles = []; uploadedImg = null; select('#img-upload').value('');
  toggleMiniMode(false);
}

function updateParticleSize() {
  if (particles.length > 0) {
    let pSize = map(particleSize, 100, 400, 2, 12);
    for (let p of particles) p.size = pSize;
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

function initParticles() {
  if (!uploadedImg) return;
  let w = uploadedImg.width;
  let h = uploadedImg.height;
  let aspect = w / h;
  let targetPixels = 1800;
  let targetH = sqrt(targetPixels / aspect);
  let targetW = targetH * aspect;
  targetW = constrain(targetW, 20, 100);
  targetH = constrain(targetH, 20, 100);

  uploadedImg.resize(round(targetW), round(targetH));
  uploadedImg.loadPixels();

  particles = [];
  let displayArea = min(width, height) * 0.6;
  let spacing = displayArea / max(uploadedImg.width, uploadedImg.height);
  let startX = (width - uploadedImg.width * spacing) / 2;
  let startY = (height - uploadedImg.height * spacing) / 2;
  let pSize = map(particleSize, 100, 400, 3, 10);

  for (let y = 0; y < uploadedImg.height; y++) {
    for (let x = 0; x < uploadedImg.width; x++) {
      let idx = (x + y * uploadedImg.width) * 4;
      let r = uploadedImg.pixels[idx];
      let g = uploadedImg.pixels[idx + 1];
      let b = uploadedImg.pixels[idx + 2];
      let a = uploadedImg.pixels[idx + 3];

      if (a > 20) {
        let p = new Particle(startX + x * spacing, startY + y * spacing, color(r, g, b), pSize);
        particles.push(p);
      }
    }
  }
}

// --- OPTIMIZED DRAW LOOP ---
function draw() {
  let style = getComputedStyle(document.body);
  bgColor = color(style.getPropertyValue('--bg-color').trim());
  background(bgColor);

  // 1. VISION CHECK
  if (isVisionActive) {
    if (millis() - lastVisionTime > VISION_INTERVAL) {
      if (window.manualPredict) window.manualPredict();
      lastVisionTime = millis();
    }
    let dMouse = dist(mouseX, mouseY, width / 2, height / 2);
    let limit = (mode === 'FLUID') ? 200 : 300;
    let mouseLooking = (dMouse < limit);
    let visionLooking = (typeof window.isLooking !== 'undefined') ? window.isLooking : false;
    isLooking = mouseLooking || visionLooking;
  } else {
    isLooking = false;
  }

  if (isLooking && !wasLooking) lookStartTime = millis();
  wasLooking = isLooking;

  // 2. FOCUS MODE LOGIC (The Core Change)
  // Determine if the visual should act "Stabilized" or "Chaotic"
  let shouldStabilize = false;

  if (focusMode === 'SCREEN') {
    // Screen Mode: Look at screen = Stabilize
    shouldStabilize = isLooking;
  } else {
    // Reality Mode: Look away from screen = Stabilize (Look at screen = Chaos)
    shouldStabilize = !isLooking;
  }

  // Audio Logic
  let vol = 0;
  if (isAudioActive && isAudioAllowed && mic) {
    try { vol = mic.getLevel(); } catch (e) { }
  }

  // Render Logic
  if (mode === 'PIXEL' && particles.length > 0) {
    drawParticles(shouldStabilize, vol * 5.0);
  } else {
    if (mode === 'PIXEL' && particles.length === 0) {
      // Wait for particles
    } else {
      drawFluid(shouldStabilize, vol);
    }
  }

  updateTypewriter();
  updateHUD(vol);
}

function updateHUD(vol) {
  // CAM Status
  let camEl = select('#hud-cam');
  if (camEl) {
    let camStatus = "";
    let camClass = "";
    if (!isVisionActive) {
      camStatus = "CAM: STANDBY";
      camClass = "status-off";
    } else {
      if (window.isModelLoaded && window.isVisionReady) {
        camStatus = "CAM: ACTIVE";
        camClass = "status-active";
      } else {
        camStatus = "CAM: LOADING...";
        camClass = "status-warn";
      }
    }
    camEl.html(camStatus);
    camEl.removeClass('status-active'); camEl.removeClass('status-warn'); camEl.removeClass('status-off');
    camEl.addClass(camClass);
  }

  // AUDIO Status
  let audioEl = select('#hud-audio');
  if (audioEl) {
    let audioStatus = "";
    let audioClass = "";
    if (!isAudioActive) {
      audioStatus = "AUDIO: MUTED";
      audioClass = "status-off";
    } else {
      audioStatus = "AUDIO: LISTENING";
      if (vol > 0.01) audioStatus += " ~";
      if (vol > 0.1) audioStatus += "~";
      if (vol > 0.3) audioStatus += "~";
      audioClass = "status-active";
    }
    audioEl.html(audioStatus);
    audioEl.removeClass('status-active'); audioEl.removeClass('status-off');
    audioEl.addClass(audioClass);
  }

  // SYS Status
  let sysEl = select('#sys-status');
  if (sysEl) {
    // If we are looking, show LOCKED (or similar feedback)
    if (isLooking) {
      sysEl.html("DETECTED");
      sysEl.style('color', '#f00');
    } else {
      sysEl.html("SCANNING");
      sysEl.style('color', 'inherit');
    }
  }
}

function drawFluid(stabilized, vol) {
  push();
  translate(width / 2, height / 2);

  // Auto-Scale Logic
  let minDim = min(width, height);
  let scalar = minDim / 800;

  // Use 'stabilized' boolean to determine target state (1.0 = stable, 0.0 = chaos)
  let targetState = stabilized ? 1.0 : 0.0;
  fluidState = lerp(fluidState, targetState, 0.05);

  let targetCol = fluidColor || color(0, 255, 65);
  let grayCol = color(50);
  let finalCol = lerpColor(targetCol, grayCol, fluidState);
  if (vol > 0.05) finalCol = lerpColor(finalCol, color(255), vol * 2.0);

  fill(finalCol); noStroke();

  beginShape();
  for (let a = 0; a < TWO_PI + 0.1; a += 0.1) {
    let xoff = map(cos(a), -1, 1, 0, 2);
    let yoff = map(sin(a), -1, 1, 0, 2);

    let n = noise(xoff, yoff, frameCount * 0.005);
    let audioAmp = (vol > 0.0) ? sin(a * 10 + frameCount * 0.1) * (vol * 100) : 0;

    // Stability controls the noise magnitude
    // If fluidState is 1 (Stable), noiseMag is low.
    let noiseMag = map(fluidState, 0, 1, 30, 5);
    let rMod = map(n, 0, 1, -noiseMag, noiseMag);

    let baseR = particleSize * scalar; // Apply Scalar
    // Condense slightly when stable
    if (stabilized) baseR = lerp(baseR, (particleSize * 0.9) * scalar, 0.1);

    let r = baseR + (rMod * scalar) + (audioAmp * scalar); // Apply Scalar to modulations
    curveVertex(r * cos(a), r * sin(a));
  }
  endShape(CLOSE);
  pop();
}

function drawParticles(stabilized, vol) {
  for (let p of particles) {
    p.update(stabilized, vol);
    p.show(vol);
  }
}

function updateTypewriter() {
  if (millis() - lastTypeTime > 50) {
    if (displayedQuote.length < currentQuote.length) {
      displayedQuote += currentQuote.charAt(typeWriterIndex);
      typeWriterIndex++;
      if (select('#quote-text')) select('#quote-text').html(displayedQuote);
      lastTypeTime = millis();
    }
  }
}

// --- PARTICLE PHYSICS V2 ---
class Particle {
  constructor(x, y, c, s) {
    this.originX = x;
    this.originY = y;
    this.x = x + random(-500, 500);
    this.y = y + random(-500, 500);
    this.c = c; this.size = s;
    this.nx = random(100); this.ny = random(100);
  }

  update(stabilized, vol) {
    let targetX = this.originX;
    let targetY = this.originY;

    // Only apply chaos effects if NOT stabilized
    if (!stabilized) {
      let t = frameCount * 0.01;
      if (effectMode === 'WANDERING') {
        let nX = noise(this.originX * 0.01, t);
        let nY = noise(this.originY * 0.01, t);
        targetX += map(nX, 0, 1, -200, 200);
        targetY += map(nY, 0, 1, -200, 200);
      } else if (effectMode === 'NEBULA') {
        targetX += map(noise(this.nx, t), 0, 1, -400, 400);
        targetY += map(noise(this.ny, t), 0, 1, -400, 400);
      } else if (effectMode === 'VORTEX') {
        let cx = width / 2; let cy = height / 2;
        let ang = atan2(this.originY - cy, this.originX - cx) + t;
        let rad = dist(cx, cy, this.originX, this.originY) + 50;
        targetX = cx + cos(ang) * rad;
        targetY = cy + sin(ang) * rad;
      } else if (effectMode === 'EXPLODE') {
        let angle = atan2(this.y - height / 2, this.x - width / 2);
        targetX += cos(angle) * 800;
        targetY += sin(angle) * 800;
      }
    }

    // Apply Physics
    let ease = 0.05;
    if (stabilized) ease = 0.15; // Snap back fast when stabilized

    this.x = lerp(this.x, targetX, ease);
    this.y = lerp(this.y, targetY, ease);

    // Leash
    if (dist(this.x, this.y, width / 2, height / 2) > width * 1.5) {
      this.x = this.originX;
      this.y = this.originY;
    }

    // Audio Shake
    if (vol > 0.05) {
      let shake = vol * 30;
      this.x += random(-shake, shake);
      this.y += random(-shake, shake);
    }
  }

  show(vol) {
    fill(this.c); noStroke();

    // Auto-Scale Logic
    let minDim = min(width, height);
    let scalar = minDim / 800;

    // Limit min size to 2px so it doesn't vanish
    let displaySize = max(this.size * scalar, 2);

    rect(this.x, this.y, displaySize, displaySize);
  }
}

let resizeTimer;
function windowResized() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeCanvas(windowWidth, windowHeight);
    if (mode === 'PIXEL') {
      if (uploadedImg) {
        initParticles();
      } else if (particles.length > 0) {
        initDefaultGrid();
      }
    }
  }, 100);
}

window.toggleMiniMode = function (active) {
  toggleMiniMode(active);
};
