# 🎮 Gamezin — Motor 2.5D Isométrico Suave (Three.js)

Um motor de jogo leve, fluido e altamente responsivo desenvolvido em **Three.js (WebGL)**, utilizando uma perspectiva **2.5D Isométrica Suave (Tilted Projection)** inspirada no estilo *Paper Mario* e na engenharia visual do modo **Explorar** (*O Caminho das Flores*).

O jogo foi projetado para rodar nativamente em Desktop e Mobile (smartphones/tablets), com suporte completo a mouse, toque na tela, teclado e joystick virtual analógico.

---

## 🧭 1. Engenharia Visual e Matemática da Câmera

Ao contrário de uma visão *Top-Down* ortográfica clássica (90° vertical) que achata o cenário, este projeto utiliza uma câmera em perspectiva estreita e ligeiramente inclinada, combinada com contra-inclinação de sprites (*billboarding*).

### 📐 Configuração da Câmera
- **Tipo:** `THREE.PerspectiveCamera`
- **FOV Base (Desktop):** `40°` a `42°` (evita distorções de lente nas bordas da tela).
- **Posição Inicial:** `(X: 0, Y: 7.5, Z: 9.5)`
- **Ponto Focal (LookAt):** `(camera.x, 1.0, camera.z - 9.5)` — mira ligeiramente acima do chão (`Y = 1.0`).
- **Ângulo de Ataque ao Solo:** Aproximadamente **~38° a 40°**.

```javascript
const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 200);
camera.position.set(0, 7.5, 9.5);
camera.lookAt(0, 1.0, 0);
```

### 📱 Enquadramento Dinâmico Responsivo
A câmera adapta automaticamente o campo de visão (`fov`) e os offsets de elevação/recuo (`camOffsetY`, `camOffsetZ`) com base na proporção da tela (`aspect = width / height`):

| Perfil de Tela | Aspect Ratio | FOV | Elevação (Y) | Recuo (Z) | Experiência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mobile Portrait** (celular na vertical) | `< 0.85` | **48°** | `8.6` | `11.0` | Campo visual mais aberto para antecipar obstáculos |
| **Tablet / Quase Quadrado** | `0.85` a `1.25` | **44°** | `8.0` | `10.2` | Enquadramento equilibrado |
| **Desktop / Widescreen** | `>= 1.25` | **40°** | `7.5` | `9.5` | Imersão panorâmica cinematográfica |

### 🍃 Amortecimento Zen da Câmera (LERP)
A câmera não fica travada rigidamente no jogador; ela utiliza uma interpolação elástica com amortecimento suave:
```javascript
const targetCamX = playerGroup.position.x;
const targetCamZ = playerGroup.position.z + camOffsetZ;

camera.position.x += (targetCamX - camera.position.x) * 0.08;
camera.position.z += (targetCamZ - camera.position.z) * 0.08;
camera.position.y = camOffsetY;
camera.lookAt(camera.position.x, 1.0, camera.position.z - camOffsetZ);
```

### 🔍 Zoom Suave Multidispositivo
- **Intervalo:** Mínimo `0.55x` (visão aberta) a Máximo `2.4x` (detalhe próximo).
- **Interpolação:** `camera.zoom += (targetZoom - camera.zoom) * 0.1` seguido de `camera.updateProjectionMatrix()`.
- **Gatilhos:** Roda do mouse (`wheel`), teclas `+` / `-` / `0` ou botões dedicados no HUD (`+`, `-`, `1x`).

---

## 🧍 2. O Truque do Billboard Inclinado (`rotation.x = -0.36`)

Se um sprite 2D for posicionado perfeitamente na vertical (`rotation.x = 0`) enquanto a câmera olha a ~38°, o sprite parecerá tombado para trás.

Para contra-balancear a inclinação da câmera, **todos os sprites de personagens, arbustos ou objetos 2D** recebem uma inclinação fixa para a frente:

$$\text{rotation.x} = -0.36\text{ rad} \approx -20.62^\circ$$

```javascript
playerMesh.rotation.x = -0.36;
```
* **Resultado Visual:** O desenho parece "olhar" frontalmente na direção da câmera, mantendo a base dos pés perfeitamente ancorada no plano tridimensional.

---

## 🌫️ 3. Horizonte Infinito e Fusão por Névoa

Para evitar uma linha de corte ou horizonte brusco entre o chão e o fundo, o cenário emprega uma técnica de **fusão volumétrica tonal única**:

