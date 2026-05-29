# Open WebUI Architecture Flow

> This document describes the high-level architecture and data flow of Open WebUI.
> Render this file with a Mermaid-compatible viewer to see the diagrams.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser["🌐 Browser / SPA
SvelteKit + Svelte 5"]
        Mobile["📱 Mobile / 3rd Party
HTTP + API Keys"]
    end

    subgraph Backend["FastAPI Backend (Python)"]
        direction TB
        LB["Load Balancer
(optional)"]
        FW["Middleware Stack
CORS · Session · Auth · Audit · Rate Limit"]
        Router["API Router Layer
/api/v1/*"]
        Socket["Socket.IO Server
/ws · Real-time"]
        TaskScheduler["APScheduler
Background Tasks"]
    end

    subgraph Auth["Authentication Layer"]
        JWT["JWT · Bearer Tokens
PyJWT + bcrypt/argon2"]
        OAuth["OAuth 2.0 / OIDC
Google · MS · GitHub · Generic"]
        LDAP["LDAP / AD
ldap3"]
        Trusted["Trusted Header SSO
Reverse-Proxy"]
        SCIM["SCIM 2.0
Okta · Azure AD · Google Workspace"]
    end

    subgraph LLM["LLM Backends"]
        Ollama["🦙 Ollama
Local Models"]
        OpenAI["OpenAI Compatible
OpenAI · Groq · Mistral · OpenRouter"]
        Anthropic["Anthropic
Claude"]
        Gemini["Google Gemini"]
    end

    subgraph RAG["RAG / Retrieval"]
        Loaders["Document Loaders
PDF · YouTube · Web · OCR · ..."]
        Embeddings["Embedding Models
sentence-transformers · ONNX · HF"]
        VectorDB["Vector Databases
Chroma · PGVector · Qdrant · Milvus
Pinecone · ES · OpenSearch · Weaviate · ..."]
        Rerank["Reranking Models"]
    end

    subgraph Storage["Data Storage"]
        DB[("Primary DB
SQLite / PostgreSQL / MySQL")]
        Redis[("Redis
Sessions · Cache · WS Multi-worker")]
        FileStore[("File Storage
Local / S3 / GCS / Azure Blob")]
    end

    subgraph Extra["Integrations & Extensions"]
        Pipelines["Pipelines Plugin System"]
        MCP["MCP Tools (Model Context Protocol)"]
        Pyodide["Pyodide (Python-in-Browser)"]
        WebSearch["Web Search Providers"]
    end

    %% Client → Backend
    Browser --> LB
    Mobile --> LB
    LB --> FW
    FW --> Router
    FW --> Socket

    %% Backend → Auth
    Router --> JWT
    Router --> OAuth
    Router --> LDAP
    Router --> Trusted
    Router --> SCIM

    %% Backend → LLM
    Router --> Ollama
    Router --> OpenAI
    Router --> Anthropic
    Router --> Gemini

    %% Backend → RAG
    Router --> Loaders
    Router --> Embeddings
    Router --> VectorDB
    Router --> Rerank

    %% Backend → Storage
    Router --> DB
    Router --> Redis
    Router --> FileStore
    Socket --> Redis
    TaskScheduler --> DB

    %% Backend → Extra
    Router --> Pipelines
    Router --> MCP
    Router --> WebSearch
    Browser --> Pyodide
```

---

## 2. Authentication Flow

```mermaid
sequenceDiagram
    participant User as User/Browser
    participant API as FastAPI Router
    participant Auth as Auth Utils
    participant OAuthP as OAuth Provider
    participant LDAP as LDAP Server
    participant DB as Database

    %% Password Login
    User->>API: POST /api/v1/auths/signin
    API->>Auth: verify email + password
    Auth->>DB: Query user by email
    DB-->>Auth: User record + hashed password
    Auth->>Auth: bcrypt/argon2 verify
    alt Success
        Auth->>Auth: Generate JWT (HS256)
        Auth-->>API: Token + User
        API-->>User: 200 { token, user, session }
    else Failure
        API-->>User: 401 Unauthorized
    end

    %% OAuth Login
    User->>API: GET /api/v1/auths/oauth/{provider}
    API->>OAuthP: Redirect to provider
    OAuthP-->>User: Authorization page
    User->>OAuthP: Grant access
    OAuthP-->>API: Callback with code
    API->>OAuthP: Exchange code for token
    OAuthP-->>API: ID Token + Access Token
    API->>Auth: Validate + extract user info
    Auth->>DB: Find or create user
    DB-->>Auth: User record
    Auth-->>API: JWT + User
    API-->>User: Redirect with session

    %% API Key Auth
    User->>API: GET /api/... (with Bearer API Key)
    API->>Auth: decode_token(api_key)
    Auth->>DB: Lookup API key
    DB-->>Auth: Valid key + user_id
    Auth-->>API: Verified user
    API-->>User: Response
```

---

## 3. Chat / LLM Request Flow

```mermaid
sequenceDiagram
    participant User as User/Browser
    participant FE as SvelteKit Frontend
    participant API as FastAPI Router
    participant ChatMod as Chat/Message Models
    participant LLMProxy as LLM Proxy Layer
    participant LLM as LLM Backend
    participant Socket as Socket.IO
    participant RAG as RAG Engine

    User->>FE: Type message + send
    FE->>FE: Store message in local state
    FE->>API: POST /api/v1/chats/{id} (new message)

    alt RAG Enabled
        API->>RAG: Query knowledge base
        RAG->>RAG: Embed query
        RAG->>VectorDB: Similarity search
        VectorDB-->>RAG: Relevant chunks
        RAG->>RAG: Rerank (optional)
        RAG->>RAG: Build augmented prompt
        RAG-->>API: Augmented context
    end

    API->>ChatMod: Save user message to DB
    ChatMod-->>API: Message saved

    %% Establish streaming via Socket.IO
    API->>Socket: Emit 'chat:action' event
    Socket->>LLMProxy: Start generation

    LLMProxy->>LLM: POST /api/chat (or /v1/chat/completions)
    LLM-->>LLMProxy: Stream: SSE tokens
    loop Token-by-token
        LLMProxy-->>Socket: 'chat:response' token
        Socket-->>FE: WebSocket message
        FE->>FE: Render token in real-time
    end

    LLMProxy-->>Socket: 'chat:done' event
    Socket-->>FE: Stream complete
    API->>Socket: Get final message
    Socket-->>API: Complete message
    API->>ChatMod: Save assistant message to DB

    FE->>FE: Finalize message display

    Note over API,ChatMod: Fallback: For non-streaming, API returns complete response directly
```

---

## 4. RAG / Knowledge Retrieval Flow

```mermaid
flowchart LR
    subgraph Ingestion["Document Ingestion"]
        Upload["📄 File Upload"] --> Loader["Document Loader
(PDF · YouTube · Web · OCR · etc.)"]
        Loader --> Chunking["Text Chunking"]
        Chunking --> Embed["Embedding Model
(sentence-transformers / ONNX / HF)"]
        Embed --> VecDB[("Vector Database")]
    end

    subgraph Query["Query Time"]
        QueryText["🔍 User Query"] --> QEmbed["Embed query"]
        QEmbed --> Search["Similarity Search
cosine / dot / L2"]
        Search --> Retrieve["Retrieve top-k chunks"]
        Retrieve --> RerankStep["Rerank (optional)"]
        RerankStep --> Context["Build Context with citations"]
    end

    subgraph Generation["Generation"]
        Context --> Prompt["Augment LLM Prompt"]
        Prompt --> LLM_GEN["LLM generates answer
with source references"]
        LLM_GEN --> Response["📝 Final Response"]
    end

    Ingredient --> Query
    Query --> Generation
```

---

## 5. Real-Time Communication Flow (Socket.IO)

```mermaid
sequenceDiagram
    participant Client as Browser Client
    participant Svelte as Svelte Store
    participant Socket as Socket.IO Server
    participant Redis as Redis Pub/Sub
    participant DB as Database
    participant LLM_Runner as LLM Runner

    %% Connection
    Client->>Socket: connect(token)
    Socket->>Socket: Authenticate via token
    alt Success
        Socket-->>Client: connected (sid)
        Socket->>DB: Update user online status
        Client->>Socket: join room (channel_id / chat_id)
    else Failure
        Socket-->>Client: connect_error
    end

    %% Chat Streaming
    Client->>Socket: emit('chat:action', { id, messages })
    Socket->>Redis: publish to channel
    Redis->>Socket: subscribe (other workers)
    Socket->>LLM_Runner: Process streaming request
    loop Each token
        LLM_Runner-->>Socket: Token
        Socket-->>Client: emit('chat:response', token)
        Client->>Svelte: Update message store
        Svelte->>Client: Re-render UI
    end
    LLM_Runner-->>Socket: Done signal
    Socket-->>Client: emit('chat:done', { messageId })
    Socket->>DB: Save complete message

    %% Real-time Channel Chat
    Client->>Socket: emit('channel:message', { channel_id, content })
    Socket->>DB: Save message
    Socket->>Socket: Broadcast to room
    Socket-->>Client: emit('channel:message', message)

    %% Presence
    Client->>Socket: emit('typing', { channel_id })
    Socket-->>Room: emit('user:typing', { user, channel_id })

    %% Collaborative Editing (Notes/Channels)
    Note over Client,Socket: Yjs CRDT sync
    Client->>Socket: emit('y:sync', ydoc_update)
    Socket->>Socket: Broadcast to room peers
    Socket->>Redis: Persist Ydoc state
```

---

## 6. Data Model Relationships

```mermaid
erDiagram
    User ||--o{ Chat : "has many"
    User ||--o{ Auth : "has credentials"
    User ||--o{ Note : "owns"
    User ||--o{ Channel : "creates"
    User }o--o{ Channel : "member of"
    User ||--o{ Group : "member of"
    User ||--o{ ApiKey : "has"
    User ||--o{ Folder : "owns"
    User ||--o{ Prompt : "creates"

    Chat ||--o{ Message : "contains"
    Chat ||--|{ ChatTag : "tagged with"
    Chat }o--|| Folder : "belongs to"

    Message ||--o{ Evaluation : "has feedback"
    Message }o--|| Model : "uses"

    Channel ||--o{ ChannelMessage : "has"
    Channel ||--o{ ChannelAccess : "access control"

    Knowledge ||--o{ KnowledgeItem : "contains"
    Knowledge }o--|| Model : "uses embedding"

    Tool ||--o{ Tool }o--|| User : "created by"
    Function ||--o{ Function }o--|| User : "created by"

    Group ||--o{ GroupUser : "maps"
    Group ||--o{ ChannelAccess : "grants access"

    Automation ||--o{ AutomationAction : "has"
    CalendarEvent ||--o{ User : "belongs to"

    User {
        string id PK
        string name
        string email
        string role "pending | user | admin | default"
        string avatar
    }

    Chat {
        string id PK
        string user_id FK
        string title
        json messages
        timestamp created_at
        timestamp updated_at
    }

    Message {
        string id PK
        string chat_id FK
        string user_id FK
        string role "user | assistant"
        json content
        int timestamp
    }

    Knowledge {
        string id PK
        string name
        string model_id FK
        jsonb data
    }
```

---

## 7. Request Lifecycle (Full-Stack)

```mermaid
flowchart LR
    subgraph Inbound
        A["Browser Request
URL or API call"] --> B["SvelteKit
Client-side routing"]
        B --> C["Svelte Store
Reactive state"]
        C --> D["API Client
fetch() + Bearer token"]
    end

    subgraph Backend_Processing
        E["FastAPI Middleware
Auth · Session · CORS · Audit"] --> F["Router
/api/v1/..."]
        F --> G["Pydantic Validation
Request/Response models"]
        G --> H["Service Logic
DAO + Business Logic"]
        H --> I["Database
SQLAlchemy ORM"]
        H --> J["External Services
LLM · VectorDB · File Store"]
    end

    subgraph Outbound
        J --> K["Response (JSON / SSE / WebSocket)"]
        I --> K
        K --> L["SvelteKit
Re-render UI"]
        L --> M["DOM Update
Tailwind CSS"]
    end

    D --> E
```

---

## 8. Deployment Topology

```mermaid
flowchart TB
    subgraph Single["Single-Server (Default)"]
        direction TB
        FE["SvelteKit Build
Static SPA"]
        BE["FastAPI + Uvicorn
Python Backend"]
        SQLite[("SQLite
webui.db")]
        FileSys[("Local Files")]
        FE --> BE
        BE --> SQLite
        BE --> FileSys
    end

    subgraph Scaled["Scaled Deployment (Redis)"]
        direction TB
        LB2["Load Balancer"]
        FE2["SvelteKit Build
Static SPA (CDN)"]
        BE1["FastAPI Worker 1"]
        BE2["FastAPI Worker 2"]
        BE3["FastAPI Worker N"]
        RedisCluster[("Redis Cluster
Session · Cache · WS") ]
        PG[("PostgreSQL
Primary DB")]
        S3[("S3/GCS/Azure Blob
File Storage")]
        VecDB_Ext[("Vector DB
Chroma / PGVector / Qdrant")]

        LB2 --> FE2
        LB2 --> BE1
        LB2 --> BE2
        LB2 --> BE3
        BE1 --> RedisCluster
        BE2 --> RedisCluster
        BE3 --> RedisCluster
        BE1 --> PG
        BE2 --> PG
        BE3 --> PG
        BE1 --> S3
        BE2 --> S3
        BE3 --> S3
        BE1 --> VecDB_Ext
        BE2 --> VecDB_Ext
        BE3 --> VecDB_Ext
    end
```

---

## 9. Key Data Flows Summary

| #   | Flow                    | Path                                                                        | Protocol         |
| --- | ----------------------- | --------------------------------------------------------------------------- | ---------------- |
| 1   | **User Authentication** | Browser → FastAPI → Auth Utils → DB → JWT                                   | HTTP REST        |
| 2   | **Chat Message**        | Browser → API → Save → LLM Proxy → LLM → Stream back                        | HTTP + WebSocket |
| 3   | **RAG Query**           | Browser → API → Embed → VectorDB → Retrieve → Rerank → Augment Prompt → LLM | HTTP REST        |
| 4   | **File Upload**         | Browser → API → File Store → DB → Embed → VectorDB                          | HTTP Multipart   |
| 5   | **Real-time Chat**      | Browser → Socket.IO → Redis Pub/Sub → Broadcast                             | WebSocket        |
| 6   | **Model Management**    | Browser → API → Ollama/OpenAI API → DB                                      | HTTP REST        |
| 7   | **Admin Config**        | Browser → API → Config Model → DB                                           | HTTP REST        |
| 8   | **Plugin Execution**    | Pipeline Server → FastAPI → External Service                                | HTTP/gRPC        |
