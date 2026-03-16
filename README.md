# NPC E-Commerce Workspace

## Project Structure

- `Back-End/`: Node.js + Express + MongoDB API
- `Front-End/`: Static HTML/CSS/JS client

## Backend Layout (Organized)

- `Back-End/server.js`: entrypoint wrapper
- `Back-End/src/server.js`: main server bootstrap
- `Back-End/src/models/`: Mongoose models
- `Back-End/src/routes/`: API route handlers
- `Back-End/src/middleware/`: auth/validation middleware
- `Back-End/src/utils/`: shared utility helpers and seed data

## Key API Domains

- `users`: auth and profile
- `components`: product catalog
- `carts`: persistent cart by user
- `builds`: persistent PC build by user
- `orders`: checkout order creation and history
- `payments`: MoMo integration

## Run

### Backend

```bash
cd Back-End
npm install
npm run dev
```

### Frontend

```bash
cd Front-End/Package
npm install
npm run start
```

Open: `http://localhost:8080`

## Notes

- Cart/Build/Order are now API-backed (no localStorage persistence for commerce data).
- JWT-protected routes require `Authorization: Bearer <token>`.
- MoMo create endpoint now expects an `orderId`.
