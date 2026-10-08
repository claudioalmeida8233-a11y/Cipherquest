# Publicar o CipherQuest em uma VPS

Esta é a opção indicada para o modo de salas. O contêiner mantém o servidor Node.js e grava as salas em `server/data/rooms.json` no disco da VPS.

## 1. Preparar a VPS

Use uma VPS Linux com Docker e Docker Compose instalados. Abra a porta `3000` no firewall da VPS para a primeira publicação.

## 2. Enviar o projeto

No computador que contém este projeto, execute no PowerShell:

```powershell
scp -r D:\JOGO-CIEP usuario@IP_DA_VPS:/opt/cipherquest
```

Substitua `usuario` e `IP_DA_VPS` pelos dados da sua VPS. Caso o acesso SSH use outra porta, acrescente `-P PORTA` ao comando.

## 3. Iniciar a aplicação

Entre na VPS:

```bash
ssh usuario@IP_DA_VPS
cd /opt/cipherquest
docker compose up -d --build
docker compose ps
```

Abra no navegador:

```text
http://IP_DA_VPS:3000
```

O endereço deve aparecer no navegador de cada Chromebook. Os links e QR codes das salas passam a usar esse mesmo endereço.

## 4. Atualizar depois de editar o projeto

Envie os arquivos novamente e, na VPS, execute:

```bash
cd /opt/cipherquest
docker compose up -d --build
```

## 5. Backup das salas em andamento

O arquivo abaixo contém as salas e o progresso atual:

```text
/opt/cipherquest/server/data/rooms.json
```

Faça uma cópia desse arquivo antes de atualizações grandes. Não o apague enquanto houver partidas acontecendo.

## HTTPS e domínio

Para uma URL mais bonita e HTTPS, a VPS precisa de um domínio apontado para o IP dela. Quando você tiver o domínio, configure um proxy reverso como Caddy ou Nginx para encaminhar `https://seu-dominio` para `http://127.0.0.1:3000`.

## Netlify

Netlify é adequado apenas para sites estáticos. O CipherQuest usa um servidor Node.js para salas, presença, partidas e progresso; por isso, não deve ser publicado apenas na Netlify.
