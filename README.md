# Connect Your School

A responsive school-management portal for school registration, student profiles, fees, results and notifications. React + Vite powers the frontend, while MongoDB Atlas and Netlify Functions provide the production API.

## Environment

Copy `.env.example` to `.env` for local development. Never commit `.env`, MongoDB credentials, Google private keys or `SHEET_SYNC_SECRET`.

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER/connect_your_school?retryWrites=true&w=majority
PORT=5000
CLIENT_URL=http://localhost:5173
VITE_API_URL=/api
```

For Netlify production, add `MONGODB_URI` under **Project configuration → Environment variables**. `VITE_API_URL` should be `/api` or absent.

## Google Sheet mirror

The private workbook should be named **Connect Your School — Master Data**. The application creates and maintains these tabs:

- `Schools` — school/admin details and six-digit admin PIN
- `Students` — school-linked student details and four-digit student PIN
- `Fees`, `Notifications`, `Exam Types`, `Results`
- `_Sync Log` — reconciliation history

### One-time Google setup

1. Create one blank Google Sheet and copy the ID between `/d/` and `/edit` in its URL.
2. In Google Cloud Console, enable **Google Sheets API**.
3. Create a service account and download its JSON key.
4. Share the blank Sheet with the JSON `client_email` as **Editor**.
5. Add these server-only variables locally and in Netlify:

```env
GOOGLE_SHEET_ID=the_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SHEET_SYNC_SECRET=use-a-long-random-secret
```

Normal app registrations are written to MongoDB first and then mirrored to the Sheet. A scheduled Netlify function reconciles Sheet edits every five minutes. Deleting a Sheet-managed school or student row deletes the corresponding MongoDB record and its dependent records. Keep the workbook private because it contains test login PINs.

## Demo dataset

`npm run seed:check` validates the deterministic demo plan without touching MongoDB:

- 5 schools
- Nursery, LKG, UKG and Classes 1–10
- Sections A, B and C
- 5 students in every class/section
- 975 students in total

To clear the selected application database and create the demo dataset, set `CONFIRM_RESET_DATABASE` to the exact database name from `MONGODB_URI`, then run:

```bash
npm run seed:reset
```

The reset refuses MongoDB system databases. After seeding, every generated school/student and login PIN is available in the private Google Sheet.

## Development

```bash
npm run dev:server
npm run dev
```

Useful commands:

- `npm run build` — production build
- `npm run lint` — lint all project files
- `npm run seed:check` — verify demo counts without database writes
- `npm run seed:demo` — upsert demo records without clearing the database
- `npm run seed:reset` — confirmed destructive reset, seed and Sheet export
