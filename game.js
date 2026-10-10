// Motor de jogo 2D Canvas leve, fluido e responsivo
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const posDisplay = document.getElementById('posDisplay');

// Configuração da Resolução e DPI (Retina / Telas Mobile de Alta Densidade)
let width = window.innerWidth;
let height = window.innerHeight;
let dpr = window.devicePixelRatio || 1;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resize);
resize();

// Configuração de Perspectiva 2.5D (Paper Mario)
// Valores menores geram mais inclinação/profundidade no piso (0.45 acentua a perspectiva 2.5D clássica)
const Y_SQUISH = 0.44;

// Estado do Personagem (Estilo Paper Mario: recorte 2D em pé com perspectiva)
const player = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  baseHeight: 120, // Altura visual de referência no mundo (proporção agradável)
  width: 90,       // Largura calculada dinamicamente pelo aspect ratio real
  height: 120,     // Altura calculada dinamicamente pelo aspect ratio real
  speed: 360,      // Pixels por segundo
  friction: 0.88,  // Fricção suave
  facingDir: 1,    // 1 = olhando pra direita, -1 = olhando pra esquerda (flip 2D clássico)
  moving: false,
  bobTimer: 0,     // Balanço suave de papel ao caminhar
  // Estado de Animação
  animState: 'idle', // 'idle', 'run_right', 'run_left'
  animTimer: 0,
  currentFrameIndex: 0,
  animations: {
    idle: [],
    run_right: [],
    run_left: []
  }
};

// Carregamento organizado dos conjuntos de animação
const spriteAssets = {
  idle: ['player.png', 'player-b.png'],
  run_right: ['player-run-right-a.png', 'player-run-right-b.png'],
  run_left: ['player-run-left-a.png', 'player-run-left-b.png']
};

let baseAspectRatioSet = false;

function loadAsset(src) {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    if (!baseAspectRatioSet) {
      baseAspectRatioSet = true;
      const naturalW = img.naturalWidth || 512;
      const naturalH = img.naturalHeight || 512;
      const aspect = naturalW / naturalH;
      player.height = player.baseHeight;
      player.width = player.baseHeight * aspect;
      console.log(`Asset base carregado! Aspect ratio: ${aspect.toFixed(2)} (${player.width}x${player.height})`);
    }
  };
  return img;
}

// Carrega todas as listas de frames
for (const state in spriteAssets) {
  player.animations[state] = spriteAssets[state].map(src => loadAsset(src));
}

// Sistema de Câmera com Zoom Dinâmico e Suave
const camera = {
  x: 0,
  y: 0,
  zoom: 1.85,        // Zoom padrão inicial mais próximo e aconchegante
  targetZoom: 1.85,  // Alvo para interpolação suave de zoom
  minZoom: 0.7,      // Zoom out máximo
  maxZoom: 3.5,      // Zoom in máximo
  smoothFactor: 0.08,// Câmera suave ao seguir
  zoomSpeed: 0.12    // Suavidade da transição de zoom
};

// Estado dos Controles
const keys = {
  KeyW: false, KeyA: false, KeyS: false, KeyD: false,
  ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

let clickTarget = null; // Para toque/clique direto na tela ("ir até onde clicou")

// 1. Controles de Teclado (Movimento + Atalhos de Zoom)
window.addEventListener('keydown', (e) => {
  if (keys[e.code] !== undefined) {
    keys[e.code] = true;
    clickTarget = null; // Cancela clique se usar teclado
  }

  // Atalhos de Zoom no Teclado
  if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
    camera.targetZoom = Math.min(camera.maxZoom, camera.targetZoom + 0.25);
  } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
    camera.targetZoom = Math.max(camera.minZoom, camera.targetZoom - 0.25);
  } else if (e.key === '0' || e.code === 'Numpad0') {
    camera.targetZoom = 1.85; // Redefinir para padrão
  }
});

window.addEventListener('keyup', (e) => {
  if (keys[e.code] !== undefined) {
    keys[e.code] = false;
  }
});

// Zoom pela Roda do Mouse (Scroll)
window.addEventListener('wheel', (e) => {
  const zoomFactor = e.deltaY < 0 ? 0.18 : -0.18;
  camera.targetZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.targetZoom + zoomFactor));
}, { passive: true });

// Botões na Tela (Desktop & Mobile)
document.getElementById('btnZoomIn')?.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  camera.targetZoom = Math.min(camera.maxZoom, camera.targetZoom + 0.3);
});
document.getElementById('btnZoomOut')?.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  camera.targetZoom = Math.max(camera.minZoom, camera.targetZoom - 0.3);
});
document.getElementById('btnZoomReset')?.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  camera.targetZoom = 1.85;
});

