# 🎨 Guia de Assets e Sprites — Gamezin (Three.js 2.5D)

Este guia define as especificações e boas práticas para criação, desenho e exportação de sprites 2D para uso no motor 2.5D Three.js do **Gamezin**.

---

## 1. Resolução e Proporções Recomendadas

No Three.js, os objetos são medidos em unidades de mundo 3D. O personagem possui altura padrão de **`2.0 unidades`** (`PLAYER_HEIGHT = 2.0`), e a largura é calculada automaticamente mantendo o *aspect ratio* natural da imagem:

| Tipo de Asset | Resolução do Arquivo (PNG) | Proporção / Pose | Unidades 3D (Mundo) | Inclinação Billboard |
| :--- | :--- | :--- | :--- | :--- |
| **Personagem Principal** | **`512 x 512 px`** (POT) | Em pé, corpo inteiro, pés rentes à base inferior | Altura: `2.0` / Largura: `2.0 * aspect` | `rotation.x = -0.36` |
| **Itens & Coletáveis** | **`256 x 256 px`** | Em pé ou repousado | Altura: `0.6` a `0.8` | `rotation.x = -0.36` |
| **Arbustos & Vegetação** | **`512 x 256 px`** ou **`512 x 512 px`** | Base reta no chão | Altura: `0.8` a `1.4` | `rotation.x = -0.36` |
| **Estruturas / Cenários** | **`512 x 512 px`** a **`1024 x 1024 px`** | Base no chão | Altura: `2.5` a `4.0` | `rotation.x = -0.36` |

---

## 2. Dicas de Arte e Estilo Visual

1. **Pose Frontal ou 3/4:**
   - Desenhe o personagem **em pé** (não visto de cima como em top-down).
   - O jogo aplica espelhamento automático suave ou usa sprites dedicados para esquerda e direita.
2. **Ponto de Apoio dos Pés (Ancoragem da Sombra):**
   - Desenhe o personagem tocando quase a borda inferior da imagem (deixe apenas ~2 a 4px de respiro). Isso garante que os pés fiquem perfeitamente alinhados com o plano da sombra elíptica (`Y = 0.02`).
3. **Contorno Marcante (Estilo Paper Mario):**
   - Um contorno escuro sólido (e opcionalmente uma leve borda branca de adesivo recortado) acentua o efeito de folha de papel tridimensional.
4. **Por que Potência de 2 (Power of Two - POT)?**
   - Texturas `256x256`, `512x512` e `1024x1024` são otimizadas nativamente pelas GPUs (computadores e smartphones), permitindo filtragem mipmap suave (`LinearMipmapLinearFilter`) sem borrões ou perda de definição em telas Retina / alta densidade.

---

## 3. Conjuntos de Animação e Nomenclatura de Arquivos

O motor `game.js` detecta e carrega automaticamente os seguintes conjuntos de frames:

| Ação | Arquivos no Projeto | Cadência de Troca | Comportamento no Jogo |
| :--- | :--- | :--- | :--- |
| **Parado (Idle)** | `player.png` e `player-b.png` | ~0.75s por frame | Respiração suave procedural no eixo Y |
| **Correndo p/ Direita** | `player-run-right-a.png` e `player-run-right-b.png` | ~0.14s (~7 fps) | Balanço de passos com pulinho (`stepHop`) e poeira FX |
| **Correndo p/ Esquerda** | `player-run-left-a.png` e `player-run-left-b.png` | ~0.14s (~7 fps) | Balanço de passos com pulinho (`stepHop`) e poeira FX |
| **Vegetação (Gramas)** | `grama-a.png` a `grama-d.png` | Estático com sombra rente | 4 variantes de tufos assentados no chão; transponíveis |
| **Obstáculos (Pedras)** | `pedra-a.png` a `pedra-c.png` | Estático com sombra rente | 3 variantes com colisão circular elástica e deslizamento suave |

> **Nota:** Para adicionar mais frames ou variantes de ambiente, basta incluir o arquivo no array correspondente em `game.js`:
> ```javascript
> const spriteAssets = {
>   idle: ['player.png', 'player-b.png'],
>   run_right: ['player-run-right-a.png', 'player-run-right-b.png'],
>   run_left: ['player-run-left-a.png', 'player-run-left-b.png']
> };
> const envAssets = {
>   grass: ['grama-a.png', 'grama-b.png', 'grama-c.png', 'grama-d.png'],
>   rock: ['pedra-a.png', 'pedra-b.png', 'pedra-c.png']
> };
> ```

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
