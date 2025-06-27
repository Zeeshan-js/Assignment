# Assignment Project

A full-stack event management application with a **Node.js/Express/GraphQL/Prisma** backend and a **React Native (Expo)** frontend. Real-time features are powered by **Socket.IO**.

---

## Project Structure

```
Assignment-Project/
  backend/    # Node.js, Express, Apollo Server, Prisma, Socket.IO
  frontend/   # Expo/React Native app
```

---

## Prerequisites

- **Node.js** (v16 or later recommended)
- **npm** (comes with Node.js)
- **Expo CLI** (for frontend, install with `npm install -g expo-cli`)
- (Optional) **PostgreSQL** or your preferred database (if not using SQLite)

---

## Installation & Setup

### 1. Clone the Repository

```sh
git clone <your-github-repo-link>
cd Assignment-Project
```

### 2. Backend Setup

```sh
cd backend
npm install
```

- Create a `.env` file in `backend/` with the following (example):
  ```
  PORT=3000
  DATABASE_URL="file:./dev.db"   # Or your actual database URL
  JWT_SECRET=your_jwt_secret
  ```

- Run database migrations (if using Prisma):
  ```sh
  npx prisma migrate deploy
  npx prisma generate
  ```

### 3. Frontend Setup

```sh
cd ../frontend
npm install
```

---

## Running the Project Locally

### 1. Start the Backend

```sh
cd backend
npm run dev
```
- The backend will be available at `http://localhost:3000/graphql` (GraphQL endpoint).
- Socket.IO will be available at `http://localhost:3000`.

### 2. Start the Frontend

```sh
cd frontend
npx expo start
```
- Use the Expo app on your phone, or an emulator, to scan the QR code and run the app.

---

## Example Credentials

- **Guest Login:**  
  The frontend provides a "Sign In (as Guest)" button.  
  This will log you in as:
  - **Email:** `guest@example.com`
  - **Name:** `Guest`

- **Normal Login:**  
  If you have seeded users in your database, use their credentials.  
  Otherwise, sign up via the app.

---

## Scripts

### Backend

- `npm run dev` — Start backend in development mode (with hot reload)
- `npm start` — Start backend in production mode

### Frontend

- `npx expo start` — Start Expo development server
- `npm run android` — Run on Android emulator/device
- `npm run ios` — Run on iOS simulator/device
- `npm run web` — Run in web browser

---

## Notes

- Ensure your backend CORS settings allow the frontend's port (default: 19006 for Expo).
- Update `DATABASE_URL` in `.env` as needed for your environment.
- If you want to use JWT authentication, set a strong `JWT_SECRET` in your `.env`.

---

## License

MIT
