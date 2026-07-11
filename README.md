# Connect Your School

A responsive school-management app for school registration, student profiles, fees, results and notifications. The frontend is React + Vite; data is stored safely in MongoDB Atlas through an Express API.

## MongoDB Atlas setup

1. Create a free account at https://www.mongodb.com/cloud/atlas/register
2. Create a free **M0** cluster.
3. Open **Database Access**, create a database user and save its username/password.
4. Open **Network Access** and add your current IP. For a deployed API, allow the hosting provider's outbound IP (or use `0.0.0.0/0` with a strong database password).
5. Click **Connect → Drivers → Node.js** and copy the connection string.
6. Copy `.env.example` to `.env`, then replace `YOUR_USERNAME`, `YOUR_PASSWORD`, and `YOUR_CLUSTER` in `MONGODB_URI`. URL-encode special characters in the password.

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/connect_your_school?retryWrites=true&w=majority
PORT=5000
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:5000/api
```

Never commit `.env` or put `MONGODB_URI` in a `VITE_` variable; Vite variables are public in the browser.

## Run locally

Open two terminals:

```bash
npm run dev:server
npm run dev
```

The frontend runs at `http://localhost:5173`; the API runs at `http://localhost:5000`. Check database connectivity at `http://localhost:5000/api/health`.

## Deploy

- Deploy the Express API (`server/index.js`) to Render, Railway or another Node host. Add `MONGODB_URI` and `CLIENT_URL` as server environment variables.
- Keep the frontend on Netlify. Add `VITE_API_URL=https://your-api-domain.example/api` in Netlify environment variables and redeploy.
- Do not deploy the API as a static Netlify site.

## Commands

- `npm run dev` — frontend development server
- `npm run dev:server` — API development server
- `npm run build` — production frontend build
- `npm run server` — production API server
- `npm run lint` — lint project files
