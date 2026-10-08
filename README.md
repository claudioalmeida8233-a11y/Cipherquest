# CipherQuest

**Transforme. Decifre. Descubra.** Projeto educacional desenvolvido pela **Turma 2001**.

Jogo online de 20 fases em 5 níveis sobre quatro deslocamentos da Cifra de César: +1, +2, +3 e −1. A ordem dos deslocamentos, as palavras e os modos de criptografar ou descriptografar são sorteados para cada sala e compartilhados por todos os participantes. Há também um **Treino** opcional de quatro desafios, com César e substituição simples, separado da disputa. Funciona em navegadores modernos, com interface em HTML, CSS e JavaScript sem framework.

## Executar

Requer Node.js 20 ou superior para servir o jogo e sincronizar as mesas.

```bash
node server/server.js
```

Abra `http://localhost:3000` no navegador. Para alunos em outros dispositivos na mesma rede, abra `http://IP-DO-COMPUTADOR:3000`. O firewall precisa permitir a porta 3000. Para uso pela escola na internet, publique este projeto em uma hospedagem que execute Node.js e forneça HTTPS. O jogo requer o servidor para criar e sincronizar salas.

Altere a porta com a variável de ambiente `PORT`. Não há instalação de pacotes externos.

## Testar

```bash
node --test
```

Os testes cobrem César nos dois sentidos, a revelação visual das letras, geração de campanhas, pontuação, regras das mesas, recuperação de sala, Treino e rotas HTTP. A substituição simples aparece apenas no Treino; a competição mantém as quatro variações da Cifra de César.

## Mesas

Um participante cria cada sala e compartilha um código de quatro caracteres, um link ou o QR code. Os códigos usam letras maiúsculas e números fáceis de distinguir, sem `I`, `O`, `0` e `1`. Cada pessoa escolhe Mesa 01 ou Mesa 02; as duas mesas têm a mesma capacidade, de 2 a 6 vagas. Quando **todas** as vagas daquela sala estiverem preenchidas, sua partida começa automaticamente, mesmo que outras salas ainda estejam aguardando jogadores. A mensagem do lobby informa quantas vagas faltam. Os participantes da mesma sala recebem os mesmos 20 desafios; salas simultâneas recebem desafios diferentes. A primeira mesa cujos participantes terminarem vence apenas a disputa daquela sala. Durante a rodada, todos veem o avanço das mesas e o tempo da sala.

Antes da largada, quem entrou pode sair e liberar sua vaga. O criador pode excluir a sala após confirmar a ação. Se um participante deixar de atualizar a sala por dois minutos antes da largada, sua vaga é liberada; se for o criador, o primeiro participante ainda presente passa a ser o criador. O servidor confere o token de cada participante; uma partida iniciada não aceita saída nem exclusão pelo lobby.

O banco atual permite até 40 salas simultâneas com desafios exclusivos. Se esse limite for atingido, a criação informa o motivo. Ao concluir todos os participantes de uma sala, seus desafios podem voltar ao sorteio para salas futuras.

As salas e o progresso são guardados em `server/data/rooms.json`, criado automaticamente na primeira sala. Atualizar a página retoma a fase, os pontos e as tentativas do próprio participante. Reiniciar o servidor também restaura as salas que ainda estejam no arquivo. As respostas da competição são validadas no servidor. Não há contas nem ranking persistente.

## Estrutura

Veja [docs/architecture.md](docs/architecture.md) para responsabilidades dos arquivos e regras de jogo. Os espaços para nomes reais ficam na tela de créditos em `index.html`, marcados com `data-credit-role`; nenhum nome foi inventado.
