# Secure PDF Transfer

Encrypted document exchange system between a **Prosecutor's Office** and a **Court**, built with NestJS, React, PostgreSQL, and Docker.

Demonstrates a **digital envelope** cryptographic pattern: files are encrypted with a symmetric key (AES-256-GCM), the symmetric key is encrypted with an asymmetric key (RSA-2048), and integrity is verified via hashing (SHA-256).

> University project -- Information Security course.

---

## Architecture

```
                        Docker Compose
 ┌─────────────────────────────────────────────────────────┐
 │                                                         │
 │   frontend-network                                      │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ :3000 Fiscalia UI        :4000 Tribunal UI        │  │
 │  └────────┬─────────────────────────┬────────────────┘  │
 │           │                         │                    │
 │   backend-network                                       │
 │  ┌────────┴─────────────────────────┴────────────────┐  │
 │  │ :3001 Fiscalia API ────► :4001 Tribunal API       │  │
 │  │       (encrypt)          (decrypt + key exchange)  │  │
 │  └──────────────────────────────────┬────────────────┘  │
 │                                     │                    │
 │   database-network                                      │
 │  ┌──────────────────────────────────┴────────────────┐  │
 │  │ :4001 Tribunal API       :5432 PostgreSQL         │  │
 │  └───────────────────────────────────────────────────┘  │
 │                                                         │
 └─────────────────────────────────────────────────────────┘

 5 containers · 3 isolated networks · 2 persistent volumes
```

## How It Works

```
Fiscalia                                         Tribunal
────────                                         ────────
                                                 Startup: generate RSA-2048 keypair
                                                          (or load from volume)

1.  GET /crypto/public-key  ──────────────────►  return public key PEM
    ◄── public key ────────────────────────────

2.  SHA-256(pdf) → hash
3.  random AES-256 key + 96-bit IV
4.  AES-256-GCM(pdf, key, iv) → ciphertext + authTag
5.  RSA-OAEP(key, tribunal_pub) → encryptedKey
6.  POST /cases/receive { ciphertext, encryptedKey, iv, authTag, hash }
                              ──────────────────►
                                                 7.  RSA-OAEP(encryptedKey, priv) → AES key
                                                 8.  AES-256-GCM decrypt (verifies authTag)
                                                 9.  SHA-256(decrypted) == hash?
                                                 10. Store in PostgreSQL
```

| Layer | Algorithm | Purpose |
|-------|-----------|---------|
| Symmetric | AES-256-GCM | Encrypt file content (authenticated) |
| Asymmetric | RSA-2048 OAEP | Encrypt the AES key |
| Hash | SHA-256 | End-to-end integrity verification |

## Tech Stack

- **Backend** -- NestJS (TypeScript)
- **Frontend** -- React 18 + Vite (TypeScript)
- **Database** -- PostgreSQL 16 + Prisma ORM
- **Crypto** -- Node.js built-in `crypto` module (no external libs)
- **Infra** -- Docker + Docker Compose

## Quick Start

```bash
git clone https://github.com/betomartinez13/secure-pdf-transfer.git
cd secure-pdf-transfer
docker-compose up --build
```

| Service | URL | Role |
|---------|-----|------|
| Fiscalia UI | http://localhost:3000 | Upload and encrypt PDFs |
| Fiscalia API | http://localhost:3001 | Encryption + send |
| Tribunal UI | http://localhost:4000 | View cases + download |
| Tribunal API | http://localhost:4001 | Decrypt + verify + store |
| Database | internal:5432 | PostgreSQL (not exposed) |

### Usage

1. Open **http://localhost:3000**
2. Enter a case name, select a PDF, click **Send to Court**
3. Open **http://localhost:4000**
4. The case appears in the table -- check the hash verification status
5. Click **Download** to retrieve the original PDF

## Security Features

### Encryption

- **AES-256-GCM** -- Authenticated encryption that detects any tampering of the ciphertext. Uses a unique random key and 96-bit IV per file.
- **RSA-2048 (OAEP padding)** -- The AES key is encrypted with the Tribunal's public key. Only the Tribunal's private key can recover it.
- **SHA-256 hashing** -- The original file is hashed before encryption. After decryption, the hash is recomputed and compared to verify end-to-end integrity.

### Key Management

- RSA keypair is generated **inside the Tribunal container** on first startup
- Private key **never leaves** the container
- Keys persist across restarts via a Docker named volume
- Public key is served dynamically via `GET /crypto/public-key`

### Network Segmentation

| Service | frontend | backend | database |
|---------|:--------:|:-------:|:--------:|
| Fiscalia UI | Y | | |
| Fiscalia API | Y | Y | |
| Tribunal UI | Y | | |
| Tribunal API | Y | Y | Y |
| PostgreSQL | | | Y |

- Database is **only reachable** from the Tribunal API
- Frontends **cannot** access the database
- Fiscalia API can reach Tribunal API but **not** the database
- PostgreSQL has **no host port mapping**

## Project Structure

```
secure-pdf-transfer/
├── docker-compose.yml
├── fiscalia/
│   ├── frontend/             # React -- file upload UI
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   └── src/
│   └── backend/              # NestJS -- encrypt + send
│       ├── Dockerfile
│       └── src/
│           ├── cases/        # POST /cases/send
│           └── crypto/       # AES-256-GCM + RSA + SHA-256
└── tribunal/
    ├── frontend/             # React -- cases table + download
    │   ├── Dockerfile
    │   ├── nginx.conf
    │   └── src/
    └── backend/              # NestJS -- decrypt + store
        ├── Dockerfile
        ├── prisma/           # DB schema
        └── src/
            ├── cases/        # POST /cases/receive, GET /cases
            ├── crypto/       # RSA keygen, AES-GCM decrypt, SHA-256
            └── prisma/       # DB service
```
