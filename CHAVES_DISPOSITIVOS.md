# Chaves de Acesso dos Dispositivos - PRODUÇÃO

## Novas Chaves PRD (10/02/2026)

Chaves individuais para produção. Cada consultora tem sua própria chave.

---

### Tablet Fixo da Agência (Totem)
**Dispositivo:** Tablet fixo na recepção da Jardim do Lago
**Tipo:** `tablet`
**Chave de Segurança:**
```
TOTEM-LAGO-PRD26
```

### Elisangela - Consultora
**Dispositivo:** Celular pessoal
**Tipo:** `mobile_consultant`
**Chave de Segurança:**
```
ELI-LAGO-PRD26
```

### Maria Eduarda - Consultora
**Dispositivo:** Celular pessoal
**Tipo:** `mobile_consultant`
**Chave de Segurança:**
```
MEDU-LAGO-PRD26
```

### Roberta - Consultora
**Dispositivo:** Celular pessoal
**Tipo:** `mobile_consultant`
**Chave de Segurança:**
```
ROB-LAGO-PRD26
```

---

## Como Aplicar as Novas Chaves

### 1. Executar o Script SQL no Banco de Produção

**ATENÇÃO:** Este script **apaga todas as chaves antigas** e invalida todos os dispositivos.

#### Via Railway Dashboard:
1. Acesse seu projeto no Railway
2. Vá em **Database → Query**
3. Copie e cole o conteúdo completo do arquivo:
   `backend/scripts/update_device_tokens.sql`
4. Clique em **Run Query**
5. Verifique se retornou exatamente **4 registros** (1 tablet + 3 consultoras)

#### Via Railway CLI (alternativa):
```bash
railway run psql -f backend/scripts/update_device_tokens.sql
```

---

### 2. Configurar o Tablet da Agência

1. Acesse no navegador do tablet:
   `https://jardimdolagoponto.up.railway.app/tablet`

2. Na tela de **"Configuração do Totem"**, digite:
   ```
   TOTEM-LAGO-PRD26
   ```

3. Clique em **"Autorizar Dispositivo"**

---

### 3. Configurar Celulares das Consultoras

Cada consultora deve usar **sua própria chave** no celular:

1. Abrir o navegador (Chrome recomendado)
2. Acessar: `https://jardimdolagoponto.up.railway.app/tablet`
3. Na tela de configuração, digitar a chave individual:
   - **Elisangela:** `ELI-LAGO-PRD26`
   - **Maria Eduarda:** `MEDU-LAGO-PRD26`
   - **Roberta:** `ROB-LAGO-PRD26`
4. Clicar em **"Autorizar Dispositivo"**

---

## Segurança

- Cada consultora tem chave individual (rastreabilidade)
- Todas as chaves antigas foram invalidadas
- Chaves são **case-sensitive** (digitar exatamente como mostrado - MAIÚSCULAS)
- Chave salva localmente no dispositivo (não precisa digitar toda vez)
- Se uma consultora sair, basta remover apenas a chave dela do banco

---

## Invalidar Dispositivos

Para invalidar todos os dispositivos e forçar recadastramento:

1. Execute novamente o script SQL (faz `DELETE FROM authorized_devices`)
2. Todos os dispositivos perdem acesso imediatamente
3. Reautorize com as novas chaves

Para invalidar apenas uma consultora específica:
```sql
DELETE FROM authorized_devices WHERE token = 'CHAVE-DA-CONSULTORA';
```

---

**Última atualização:** 10/02/2026
**Chaves válidas até:** Indefinidamente (até próxima redefinição)