// 2. Controles de Clique / Toque no Mundo
window.addEventListener('pointerdown', (e) => {
  // Ignora se o toque foi em cima do joystick ou controles de zoom
  if (e.target.closest('#joystickZone') || e.target.closest('#zoomControls')) return;

  // Converte a coordenada da tela para coordenada do mundo usando a câmera E o ZOOM atual
  const screenX = e.clientX;
  const screenY = e.clientY;
  const worldX = (screenX - width / 2) / camera.zoom + camera.x;
  const worldY = (screenY - height / 2) / (camera.zoom * Y_SQUISH) + camera.y;

  clickTarget = { x: worldX, y: worldY };
});

// 3. Joystick Virtual Fluido
const joystickZone = document.getElementById('joystickZone');
const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');

let joystickActive = false;
let joystickVector = { x: 0, y: 0 };
const maxDistance = 45; // Raio máximo de puxada do joystick em px
let joystickTouchId = null;

function updateJoystickPosition(clientX, clientY) {
  const rect = joystickBase.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let dx = clientX - centerX;
  let dy = clientY - centerY;
  let dist = Math.hypot(dx, dy);

  if (dist > maxDistance) {
    dx = (dx / dist) * maxDistance;
    dy = (dy / dist) * maxDistance;
    dist = maxDistance;
  }

  joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  joystickVector = {
    x: dx / maxDistance,
    y: dy / maxDistance
  };
}

function resetJoystick() {
  joystickActive = false;
  joystickTouchId = null;
  joystickVector = { x: 0, y: 0 };
  joystickKnob.style.transform = 'translate(0px, 0px)';
}

joystickZone.addEventListener('pointerdown', (e) => {
  joystickActive = true;
  joystickTouchId = e.pointerId;
  joystickZone.setPointerCapture(e.pointerId);
  updateJoystickPosition(e.clientX, e.clientY);
  clickTarget = null;
});

joystickZone.addEventListener('pointermove', (e) => {
  if (joystickActive && e.pointerId === joystickTouchId) {
    updateJoystickPosition(e.clientX, e.clientY);
  }
});

joystickZone.addEventListener('pointerup', (e) => {
  if (e.pointerId === joystickTouchId) resetJoystick();
});

joystickZone.addEventListener('pointercancel', (e) => {
  if (e.pointerId === joystickTouchId) resetJoystick();
});

// Loop Principal de Atualização
let lastTime = performance.now();

function update(deltaTime) {
  let moveX = 0;
  let moveY = 0;

  // Entrada: Teclado
  if (keys.KeyW || keys.ArrowUp) moveY -= 1;
  if (keys.KeyS || keys.ArrowDown) moveY += 1;
  if (keys.KeyA || keys.ArrowLeft) moveX -= 1;
  if (keys.KeyD || keys.ArrowRight) moveX += 1;

  // Entrada: Joystick
  if (joystickActive && (Math.abs(joystickVector.x) > 0.05 || Math.abs(joystickVector.y) > 0.05)) {
    moveX = joystickVector.x;
    moveY = joystickVector.y;
  }

  // Normalização do vetor de movimento
  const inputMagnitude = Math.hypot(moveX, moveY);
  if (inputMagnitude > 0.05) {
    clickTarget = null; // Anula alvo de clique se o jogador interagir com teclas/joystick
    const factor = inputMagnitude > 1 ? 1 / inputMagnitude : 1;
    // O movimento no eixo Y é ligeiramente adaptado para a perspectiva do chão (velocidade aparente correta)
    player.vx += (moveX * factor) * player.speed * 8 * deltaTime;
    player.vy += (moveY * factor) * player.speed * 8 * deltaTime;

    // Define direção da folha de papel (1 = Direita, -1 = Esquerda)
    if (moveX > 0.1) player.facingDir = 1;
    else if (moveX < -0.1) player.facingDir = -1;
  } else if (clickTarget) {
    // Movimento por Clique / Toque na Tela
    const distTargetX = clickTarget.x - player.x;
    const distTargetY = clickTarget.y - player.y;
    const distTarget = Math.hypot(distTargetX, distTargetY);

    if (distTarget > 6) {
      const dirX = distTargetX / distTarget;
      const dirY = distTargetY / distTarget;
      player.vx += dirX * player.speed * 8 * deltaTime;
      player.vy += dirY * player.speed * 8 * deltaTime;

      if (dirX > 0.1) player.facingDir = 1;
      else if (dirX < -0.1) player.facingDir = -1;
    } else {
      clickTarget = null;
    }
  }

  // Aplicação da física e inércia fluida
  player.vx *= Math.pow(player.friction, deltaTime * 60);
  player.vy *= Math.pow(player.friction, deltaTime * 60);

  // Limite de velocidade máxima
  const speedCurrent = Math.hypot(player.vx, player.vy);
  if (speedCurrent > player.speed) {
    player.vx = (player.vx / speedCurrent) * player.speed;
    player.vy = (player.vy / speedCurrent) * player.speed;
  }

  player.x += player.vx * deltaTime;
  player.y += player.vy * deltaTime;

  // Atualiza estado de movimento e animação
  player.moving = speedCurrent > 15;

  let targetState = 'idle';
  if (player.moving) {
    targetState = player.facingDir === -1 ? 'run_left' : 'run_right';
  }

  // Se mudou de estado (ex: de parado para correndo), reseta o timer para o primeiro frame responder imediatamente
  if (player.animState !== targetState) {
    player.animState = targetState;
    player.animTimer = 0;
    player.currentFrameIndex = 0;
  }

  const currentAnimList = player.animations[player.animState] || [];

  if (player.moving) {
    // Andando/Correndo: ritmo dinâmico dos passos
    player.bobTimer += deltaTime * 12;
    player.animTimer += deltaTime;
    const runFrameInterval = 0.14; // ~7 frames/segundo (corrida viva e fluida)
    if (player.animTimer >= runFrameInterval) {
      player.animTimer = 0;
      if (currentAnimList.length > 0) {
        player.currentFrameIndex = (player.currentFrameIndex + 1) % currentAnimList.length;
      }
    }
  } else {
    // Parado (Idle): respiração suave e troca sutil entre os frames idle
    player.bobTimer += (0 - (player.bobTimer % (Math.PI * 2))) * 0.1;
    player.animTimer += deltaTime;
    const idleFrameInterval = 0.75; // troca sutil a cada 0.75s
    if (player.animTimer >= idleFrameInterval) {
      player.animTimer = 0;
      if (currentAnimList.length > 0) {
        player.currentFrameIndex = (player.currentFrameIndex + 1) % currentAnimList.length;
      }
    }
  }

  // Transição do efeito de virar a folha (flipScaleX de -1 a 1 suavemente)
  player.flipScaleX += (player.facingDir - player.flipScaleX) * 0.25;

  // Interpolação suave do zoom e da câmera
  camera.zoom += (camera.targetZoom - camera.zoom) * camera.zoomSpeed;
  camera.x += (player.x - camera.x) * camera.smoothFactor;
  camera.y += (player.y - camera.y) * camera.smoothFactor;

  // Atualiza HUD com coordenadas e nível atual de zoom
  posDisplay.textContent = `X: ${Math.round(player.x)} | Y: ${Math.round(player.y)} | Zoom: ${camera.zoom.toFixed(1)}x`;
}

