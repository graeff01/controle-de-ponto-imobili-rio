# 🔑 Chaves de Acesso dos Dispositivos

## ✅ Novas Chaves Simples (27/01/2026)

Chaves redesenhadas para serem **fáceis de digitar no celular**!

---

### 📱 Tablet Fixo da Agência
**Dispositivo:** Tablet fixo na recepção da Jardim do Lago
**Tipo:** `tablet`
**Chave de Segurança:**
```
TABLET-JARDIM-2026
```

### 📱 Celulares das Consultoras
**Dispositivo:** Celulares pessoais de todas as consultoras
**Tipo:** `mobile`
**Chave de Segurança:**
```
CONSULTORA-2026
```

> ⚠️ **IMPORTANTE:** Esta chave é compartilhada por todas as consultoras.
> Todas podem usar a mesma chave `CONSULTORA-2026` em seus celulares.

---

## 🛠️ Como Aplicar as Novas Chaves

### 1️⃣ Atualizar o Banco de Dados (Produção)

**ATENÇÃO:** Este script **apaga todas as chaves antigas** e invalida todos os dispositivos.

#### Via Railway Dashboard:
1. Acesse seu projeto no Railway
2. Vá em **Database → Query**
3. Copie e cole o conteúdo completo do arquivo:
   `backend/scripts/update_device_tokens.sql`
4. Clique em **Run Query**
5. Verifique se retornou apenas 2 registros (tablet e mobile)

#### Via Railway CLI (alternativa):
```bash
railway run psql -f backend/scripts/update_device_tokens.sql
```

---

### 2️⃣ Configurar o Tablet da Agência

1. Acesse no navegador do tablet:
   `https://jardimdolagoponto.up.railway.app/tablet`

2. Na tela de **"Configuração do Totem"**, digite exatamente:
   ```
   TABLET-JARDIM-2026
   ```

3. Clique em **"Autorizar Dispositivo"**

4. Pronto! O tablet está autorizado permanentemente.

---

### 3️⃣ Configurar Celulares das Consultoras

Cada consultora deve fazer isso no próprio celular:

1. Abrir o navegador (Chrome recomendado)

2. Acessar:
   `https://jardimdolagoponto.up.railway.app/tablet`

3. Na tela de **"Configuração do Totem"**, digitar:
   ```
   CONSULTORA-2026
   ```

4. Clicar em **"Autorizar Dispositivo"**

5. Pronto! O celular está autorizado e pode registrar ponto externo.

---

## 🔒 Segurança

- ✅ **Chaves curtas e fáceis de digitar** no celular
- ✅ **Todas as chaves antigas foram invalidadas**
- ✅ Apenas dispositivos com as novas chaves funcionam
- ✅ Chave salva localmente no dispositivo (não precisa digitar toda vez)
- ⚠️ Se uma consultora sair da empresa, basta gerar uma nova chave e invalidar a antiga

---

## 🔄 Como Invalidar Dispositivos Antigos

Se precisar invalidar todos os dispositivos e forçar recadastramento:

1. Execute novamente o script SQL (que faz `DELETE FROM authorized_devices`)
2. Todos os dispositivos perderão acesso imediatamente
3. Será necessário reautorizar com as novas chaves

---

## 📝 Notas Importantes

- **Tablet da agência** usa: `TABLET-JARDIM-2026`
- **Todas as consultoras** usam: `CONSULTORA-2026` (mesma chave para todas)
- Chaves são **case-sensitive** (maiúsculas/minúsculas importam)
- Digite exatamente como mostrado acima
- Após autorizar uma vez, o dispositivo fica autorizado permanentemente

---

## ❓ Troubleshooting

**"Dispositivo não autorizado"**
→ Verifique se digitou a chave exatamente como mostrado (todas maiúsculas)
→ Confirme que o script SQL foi executado no banco de produção

**"Chave antiga não funciona mais"**
→ Normal! Execute o novo script SQL e use as novas chaves

**"Preciso gerar chave individual para cada consultora?"**
→ Não precisa. Todas podem usar `CONSULTORA-2026`
→ Se quiser chaves individuais, edite o script SQL e adicione mais linhas

---

**Última atualização:** 27/01/2026
**Chaves válidas até:** Indefinidamente (até próxima redefinição)
