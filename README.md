# CALU AI — Acompanhamento Alimentar Inteligente (v2.2.2)

> "Seu acompanhamento alimentar inteligente."

O **CALU AI** é um aplicativo web e mobile (PWA/Capacitor/Android) para acompanhamento nutricional humanizado, desenvolvido sob medida para a cultura alimentar brasileira. Utiliza inteligência artificial multimodal (fotografia, áudio e texto), banco de dados determinístico (TACO - Tabela Brasileira de Composição de Alimentos), leitor de código de barras e o assistente **Coach Calu**.

---

## 1. Arquitetura da Solução

O CALU AI segue os princípios rigorosos de segurança e integridade de dados da versão **V2.2.2**:

- **Interface:** React 19 + TypeScript + Vite + Tailwind CSS.
- **Autenticação:** Firebase Authentication no cliente, validada estritamente no servidor via Firebase Admin SDK (`verifyIdToken`).
- **Backend / API:** Node.js + Express com camadas de segurança (Helmet, CORS restrito, Rate Limiting, Schemas Zod).
- **Fonte da Verdade:** Cloud Firestore como **única** fonte de persistência para todos os dados de negócio (refeições, pesos, hidratação, hábitos, memórias e chat). Remoção total de dependência de `localStorage` para dados de negócio.
- **Armazenamento de Imagens:** Firebase Storage com caminhos isolados por usuário (`users/{userId}/meals/...`) e limite binário estrito de 5MB.
- **Inteligência Nutricional:** IA multimodal Gemini (`gemini-3.8-flash`) no servidor, combinada de forma determinística com a tabela TACO. A IA identifica os alimentos; a base oficial calcula os macronutrientes.
- **Proteção de Custo de IA:** Quota atômica **FAIL-CLOSED** via transações no Firestore. Se houver falha de infraestrutura, a chamada à IA é negada (HTTP 503) para evitar vazamento de custos.
- **Estorno Atômico de Cota:** Mecanismo seguro de Reserva → Execução → Reembolso em caso de falha de infraestrutura no downstream da IA.

```
                    ┌─────────────────────┐
                    │      CALU AI        │
                    │   React + Vite      │
                    └──────────┬──────────┘
                               │
                         Firebase Auth
                               │
                         ID Token (Bearer)
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Express       │
                    │   Security Layer    │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼──────────────────┐
             │                 │                  │
             ▼                 ▼                  ▼
        Rate Limit         Auth/RBAC          Zod
             │                 │                  │
             └─────────────────┼──────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    AI Cost Guard    │
                    │  Quota + Budget     │
                    └──────────┬──────────┘
                               │
                         FAIL-CLOSED
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
          Firestore         Storage          Gemini
              │
              ▼
      FONTE DE VERDADE
              │
      ┌───────┼────────┬─────────┬──────────┐
      ▼       ▼        ▼         ▼          ▼
    Meals   Weight    Water    Habits     Memory
      │       │        │         │          │
      └───────┴────────┴─────────┴──────────┘
                         │
                         ▼
                 Nutrition Engine
                         │
                    TACO + Regras
                         │
                         ▼
                   CALU AI RESULT
```

---

## 2. Stack Tecnológica

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion.
- **Backend:** Node.js, Express, tsx, Helmet, CORS, Express-Rate-Limit, Zod.
- **Firebase:** Firebase Client SDK v12, Firebase Admin SDK v14 (modular).
- **IA Multimodal:** `@google/genai` (Google Gen AI SDK v2.4).
- **Tabela Nutricional:** TACO (Tabela Brasileira de Composição de Alimentos - 4ª edição) + Catálogo Brasileiro de Código de Barras.

---

## 3. Variáveis de Ambiente

Crie o arquivo `.env` a partir do template `.env.example`:

### Frontend (Público no navegador)
```env
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="seu-projeto"
VITE_FIREBASE_STORAGE_BUCKET="seu-projeto.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
VITE_FIREBASE_APP_ID="1:1234567890:web:abcdef"
```