// Renderização
function render() {
  // Limpa com tela toda branca
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  // Centraliza no meio da tela e aplica a escala de ZOOM dinâmico
  ctx.translate(width / 2, height / 2);
  ctx.scale(camera.zoom, camera.zoom);

  // 1. CHÃO COM PERSPECTIVA (grade suave no plano 3D/2.5D)
  ctx.save();
  ctx.scale(1, Y_SQUISH); // Achata o plano horizontal criando perspectiva de piso inclinado
  ctx.translate(-camera.x, -camera.y);

  drawSubtleGroundMarks();

  // Desenha o marcador de clique no chão achatado em perspectiva
  if (clickTarget) {
    ctx.beginPath();
    ctx.ellipse(clickTarget.x, clickTarget.y, 14, 8, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 2. SOMBRA PROJETADA NO CHÃO (Muito sutil, achatada na mesma inclinação da perspectiva)
  const shadowScale = 1 - Math.abs(Math.sin(player.bobTimer)) * 0.08;
  const shadowRadiusX = (player.width * 0.44) * shadowScale;
  const shadowRadiusY = (player.width * 0.14) * shadowScale; // Mais fina para acompanhar a maior inclinação do chão

  ctx.save();
  ctx.translate(player.x, player.y + 2);
  ctx.scale(1, shadowRadiusY / shadowRadiusX);

  const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowRadiusX);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.09)');   // Centro bem sutil
  shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.035)'); // Difusão suave
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');      // Transparência total nas bordas

  ctx.beginPath();
  ctx.arc(0, 0, shadowRadiusX, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();
  ctx.restore();

  ctx.restore(); // Fecha o espaço do chão

  // 3. PERSONAGEM EM PÉ (RECORTADO COMO PAPEL / BILLBOARD)
  // Calculamos a posição na tela: o pé do personagem fica exatamente no ponto (player.x, player.y * Y_SQUISH)
  const screenFeetX = (player.x - camera.x);
  const screenFeetY = (player.y - camera.y) * Y_SQUISH;

  ctx.save();
  ctx.translate(screenFeetX, screenFeetY);

  // Balanço Paper Mario: leve pulinho e inclinação ao andar
  const walkBobY = player.moving ? -Math.abs(Math.sin(player.bobTimer)) * 6 : 0;
  const walkTilt = player.moving ? Math.sin(player.bobTimer) * 0.05 * player.facingDir : 0;

  ctx.translate(0, walkBobY);
  ctx.rotate(walkTilt);
  // Se o estado for 'idle', usa o flip suave (player.flipScaleX).
  // Se estiver correndo e houver sprites desenhados especificamente para esquerda/direita, renderiza na orientação original desenhada (1).
  const isDedicatedDirSprite = (player.animState === 'run_left' || player.animState === 'run_right');
  const renderScaleX = isDedicatedDirSprite ? 1 : player.flipScaleX;
  ctx.scale(renderScaleX, 1);

  // Obtém a lista de frames da animação ativa (idle, run_right, run_left)
  const animList = player.animations[player.animState] || [];
  const readyFrames = animList.filter(f => f && f.complete && f.naturalWidth > 0);

  // Fallback: se a lista específica não tiver carregado ainda, tenta usar os frames de idle
  const fallbackFrames = (player.animations.idle || []).filter(f => f && f.complete && f.naturalWidth > 0);
  const activeFrame = (readyFrames.length > 0) 
    ? readyFrames[player.currentFrameIndex % readyFrames.length] 
    : (fallbackFrames.length > 0 ? fallbackFrames[0] : null);

  if (activeFrame) {
    // Desenha o frame ativo do loop, perfeitamente ancorado pela base dos pés e com proporção original
    ctx.drawImage(
      activeFrame,
      -player.width / 2,
      -player.height,
      player.width,
      player.height
    );
  } else {
    // Placeholder estilizado Paper Mario (recorte plano com traço preto marcante)
    drawPaperMarioPlaceholder();
  }

  ctx.restore(); // Fecha o espaço do personagem
  ctx.restore(); // Fecha viewport principal
}

