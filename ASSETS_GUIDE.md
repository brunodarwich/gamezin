# 🎨 Guia de Assets e Sprites — Gamezin (Three.js 2.5D)

Este guia define as especificações e boas práticas para criação, desenho e exportação de sprites 2D para uso no motor 2.5D Three.js do **Gamezin**.

---

## 1. Resolução e Proporções Recomendadas

No Three.js, os objetos são medidos em unidades de mundo 3D. O personagem possui altura padrão de **`2.0 unidades`** (`PLAYER_HEIGHT = 2.0`), e a largura é calculada automaticamente mantendo o *aspect ratio* natural da imagem:

| Tipo de Asset | Resolução do Arquivo (PNG) | Proporção / Pose | Unidades 3D (Mundo) | Inclinação Billboard |
| :--- | :--- | :--- | :--- | :--- |
| **Personagem Principal** | **`512 x 512 px`** (POT) | Em pé, corpo inteiro, pés rentes à base inferior | Altura: `2.0` / Largura: `2.0 * aspect` | `rotation.x = -0.36` |
| **Mobs & Criaturas** | **`512 x 512 px`** (POT) | Arte apoiada no centro inferior do quadro | Escala: `1.9` (Pivô no centro inferior) | `rotation.x = -0.36` |
| **Mago Flutuante** | **`512 x 512 px`** (POT) | Levitando, corpo inteiro | Altura: `2.0` (Elevado `+1.25Y` no ar) | `rotation.x = -0.36` |
| **Itens & Coletáveis** | **`256 x 256 px`** | Em pé ou repousado | Altura: `0.6` a `0.8` | `rotation.x = -0.36` |
| **Arbustos & Vegetação** | **`512 x 256 px`** ou **`512 x 512 px`** | Base reta no chão | Altura: `0.8` a `1.4` | `rotation.x = -0.36` |
| **Estruturas / Cenários** | **`512 x 512 px`** a **`1024 x 1024 px`** | Base no chão | Altura: `2.5` a `4.0` | `rotation.x = -0.36` |

---

## 2. Dicas de Arte e Estilo Visual

1. **Pose Frontal ou 3/4:**
   - Desenhe o personagem **em pé** (não visto de cima como em top-down).
   - O jogo aplica espelhamento automático suave ou usa sprites dedicados para esquerda e direita.
2. **Ponto de Apoio dos Pés / Base Inferior (Ancoragem):**
   - Desenhe o personagem ou criatura tocando quase a borda inferior da imagem (deixe apenas ~2 a 4px de respiro). No caso de criaturas/mobs, o ponto de fixação deve ser o **centro inferior** (`mobGeo.translate(0, height / 2, 0)`), alinhando o corpo perfeitamente com o solo tridimensional e a sombra elíptica.
3. **Contorno Marcante (Estilo Paper Mario):**
   - Um contorno escuro sólido (e opcionalmente uma leve borda branca de adesivo recortado) acentua o efeito de folha de papel tridimensional.
4. **Por que Potência de 2 (Power of Two - POT)?**
   - Texturas `256x256`, `512x512` e `1024x1024` são otimizadas nativamente pelas GPUs (computadores e smartphones), permitindo filtragem mipmap suave (`LinearMipmapLinearFilter`) sem borrões ou perda de definição em telas Retina / alta densidade.

---

## 3. Conjuntos de Animação e Nomenclatura de Arquivos

O motor `game.js` detecta e carrega automaticamente os seguintes conjuntos de frames:

| Ação / Entidade | Arquivos no Projeto | Cadência de Troca | Comportamento no Jogo |
| :--- | :--- | :--- | :--- |
| **Parado (Idle)** | `player.png` e `player-b.png` | ~0.75s por frame | Respiração suave procedural no eixo Y |
| **Correndo p/ Direita** | `player-run-right-a.png` e `player-run-right-b.png` | ~0.14s (~7 fps) | Balanço de passos com pulinho (`stepHop`) e poeira FX |
| **Correndo p/ Esquerda** | `player-run-left-a.png` e `player-run-left-b.png` | ~0.14s (~7 fps) | Balanço de passos com pulinho (`stepHop`) e poeira FX |
| **Mobs (Slimes)** | `mob-a-1.png` a `mob-a-4.png` | ~0.32s por frame (~3 fps) | Ciclo ping-pong `1>2>3>4>3>2>1`, velocidade 3x lenta, colisão mútua e Z-sorting |
| **NPC Mestre Sábio** | `old-a.png` e `old-b.png` | Boca abre/fecha durante fala | `old-a.png` (padrão/repouso), `old-b.png` (falando com IA ou frases idle) |
| **Mago Flutuante** | `mago-a.png` a `mago-e.png` | ~0.13s a 0.16s por frame | 4 loops temáticos derivados do modelo original: Meditativo (19 poses), Canalização Arcana (20 poses), Voo Espectral (16 poses) e Revelação (18 poses). Navegação em 4 modos com velocidade suave limitada a 1.25 un/s. Duração efêmera de 8 a 14s visível, pulso espectral de opacidade (0.40 a 0.98), sombra dinâmica e ausência de 30 a 60s (3x aumentada) |
| **Vegetação (Gramas)** | `grama-a.png` a `grama-d.png` | Estático com sombra rente | 4 variantes de tufos assentados no chão; transponíveis |
| **Obstáculos (Pedras)** | `pedra-a.png` a `pedra-c.png` | Estático com sombra rente | 3 variantes com colisão circular elástica e deslizamento suave |
| **Árvores & Cenário** | `arvore-a.png` (1024x1024 px) | Estático com sombra de tronco | Árvore frondosa majestosa com colisão sólida no tronco, copa transponível em 2.5D e Z-sorting |
| **Baú 3D (Textura UV)** | `bau-texture.png` (1024x1024 px) | Atlas UV de 6 faces para o modelo 3D | Textura completa para o baú articulado (tampa móvel e base com fechadura) |
| **Maçã Coletável** | `maca.png` (256x256 px) | Pose estática vertical com folhinha | Altura: `0.45` un, inclinada a -20.6°, sombra elíptica |
| **Player Carregando Maçã** | `player-apple-idle-a.png` a `player-apple-run-left-b.png` (6 frames) | 512x512 px, corpo inteiro com maçã nas mãos | Altura: `2.0` un, pés na base inferior, espelha animações do player |

