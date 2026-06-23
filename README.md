# WebGL Doom

WebGL Doom é um jogo de tiro e sobrevivência em ondas em primeira pessoa desenvolvido integralmente em WebGL Puro. O jogador é colocado em uma arena de cemitério cercada por muralhas, enfrentando hordas de inimigos que ficam progressivamente mais difíceis até o confronto final com um chefe. Entre as ondas, o jogador escolhe upgrades e uma arma permanente.

## Funcionalidades Técnicas

Este projeto foi desenvolvido como requisito para a disciplina de Computação Gráfica, focando na implementação de baixo nível sem o uso de bibliotecas gráficas de alto nível.

- **Leitor de OBJ Próprio**: Implementação de um parser para arquivos .obj e .mtl, realizando a leitura assíncrona de geometria e materiais com suporte a cores por vértice.
- **Iluminação Dinâmica (Phong)**: Sistema de iluminação fragmento a fragmento utilizando o modelo de reflexão de Phong, simulando um feixe de luz de lanterna (Spotlight) com atenuação por distância, além de até 5 point lights dinâmicos para projéteis e efeito de flash de disparo.
- **Sistema de Ondas (Hordas)**: Gerenciador de hordas que aumenta a quantidade de inimigos a cada onda, culminando em uma batalha contra um chefe.
- **Sistema de Armas**: Três armas jogáveis — Pistola (tiro único), AKM (automática com spread) e Escopeta (8 projéteis com spread) — selecionáveis durante o jogo.
- **Sistema de Upgrades**: Entre as ondas, o jogador pode escolher entre upgrades de vida máxima, stamina, dano, vidas extras e balas perfurantes.
- **Áudio Integrado**: Sistema de áudio via Web Audio API com sons de passos, tiros, dano, morte, growl dos inimigos e música de fundo.
- **Colisão por Eixo Separado**: Sistema de colisão AABB que verifica os eixos X e Z de forma independente, permitindo deslizar nas paredes.
- **Shader Customizado**: Vertex e fragment shaders GLSL escritos manualmente com suporte a textura, cor por vértice, iluminação e modo emissivo.
- **Movimento do Jogador**: Sistema de stamina para corrida e pulo, com gravidade e colisão contra o mapa.

## Comandos

- **W, A, S, D**: Movimentação do jogador.
- **Mouse**: Controle de visão e disparo (pointer lock).
- **SHIFT**: Correr (consome stamina).
- **ESPAÇO**: Pular (consome stamina).
- **ESC**: Pausar/Continuar.

## Requisitos de Sistema

O projeto utiliza exclusivamente:
- **WebGL Puro** para renderização.
- **Álgebra Linear Própria** para transformações de matrizes (MVP).
- **Canvas HTML5** para criação do contexto gráfico.
- **Web Audio API** para áudio.

## Como Executar

[Jogar](https://kaynanxd.github.io/cg-project3d-uece/)

Caso queira compilar:
1. No terminal da pasta do projeto: `python -m http.server 8000`
2. Acesse `http://localhost:8000`.

## Equipe

- Kaynan Freitas 
- Marcello Lee
- Beatriz Duarte
