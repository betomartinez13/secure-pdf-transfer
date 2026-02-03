# Fiscalia Frontend

React frontend for the Fiscalia secure document transfer module.

## Prerequisites

- Node.js 18+
- Fiscalia Backend running on port 3001 (see `/fiscalia/backend`)
- Tribunal Backend running on port 4001 (required for end-to-end flow)

## Installation

```bash
npm install
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_FISCALIA_API_URL` | Fiscalia backend URL | `http://localhost:3001` |

Create a `.env` file to override (optional):

```env
VITE_FISCALIA_API_URL=http://localhost:3001
```

## Run Development Server

```bash
npm run dev
```

Opens at http://localhost:3000

## Build for Production

```bash
npm run build
npm run preview  # preview production build
```

## Usage

1. Enter a case name (min 2 characters)
2. Select a PDF file
3. Click "Send to Court"
4. View success/error response with SHA-256 hash and verification status

## API Endpoint

The frontend calls:

- **POST** `/cases/send` (multipart/form-data)
  - `caseName`: string
  - `file`: PDF file

Response:
```json
{
  "success": true,
  "message": "Case \"ABC-123\" sent successfully.",
  "hash": "sha256-hash-string",
  "hashVerified": true
}
```

## Testing the Full Flow

1. Start Tribunal backend (port 4001)
2. Start Fiscalia backend (port 3001)
3. Start Fiscalia frontend (port 3000)
4. Upload a PDF and verify the hash verification status
