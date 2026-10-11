// Motor 3D/2.5D baseado em Three.js com Perspectiva Isométrica Suave e Fundo Infinito
// Inspirado na engenharia visual e mecânica do modo Explorar (O Caminho das Flores)

(() => {
  // Configurações e Constantes Principais
  const PLAYER_HEIGHT = 2.0;
  let playerWidth = 2.0; // Atualizado após carregar o aspect ratio real do sprite
  const BASE_Y = PLAYER_HEIGHT / 2;
  const SPEED = 5.2; // Velocidade em unidades Three.js / segundo
  const DUST_TRIGGER_TIME = 0.9;
  const DUST_SPAWN_INTERVAL = 0.12;
  const MAX_FX_PARTICLES = 60;
  const BASE_SORT_ORDER = 10000; // Base para ordenação de profundidade 2.5D (Z-sorting)

  // Variáveis de Enquadramento da Câmera
  let camOffsetY = 7.5;
  let camOffsetZ = 9.5;

  // Elementos do DOM
  const canvas = document.getElementById('gameCanvas');
  const posDisplay = document.getElementById('posDisplay');

  // Three.js Core
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfcfbf8); // Branco quente orgânico
  scene.fog = new THREE.FogExp2(0xfcfbf8, 0.018); // Névoa volumétrica suave

  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 200);
  camera.position.set(0, camOffsetY, camOffsetZ);
  camera.lookAt(0, 1.0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Iluminação Suave
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.92);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff7ed, 0.55);
  dirLight.position.set(6, 14, 8);
  scene.add(dirLight);

  // 1. Chão Infinito com Horizonte Imperceptível
  const groundGeo = new THREE.PlaneGeometry(350, 350);
  const groundMat = new THREE.MeshBasicMaterial({
    color: 0xfcfbf8,
    depthWrite: true
  });
  const groundPlane = new THREE.Mesh(groundGeo, groundMat);
  groundPlane.rotation.x = -Math.PI / 2;
  scene.add(groundPlane);

  // 2. Marcas Sutis no Chão (Referência tátil de movimento e escala 3D)
  function createGroundMarksTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 256;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(215, 208, 195, 0.38)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(128 - 7, 128);
    ctx.lineTo(128 + 7, 128);
    ctx.moveTo(128, 128 - 7);
    ctx.lineTo(128, 128 + 7);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(cvs);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(70, 70);
    return tex;
  }

  const marksPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(350, 350),
    new THREE.MeshBasicMaterial({
      map: createGroundMarksTexture(),
      transparent: true,
      depthWrite: false
    })
  );
  marksPlane.rotation.x = -Math.PI / 2;
  marksPlane.position.y = 0.005;
  scene.add(marksPlane);

  // 3. Texturas Procedurais via Canvas 2D
  // Sombra suave sob os pés
  function createShadowTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 128;
    cvs.height = 128;
    const ctx = cvs.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(30, 40, 45, 0.45)');
    grad.addColorStop(0.5, 'rgba(40, 50, 55, 0.18)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cvs);
  }

  // Marcador de Toque Verde Botânico Translúcido com Centro Suave
  function createClickMarkerTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 128;
    cvs.height = 128;
    const ctx = cvs.getContext('2d');

    // 1. Anel externo elegante
    ctx.strokeStyle = 'rgba(78, 122, 102, 0.72)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 48, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Miolo preenchido translúcido
    ctx.fillStyle = 'rgba(120, 170, 145, 0.42)';
    ctx.beginPath();
    ctx.arc(64, 64, 16, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(cvs);
  }

  // Partícula de Poeira Cartunizada
  function createDustTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 128;
    cvs.height = 128;
    const ctx = cvs.getContext('2d');

    const puffs = [
      { x: 64, y: 72, r: 36 },
      { x: 38, y: 78, r: 26 },
      { x: 90, y: 78, r: 26 },
      { x: 48, y: 52, r: 24 },
      { x: 78, y: 50, r: 26 },
      { x: 64, y: 44, r: 20 }
    ];

    // Contorno suave
    ctx.fillStyle = 'rgba(175, 155, 130, 0.45)';
    puffs.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y + 3, p.r + 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Traço cartoon
    ctx.fillStyle = 'rgba(185, 162, 135, 0.95)';
    puffs.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Corpo da nuvem
    ctx.fillStyle = 'rgba(238, 228, 214, 0.96)';
    puffs.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Brilho interno
    ctx.fillStyle = 'rgba(255, 252, 246, 0.8)';
    puffs.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x - 3, p.y - 4, p.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    });

    return new THREE.CanvasTexture(cvs);
  }

  // 4. Grupo do Jogador & Billboard Inclinado
  const playerGroup = new THREE.Group();
  playerGroup.position.set(0, 0, 0);
  scene.add(playerGroup);

  // Sombra Projetada em Elipse
  const shadowGeo = new THREE.PlaneGeometry(1.6, 0.9);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createShadowTexture(),
    transparent: true,
    depthWrite: false
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  shadowMesh.renderOrder = 1;
  playerGroup.add(shadowMesh);

  // Sprite Billboard do Jogador
  let playerMesh = null;
  const playerGeo = new THREE.PlaneGeometry(playerWidth, PLAYER_HEIGHT);
  const playerMat = new THREE.MeshBasicMaterial({
    transparent: true,
    alphaTest: 0.02,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  playerMesh = new THREE.Mesh(playerGeo, playerMat);
  playerMesh.position.y = BASE_Y;
  playerMesh.rotation.x = -0.36; // Inclinação de contra-balanço exata (-20.6°)
  playerMesh.renderOrder = 2;
  playerGroup.add(playerMesh);

  // Marcador de Destino no Chão
  const markerGeo = new THREE.PlaneGeometry(1.2, 1.2);
  const markerMat = new THREE.MeshBasicMaterial({
    map: createClickMarkerTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const clickMarkerMesh = new THREE.Mesh(markerGeo, markerMat);
  clickMarkerMesh.rotation.x = -Math.PI / 2;
  clickMarkerMesh.position.y = 0.03;
  clickMarkerMesh.renderOrder = 3;
  scene.add(clickMarkerMesh);

  // Sistema de Partículas (FX)
  const dustTexture = createDustTexture();
  const fxGroup = new THREE.Group();
  scene.add(fxGroup);
  const fxParticles = [];

  function spawnDustParticle(x, z, dirX, dirZ) {
    if (!dustTexture || fxParticles.length >= MAX_FX_PARTICLES) return;

    const geo = new THREE.PlaneGeometry(0.85, 0.85);
    const initialOpacity = 0.85;
    const mat = new THREE.MeshBasicMaterial({
      map: dustTexture,
      transparent: true,
      opacity: initialOpacity,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 4;
    const spawnX = x - dirX * 0.25 + (Math.random() - 0.5) * 0.18;
    const spawnZ = z - dirZ * 0.25 + (Math.random() - 0.5) * 0.18;
    mesh.position.set(spawnX, 0.16, spawnZ);
    mesh.rotation.x = -0.36;
    mesh.rotation.z = (Math.random() - 0.5) * 0.3;

    const startScale = 0.42 + Math.random() * 0.15;
    mesh.scale.set(startScale, startScale, startScale);
    fxGroup.add(mesh);

    fxParticles.push({
      mesh: mesh,
      vx: -dirX * 0.35 + (Math.random() - 0.5) * 0.25,
      vz: -dirZ * 0.35 + (Math.random() - 0.5) * 0.25,
      vy: 0.22 + Math.random() * 0.14,
      baseScale: startScale,
      initialOpacity: initialOpacity,
      age: 0,
      life: 0.52 + Math.random() * 0.14
    });
  }

  function updateParticles(delta) {
    for (let i = fxParticles.length - 1; i >= 0; i--) {
      const p = fxParticles[i];
      p.age += delta;

      if (p.age >= p.life) {
        fxGroup.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        fxParticles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.vx * delta;
      p.mesh.position.z += p.vz * delta;
      p.mesh.position.y += p.vy * delta;
      p.vy *= 0.94;

      const progress = p.age / p.life;
      p.mesh.material.opacity = p.initialOpacity * (1 - progress);
      const currentScale = p.baseScale * (1 + progress * 0.45);
      p.mesh.scale.set(currentScale, currentScale, currentScale);
    }
  }

  // 5. Carregamento dos Sprites e Animações
  const spriteAssets = {
    idle: ['player.png', 'player-b.png'],
    run_right: ['player-run-right-a.png', 'player-run-right-b.png'],
    run_left: ['player-run-left-a.png', 'player-run-left-b.png']
  };

  const spriteTextures = {
    idle: [],
    run_right: [],
    run_left: []
  };

  const textureLoader = new THREE.TextureLoader();
  let baseAspectRatioCalculated = false;

  for (const state in spriteAssets) {
    spriteAssets[state].forEach((path, idx) => {
      textureLoader.load(path, (tex) => {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        spriteTextures[state][idx] = tex;

        if (!baseAspectRatioCalculated && tex.image && tex.image.naturalWidth) {
          baseAspectRatioCalculated = true;
          const aspect = tex.image.naturalWidth / tex.image.naturalHeight;
          playerWidth = PLAYER_HEIGHT * aspect;
          if (playerMesh) {
            playerMesh.geometry.dispose();
            playerMesh.geometry = new THREE.PlaneGeometry(playerWidth, PLAYER_HEIGHT);
          }
        }

        // Ativa o primeiro frame se o mesh ainda não tiver textura
        if (state === 'idle' && idx === 0 && playerMesh && !playerMesh.material.map) {
          playerMesh.material.map = tex;
          playerMesh.material.needsUpdate = true;
        }
      });
    });
  }

  // 5.1 Elementos de Ambiente: Gramas e Pedras com Chunks Infinitos
  const envAssets = {
    grass: ['grama-a.png', 'grama-b.png', 'grama-c.png', 'grama-d.png'],
    rock: ['pedra-a.png', 'pedra-b.png', 'pedra-c.png'],
    tree: ['arvore-a.png']
  };

  const envMaterials = {
    grass: [],
    rock: [],
    tree: []
  };

  for (const type in envAssets) {
    envAssets[type].forEach((path, idx) => {
      const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        alphaTest: 0.02,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      envMaterials[type][idx] = mat;

      textureLoader.load(
        path,
        (tex) => {
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          mat.map = tex;
          mat.needsUpdate = true;
          if (type === 'tree') {
            console.log('🌲 Textura da árvore (arvore-a.png 1024px) carregada com sucesso!');
          }
        },
        undefined,
        (err) => {
          console.error('❌ Falha ao carregar textura de ambiente:', path, err);
        }
      );
    });
  }

  // Geometria e Sombra Compartilhadas dos Props de Cenário
  const propBaseGeo = new THREE.PlaneGeometry(1, 1);
  propBaseGeo.translate(0, 0.5, 0); // Ancoragem na base inferior (Y = 0)

  const propShadowGeo = new THREE.PlaneGeometry(1, 1);
  const propShadowMat = new THREE.MeshBasicMaterial({
    map: createShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.22 // Sombra discreta e suave de contato direto com o chão
  });

  // Funções de PRNG Determinístico para Chunks Procedurais
  function createSeededRandom(seed) {
    let s = (seed ^ 0x6D2B79F5) >>> 0;
    return function() {
      s = (s + 0x9E3779B9) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getChunkSeed(cx, cz) {
    let h = (cx * 73856093) ^ (cz * 19349663);
    return (h ^ 0x85ebca6b) >>> 0;
  }

  // Gerenciador de Chunks de Cenário
  const CHUNK_SIZE = 24;
  const CHUNK_RADIUS = 2; // Grade 5x5 cobrindo 120x120 unidades de mundo
  const loadedChunks = new Map();
  const activeRockObstacles = [];
  const envGroup = new THREE.Group();
  scene.add(envGroup);

  let lastChunkX = null;
  let lastChunkZ = null;

  function spawnChunk(cx, cz, key) {
    const chunkGroup = new THREE.Group();
    const seed = getChunkSeed(cx, cz);
    const rand = createSeededRandom(seed);

    const minX = cx * CHUNK_SIZE;
    const minZ = cz * CHUNK_SIZE;

    const chunkRocks = [];

    // 1. Gramas no chunk (3 a 6 tufos estáticos e assentados no chão)
    const numGrass = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < numGrass; i++) {
      const gx = minX + (rand() * 0.9 + 0.05) * CHUNK_SIZE;
      const gz = minZ + (rand() * 0.9 + 0.05) * CHUNK_SIZE;

      const variant = Math.floor(rand() * 4); // Variantes A, B, C, D
      const baseScale = 0.72 + rand() * 0.35;
      const flipX = rand() < 0.5 ? 1 : -1;

      const gItem = new THREE.Group();
      gItem.position.set(gx, 0, gz);

      // Sombra sutil de contato rente à base do chão
      const shadow = new THREE.Mesh(propShadowGeo, propShadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0, 0.006, -0.015);
      shadow.scale.set(baseScale * 0.45, baseScale * 0.18, 1);
      shadow.renderOrder = 1;
      gItem.add(shadow);

      // Sprite estático da grama (sem balanço flutuante)
      const mesh = new THREE.Mesh(propBaseGeo, envMaterials.grass[variant]);
      mesh.rotation.x = -0.36;
      mesh.scale.set(baseScale * flipX, baseScale, 1);
      mesh.renderOrder = BASE_SORT_ORDER + Math.round(gz * 100);
      gItem.add(mesh);

      chunkGroup.add(gItem);
    }

    // 2. Pedras no chunk (1 a 3 pedras sólidas com sombra rente e 3 variantes)
    const numRocks = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < numRocks; i++) {
      const rx = minX + (rand() * 0.88 + 0.06) * CHUNK_SIZE;
      const rz = minZ + (rand() * 0.88 + 0.06) * CHUNK_SIZE;

      // Mantém a área inicial de spawn (0, 0), o Mestre Sábio (3.8, 2.2) e a árvore marco (5.8, 1.0) livres de pedras
      if (Math.hypot(rx, rz) < 3.2 || Math.hypot(rx - 3.8, rz - 2.2) < 2.5 || Math.hypot(rx - 5.8, rz - 1.0) < 2.5) {
        continue;
      }

      const variant = Math.floor(rand() * 3); // Variantes A, B, C
      const baseScale = 0.75 + rand() * 0.42;
      const flipX = rand() < 0.5 ? 1 : -1;

      const rItem = new THREE.Group();
      rItem.position.set(rx, 0, rz);

      // Sombra discreta de contato rente à base da rocha
      const shadow = new THREE.Mesh(propShadowGeo, propShadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0, 0.008, -0.015);
      shadow.scale.set(baseScale * 0.65, baseScale * 0.28, 1);
      shadow.renderOrder = 1;
      rItem.add(shadow);

      // Sprite estático da pedra com contra-inclinação billboard
      const mesh = new THREE.Mesh(propBaseGeo, envMaterials.rock[variant]);
      mesh.rotation.x = -0.36;
      mesh.scale.set(baseScale * flipX, baseScale, 1);
      mesh.renderOrder = BASE_SORT_ORDER + Math.round(rz * 100);
      rItem.add(mesh);

      chunkGroup.add(rItem);

      const rockEntry = {
        x: rx,
        z: rz,
        radius: baseScale * 0.42,
        chunkKey: key
      };
      chunkRocks.push(rockEntry);
      activeRockObstacles.push(rockEntry);
    }

    // 3. Árvores frondosas no chunk (1 a 3 árvores de 1024px com copa 2.5D e tronco colidível)
    const numTrees = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < numTrees; i++) {
      const tx = minX + (rand() * 0.82 + 0.09) * CHUNK_SIZE;
      const tz = minZ + (rand() * 0.82 + 0.09) * CHUNK_SIZE;

      // Mantém a área inicial de spawn (0, 0) e a clareira central desimpedidas
      if (Math.hypot(tx, tz) < 4.2 || Math.hypot(tx - 3.8, tz - 2.2) < 2.8) {
        continue;
      }

      // Evita sobreposição direta com rochas ou outras árvores do mesmo chunk
      let overlapObstacle = false;
      for (let j = 0; j < chunkRocks.length; j++) {
        const obs = chunkRocks[j];
        if (Math.hypot(tx - obs.x, tz - obs.z) < 2.6) {
          overlapObstacle = true;
          break;
        }
      }
      if (overlapObstacle) continue;

      const baseScale = 3.4 + rand() * 0.8; // Escala entre 3.4 e 4.2 unidades para arte de 1024px
      const flipX = rand() < 0.5 ? 1 : -1;

      const tItem = new THREE.Group();
      tItem.position.set(tx, 0, tz);

      // Sombra projetada sob a base do tronco e raízes
      const shadow = new THREE.Mesh(propShadowGeo, propShadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0, 0.007, -0.02);
      shadow.scale.set(baseScale * 0.55, baseScale * 0.22, 1);
      shadow.renderOrder = 1;
      tItem.add(shadow);

      // Sprite da árvore com contra-inclinação billboard
      const mesh = new THREE.Mesh(propBaseGeo, envMaterials.tree[0]);
      mesh.rotation.x = -0.36;
      mesh.scale.set(baseScale * flipX, baseScale, 1);
      mesh.renderOrder = BASE_SORT_ORDER + Math.round(tz * 100);
      tItem.add(mesh);

      chunkGroup.add(tItem);

      const treeEntry = {
        x: tx,
        z: tz,
        radius: baseScale * 0.13, // Colisão sólida no tronco (~0.45 a 0.55 unidades)
        chunkKey: key,
        isTree: true
      };
      chunkRocks.push(treeEntry);
      activeRockObstacles.push(treeEntry);
    }

    // No chunk inicial (0, 0), inclui a clareira com árvores imponentes visíveis imediatamente na tela inicial
    if (cx === 0 && cz === 0) {
      const startingTrees = [
        { x: -2.4, z: -2.8, scale: 3.8, flip: 1 },  // Noroeste (canto superior esquerdo da tela)
        { x: 2.2, z: -2.8, scale: 3.6, flip: -1 },  // Nordeste (canto superior direito da tela)
        { x: 4.8, z: 1.4, scale: 4.2, flip: 1 },   // Ao lado do Mestre Sábio (sombra zen)
        { x: -2.8, z: 1.8, scale: 3.7, flip: -1 }   // Oeste (lateral esquerda da tela)
      ];

      startingTrees.forEach((t) => {
        const tItem = new THREE.Group();
        tItem.position.set(t.x, 0, t.z);

        const shadow = new THREE.Mesh(propShadowGeo, propShadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(0, 0.007, -0.02);
        shadow.scale.set(t.scale * 0.55, t.scale * 0.22, 1);
        shadow.renderOrder = 1;
        tItem.add(shadow);

        const mesh = new THREE.Mesh(propBaseGeo, envMaterials.tree[0]);
        mesh.rotation.x = -0.36;
        mesh.scale.set(t.scale * t.flip, t.scale, 1);
        mesh.renderOrder = BASE_SORT_ORDER + Math.round(t.z * 100);
        tItem.add(mesh);

        chunkGroup.add(tItem);

        const treeObs = {
          x: t.x,
          z: t.z,
          radius: t.scale * 0.13,
          chunkKey: key,
          isTree: true
        };
        chunkRocks.push(treeObs);
        activeRockObstacles.push(treeObs);
      });
    }

    envGroup.add(chunkGroup);
    loadedChunks.set(key, {
      group: chunkGroup,
      rocks: chunkRocks
    });
  }

  function updateChunks(centerCx, centerCz) {
    const neededKeys = new Set();

    for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx++) {
      for (let dz = -CHUNK_RADIUS; dz <= CHUNK_RADIUS; dz++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        const key = `${cx},${cz}`;
        neededKeys.add(key);

        if (!loadedChunks.has(key)) {
          spawnChunk(cx, cz, key);
        }
      }
    }

    // Descarrega chunks que saíram do raio visível
    for (const [key, chunkData] of loadedChunks.entries()) {
      if (!neededKeys.has(key)) {
        envGroup.remove(chunkData.group);

        for (let i = activeRockObstacles.length - 1; i >= 0; i--) {
          if (activeRockObstacles[i].chunkKey === key) {
            activeRockObstacles.splice(i, 1);
          }
        }

        loadedChunks.delete(key);
      }
    }
  }

  function checkChunkUpdates() {
    const cx = Math.floor(playerGroup.position.x / CHUNK_SIZE);
    const cz = Math.floor(playerGroup.position.z / CHUNK_SIZE);
    if (cx !== lastChunkX || cz !== lastChunkZ) {
      lastChunkX = cx;
      lastChunkZ = cz;
      updateChunks(cx, cz);
    }
  }

  // 5.2 Mobs do Mapa (Lesminha / Slime)
  const MOB_COUNT = 7;
  const MOB_SIZE = 1.9;
  const MOB_BASE_SPEED = 0.53; // 3x mais devagar (anterior: 1.6 / 3)
  const MOB_ANIM_INTERVAL = 0.32; // Cadência orgânica e pausada condizente com o rastejo lento
  const MOB_CYCLE = [0, 1, 2, 3, 2, 1]; // 1 > 2 > 3 > 4 > 3 > 2 > 1...

  const mobAssets = ['mob-a-1.png', 'mob-a-2.png', 'mob-a-3.png', 'mob-a-4.png'];
  const mobTextures = [];

  // Ponto de fixação no centro inferior da imagem (Y = 0 na base)
  const mobGeo = new THREE.PlaneGeometry(MOB_SIZE, MOB_SIZE);
  mobGeo.translate(0, MOB_SIZE / 2, 0);

  const mobShadowGeo = new THREE.PlaneGeometry(1.3, 0.65);
  const mobShadowMat = new THREE.MeshBasicMaterial({
    map: createShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.28
  });

  const mobsGroup = new THREE.Group();
  scene.add(mobsGroup);
  const mobsList = [];

  mobAssets.forEach((path, idx) => {
    textureLoader.load(path, (tex) => {
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      mobTextures[idx] = tex;

      // Atribui o primeiro frame aos mobs que ainda não possuírem mapa
      mobsList.forEach(m => {
        if (!m.mesh.material.map && idx === 0) {
          m.mesh.material.map = tex;
          m.mesh.material.needsUpdate = true;
        }
      });
    });
  });

  // Distribui 7 mobs pelo mapa ao redor da área inicial
  const initialSpawnAngles = [0.25, 1.15, 2.05, 3.10, 4.05, 4.95, 5.85];
  const initialSpawnDistances = [6.5, 9.5, 7.2, 12.0, 8.8, 11.2, 14.5];

  for (let i = 0; i < MOB_COUNT; i++) {
    const angle = initialSpawnAngles[i] + (Math.random() - 0.5) * 0.35;
    const dist = initialSpawnDistances[i] + (Math.random() - 0.5) * 1.8;
    const startX = Math.cos(angle) * dist;
    const startZ = Math.sin(angle) * dist;

    const group = new THREE.Group();
    group.position.set(startX, 0, startZ);

    // Sombra elíptica suave no solo
    const shadow = new THREE.Mesh(mobShadowGeo, mobShadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.012, 0);
    shadow.renderOrder = 1;
    group.add(shadow);

    // Cada mob possui seu material próprio para trocar texturas independentemente
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.02,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(mobGeo, mat);
    mesh.position.set(0, 0, 0);
    mesh.rotation.x = -0.36; // Contra-inclinação billboard isométrica idêntica à do jogador
    mesh.renderOrder = BASE_SORT_ORDER + Math.round(startZ * 100);
    group.add(mesh);

    mobsGroup.add(group);

    const wanderRadius = 6.0;
    const targetX = startX + (Math.random() * 2 - 1) * wanderRadius;
    const targetZ = startZ + (Math.random() * 2 - 1) * wanderRadius;

    mobsList.push({
      group: group,
      mesh: mesh,
      shadow: shadow,
      x: startX,
      z: startZ,
      targetX: targetX,
      targetZ: targetZ,
      speed: MOB_BASE_SPEED * (0.88 + Math.random() * 0.28),
      state: 'walking',
      idleTimer: 0,
      animTimer: Math.random() * MOB_ANIM_INTERVAL, // Dessincroniza os passos entre eles
      cycleStep: Math.floor(Math.random() * MOB_CYCLE.length),
      facingRight: false
    });
  }

  function updateMobs(delta) {
    const mobRadius = 0.38;
    const playerRadius = 0.38;

    for (let i = 0; i < mobsList.length; i++) {
      const mob = mobsList[i];

      // Ordenação dinâmica de profundidade 2.5D (Z-sorting)
      // Quando Z do mob for maior que Z do jogador (mais à frente), renderOrder será maior e sobrepõe o player
      mob.mesh.renderOrder = BASE_SORT_ORDER + Math.round(mob.z * 100);

      if (mob.state === 'walking') {
        const dx = mob.targetX - mob.x;
        const dz = mob.targetZ - mob.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.16) {
          const vx = (dx / dist) * mob.speed;
          const vz = (dz / dist) * mob.speed;

          let nextX = mob.x + vx * delta;
          let nextZ = mob.z + vz * delta;

          // 1. Colisão e deslizamento elástico contra rochas
          for (let j = 0; j < activeRockObstacles.length; j++) {
            const rock = activeRockObstacles[j];
            const rdx = nextX - rock.x;
            const rdz = nextZ - rock.z;
            const minDist = mobRadius + rock.radius;
            const distSq = rdx * rdx + rdz * rdz;

            if (distSq < minDist * minDist) {
              const rDist = Math.sqrt(distSq) || 0.001;
              const overlap = minDist - rDist;
              nextX += (rdx / rDist) * overlap;
              nextZ += (rdz / rDist) * overlap;
            }
          }

          // 2. Colisão física contra o jogador (impede que o mob ocupe o espaço do jogador)
          const dxP = nextX - playerGroup.position.x;
          const dzP = nextZ - playerGroup.position.z;
          const minDistP = mobRadius + playerRadius;
          const distSqP = dxP * dxP + dzP * dzP;

          if (distSqP < minDistP * minDistP) {
            const distP = Math.sqrt(distSqP) || 0.001;
            const overlapP = minDistP - distP;
            nextX += (dxP / distP) * overlapP;
            nextZ += (dzP / distP) * overlapP;
          }

          // 3. Colisão física entre os próprios mobs (impede que se sobreponham)
          for (let k = 0; k < mobsList.length; k++) {
            if (k === i) continue;
            const other = mobsList[k];
            const mdx = nextX - other.x;
            const mdz = nextZ - other.z;
            const mMinDist = mobRadius * 1.8;
            const mDistSq = mdx * mdx + mdz * mdz;
            if (mDistSq < mMinDist * mMinDist) {
              const mDist = Math.sqrt(mDistSq) || 0.001;
              const mOverlap = mMinDist - mDist;
              nextX += (mdx / mDist) * mOverlap;
              nextZ += (mdz / mDist) * mOverlap;
            }
          }

          // 4. Colisão física contra o NPC Mestre Sábio (impede sobreposição)
          if (typeof npcPosition !== 'undefined') {
            const dxN = nextX - npcPosition.x;
            const dzN = nextZ - npcPosition.z;
            const minDistN = mobRadius + npcRadius;
            const distSqN = dxN * dxN + dzN * dzN;

            if (distSqN < minDistN * minDistN) {
              const distN = Math.sqrt(distSqN) || 0.001;
              const overlapN = minDistN - distN;
              nextX += (dxN / distN) * overlapN;
              nextZ += (dzN / distN) * overlapN;
            }
          }

          mob.x = nextX;
          mob.z = nextZ;
          mob.group.position.x = nextX;
          mob.group.position.z = nextZ;
          mob.mesh.renderOrder = BASE_SORT_ORDER + Math.round(nextZ * 100);

          // Orientação visual: arte original olha para a esquerda
          if (vx > 0.05) {
            mob.facingRight = true;
          } else if (vx < -0.05) {
            mob.facingRight = false;
          }
          mob.mesh.scale.x = mob.facingRight ? -1 : 1;

          // Ciclo de Animação Ping-Pong: 1 > 2 > 3 > 4 > 3 > 2 > 1...
          mob.animTimer += delta;
          if (mob.animTimer >= MOB_ANIM_INTERVAL) {
            mob.animTimer = 0;
            mob.cycleStep = (mob.cycleStep + 1) % MOB_CYCLE.length;
            const frameIdx = MOB_CYCLE[mob.cycleStep];
            if (mobTextures[frameIdx] && mob.mesh.material.map !== mobTextures[frameIdx]) {
              mob.mesh.material.map = mobTextures[frameIdx];
              mob.mesh.material.needsUpdate = true;
            }
          }
        } else {
          // Chegou ao ponto alvo, pausa brevemente antes do próximo trajeto
          mob.state = 'idle';
          mob.idleTimer = 0.8 + Math.random() * 2.2;
          // Retorna suavemente ao frame inicial esticado
          if (mobTextures[0] && mob.mesh.material.map !== mobTextures[0]) {
            mob.mesh.material.map = mobTextures[0];
            mob.mesh.material.needsUpdate = true;
          }
        }
      } else if (mob.state === 'idle') {
        mob.idleTimer -= delta;
        if (mob.idleTimer <= 0) {
          // Sorteia novo destino aleatório próximo
          const roamDist = 3.5 + Math.random() * 6.5;
          const roamAngle = Math.random() * Math.PI * 2;
          mob.targetX = mob.x + Math.cos(roamAngle) * roamDist;
          mob.targetZ = mob.z + Math.sin(roamAngle) * roamDist;
          mob.state = 'walking';
        }
      }
    }
  }

  // 5.3 NPC Mestre Sábio (Filosofia e Ensinamentos do Canal Corvo Seco)
  const npcPosition = new THREE.Vector3(3.8, 0, 2.2);
  const npcRadius = 0.55;
  const NPC_HEIGHT = PLAYER_HEIGHT; // 2.0 (idêntico ao player)
  const NPC_WIDTH = 2.0;            // 2.0 (mesma proporção de 512x512)
  const NPC_BASE_Y = NPC_HEIGHT / 2; // 1.0

  const npcGroup = new THREE.Group();
  npcGroup.position.copy(npcPosition);
  scene.add(npcGroup);

  // Sombra projetada do NPC no solo (mesma escala da sombra do player)
  const npcShadowGeo = new THREE.PlaneGeometry(1.6, 0.9);
  const npcShadowMesh = new THREE.Mesh(npcShadowGeo, propShadowMat);
  npcShadowMesh.rotation.x = -Math.PI / 2;
  npcShadowMesh.position.set(0, 0.012, 0);
  npcShadowMesh.renderOrder = 1;
  npcGroup.add(npcShadowMesh);

  // Mesh do NPC com geometria centrada, pivô e contra-inclinação idênticos aos do jogador
  const npcGeo = new THREE.PlaneGeometry(NPC_WIDTH, NPC_HEIGHT);

  const npcMat = new THREE.MeshBasicMaterial({
    transparent: true,
    alphaTest: 0.02,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const npcMesh = new THREE.Mesh(npcGeo, npcMat);
  npcMesh.position.set(0, NPC_BASE_Y, 0);
  npcMesh.rotation.x = -0.36; // Contra-inclinação billboard isométrica idêntica à do jogador (-20.6°)
  npcMesh.renderOrder = BASE_SORT_ORDER + Math.round(npcPosition.z * 100);
  npcGroup.add(npcMesh);

  // Texturas do NPC (old-a: padrão / boca fechada, old-b: falando / boca aberta)
  const npcTextures = {
    idle: null,
    talking: null
  };

  textureLoader.load('old-a.png', (tex) => {
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    npcTextures.idle = tex;
    if (npcMesh && !npcMesh.material.map) {
      npcMesh.material.map = tex;
      npcMesh.material.needsUpdate = true;
    }
  });

  textureLoader.load('old-b.png', (tex) => {
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    npcTextures.talking = tex;
  });

  // Configurações da API DeepSeek
  const DEEPSEEK_CONFIG = {
    apiKey: 'sk-3d51c1545e6748978fa84f9b9b9727fb',
    model: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/chat/completions'
  };

  // 30 Frases e Ensinamentos Autênticos do Canal Corvo Seco (Advaita, Zen, Autoinvestigação)
  const CORVO_SECO_QUOTES = [
    "A mente é apenas o vento que passa; você é o espaço que nunca se move.",
    "Não tente silenciar os pensamentos com força. Apenas perceba quem é que os observa.",
    "A paz não é a ausência de tempestade, mas a presença de serenidade no centro dela.",
    "Tudo o que vem e vai não é você. Você é aquilo que permanece imóvel.",
    "Todo o sofrimento nasce do apego a uma ilusão passageira que você chama de 'eu'.",
    "Olhe para o chão, olhe para este céu. Onde termina o mundo e onde você começa?",
    "Aquele que procura a iluminação é a própria mente criando uma ilusão de distância.",
    "Seja como a água límpida: ela não resiste à pedra, ela a contorna com suave paciência.",
    "A pressa é a tentativa tola da mente de chegar a um lugar onde você já se encontra.",
    "Silencie por um instante. O que sobra quando você não pensa no ontem nem no amanhã?",
    "Você não possui uma vida isolada; você é a própria Vida em movimento.",
    "A resposta que você tanto persegue não está nas palavras, mas no silêncio entre elas.",
    "O ego quer remar contra o rio da existência; o sábio apenas mergulha e flui.",
    "Nada do que acontece fora pode manchar a pureza daquilo que você verdadeiramente é.",
    "O peso que você carrega nos ombros não é a sua jornada, são apenas suas expectativas.",
    "Observe sem julgar. No instante em que você julga, você se separa da totalidade.",
    "A verdadeira liberdade começa quando você descobre que não precisa provar nada a ninguém.",
    "O gato ao meu lado não se inquieta com o amanhã. Ele simplesmente repousa no presente.",
    "Construímos gaiolas com nossos medos e depois lamentamos a falta de espaço para voar.",
    "Quando o observador se dissolve na observação, resta apenas a consciência tranquila.",
    "Desapegar não é perder coisa alguma; é abrir as mãos para abraçar o infinito.",
    "Não existe um caminho rumo à paz; a paz é a própria maneira de dar cada passo.",
    "A mente cria problemas imaginários e depois passa os dias sofrendo para resolvê-los.",
    "Acolha a incerteza com ternura. É no solo do não-saber que a sabedoria floresce.",
    "Tudo o que ganha forma há de passar. Descanse naquilo que não tem princípio nem fim.",
    "O silêncio interior não está vazio; ele está transbordando de harmonia e plenitude.",
    "Você já é aquilo que tanto procura. Pare de perseguir seu próprio reflexo no espelho.",
    "Aceitar o instante presente exatamente como ele se apresenta: esse é o descanso sagrado.",
    "Deixe o mundo correr lá fora. Aqui dentro, neste instante, a quietude é soberana.",
    "Respire profundamente, viajante. Este fôlego agora é a única realidade existente."
  ];

  // Estado do Diálogo e Animações de Fala
  let inDialogue = false;
  let dialogueTurnCount = 0;
  const MAX_DIALOGUE_TURNS = 5;
  let dialogueHistory = [];
  let userPrevZoom = 1.0;
  let isAwaitingAI = false;

  let typewriterTimeout = null;
  let mouthFlapInterval = null;
  let isTypingSpeech = false;
  let idleQuoteTimer = 0;
  const IDLE_QUOTE_INTERVAL = 11.5; // Balão de ensinamento a cada ~11.5 segundos
  let idleQuoteIndex = Math.floor(Math.random() * CORVO_SECO_QUOTES.length);
  let idleHideTimeout = null;

  function stopSpeechAnimation() {
    if (typewriterTimeout) {
      clearTimeout(typewriterTimeout);
      typewriterTimeout = null;
    }
    if (mouthFlapInterval) {
      clearInterval(mouthFlapInterval);
      mouthFlapInterval = null;
    }
    isTypingSpeech = false;
    if (npcMesh && npcTextures.idle) {
      npcMesh.material.map = npcTextures.idle;
      npcMesh.material.needsUpdate = true;
    }
  }

  // Exibe texto com efeito de digitação e animação da boca (old-a <-> old-b)
  function displaySpeechText(text, tag = '', onComplete = null) {
    stopSpeechAnimation();

    const bubbleEl = document.getElementById('npcSpeechBubble');
    const textEl = document.getElementById('npcSpeechText');

    if (!bubbleEl || !textEl) return;

    bubbleEl.classList.remove('npc-ui-hidden');
    textEl.textContent = '';

    isTypingSpeech = true;
    let charIndex = 0;
    const speed = 25; // Velocidade agradável de leitura (ms/char)

    // Alterna a boca aberta/fechada durante a fala
    let mouthOpen = false;
    mouthFlapInterval = setInterval(() => {
      if (!isTypingSpeech || !npcMesh) return;
      mouthOpen = !mouthOpen;
      const targetTex = mouthOpen ? (npcTextures.talking || npcTextures.idle) : npcTextures.idle;
      if (targetTex && npcMesh.material.map !== targetTex) {
        npcMesh.material.map = targetTex;
        npcMesh.material.needsUpdate = true;
      }
    }, 220);

    function typeNextChar() {
      if (charIndex < text.length) {
        textEl.textContent += text.charAt(charIndex);
        charIndex++;
        typewriterTimeout = setTimeout(typeNextChar, speed);
      } else {
        stopSpeechAnimation();
        if (onComplete) onComplete();
      }
    }

    typeNextChar();
  }

  // Ciclo Idle de Ensinamentos do Corvo Seco
  function triggerIdleQuote() {
    if (inDialogue) return;
    const quote = CORVO_SECO_QUOTES[idleQuoteIndex];
    idleQuoteIndex = (idleQuoteIndex + 1) % CORVO_SECO_QUOTES.length;

    displaySpeechText(quote, 'Ensinamento', () => {
      if (idleHideTimeout) clearTimeout(idleHideTimeout);
      idleHideTimeout = setTimeout(() => {
        if (!inDialogue) {
          const bubbleEl = document.getElementById('npcSpeechBubble');
          if (bubbleEl) bubbleEl.classList.add('npc-ui-hidden');
        }
      }, 5000);
    });
  }

  // Início da Conversa com o Mestre
  function startDialogue() {
    if (inDialogue) return;
    inDialogue = true;
    dialogueTurnCount = 0;
    dialogueHistory = [];
    userPrevZoom = targetZoom;
    targetZoom = 1.95; // Zoom cinemático no mestre e no viajante

    // Trava movimento do jogador
    targetPosition = null;
    velocity.set(0, 0, 0);
    isMoving = false;

    // Esconde prompt de aproximação
    const promptEl = document.getElementById('npcPrompt');
    if (promptEl) promptEl.classList.add('npc-ui-hidden');

    // Abre barra de chat de diálogo
    const chatBar = document.getElementById('npcChatBar');
    const turnCountEl = document.getElementById('interactionTurnCount');
    const inputEl = document.getElementById('npcChatInput');
    const sendBtn = document.getElementById('btnSendChat');

    if (chatBar) chatBar.classList.remove('npc-ui-hidden');
    if (turnCountEl) turnCountEl.textContent = '0';
    if (inputEl) {
      inputEl.value = '';
      inputEl.disabled = false;
      setTimeout(() => inputEl.focus(), 250);
    }
    if (sendBtn) sendBtn.disabled = false;

    // Saudação reflexiva inicial do sábio
    const initialGreeting = "O que traz sua mente inquieta até este silêncio, viajante?";
    dialogueHistory.push({ role: 'assistant', content: initialGreeting });
    displaySpeechText(initialGreeting, 'Diálogo');
  }

  // Projeção e Controle do Balão de Fala do Jogador (Viajante)
  const tempPlayerVec = new THREE.Vector3();
  let playerSpeechHideTimeout = null;

  function showPlayerSpeech(text) {
    const bubbleEl = document.getElementById('playerSpeechBubble');
    const textEl = document.getElementById('playerSpeechText');
    if (!bubbleEl || !textEl) return;

    if (playerSpeechHideTimeout) {
      clearTimeout(playerSpeechHideTimeout);
      playerSpeechHideTimeout = null;
    }

    textEl.textContent = text;
    bubbleEl.classList.remove('npc-ui-hidden');
    updatePlayerSpeechUI();
  }

  function hidePlayerSpeech(delayMs = 0) {
    if (playerSpeechHideTimeout) {
      clearTimeout(playerSpeechHideTimeout);
      playerSpeechHideTimeout = null;
    }

    if (delayMs > 0) {
      playerSpeechHideTimeout = setTimeout(() => {
        const bubbleEl = document.getElementById('playerSpeechBubble');
        if (bubbleEl) bubbleEl.classList.add('npc-ui-hidden');
      }, delayMs);
    } else {
      const bubbleEl = document.getElementById('playerSpeechBubble');
      if (bubbleEl) bubbleEl.classList.add('npc-ui-hidden');
    }
  }

  function updatePlayerSpeechUI() {
    if (!playerGroup) return;
    const bubbleEl = document.getElementById('playerSpeechBubble');
    if (!bubbleEl || bubbleEl.classList.contains('npc-ui-hidden')) return;

    tempPlayerVec.setFromMatrixPosition(playerGroup.matrixWorld);
    tempPlayerVec.y += 2.25; // Acima da cabeça do jogador
    tempPlayerVec.project(camera);

    const screenX = (tempPlayerVec.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-(tempPlayerVec.y * 0.5) + 0.5) * window.innerHeight;

    bubbleEl.style.left = `${screenX}px`;
    bubbleEl.style.top = `${screenY}px`;
  }

  // Encerramento da Conversa
  function endDialogue(farewellMessage = null) {
    if (!inDialogue) return;
    inDialogue = false;
    isAwaitingAI = false;
    targetZoom = Math.min(Math.max(userPrevZoom, MIN_ZOOM), MAX_ZOOM);

    hidePlayerSpeech(0);

    const chatBar = document.getElementById('npcChatBar');
    if (chatBar) chatBar.classList.add('npc-ui-hidden');

    if (farewellMessage) {
      displaySpeechText(farewellMessage, 'Despedida', () => {
        setTimeout(() => {
          const bubbleEl = document.getElementById('npcSpeechBubble');
          if (bubbleEl) bubbleEl.classList.add('npc-ui-hidden');
          stopSpeechAnimation();
        }, 3800);
      });
    } else {
      const bubbleEl = document.getElementById('npcSpeechBubble');
      if (bubbleEl) bubbleEl.classList.add('npc-ui-hidden');
      stopSpeechAnimation();
    }
  }

  // Envio de Mensagem para a IA DeepSeek
  async function handlePlayerSend() {
    if (!inDialogue || isAwaitingAI) return;
    const inputEl = document.getElementById('npcChatInput');
    const sendBtn = document.getElementById('btnSendChat');
    const turnCountEl = document.getElementById('interactionTurnCount');

    const text = inputEl ? inputEl.value.trim() : '';
    if (!text) return;

    // Exibe a fala no balão sobre a cabeça do jogador
    showPlayerSpeech(text);

    dialogueTurnCount++;
    if (turnCountEl) turnCountEl.textContent = String(dialogueTurnCount);
    dialogueHistory.push({ role: 'user', content: text });

    if (inputEl) {
      inputEl.value = '';
      inputEl.disabled = true;
    }
    if (sendBtn) sendBtn.disabled = true;
    isAwaitingAI = true;

    const isFinalTurn = (dialogueTurnCount >= MAX_DIALOGUE_TURNS);
    const bubbleText = document.getElementById('npcSpeechText');
    if (bubbleText) bubbleText.textContent = '...';

    try {
      let systemPrompt = `Você é o Mestre Sábio, um ancião sereno, lúcido e acolhedor acompanhado de seu gato tranquilo ao lado, inspirado nos ensinamentos de não-dualidade do canal "Corvo Seco" (Advaita Vedanta, Zen, Taoísmo, Nisargadatta Maharaj, Ramana Maharshi, Wu Hsin).
DIRETRIZES:
1. Seja sempre breve, profundo e poético (no máximo 2 a 3 frases curtas para caber com elegância no balão de fala do jogo).
2. Aponte para a autoinvestigação, o silêncio da mente, a dissolução das ilusões do ego e a paz do momento presente.
3. Responda em português brasileiro suave, sem tópicos ou listas.`;

      if (isFinalTurn) {
        systemPrompt += `\nESTE É O 5º E ÚLTIMO TURNO DE CONVERSA: Você DEVE responder de forma profunda ao que o viajante disse e, em seguida, inventar uma desculpa sábia, poética ou bem-humorada com seu gato para encerrar o diálogo (por exemplo: que as palavras já cumpriram seu papel de apontar o caminho, que agora é hora de praticar o silêncio em seus passos, ou que você e seu gato precisam contemplar a brisa em quietude). Despeça-se cordialmente.`;
      }

      const response = await fetch(DEEPSEEK_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: DEEPSEEK_CONFIG.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...dialogueHistory
          ],
          max_tokens: 220,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      let reply = "";
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const msg = data.choices[0].message;
        if (typeof msg.content === 'string' && msg.content.trim().length > 0) {
          reply = msg.content.trim();
        } else if (typeof msg.reasoning_content === 'string' && msg.reasoning_content.trim().length > 0) {
          reply = msg.reasoning_content.trim();
        }
      }

      if (!reply) {
        reply = "O silêncio agora ensina mais do que qualquer palavra...";
      }

      dialogueHistory.push({ role: 'assistant', content: reply });

      // Oculta suavemente o balão do jogador após o mestre começar a responder
      hidePlayerSpeech(4500);

      displaySpeechText(reply, isFinalTurn ? 'Encerramento' : 'Mestre', () => {
        if (isFinalTurn) {
          // Após ler o último ensinamento, encerra automaticamente a conversa
          setTimeout(() => {
            endDialogue();
          }, 4500);
        } else {
          if (inputEl) {
            inputEl.disabled = false;
            inputEl.focus();
          }
          if (sendBtn) sendBtn.disabled = false;
          isAwaitingAI = false;
        }
      });
    } catch (err) {
      console.warn('DeepSeek API fallback:', err);
      const fallbackQuotes = [
        "As palavras se perderam na névoa, mas a verdade do silêncio continua viva e serena dentro de você.",
        "O vento levou a resposta. Olhe para dentro de si mesmo neste instante e você a encontrará.",
        "Não se prenda à dependência de respostas externas. A quietude é seu mestre supremo."
      ];
      const fallback = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      dialogueHistory.push({ role: 'assistant', content: fallback });

      hidePlayerSpeech(4500);

      displaySpeechText(fallback, isFinalTurn ? 'Encerramento' : 'Reflexão', () => {
        if (isFinalTurn) {
          setTimeout(() => endDialogue(), 4000);
        } else {
          if (inputEl) {
            inputEl.disabled = false;
            inputEl.focus();
          }
          if (sendBtn) sendBtn.disabled = false;
          isAwaitingAI = false;
        }
      });
    }
  }

  // Projeção das Coordenadas 3D para a Interface em Tela
  const tempNpcVec = new THREE.Vector3();
  function updateNpcUI() {
    if (!npcGroup) return;

    // Projeta ponto acima da cabeça do NPC (Y ~ 2.15)
    tempNpcVec.setFromMatrixPosition(npcGroup.matrixWorld);
    tempNpcVec.y += 2.15;
    tempNpcVec.project(camera);

    const isBehind = tempNpcVec.z > 1;
    const screenX = (tempNpcVec.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-(tempNpcVec.y * 0.5) + 0.5) * window.innerHeight;

    const bubbleEl = document.getElementById('npcSpeechBubble');
    const promptEl = document.getElementById('npcPrompt');

    if (bubbleEl) {
      bubbleEl.style.left = `${screenX}px`;
      bubbleEl.style.top = `${screenY}px`;
    }

    if (promptEl) {
      promptEl.style.left = `${screenX}px`;
      promptEl.style.top = `${screenY - 12}px`;
    }

    // Distância do jogador ao NPC
    const distToNpc = Math.hypot(
      playerGroup.position.x - npcPosition.x,
      playerGroup.position.z - npcPosition.z
    );

    // Prompt de Interação flutuante
    if (!inDialogue) {
      if (distToNpc <= 3.2 && !isBehind) {
        if (promptEl) promptEl.classList.remove('npc-ui-hidden');
      } else {
        if (promptEl) promptEl.classList.add('npc-ui-hidden');
      }
    } else {
      if (promptEl) promptEl.classList.add('npc-ui-hidden');
    }
  }

  // Atualização Geral do NPC no Loop
  function updateNpc(delta) {
    updateNpcUI();
    updatePlayerSpeechUI();

    const distToNpc = Math.hypot(
      playerGroup.position.x - npcPosition.x,
      playerGroup.position.z - npcPosition.z
    );

    // Ciclo de falas idle quando o jogador estiver a até 12 unidades de distância
    if (!inDialogue) {
      if (distToNpc <= 12.0) {
        idleQuoteTimer += delta;
        if (idleQuoteTimer >= IDLE_QUOTE_INTERVAL) {
          idleQuoteTimer = 0;
          triggerIdleQuote();
        }
      } else {
        idleQuoteTimer = 0;
        const bubbleEl = document.getElementById('npcSpeechBubble');
        if (bubbleEl && !bubbleEl.classList.contains('npc-ui-hidden')) {
          bubbleEl.classList.add('npc-ui-hidden');
          stopSpeechAnimation();
        }
      }
    }
  }

  // Event Listeners dos Elementos de Diálogo do NPC
  document.getElementById('btnNpcInteract')?.addEventListener('click', (e) => {
    e.stopPropagation();
    startDialogue();
  });

  document.getElementById('btnCloseChat')?.addEventListener('click', (e) => {
    e.stopPropagation();
    endDialogue();
  });

  document.getElementById('npcChatForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handlePlayerSend();
  });

  // Digitação em tempo real no balão de fala do jogador
  document.getElementById('npcChatInput')?.addEventListener('input', (e) => {
    if (!inDialogue) return;
    const val = e.target.value.trim();
    if (val) {
      showPlayerSpeech(val);
    } else {
      hidePlayerSpeech(0);
    }
  });
  const velocity = new THREE.Vector3();
  const inputVector = new THREE.Vector2();
  let targetPosition = null;
  let isMoving = false;
  let facingRight = true;

  // Timers procedurais
  let walkClock = 0;
  let idleClock = 0;
  let animState = 'idle';
  let animTimer = 0;
  let currentFrameIndex = 0;
  let moveDuration = 0;
  let dustSpawnTimer = 0;

  // Zoom Dinâmico Suave
  let currentZoom = 1.0;
  let targetZoom = 1.0;
  const MIN_ZOOM = 0.55;
  const MAX_ZOOM = 2.4;

  // 7. Controles de Entrada (Teclado, Joystick, Clique)
  const keys = {
    w: false, s: false, a: false, d: false,
    up: false, down: false, left: false, right: false
  };

  window.addEventListener('keydown', (e) => {
    // Se o jogador estiver digitando na caixa de chat, não processa movimentação nem atalhos do jogo
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      if (e.key === 'Escape' && inDialogue) {
        endDialogue();
      }
      return;
    }

    // Tecla 'E' para interagir com o Mestre Sábio quando próximo
    if (e.key === 'e' || e.key === 'E') {
      const dist = Math.hypot(playerGroup.position.x - npcPosition.x, playerGroup.position.z - npcPosition.z);
      if (dist <= 3.5 && !inDialogue) {
        e.preventDefault();
        startDialogue();
        return;
      }
    }

    // Tecla Escape encerra o diálogo
    if (e.key === 'Escape' && inDialogue) {
      e.preventDefault();
      endDialogue();
      return;
    }

    const k = e.key.toLowerCase();
    if (k === 'w' || e.code === 'ArrowUp') keys.up = true;
    if (k === 's' || e.code === 'ArrowDown') keys.down = true;
    if (k === 'a' || e.code === 'ArrowLeft') keys.left = true;
    if (k === 'd' || e.code === 'ArrowRight') keys.right = true;

    if (keys.up || keys.down || keys.left || keys.right) {
      targetPosition = null; // Teclado anula destino de clique
    }

    // Atalhos de Zoom no Teclado
    if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
      targetZoom = Math.min(MAX_ZOOM, targetZoom + 0.25);
    } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
      targetZoom = Math.max(MIN_ZOOM, targetZoom - 0.25);
    } else if (e.key === '0' || e.code === 'Numpad0') {
      targetZoom = 1.0;
    }
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || e.code === 'ArrowUp') keys.up = false;
    if (k === 's' || e.code === 'ArrowDown') keys.down = false;
    if (k === 'a' || e.code === 'ArrowLeft') keys.left = false;
    if (k === 'd' || e.code === 'ArrowRight') keys.right = false;
  });

  // Zoom pela Roda do Mouse (Scroll)
  window.addEventListener('wheel', (e) => {
    const factor = e.deltaY < 0 ? 0.18 : -0.18;
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom + factor));
  }, { passive: true });

  // Botões de Zoom no HUD
  document.getElementById('btnZoomIn')?.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    targetZoom = Math.min(MAX_ZOOM, targetZoom + 0.3);
  });
  document.getElementById('btnZoomOut')?.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    targetZoom = Math.max(MIN_ZOOM, targetZoom - 0.3);
  });
  document.getElementById('btnZoomReset')?.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    targetZoom = 1.0;
  });

  // Joystick Virtual Mobile
  const joystickZone = document.getElementById('joystickZone');
  const joystickBase = document.getElementById('joystickBase');
  const joystickKnob = document.getElementById('joystickKnob');

  let joystickActive = false;
  let joystickVector = { x: 0, y: 0 };
  const maxJoystickDistance = 45;
  let joystickTouchId = null;

  function updateJoystickPosition(clientX, clientY) {
    if (!joystickBase) return;
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    let dist = Math.hypot(dx, dy);

    if (dist > maxJoystickDistance) {
      dx = (dx / dist) * maxJoystickDistance;
      dy = (dy / dist) * maxJoystickDistance;
    }

    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joystickVector = {
      x: dx / maxJoystickDistance,
      y: dy / maxJoystickDistance
    };
  }

  function resetJoystick() {
    joystickActive = false;
    joystickTouchId = null;
    joystickVector = { x: 0, y: 0 };
    if (joystickKnob) joystickKnob.style.transform = 'translate(0px, 0px)';
  }

  if (joystickZone) {
    joystickZone.addEventListener('pointerdown', (e) => {
      joystickActive = true;
      joystickTouchId = e.pointerId;
      joystickZone.setPointerCapture(e.pointerId);
      updateJoystickPosition(e.clientX, e.clientY);
      targetPosition = null;
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
  }

  // Clique / Toque no Chão via Raycaster
  const raycaster = new THREE.Raycaster();
  const mousePointer = new THREE.Vector2();

  window.addEventListener('pointerdown', (e) => {
    // Ignora cliques se estiver em diálogo ativo
    if (inDialogue) return;

    // Ignora cliques que não sejam o botão principal (botão esquerdo / toque)
    if (e.button !== undefined && e.button !== 0) return;

    // Ignora cliques no joystick, controles de zoom ou UI do NPC
    if (e.target.closest('#joystickZone') ||
        e.target.closest('#zoomControls') ||
        e.target.closest('#npcPrompt') ||
        e.target.closest('#npcChatBar') ||
        e.target.closest('#npcSpeechBubble')) return;

    mousePointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mousePointer, camera);
    const intersects = raycaster.intersectObject(groundPlane);

    if (intersects.length > 0) {
      const p = intersects[0].point;
      targetPosition = new THREE.Vector3(p.x, 0, p.z);

      // Posiciona e dispara animação expansiva do marcador verde botânico
      clickMarkerMesh.position.x = p.x;
      clickMarkerMesh.position.z = p.z;
      clickMarkerMesh.material.opacity = 0.85;
      clickMarkerMesh.scale.set(0.6, 0.6, 0.6);
    }
  });

  // Redimensionamento e Enquadramento Responsivo
  function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    camera.aspect = aspect;

    // Enquadramento dinâmico por perfil de tela
    if (aspect < 0.85) {
      // Mobile vertical
      camera.fov = 48;
      camOffsetY = 8.6;
      camOffsetZ = 11.0;
    } else if (aspect < 1.25) {
      // Tablet ou quadrado
      camera.fov = 44;
      camOffsetY = 8.0;
      camOffsetZ = 10.2;
    } else {
      // Desktop / notebook widescreen
      camera.fov = 40;
      camOffsetY = 7.5;
      camOffsetZ = 9.5;
    }

    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }
  window.addEventListener('resize', onResize);
  onResize();

  // 8. Loop Principal de Atualização do Jogador
  function updatePlayer(delta) {
    if (inDialogue) {
      isMoving = false;
      velocity.set(0, 0, 0);
      targetPosition = null;

      // Mantém a sutil microanimação de respiração no estado parado
      if (playerMesh) {
        playerMesh.renderOrder = BASE_SORT_ORDER + Math.round(playerGroup.position.z * 100);
        idleClock += delta * 2.2;
        playerMesh.position.y = BASE_Y + Math.sin(idleClock) * 0.025;
        playerMesh.rotation.z = 0;
        if (shadowMesh) shadowMesh.scale.set(1, 1, 1);
      }
      return;
    }

    inputVector.set(0, 0);

    // Entrada: Teclado
    if (keys.left) inputVector.x -= 1;
    if (keys.right) inputVector.x += 1;
    if (keys.up) inputVector.y -= 1;
    if (keys.down) inputVector.y += 1;

    // Entrada: Joystick
    if (joystickActive && (Math.abs(joystickVector.x) > 0.05 || Math.abs(joystickVector.y) > 0.05)) {
      inputVector.x = joystickVector.x;
      inputVector.y = joystickVector.y;
    }

    const inputMag = inputVector.length();
    if (inputMag > 0.05) {
      targetPosition = null;
      const factor = inputMag > 1 ? 1 / inputMag : 1;
      velocity.x = inputVector.x * factor * SPEED;
      velocity.z = inputVector.y * factor * SPEED;
      isMoving = true;
    } else if (targetPosition) {
      // Entrada: Clique no Solo
      const diffX = targetPosition.x - playerGroup.position.x;
      const diffZ = targetPosition.z - playerGroup.position.z;
      const dist = Math.hypot(diffX, diffZ);

      if (dist > 0.12) {
        velocity.x = (diffX / dist) * SPEED;
        velocity.z = (diffZ / dist) * SPEED;
        isMoving = true;
      } else {
        targetPosition = null;
        velocity.set(0, 0, 0);
        isMoving = false;
      }
    } else {
      velocity.set(0, 0, 0);
      isMoving = false;
    }

    // Atualiza posição do jogador com colisão e deslizamento elástico em pedras
    if (isMoving) {
      let nextX = playerGroup.position.x + velocity.x * delta;
      let nextZ = playerGroup.position.z + velocity.z * delta;

      // 1. Colisão elástica e deslizamento suave com pedras ativas
      const playerRadius = 0.38;
      for (let i = 0; i < activeRockObstacles.length; i++) {
        const rock = activeRockObstacles[i];
        const dx = nextX - rock.x;
        const dz = nextZ - rock.z;
        const minDist = playerRadius + rock.radius;
        const distSq = dx * dx + dz * dz;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = minDist - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          // Afasta o jogador para fora do raio da rocha
          nextX += nx * overlap;
          nextZ += nz * overlap;

          // Desliza a velocidade ao longo da tangente da rocha
          const dot = velocity.x * nx + velocity.z * nz;
          if (dot < 0) {
            velocity.x -= dot * nx;
            velocity.z -= dot * nz;
          }
        }
      }

      // 2. Colisão elástica e deslizamento suave com mobs (impede ocupar o mesmo espaço)
      const mobRadius = 0.38;
      for (let i = 0; i < mobsList.length; i++) {
        const mob = mobsList[i];
        const dx = nextX - mob.x;
        const dz = nextZ - mob.z;
        const minDist = playerRadius + mobRadius;
        const distSq = dx * dx + dz * dz;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = minDist - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          // Afasta o jogador para fora do corpo do mob
          nextX += nx * overlap;
          nextZ += nz * overlap;

          // Desliza a velocidade tangencialmente ao contorno do mob
          const dot = velocity.x * nx + velocity.z * nz;
          if (dot < 0) {
            velocity.x -= dot * nx;
            velocity.z -= dot * nz;
          }
        }
      }

      // 3. Colisão elástica e deslizamento suave com o NPC Mestre Sábio
      if (typeof npcPosition !== 'undefined') {
        const dxNpc = nextX - npcPosition.x;
        const dzNpc = nextZ - npcPosition.z;
        const minDistNpc = playerRadius + npcRadius;
        const distSqNpc = dxNpc * dxNpc + dzNpc * dzNpc;

        if (distSqNpc < minDistNpc * minDistNpc) {
          const distN = Math.sqrt(distSqNpc) || 0.001;
          const overlapN = minDistNpc - distN;
          const nx = dxNpc / distN;
          const nz = dzNpc / distN;

          nextX += nx * overlapN;
          nextZ += nz * overlapN;

          const dot = velocity.x * nx + velocity.z * nz;
          if (dot < 0) {
            velocity.x -= dot * nx;
            velocity.z -= dot * nz;
          }
        }
      }

      playerGroup.position.x = nextX;
      playerGroup.position.z = nextZ;

      if (targetPosition) {
        const remainingDist = Math.hypot(targetPosition.x - nextX, targetPosition.z - nextZ);
        if (remainingDist <= 0.15) {
          targetPosition = null;
          velocity.set(0, 0, 0);
          isMoving = false;
        }
      }

      // Direção do personagem
      if (velocity.x < -0.15) facingRight = false;
      if (velocity.x > 0.15) facingRight = true;

      // Partículas de corrida (FX) após 0.9s de movimento contínuo
      moveDuration += delta;
      if (moveDuration >= DUST_TRIGGER_TIME) {
        dustSpawnTimer += delta;
        if (dustSpawnTimer >= DUST_SPAWN_INTERVAL) {
          dustSpawnTimer = 0;
          const normDirX = velocity.x !== 0 ? Math.sign(velocity.x) : (facingRight ? 1 : -1);
          const normDirZ = velocity.z !== 0 ? Math.sign(velocity.z) : 0;
          spawnDustParticle(playerGroup.position.x, playerGroup.position.z, normDirX, normDirZ);
        }
      }
    } else {
      moveDuration = 0;
      dustSpawnTimer = 0;
    }

    // Seleção de Estado de Animação
    let targetAnimState = 'idle';
    if (isMoving) {
      targetAnimState = facingRight ? 'run_right' : 'run_left';
    }

    if (animState !== targetAnimState) {
      animState = targetAnimState;
      animTimer = 0;
      currentFrameIndex = 0;
    }

    // Animação de Passos, Pulinho e Sombra
    if (playerMesh) {
      // Ordenação dinâmica de profundidade 2.5D (Z-sorting):
      // Quando Z do player for maior que Z do mob (mais à frente), renderOrder será maior e sobrepõe o mob
      playerMesh.renderOrder = BASE_SORT_ORDER + Math.round(playerGroup.position.z * 100);
      const activeAnimFrames = spriteTextures[animState] || [];
      const isDedicatedDir = (animState === 'run_left' || animState === 'run_right');
      const scaleX = isDedicatedDir ? 1 : (facingRight ? 1 : -1);
      playerMesh.scale.x = scaleX;

      if (isMoving) {
        walkClock += delta * 12;

        // Troca de frames na corrida (~7 fps / 0.14s)
        if (activeAnimFrames.length > 1) {
          animTimer += delta;
          if (animTimer >= 0.14) {
            animTimer = 0;
            currentFrameIndex = (currentFrameIndex + 1) % activeAnimFrames.length;
          }
        } else {
          currentFrameIndex = 0;
        }

        const currentTex = activeAnimFrames[currentFrameIndex] || spriteTextures.idle[0];
        if (currentTex && playerMesh.material.map !== currentTex) {
          playerMesh.material.map = currentTex;
          playerMesh.material.needsUpdate = true;
        }

        // Pulo dinâmico de passo & inclinação de caminhada
        const stepHop = Math.abs(Math.sin(walkClock)) * 0.14;
        playerMesh.position.y = BASE_Y + stepHop;
        playerMesh.rotation.z = Math.sin(walkClock) * (facingRight ? -0.05 : 0.05);

        // Sombra pulsa em escala inversa com os pés
        if (shadowMesh) {
          const sScale = 1 - (stepHop * 1.2);
          shadowMesh.scale.set(sScale, sScale, sScale);
        }
      } else {
        // Modo Parado (Idle): Microanimação de Respiração Suave
        idleClock += delta * 2.2;
        playerMesh.position.y = BASE_Y + Math.sin(idleClock) * 0.025;
        playerMesh.rotation.z = 0;

        if (shadowMesh) {
          shadowMesh.scale.set(1, 1, 1);
        }

        // Troca sutil entre os frames de idle (~0.75s)
        const idleFrames = spriteTextures.idle || [];
        if (idleFrames.length > 1) {
          animTimer += delta;
          if (animTimer >= 0.75) {
            animTimer = 0;
            currentFrameIndex = (currentFrameIndex + 1) % idleFrames.length;
          }
        } else {
          currentFrameIndex = 0;
        }

        const currentTex = idleFrames[currentFrameIndex];
        if (currentTex && playerMesh.material.map !== currentTex) {
          playerMesh.material.map = currentTex;
          playerMesh.material.needsUpdate = true;
        }
      }
    }

    // Efeito de onda e desaparecimento suave do marcador de clique
    if (clickMarkerMesh && clickMarkerMesh.material.opacity > 0) {
      clickMarkerMesh.material.opacity = Math.max(0, clickMarkerMesh.material.opacity - delta * 1.5);
      const s = clickMarkerMesh.scale.x + delta * 0.8;
      clickMarkerMesh.scale.set(s, s, s);
    }
  }

  // 9. Atualização da Câmera (LERP Zen & Zoom Suave)
  function updateCamera(delta) {
    // Interpolação de Zoom
    currentZoom += (targetZoom - currentZoom) * 0.1;
    camera.zoom = currentZoom;
    camera.updateProjectionMatrix();

    // LERP suave seguindo o jogador ou o enquadramento cinemático no diálogo
    let targetCamX = playerGroup.position.x;
    let targetCamZ = playerGroup.position.z + camOffsetZ;
    let targetCamY = camOffsetY;

    if (inDialogue && typeof npcPosition !== 'undefined') {
      // Ponto médio entre o jogador e o Mestre Sábio
      targetCamX = (playerGroup.position.x + npcPosition.x) * 0.5;
      targetCamZ = (playerGroup.position.z + npcPosition.z) * 0.5 + (camOffsetZ * 0.65);
      targetCamY = camOffsetY * 0.72;
    }

    camera.position.x += (targetCamX - camera.position.x) * 0.08;
    camera.position.z += (targetCamZ - camera.position.z) * 0.08;
    camera.position.y += (targetCamY - camera.position.y) * 0.08;

    // Foco cinematográfico
    const lookTargetX = (inDialogue && typeof npcPosition !== 'undefined') ? (playerGroup.position.x + npcPosition.x) * 0.5 : camera.position.x;
    const lookTargetZ = (inDialogue && typeof npcPosition !== 'undefined') ? (playerGroup.position.z + npcPosition.z) * 0.5 : (camera.position.z - camOffsetZ);
    camera.lookAt(lookTargetX, 1.0, lookTargetZ);

    // Chão infinito segue a posição do jogador de forma transparente
    groundPlane.position.x = playerGroup.position.x;
    groundPlane.position.z = playerGroup.position.z;
    marksPlane.position.x = playerGroup.position.x;
    marksPlane.position.z = playerGroup.position.z;
    if (marksPlane.material.map) {
      marksPlane.material.map.offset.x = (playerGroup.position.x / 350) * 70;
      marksPlane.material.map.offset.y = -(playerGroup.position.z / 350) * 70;
    }

    // Atualiza HUD
    if (posDisplay) {
      posDisplay.textContent = `X: ${playerGroup.position.x.toFixed(1)} | Z: ${playerGroup.position.z.toFixed(1)} | Zoom: ${currentZoom.toFixed(1)}x`;
    }
  }

  // 10. Loop de Renderização
  const clock = new THREE.Clock();

  // Inicialização dos chunks ao redor da posição inicial
  checkChunkUpdates();

  function renderLoop() {
    const delta = Math.min(clock.getDelta(), 0.1);

    checkChunkUpdates();
    updatePlayer(delta);
    updateMobs(delta);
    if (typeof updateNpc === 'function') updateNpc(delta);
    updateParticles(delta);
    updateCamera(delta);

    renderer.render(scene, camera);

    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
})();