- **Cor Base Orgânica:** `#fcfbf8` (Branco quente relaxante e acolhedor).
- **Névoa Volumétrica:** `THREE.FogExp2(0xfcfbf8, 0.018)`.
- **Material do Chão:** `MeshBasicMaterial({ color: 0xfcfbf8 })`.
- **Ancoragem Infinita do Chão:** O plano do chão e a malha de marcas sutis acompanham continuamente a posição do jogador no mundo, deslocando o offset da textura no espaço global. O chão **nunca termina**.

---

## 🎯 4. Marcador de Toque Suave (Click Indicator)

Quando o jogador clica ou toca no chão, um indicador orgânico de feedback visual é acionado via Three.js Raycaster:

### Passo 1: Textura Procedural Canvas 2D
Gerada em tempo de execução sem requisições de rede:
```javascript
function createClickMarkerTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 128;
  cvs.height = 128;
  const ctx = cvs.getContext('2d');

  // Anel externo translúcido verde botânico
  ctx.strokeStyle = 'rgba(78, 122, 102, 0.72)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.stroke();

  // Miolo suave que marca o ponto de contato exato
  ctx.fillStyle = 'rgba(120, 170, 145, 0.42)';
  ctx.beginPath();
  ctx.arc(64, 64, 16, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(cvs);
}
```

### Passo 2: Efeito Onda e Desaparecimento no Loop
- **No Clique:** `opacity = 0.85`, `scale = 0.6`.
- **No Loop de Renderização:**
  ```javascript
  if (clickMarkerMesh.material.opacity > 0) {
    clickMarkerMesh.material.opacity = Math.max(0, clickMarkerMesh.material.opacity - delta * 1.5);
    const s = clickMarkerMesh.scale.x + delta * 0.8;
    clickMarkerMesh.scale.set(s, s, s);
  }
  ```

---

## 🌑 5. Sombra Dinâmica e Microanimações

### Sombra Projetada em Elipse
- Malha plana no chão em `Y = 0.02` com gradiente radial preto-azulado suave.
- **Pulso de Passos:** Quando o personagem caminha ou corre, a sombra encolhe e expande em sincronia com o pulo do passo:
  $$\text{scale} = 1 - (\text{stepHop} \times 1.2)$$

### Microanimação de Respiração (Idle)
Quando parado, o personagem respira suavemente através de uma senoide contínua no eixo vertical:
```javascript
idleClock += delta * 2.2;
playerMesh.position.y = BASE_Y + Math.sin(idleClock) * 0.025;
```

### Balanço de Caminhada
- **Elevação do Passo:** `stepHop = Math.abs(Math.sin(walkClock)) * 0.14`.
- **Inclinação Pendular:** `playerMesh.rotation.z = Math.sin(walkClock) * (facingRight ? -0.05 : 0.05)`.

### Partículas de Corrida (FX Dust)
- Quando o jogador se desloca por mais de `0.9s` contínuo, nuvens cartunizadas de poeira são geradas nos calcanhares com elevação, rotação e esvaecimento gradativo.

---

## 🕹️ 6. Sistema de Controles

| Entrada | Ação | Plataforma |
| :--- | :--- | :--- |
| **WASD / Setas** | Movimentação direcional | Teclado Desktop |
| **Clique / Toque no Chão** | Raycaster calcula o ponto no plano 3D e o jogador anda até o local | Mouse / Touch Mobile |
| **Joystick Virtual** | Analógico virtual com arraste de raio 45px na tela | Telas Touch Mobile |
| **Scroll do Mouse** | Zoom dinâmico contínuo | Mouse Desktop |
| **Teclas `+`, `-`, `0`** | Zoom in, Zoom out e Reset (1x) | Teclado Desktop |
| **Botões `+`, `-`, `1x`** | Controles táteis de Zoom no HUD | Desktop & Mobile |

---

---

## 🌿 6. Elementos de Ambiente e Chunks Infinitos

O cenário conta com geração procedural infinita baseada em grade de chunks (`24x24` unidades de mundo) com semente determinística (PRNG Mulberry32), garantindo que os mesmos elementos apareçam sempre nas mesmas coordenadas:

### 🌾 Gramas (`grama-a.png`, `grama-b.png`, `grama-c.png`, `grama-d.png`)
- **Visual:** Tufos orgânicos em 4 variantes com inclinação billboard `rotation.x = -0.36`.
- **Ancoragem Firme no Solo:** Elementos 100% estáticos fixados na base, sem oscilações artificiais ou efeito flutuante.
- **Sombra Discreta de Contato:** Sombra elíptica sutil (`opacity: 0.22`) rente à raiz da planta no chão.
- **Física:** Totalmente transponíveis pelo personagem.

