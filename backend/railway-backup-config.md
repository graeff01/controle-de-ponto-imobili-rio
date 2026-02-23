# CONFIGURAÇÃO DE BACKUP RAILWAY

## PASSO 1: Acessar Railway

1. Acesse: https://railway.app/
2. Login com sua conta
3. Selecione o projeto do PostgreSQL

## PASSO 2: Habilitar Backups Automáticos

1. Clique no serviço **Postgres**
2. Vá em **Settings** (⚙️)
3. Role até **Backups**
4. Clique em **Enable Automated Backups**

### Configurações Recomendadas:
- **Frequency:** Daily (Diário)
- **Retention:** 7 days (7 dias)
- **Time:** 03:00 UTC (00:00 Brasília)

## PASSO 3: Backup Manual (Teste)

1. Na mesma tela de Backups
2. Clique em **Create Backup Now**
3. Aguarde a confirmação

## PASSO 4: Restaurar Backup (Se necessário)

1. Vá em **Backups**
2. Encontre o backup desejado
3. Clique em **Restore**
4. Confirme a operação

## ⚠️ IMPORTANTE:

- Backups são salvos no Railway (grátis)
- Limite de 7 dias no plano gratuito
- Para mais dias, upgrade para plano pago
- Teste a restauração 1x por mês

## BACKUP LOCAL (Recomendado):

Execute este comando 1x por semana:
```bash
pg_dump "postgresql://postgres:FFIOZMVubGaENtsCFptHbuWihhlxTqPS@centerbeam.proxy.rlwy.net:49679/railway" > backup_$(date +%Y%m%d).sql
```

Salve os arquivos `.sql` em:
- Google Drive
- Dropbox
- HD Externo