// Desenha o avatar temporário estilizado de papel recortado
function drawPaperMarioPlaceholder() {
  const w = player.width;
  const h = player.height;

  // Borda branca grossa de adesivo recortado (sticker cut) típica de Paper Mario
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Corpo / Camisa
  ctx.beginPath();
  ctx.roundRect(-w / 2.4, -h * 0.65, w / 1.2, h * 0.65, [14, 14, 6, 6]);
  ctx.fillStyle = '#2563eb';
  ctx.fill();
  ctx.stroke();

  // Cabeça
  ctx.beginPath();
  ctx.arc(0, -h * 0.72, w / 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fed7aa'; // Tom de pele recortado
  ctx.fill();
  ctx.stroke();

  // Chapéu / Cabelo recortado
  ctx.beginPath();
  ctx.arc(0, -h * 0.78, w / 2.3, Math.PI, 0);
  ctx.fillStyle = '#dc2626'; // Vermelho vibrante
  ctx.fill();
  ctx.stroke();

  // Aba do boné
  ctx.beginPath();
  ctx.ellipse(w * 0.2, -h * 0.77, w * 0.28, 6, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#b91c1c';
  ctx.fill();
  ctx.stroke();

  // Olho estilo cartoon Paper Mario
  ctx.beginPath();
  ctx.ellipse(w * 0.16, -h * 0.73, 4.5, 7.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Brilho do olho
  ctx.beginPath();
  ctx.arc(w * 0.18, -h * 0.75, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Nariz fofo
  ctx.beginPath();
  ctx.arc(w * 0.32, -h * 0.7, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#fca5a5';
  ctx.fill();
  ctx.stroke();
}

// Pequenas referências no chão para dar sensação de profundidade e movimento na tela branca
function drawSubtleGroundMarks() {
  const gridSize = 140;
  // Expande a área visível dividindo pelo zoom para cobrir todo o viewport em qualquer nível de aproximação
  const viewSpanX = (width / camera.zoom) * 0.7;
  const viewSpanY = (height / (camera.zoom * Y_SQUISH)) * 0.7;

  const startX = Math.floor((camera.x - viewSpanX) / gridSize) * gridSize;
  const endX = Math.ceil((camera.x + viewSpanX) / gridSize) * gridSize;
  const startY = Math.floor((camera.y - viewSpanY) / gridSize) * gridSize;
  const endY = Math.ceil((camera.y + viewSpanY) / gridSize) * gridSize;

  // Marcas sutis e elegantes no chão infinito
  ctx.strokeStyle = '#e9eaec';
  ctx.lineWidth = 1.4;

  for (let gx = startX; gx <= endX; gx += gridSize) {
    for (let gy = startY; gy <= endY; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx - 5, gy);
      ctx.lineTo(gx + 5, gy);
      ctx.moveTo(gx, gy - 5);
      ctx.lineTo(gx, gy + 5);
      ctx.stroke();
    }
  }
}

// Game Loop com Delta Time
function gameLoop(currentTime) {
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Trava no máx 100ms para evitar saltos
  lastTime = currentTime;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame((time) => {
  lastTime = time;
  gameLoop(time);
});