### Backend (Segredos do Servidor — NUNCA expostos ao cliente)
```env
GEMINI_API_KEY="AIzaSy..."
FIREBASE_PROJECT_ID="seu-projeto"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@seu-projeto.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET="seu-projeto.appspot.com"
AI_PROVIDER="gemini"
APP_URL="https://seu-dominio.com"
PORT=3000
```

---

## 4. Segurança e Hardening (V2.2.2)

1. **Anti-IDOR:** Toda requisição autenticada deriva a identidade do usuário exclusivamente do `req.user.uid` retornado pelo `admin.auth().verifyIdToken()`. Parâmetros ou campos de payload contendo `uid` enviados pelo cliente são estritamente ignorados.
2. **Anti-Bypass de Planos:** O plano (`plan: 'free' | 'premium'`) é validado no Firestore pelo servidor. Clientes não possuem permissão de escrita direta em privilégios ou quotas nas regras do Firestore.
3. **Chat Server-Authoritative:** O cliente envia apenas o texto da mensagem. O servidor carrega o histórico real do Firestore, aplica proteção contra prompt injection, invoca o Gemini e persiste tanto a mensagem do usuário quanto a resposta da Calu antes de responder.
4. **Rate Limiting Categórico:** Proteção contra abusos em rotas públicas (120 req/15min) e endpoints de IA intensivos (40 req/15min).
5. **Fail-Closed AI Cost Control:** Se a transação de quota no Firestore falhar ou estiver inacessível, a requisição é rejeitada com HTTP 503 (`QUOTA_UNAVAILABLE`), impedindo chamadas descontroladas à API Gemini.
6. **Health & Readiness Endpoints:**
   - `GET /api/health`: Liveness probe (`{ "status": "ok", "version": "2.2.2" }`).
   - `GET /api/ready`: Readiness probe (`{ "status": "ready" }`), retornando HTTP 503 se o Firebase Admin estiver desconectado em produção.
7. **Conformidade LGPD:**
   - `GET /api/user/export-data`: exporta todas as 9 subcoleções do usuário com metadados e versão do schema (`2.2.2`).
   - `POST /api/user/delete-account`: exclusão paginada e recursiva em batches seguros de 400 documentos, deleção no Storage e remoção no Firebase Auth. Se qualquer etapa falhar, retorna `DELETE_INCOMPLETE` e nunca `success: true`.

---

## 5. Desenvolvimento e Testes

### Instalação de Dependências
```bash
npm install
```

### Executar em Desenvolvimento
```bash
npm run dev
```
Servidor ativo em: `http://localhost:3000`.

### Executar a Suíte Completa de Testes de Segurança (60 Testes)
```bash
npm test
```

### Verificação de Tipos e Build de Produção
```bash
npm run lint
npm run build
```

---

## 6. Checklist de Produção (Production Readiness)

- [x] Firebase Authentication configurado
- [x] Firestore configurado como única fonte de verdade
- [x] Storage configurado com limite binário de 5MB
- [x] Firestore Rules publicadas com isolamento estrito por UID
- [x] Storage Rules publicadas com validação de MIME e quota
- [x] Firebase Admin modular inicializado no servidor
- [x] Gemini API configurada estritamente no backend
- [x] `GEMINI_API_KEY` protegida e ausente do bundle do frontend
- [x] Rate limiting ativo em rotas públicas e de IA
- [x] Quota server-side atômica com fail-closed
- [x] Estorno de quota em caso de falha de infraestrutura
- [x] LGPD Export com schemaVersion 2.2.2
- [x] LGPD Delete recursivo em batches de 400
- [x] Health check (`/api/health`) e Readiness (`/api/ready`) implementados
- [x] Suíte de 60 testes de integração e segurança 100% aprovados
- [x] Build de produção e linting sem erros

---

## 7. Licença e Propriedade
Projeto CALU AI — Todos os direitos reservados.
