# 🔑 Chaves de Acesso dos Dispositivos

## Novas Chaves Geradas (27/01/2026)

### 📱 Tablet Fixo da Agência
**Dispositivo:** Tablet fixo na recepção da Jardim do Lago
**Tipo:** `tablet`
**Chave de Segurança:**
```
7c1cbc688e61e4761feac5a6689661bbdfd8a5fd5e92341d252bed1fb3812fd8
```

### 📱 Dispositivos Móveis das Consultoras
**Dispositivo:** Celulares pessoais das consultoras
**Tipo:** `mobile`
**Chave de Segurança:**
```
7141ab68d4f321796d85e53735e855b2bddcc920ee506d21c7d2d9893efc990c
```

---

## 🛠️ Como Aplicar as Chaves

### 1. Atualizar o Banco de Dados (Produção)

Execute o script SQL no Railway:

```bash
# Via Railway CLI
railway run psql -f backend/scripts/update_device_tokens.sql

# OU copie o conteúdo do arquivo e execute no Railway Dashboard > Database > Query
```

### 2. Configurar o Tablet da Agência

1. Acesse: `https://jardimdolagoponto.up.railway.app/tablet`
2. Na tela de "Configuração do Totem", digite a chave:
   ```
   7c1cbc688e61e4761feac5a6689661bbdfd8a5fd5e92341d252bed1fb3812fd8
   ```
3. Clique em "Autorizar Dispositivo"
4. O tablet ficará permanentemente autorizado (chave salva no localStorage)

### 3. Configurar Celulares das Consultoras

1. Cada consultora acessa no celular: `https://jardimdolagoponto.up.railway.app/tablet`
2. Na tela de "Configuração do Totem", digita a chave:
   ```
   7141ab68d4f321796d85e53735e855b2bddcc920ee506d21c7d2d9893efc990c
   ```
3. Clica em "Autorizar Dispositivo"
4. O celular fica permanentemente autorizado

---

## ⚠️ Segurança

- **NÃO compartilhe estas chaves publicamente**
- **NÃO envie por WhatsApp ou email** - entregue pessoalmente
- As chaves são criptograficamente seguras (256 bits)
- Se uma chave for comprometida, execute novamente o script para gerar novas

---

## 🔄 Como Gerar Novas Chaves (se necessário)

```bash
cd backend
node -e "const crypto = require('crypto'); console.log('NOVA_CHAVE:', crypto.randomBytes(32).toString('hex'));"
```

Depois atualize o script SQL e execute novamente.
