# Sistema de Controle de Presença — Auxiliadora Predial Jardim do Lago

> Sistema desenvolvido para eliminar o caos de planilhas e garantir segurança jurídica na gestão de jornada de trabalho de uma imobiliária com dois perfis de profissionais: funcionários CLT e corretores plantonistas PJ.

---

## O Problema que Este Sistema Resolve

A imobiliária operava com planilhas manuais, sem rastreabilidade, sem validade jurídica e sem diferenciação entre dois perfis de trabalhadores com regras completamente diferentes. O sistema foi construído do zero para resolver isso com tecnologia.

---

## O que Foi Construído

### Funcionalidades Principais

**Registro de Ponto com Biometria Facial**
Totem fixo na recepção com câmera. O funcionário digita a matrícula, tira uma foto com contagem regressiva e o ponto é registrado com imagem, horário e geolocalização armazenados no banco.

**Dois Módulos Distintos de Presença**
- *CLT:* Registro completo — entrada, saída para intervalo, retorno, saída final. Validação de sequência, intervalo mínimo de 1 hora e banco de horas automático.
- *Plantonistas PJ:* Marcação de presença simples no plantão, com foto, sem jornada completa. Relatório mensal exportável em Excel.

**Registro Externo para Consultoras**
Consultoras em visita externa registram ponto pelo celular com GPS obrigatório. O sistema bloqueia o acesso móvel quando detecta que o dispositivo está dentro de um raio de 250m da agência (para evitar fraude). O registro vai para uma fila de aprovação do gestor.

**Banco de Horas em Tempo Real**
Calculado automaticamente a cada registro. Considera feriados, fins de semana e horas esperadas configuradas por funcionário. Saldo diário e acumulado mensal visíveis no painel.

**Espelho de Ponto Digital com Assinatura Eletrônica**
O funcionário acessa pelo celular ou computador, digita a matrícula, visualiza o espelho do mês e assina com o dedo. A assinatura é armazenada como imagem base64 com hash SHA-256, IP, user-agent e timestamp — validade jurídica conforme Lei 14.063/2020.

**Termo de Compromisso Jurídico**
Na primeira vez que o funcionário usa o sistema, ele lê o Termo de Compromisso baseado na Portaria 671/MTE e na CLT, rola até o final, marca que leu e assina. O PDF assinado é gerado, comprimido com gzip e armazenado no banco com hash de integridade.

**Painel Administrativo Completo**
Dashboard com presença em tempo real, gráfico semanal, banco de horas consolidado, alertas automáticos (jornadas incompletas, excesso de horas, atrasos), aprovação de ajustes e ponto externo, relatórios mensais CLT e plantonistas, fechamento de mês com bloqueio de ajustes retroativos e logs de auditoria imutáveis.

**Jobs Agendados Automáticos**
- Fechamento diário do banco de horas às 23:55
- Verificação de jornadas incompletas às 19h
- Verificação de excesso de horas toda sexta às 18h
- Digest semanal por e-mail para gestores todo domingo às 20h
- Backup automático do banco às 2h

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Node.js · Express · PostgreSQL |
| Frontend | React · Vite · TailwindCSS · Framer Motion |
| Autenticação | JWT · bcrypt · Rate Limiting |
| PDF | pdfmake · pdfkit |
| E-mail | Resend |
| Monitoramento | Sentry |
| Deploy | Railway (backend + banco) · Vercel (frontend) |
| PWA | Mobile First · Service Worker |

---

## Arquitetura

```
backend/
├── src/
│   ├── modules/          # Módulos por domínio (auth, users, time-records, espelho...)
│   ├── middleware/        # Auth JWT, RBAC, rate limiting, auditoria
│   ├── services/          # PDF, e-mail, backup, notificações
│   ├── jobs/              # Cron jobs agendados
│   └── database/          # Migrations e seeds
frontend/
├── src/
│   ├── pages/             # 18 telas (PontoTablet, Dashboard, BancoHoras, EspelhoPonto...)
│   ├── components/        # Layout, UI, modais, assinatura
│   └── services/          # API, offline storage, sync service
```

---

## Como Rodar Localmente

**Pré-requisitos:** Node.js 18+, PostgreSQL

```bash
# Backend
cd backend
cp .env.example .env   # configure DATABASE_URL e JWT_SECRET
npm install
npm run migrate
npm run seed
npm run dev            # http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

**Credenciais padrão:**
- Matrícula: `ADMIN001`
- Senha: `Admin@123`

---

## Diferenciais Técnicos

- Geolocalização com validação de proximidade por Haversine para bloquear fraude de ponto externo
- Fotos armazenadas como binário (BYTEA) no PostgreSQL — sem dependência de storage externo
- Timezone sempre em `America/Sao_Paulo` — zero bugs de horário de verão
- Offline mode com IndexedDB — o tablet registra mesmo sem internet e sincroniza quando a conexão volta
- RBAC granular — admin, manager, employee, plantonista com permissões distintas por rota
- Audit log imutável em tabela separada para todas as operações críticas

---

**Douglas Graeff**
[linkedin.com/in/graeffdouglas](https://linkedin.com/in/graeffdouglas) · [github.com/graeff01](https://github.com/graeff01)
