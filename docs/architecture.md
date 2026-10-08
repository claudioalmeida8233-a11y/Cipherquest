# CipherQuest — arquitetura da primeira versão

## Objetivo
Jogo escolar responsivo de 20 desafios progressivos em salas de disputa, mais um Treino opcional de quatro desafios. O jogador transforma e decifra mensagens, vê cada letra mapeada e recebe explicações. Turma 2001 é a autoria oficial.

## Arquivos
- `index.html`: telas semânticas de menu, instruções, jogo, salas, resultado, sobre e créditos.
- `css/style.css`: identidade visual, layout responsivo, animações e acessibilidade.
- `js/crypto.js`: César, substituição simples, normalização e alfabeto visual.
- `js/challenges.js`: banco de palavras, gerador de 20 desafios por semente e Treino fixo de quatro desafios.
- `js/game.js`: estado, pontuação, tentativas, pistas e progressão.
- `js/ui.js`: renderização segura das telas e animações.
- `js/hero.js`: demonstração das quatro transformações de César e revelação progressiva com `*`.
- `js/rooms.js`: cliente de salas online.
- `js/app.js`: eventos e integração.
- `server/room-store.js`: salas, presença, progresso validado no servidor e persistência local em JSON.
- `server/server.js`: arquivos estáticos e API de duas mesas, sem dependências.
- `tests/*.test.js`: regras de transformação, geração, pontuação e salas.

## Fluxo
Menu → Treino opcional **ou** criar/entrar por código, link ou QR → todas as vagas das duas mesas daquela sala preenchidas → início automático independente → mesma sequência sorteada para os participantes da sala → cada pessoa termina → primeira mesa com todos os participantes concluídos vence naquela sala. Cada sala tem duas mesas com a mesma capacidade, de 2 a 6 vagas. O servidor reserva desafios exclusivos entre salas ativas e libera a reserva quando todos terminam.

No lobby, o participante pode sair, e somente o criador pode excluir a sala. Ambas as ações exigem token válido e são recusadas após o início. Antes da largada, uma vaga sem atualização por dois minutos é liberada; se era do criador, o primeiro participante presente assume a criação. Uma sala excluída faz os demais clientes retornarem ao formulário na próxima atualização.

## Regras
Acerto: 100, 80, 60 ou 40 pontos conforme tentativa; pista desconta 30 da fase; combo dobra após 3 acertos seguidos e cresce a cada 3, até x4. Resposta ignora caixa e espaços nas bordas. Palavras do jogo são apresentadas em maiúsculas sem acentos. Codificação de dados será diferenciada de criptografia na tela Sobre.

## Visual
Painéis azul profundo, tipografia clara, acentos ciano e violeta, grade sutil, brilho contido e transições com respeito a movimento reduzido. O alfabeto e o feedback por caracteres funcionam em telas pequenas com rolagem horizontal.

## Limites técnicos
O modo online requer executar o servidor Node.js e publicar em hospedagem compatível. Salas e partidas são gravadas em `server/data/rooms.json`, e um recarregamento retoma o estado do participante. Não há contas nem ranking persistente. As respostas da disputa são conferidas no servidor, mas a aplicação ainda não possui autenticação de identidade.