> **Nota:** Para adicionar mais frames ou variantes de ambiente, basta incluir o arquivo no array correspondente em `game.js`:
> ```javascript
> const spriteAssets = {
>   idle: ['player.png', 'player-b.png'],
>   run_right: ['player-run-right-a.png', 'player-run-right-b.png'],
>   run_left: ['player-run-left-a.png', 'player-run-left-b.png']
> };
> const spriteAssetsWithApple = {
>   idle: ['player-apple-idle-a.png', 'player-apple-idle-b.png'],
>   run_right: ['player-apple-run-right-a.png', 'player-apple-run-right-b.png'],
>   run_left: ['player-apple-run-left-a.png', 'player-apple-run-left-b.png']
> };
> const envAssets = {
>   grass: ['grama-a.png', 'grama-b.png', 'grama-c.png', 'grama-d.png'],
>   rock: ['pedra-a.png', 'pedra-b.png', 'pedra-c.png'],
>   tree: ['arvore-a.png']
> };
> ```

---

## 5. Especificações para Desenhar os Novos Assets

### 📦 A. Textura do Baú 3D (`bau-texture.png` — 1024x1024 px)
O baú é um modelo 3D estilizado com proporções cartunescas. Crie uma imagem PNG de **`1024 x 1024 px`** com as seguintes áreas desenhadas:

```
+-----------------------------+-----------------------------+
|                             |                             |
|      FRENTE DA TAMPA        |       TOPO DA TAMPA         |
|   (0, 0 até 512, 256 px)    |  (512, 0 até 1024, 256 px)  |
|  [Madeira curvada c/ aba]   | [Tábuas curvadas + ferragem]|
|                             |                             |
+-----------------------------+-----------------------------+
|                             |                             |
|       FRENTE DA BASE        |    LATERAIS (ESQ. E DIR.)   |
|  (0, 256 até 512, 512 px)   | (512, 256 até 1024, 512 px) |
| [Madeira + Fecho Dourado]   |  [Madeira + Alças de ferro] |
|                             |                             |
+-----------------------------+-----------------------------+
|                             |                             |
|     TRASEIRA DO BAÚ         |      INTERIOR DO BAÚ        |
|  (0, 512 até 512, 768 px)   | (512, 512 até 1024, 768 px) |
|   [Dobradiças de ferro]     |   [Forro aveludado escuro]  |
|                             |                             |
+-----------------------------+-----------------------------+
|                             |                             |
|     FUNDO DA BASE (CHÃO)    |      RESERVA / DETALHES     |
|  (0, 768 até 512, 1024 px)  | (512, 768 até 1024, 1024 px)|
|                             |                             |
+-----------------------------+-----------------------------+
```

### 🍎 B. Maçã Coletável (`maca.png` — 256x256 px)
- **Formato:** PNG com transparência (RGBA).
- **Desenho:** Maçã vermelha suculenta, cabinho marrom e folha verde brilhante.
- **Estilo:** Contorno marcante preto/marrom escuro (estilo Paper Mario).
- **Tamanho:** Ocupando cerca de 80% da área do quadro de 256x256 px.

### 🚶 C. Sprites do Viajante Segurando Maçã (6 Arquivos — 512x512 px cada)
Para que a troca de animação fique perfeita, decalque a silhueta dos sprites atuais mantendo a posição dos pés e a cabeça:
1. **`player-apple-idle-a.png`**: Postura de repouso (baseada em `player.png`), com os dois braços segurando a maçã na frente do tórax.
2. **`player-apple-idle-b.png`**: Postura de respiração (baseada em `player-b.png`), peito levemente expandido / maçã subindo ~4px.
3. **`player-apple-run-right-a.png`**: Passo 1 correndo para direita (baseado em `player-run-right-a.png`), segurando a maçã firmemente.
4. **`player-apple-run-right-b.png`**: Passo 2 correndo para direita (baseado em `player-run-right-b.png`).
5. **`player-apple-run-left-a.png`**: Passo 1 correndo para esquerda (baseado em `player-run-left-a.png`).
6. **`player-apple-run-left-b.png`**: Passo 2 correndo para esquerda (baseado em `player-run-left-b.png`).


---

## 4. Como os Sprites São Renderizados no Three.js

- **Geometria:** `THREE.PlaneGeometry(largura, altura)`
- **Material:**
  ```javascript
  const mat = new THREE.MeshBasicMaterial({
    map: textura,
    transparent: true,
    alphaTest: 0.02,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  ```
- **Inclinação Obrigatória:** `mesh.rotation.x = -0.36;` para compensar o ângulo da câmera de ~38°.
