## 1. Resolução e Tamanho Recomendado para Desenho Digital

Para o estilo **Paper Mario (2.5D com perspectiva)**:

| Asset | Tamanho em Tela | Resolução de Desenho no Canvas | Proporção / Pose | Formato |
| :--- | :--- | :--- | :--- | :--- |
| **Personagem Principal (Player)** | `64 x 84 px` (em pé) | **`256 x 340 px`** ou **`512 x 680 px`** | Personagem **em pé de frente ou 3/4 virado para a direita**, apoiado pela base dos pés | PNG Transparente |
| **Itens / Coletáveis** | `32 x 32 px` | **`128 x 128 px`** ou **`256 x 256 px`** | Em pé ou apoiados no chão | PNG Transparente |
| **Cenários / Objetos** | Variável | **`256 x 256 px`** a **`512 x 512 px`** | Base no chão (para projetar sombra) | PNG Transparente |

### Dicas de Desenho Estilo Paper Mario:
1. **Pose do Personagem:** Desenhe o personagem **em pé** (não de cima como no Top-Down clássico). Olhando levemente para a direita ou em pose 3/4. O jogo faz o espelhamento automático suave (efeito folha virando) quando ele anda para a esquerda.
2. **Borda/Contorno:** Um contorno escuro marcante (e opcionalmente uma leve borda branca de recorte/adesivo) deixa o efeito "Paper" idêntico aos jogos da Nintendo.
3. **Ponto de Apoio:** Desenhe o personagem tocando quase a base inferior do quadro para que a sombra no chão fique perfeitamente alinhada com os pés.

---

### Por que `256 x 256 px` ou `512 x 512 px` (e não 500x500)?
1. **Potência de 2 (Power of Two - POT):**
   - Placas de vídeo (GPUs) de computadores e smartphones (Android/iOS) processam texturas de potências de 2 (`64, 128, 256, 512, 1024, 2048`) de forma muito mais otimizada na memória VRAM e sem artefatos de amostragem.
2. **Nitidez Retina / Telas Mobile (2x a 3x DPI):**
   - No jogo, o personagem é desenhado na tela com cerca de `64px` ou `80px`.
   - Se você desenhar em `256 x 256 px` (4x a escala da tela), a GPU aplica o anti-aliasing automático ao reduzir para a tela. O traço fica perfeitamente nítido tanto em monitores 1080p/4K quanto em celulares com telas AMOLED de alta densidade (300~450 ppi), sem ficar borrado nem pixelado.
3. **500x500 vs 512x512:**
   - 500x500 funcionará, mas **512x512** é a convenção técnica padrão da indústria de jogos 2D. Se desenhar em 512x512 px, apenas deixe uma margem interna de segurança (padding) de ~10% para o traço não colar nas bordas.

---

## 2. Como Usar Animação em Frames no Protótipo

O jogo agora organiza e detecta automaticamente os conjuntos de sprites:

| Ação | Nomes dos Arquivos (Frames) | Comportamento |
| :--- | :--- | :--- |
| **Parado (Idle)** | `player.png` e `player-b.png` | Respiração suave (~0.75s por frame) |
| **Correndo p/ Direita** | `player-run-right-a.png` e `player-run-right-b.png` | Ciclo dinâmico de corrida (~7 fps) |
| **Correndo p/ Esquerda** | `player-run-left-a.png` e `player-run-left-b.png` | Ciclo dinâmico de corrida (~7 fps) |

*Todos os frames utilizam a proporção original de 512x512 px sem nenhuma distorção.*

---

## 3. Como Rodar e Testar

O servidor de desenvolvimento local já está ativo:
- Abra no seu navegador: **`http://localhost:8080`**
- No mesmo Wi-Fi, você pode abrir no seu celular Android digitando o seu IP local (ex: `http://192.168.x.x:8080`).
- No Android, você pode clicar em **"Adicionar à tela inicial"** no Chrome para testar em modo aplicativo (tela cheia).