### 🪨 Pedras e Rochas (`pedra-a.png`, `pedra-b.png`, `pedra-c.png`)
- **Visual:** Rochas sólidas em 3 variantes com variações de escala e espelhamento horizontal.
- **Sombra Rente de Contato:** Sombra compacta projetada diretamente sob a base de contato (`opacity: 0.22`), conferindo peso visual no plano 3D.
- **Colisão Elástica & Sliding:** Sistema de colisão circular com desvio tangencial (`sliding collision`), impedindo que o jogador atravesse a rocha e permitindo contorná-la suavemente com teclado, toque ou joystick.
- **Área Segura:** Raio de `3.2` unidades ao redor de `(0, 0)` mantido 100% livre de rochas para garantir o nascimento seguro do jogador.

---

## 🐛 7. Entidades e Mobs (Slimes / Criaturas)

O mapa conta com a presença de criaturas autônomas que povoam o cenário com vida e dinamismo:

### 🔄 Ciclo Ping-Pong (`mob-a-1.png` a `mob-a-4.png`)
- **Sequência:** `1 > 2 > 3 > 4 > 3 > 2 > 1 > 2 > 3...`
- **Índices de Animação:** `[0, 1, 2, 3, 2, 1]`, gerando contração orgânica seguida de distensão estilo lagarta/slime.
- **Cadência Suave:** `0.32s` por frame (~3.1 fps), proporcional à nova velocidade lenta de rastejo para manter perfeita harmonia mecânica e visual.

### ⚓ Ponto de Fixação no Centro Inferior
- Como os desenhos originais de 512x512 foram produzidos com o mob posicionado na base inferior da tela, a malha tridimensional aplica:
  ```javascript
  const mobGeo = new THREE.PlaneGeometry(MOB_SIZE, MOB_SIZE);
  mobGeo.translate(0, MOB_SIZE / 2, 0); // O pivô (0, 0, 0) passa a ser a base inferior central
  ```
- Com a inclinação billboard de `-0.36 rad` (`-20.6°`), o monstrinho fica perfeitamente assentado no chão (`Y = 0`) em qualquer ângulo de visualização ou zoom, sem flutuação.

### 🧭 Movimentação Lenta e IA Aleatória (Wandering AI)
- **Velocidade Reduzida 3x:** Velocidade base de `0.53` unidades/s (3x mais devagar), transmitindo a sensação tátil de um rastejo orgânico e calmo.
- **Patrulha Autônoma:** Cada criatura sorteia destinos em um raio de `3.5` a `10` unidades ao redor de seu local atual.
- **Pausas Naturais:** Ao alcançar o destino, o mob entra em estado de repouso (`idle`) por `0.8s` a `2.2s`, retornando ao frame de repouso esticado (`mob-a-1.png`).
- **Inversão de Sentido:** Quando caminha para a direita ($V_x > 0$), a malha inverte horizontalmente (`scale.x = -1`), visto que a arte original foi ilustrada olhando para a esquerda.
- **Sombra Dedicada:** Sombra elíptica projetada suavemente sob a base de cada criatura (`renderOrder = 1`).

### 🧱 Colisão Mútua Sólida (Player $\leftrightarrow$ Mob)
- **Não Ocupação de Espaço Comum:** O jogador e as criaturas não podem ocupar o mesmo espaço tridimensional ($D_{\min} = 0.76$).
- **Desvio Elástico Bidirecional:**
  - Se o jogador caminha contra o mob, o player é contido e desliza tangencialmente pelo contorno do corpo da criatura.
  - Se o mob rasteja em direção ao player, o mob desvia e contorna o jogador.
  - Mobs também detectam colisão mútua entre si e contra rochas do cenário (`activeRockObstacles`).

### 📐 Ordenação de Profundidade 2.5D Dinâmica (Z-Sorting)
- Para que o mundo 2.5D respeite a oclusão visual de forma natural:
  ```javascript
  playerMesh.renderOrder = BASE_SORT_ORDER + Math.round(playerGroup.position.z * 100);
  mob.mesh.renderOrder = BASE_SORT_ORDER + Math.round(mob.z * 100);
  ```
  - **Mob à Frente:** Quando o mob está posicionado mais ao sul/frente do jogador ($Z_{\text{mob}} > Z_{\text{player}}$), o mob recebe `renderOrder` superior e é desenhado **sobrepondo o jogador**.
  - **Mob Atrás:** Quando o jogador se posiciona à frente do mob ($Z_{\text{player}} > Z_{\text{mob}}$), o jogador recebe `renderOrder` superior e é desenhado **sobrepondo o mob**.
  - Esse mesmo critério se estende para pedras e gramas do cenário.

---

## 🪷 8. NPC Mestre Sábio (Ensinamentos do Corvo Seco & IA DeepSeek)

O mapa conta com um sábio contemplativo localizado nas coordenadas **`(X: 10, Z: 10)`**, acompanhado de seu cajado e um gato sereno. O personagem é profundamente inspirado pela sabedoria de não-dualidade, autoinvestigação e quietude mental compartilhadas pelo canal **Corvo Seco** (Advaita Vedanta, Zen, Wu Hsin, Ramana Maharshi, Nisargadatta Maharaj).

### 🧘‍♂️ Ciclo Idle de Ensinamentos (30 Frases Pré-definidas)
- Quando o jogador está em seu campo de percepção (raio de até 12 unidades) sem interagir ativamente:
- A cada `~11.5s`, o sábio profere um ensinamento reflexivo em um balão flutuante projetado diretamente sobre sua cabeça.
- Durante a fala, a boca do ancião anima entre repouso (`old-a.png`) e aberta (`old-b.png`), voltando suavemente à quietude.
- O jogo conta com um acervo de **30 frases poéticas e profundas** sobre a mente, o ego, o desapego e o instante presente.

### 💬 Proximidade e Interação Cinemática
- **Detecção de Proximidade:** Ao se aproximar a menos de `3.2 unidades`, surge o botão flutuante com indicação de tecla `E` e toque/clique para conversar.
- **Enquadramento Cinemático:** Ao iniciar o diálogo:
  - O movimento do jogador é travado em postura serena.
  - A câmera realiza uma interpolação suave (LERP) para o ponto médio entre o viajante e o mestre.
  - O zoom aumenta suavemente para `1.95x`.
  - O sábio inicia com a saudação: *"O que traz sua mente inquieta até este silêncio, viajante?"*.

### 🧠 Diálogo Vivo com IA (DeepSeek API)
- **Barra de Entrada Responsiva:** Permite digitar livremente perguntas, reflexões ou sentimentos pelo teclado físico ou pelo teclado virtual do smartphone.
- **Modelo e Persona:** Conectado à API do DeepSeek (`deepseek-v4-flash`), instruído com a persona acolhedora e meditativa do canal Corvo Seco.
- **Limite de 5 Turnos e Desculpa Zen:**
  - A conversa permite até **5 interações**.
  - No 5º turno, a IA formula uma resposta contextual profunda e **inventa uma desculpa filosófica e poética com seu gato** para encerrar o diálogo (ex: que as palavras já cumpriram sua função de apontar o caminho, que agora é hora de praticar o silêncio, ou que o gato precisa de quietude).
  - Após a fala final ser lida, a interface fecha suavemente, a câmera retorna ao zoom e ângulo original do jogador e os controles são liberados.
  - A tecla `Esc` ou o botão `✕ Encerrar` permitem sair a qualquer momento.

---

## 🧙‍♂️ 9. Mago Flutuante Místico (Aparição Efêmera & Levitação)

O mundo conta com a presença misteriosa do **Mago Flutuante**, uma entidade mística que transita suavemente entre o visível e o invisível.

### ✨ Mecânica e Comportamento
- **Materialização e Desaparecimento (Fade In / Fade Out):** O mago surge gradualmente com uma transição suave de opacidade (`smoothstep`), permanece ativo no mapa por **18 a 26 segundos** e se desmaterializa de forma etérea, ficando invisível por **10 a 20 segundos** antes de reaparecer em outro ponto do cenário.
- **Física de Levitação:** Flutua elevado a **`+1.25 unidades`** acima do chão, com oscilação vertical contínua (`bobbing` senoidal).
- **Sombra Dinâmica no Solo:** Possui uma sombra elíptica projetada no chão que expande, contrai e modula sua opacidade dinamicamente conforme o mago sobe, desce ou entra em fade.
- **Sistema de Navegação em 4 Modos (Muito além de círculos):**
  1. **Peregrinação Livre (Wanderlust / Travessia):** O mago escolhe marcos distantes no mapa (14 a 26 unidades pelo descampado) e viaja em linha ondulatória cruzando o cenário com velocidade de cruzeiro de ~2.1 un/s.
  2. **Rasante Curioso (Flyby em Curva Ampla):** Vem de longe, corta a rota perto do Viajante ou do Mestre Velho a uma distância segura (~3.8 un) com aceleração suave e segue rumo ao horizonte.
  3. **Lemniscata do Infinito ($\infty$):** Trajetória tridimensional harmônica no formato da figura 8 / símbolo do infinito, com aceleração suave nas curvas e cruzamento central.
  4. **Espiral Harmônica Flutuante:** Trajetória em espiral que se expande e se contrai com variações contínuas de altitude.
- **4 Loops de Poses Temáticos (Derivados do Modelo Base):**
  1. *Meditativo Clássico (19 poses):* `A > B > A > B > A > B > C > C > D > C > E > E > C > C > C > A > A > B > A` (~0.16s/frame).
  2. *Canalização Arcana (20 poses):* `A > B > C > D > C > D > E > E > E > D > C > D > E > E > C > C > B > A > B > A` (~0.16s/frame).
  3. *Voo Espectral Rápido (16 poses):* `A > A > B > A > B > B > A > B > C > C > D > C > B > A > B > A` (~0.13s/frame).
  4. *Revelação & Êxtase (18 poses):* `A > B > A > C > C > D > D > E > E > E > E > D > D > C > C > A > B > A` (~0.15s/frame).

---

## 📁 10. Estrutura de Arquivos

```
gamezin/
├── index.html              # Estrutura HTML5 com Canvas, Joystick, HUD e Balão/Chat do NPC
├── style.css               # Estilização responsiva, tema orgânico #fcfbf8 e UI do NPC
├── game.js                 # Motor Three.js 2.5D, IA dos mobs, NPC Corvo Seco e Mago Flutuante
├── three.min.js            # Biblioteca Three.js local (standalone offline)
├── manifest.json           # Manifesto PWA para tela cheia em dispositivos móveis
├── ASSETS_GUIDE.md         # Guia técnico para desenhar e exportar novos sprites
│
├── player.png              # Frame 1 de repouso do jogador (Idle)
├── player-b.png            # Frame 2 de repouso do jogador (Idle)
├── player-run-right-a.png  # Corrida para a direita (frame 1)
├── player-run-right-b.png  # Corrida para a direita (frame 2)
├── player-run-left-a.png   # Corrida para a esquerda (frame 1)
├── player-run-left-b.png   # Corrida para a esquerda (frame 2)
│
├── old-a.png               # NPC Mestre Sábio (padrão / boca fechada)
├── old-b.png               # NPC Mestre Sábio (falando / boca aberta)
│
├── mago-a.png              # Mago Flutuante - Pose A
├── mago-b.png              # Mago Flutuante - Pose B
├── mago-c.png              # Mago Flutuante - Pose C
├── mago-d.png              # Mago Flutuante - Pose D
├── mago-e.png              # Mago Flutuante - Pose E
│
├── mob-a-1.png             # Frame 1 da criatura (esticado/repouso)
├── mob-a-2.png             # Frame 2 da criatura (início da contração)
├── mob-a-3.png             # Frame 3 da criatura (contração intermediária)
├── mob-a-4.png             # Frame 4 da criatura (contração máxima vertical)
│
├── grama-a.png             # Tufo de grama - variante A
├── grama-b.png             # Tufo de grama - variante B
├── grama-c.png             # Tufo de grama - variante C
├── grama-d.png             # Tufo de grama - variante D
├── pedra-a.png             # Rocha sólida - variante A
├── pedra-b.png             # Rocha sólida - variante B
├── pedra-c.png             # Rocha sólida - variante C
└── arvore-a.png            # Árvore frondosa (1024x1024) com copa 2.5D e tronco colidível
```

---

## 🚀 11. Como Executar e Testar

Como o projeto é construído em JavaScript puro e Three.js local, basta servi-lo por qualquer servidor estático HTTP:

### Opção 1: Node.js (`npx serve` ou `http-server`)
```bash
npx serve .
# ou
npx http-server -p 8080
```

### Opção 2: Python
```bash
python -m http.server 8080
```

Abra no navegador em: **`http://localhost:8080`**  
Para testar no celular, conecte no mesmo Wi-Fi e acesse pelo IP da sua máquina (ex: `http://192.168.x.x:8080`).
