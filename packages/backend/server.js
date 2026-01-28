// server.js (Optimized Weekly Reads + Email Restrictions)

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  }),
});
const db = admin.firestore();

const app = express();

const allowedOrigins = [
  "https://parking.foysys.com",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(new Error("This origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ---- Auth middleware (admin-protected routes) ----
const verifyAuthToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized: No token provided.");
  }
  const idToken = authHeader.slice("Bearer ".length);
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch {
    res.status(403).send("Unauthorized: Invalid token.");
  }
};

// ---- Config ----
const PARKING_SPOTS = [
  "Parqueadero 57", "Parqueadero 61", "Parqueadero 343",
  "Parqueadero 344", "Parqueadero 345", "Parqueadero 346", "Parqueadero 347",
  "Parqueadero 348", "Parqueadero 349", "Parqueadero 350",
];

// Email domain restriction
const ALLOWED_DOMAIN = "@northhighland.com";
const MAX_WEEKLY_RESERVATIONS = 3;

// ---- Mailer ----
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// ---- Week helpers (America/Guayaquil) ----
const tz = "America/Guayaquil";

function toGye(date = new Date()) {
  // normalize to local time in Guayaquil by formatting then re-parsing ISO date-only where needed
  return new Date(date.toLocaleString("en-US", { timeZone: tz }));
}

function getVisibleWeekRange() {
  const now = toGye();
  const dow = now.getDay(); // 0=Sun ... 6=Sat
  const hour = now.getHours();
  const effective = dow === 0 ? 7 : dow; // Mon=1 .. Sun=7
  const monday = new Date(now);
  monday.setDate(now.getDate() - (effective - 1));

  // After Fri 6pm, Sat, Sun -> show next week
  if ((dow === 5 && hour >= 19) || dow === 6 || dow === 0) {
    monday.setDate(monday.getDate() + 7);
  }

  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split("T")[0]); // YYYY-MM-DD
  }
  return { start: dates[0], end: dates[4], dates };
}

function getVisibleDates() {
  const { dates } = getVisibleWeekRange();
  return dates.map((dateStr) => {
    // label day name for UI
    const weekday = new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long" });
    return { date: dateStr, day: weekday };
  });
}

// ---- Email validation helper ----
function validateEmail(email) {
  if (!email || typeof email !== 'string') return { valid: false, error: "Email is required" };
  
  const emailLower = email.toLowerCase().trim();
  
  if (!emailLower.endsWith(ALLOWED_DOMAIN)) {
    return { valid: false, error: "Only North Highland Email accepted." };
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    return { valid: false, error: "Invalid email format" };
  }
  
  return { valid: true, normalizedEmail: emailLower };
}

// ---- Tiny in-memory cache to reduce hot reads ----
const cache = new Map(); // key -> { data, ts }
const TTL_MS = 60 * 1000;

function getCached(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data;
  cache.delete(key);
  return null;
}
function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ---- Endpoints ----
app.get("/config", (req, res) => {
  res.json({
    parkingSpots: PARKING_SPOTS,
    visibleWeekDates: getVisibleDates(),
  });
});

// Create reservation (public; validated server-side)
app.post("/reserve", async (req, res) => {
  const { email, date, spot } = req.body;
  
  // Validate required fields
  if (!email || !date || !spot) {
    return res.status(400).json({ error: "Email, date, and parking spot are required" });
  }

  // Validate email domain
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }
  
  const normalizedEmail = emailValidation.normalizedEmail;

  // Validate date is within visible week
  const visibleDates = getVisibleWeekRange().dates;
  if (!visibleDates.includes(date)) {
    return res.status(400).json({ error: "You can only reserve dates within the visible week." });
  }

  // Validate parking spot
  if (!PARKING_SPOTS.includes(spot)) {
    return res.status(400).json({ error: "Invalid parking spot selected." });
  }

  const reservationsRef = db.collection("reservations");
  try {
    await db.runTransaction(async (tx) => {
      // Check if user already has a reservation for this specific date
      const userDateQuery = reservationsRef
        .where("date", "==", date)
        .where("email", "==", normalizedEmail)
        .limit(1);
        
      // Check if spot is already reserved for this date
      const spotQuery = reservationsRef
        .where("date", "==", date)
        .where("spot", "==", spot)
        .limit(1);
      
      // Check user's weekly reservation count
      const { start, end } = getVisibleWeekRange();
      const userWeeklyQuery = reservationsRef
        .where("email", "==", normalizedEmail)
        .where("date", ">=", start)
        .where("date", "<=", end);

      const [userDateSnap, spotSnap, userWeeklySnap] = await Promise.all([
        tx.get(userDateQuery),
        tx.get(spotQuery),
        tx.get(userWeeklyQuery)
      ]);

      // Check if user already has reservation for this date
      if (!userDateSnap.empty) {
        throw new Error("You can only reserve one parking spot per day.");
      }

      // Check if spot is already taken
      if (!spotSnap.empty) {
        throw new Error(`Parking spot ${spot} is already reserved for this date.`);
      }

      // Check weekly limit (3 reservations per week)
      if (userWeeklySnap.size >= MAX_WEEKLY_RESERVATIONS) {
        throw new Error(`You can only make ${MAX_WEEKLY_RESERVATIONS} reservations per week. You currently have ${userWeeklySnap.size} reservations.`);
      }

      // Create new reservation with normalized email
      const newDoc = reservationsRef.doc();
      tx.set(newDoc, { 
        email: normalizedEmail, 
        date, 
        spot, 
        createdAt: admin.firestore.Timestamp.now() 
      });
    });

    // Send confirmation email
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: normalizedEmail,
      subject: "Parking Reservation Confirmation",
      html: `
        <h2>Parking Reservation Confirmed</h2>
        <p>Your parking spot has been successfully reserved:</p>
        <ul>
          <li><strong>Parking Spot:</strong> ${spot}</li>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Email:</strong> ${normalizedEmail}</li>
        </ul>
        <p>Please arrive on time and park only in your designated spot.</p>
      `,
    }).catch(err => console.error("Email sending failed:", err));

    // bust caches for this week
    const { start, end } = getVisibleWeekRange();
    cache.delete(`week:${start}:${end}`);
    cache.delete(`summary:${start}:${end}`);

    res.status(201).json({ 
      message: `Reservation successful for ${spot} on ${date}`,
      reservationDetails: {
        email: normalizedEmail,
        date,
        spot
      }
    });
  } catch (e) {
    console.error("Reservation Error:", e.message);
    res.status(400).json({ error: e.message });
  }
});

// ---- NEW: reservations for visible (or provided) week only ----
app.get("/reservations/week", async (req, res) => {
  const { start, end } = (() => {
    const { start, end } = getVisibleWeekRange();
    return {
      start: req.query.start || start,
      end: req.query.end || end,
    };
  })();

  const cacheKey = `week:${start}:${end}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const q = db
      .collection("reservations")
      .where("date", ">=", start)
      .where("date", "<=", end)
      .orderBy("date", "asc");

    const snap = await q.get();
    const reservations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setCached(cacheKey, reservations);
    res.json(reservations);
  } catch (err) {
    console.error("Error fetching weekly reservations:", err);
    res.status(500).json({ error: "Failed to fetch weekly reservations" });
  }
});

// ---- NEW: compact weekly summary for the grid (1 call) ----
app.get("/summary/week", async (req, res) => {
  const { start, end, dates } = (() => {
    const r = getVisibleWeekRange();
    return { ...r, start: req.query.start || r.start, end: req.query.end || r.end };
  })();

  const cacheKey = `summary:${start}:${end}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const q = db
      .collection("reservations")
      .where("date", ">=", start)
      .where("date", "<=", end)
      .orderBy("date", "asc");

    const snap = await q.get();

    // Initialize all as null (available)
    const summary = {};
    for (const d of dates) {
      summary[d] = {};
      for (const s of PARKING_SPOTS) summary[d][s] = null;
    }
    // Fill reserved spots
    snap.forEach((doc) => {
      const { date, spot, email } = doc.data();
      if (summary[date]) summary[date][spot] = email || true;
    });

    setCached(cacheKey, summary);
    res.json(summary);
  } catch (err) {
    console.error("Error building weekly summary:", err);
    res.status(500).json({ error: "Failed to fetch weekly summary" });
  }
});

// ---- Admin-only: clear & release remain protected ----
app.delete("/clear-reservations", verifyAuthToken, async (req, res) => {
  try {
    const snap = await db.collection("reservations").get();
    if (snap.empty) return res.json({ message: "No reservations to delete." });

    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    
    // Clear all caches
    cache.clear();
    
    res.json({ message: "All reservations have been successfully deleted." });
  } catch (e) {
    console.error("Error clearing reservations:", e);
    res.status(500).json({ error: "Failed to clear reservations" });
  }
});

app.delete("/release/:id", verifyAuthToken, async (req, res) => {
  try {
    const docRef = db.collection("reservations").doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Reservation not found." });
    }

    await docRef.delete();

    // Clear relevant caches
    const { start, end } = getVisibleWeekRange();
    cache.delete(`week:${start}:${end}`);
    cache.delete(`summary:${start}:${end}`);

    res.json({ message: "Reservation released successfully." });
  } catch (e) {
    console.error("Error releasing reservation:", e);
    res.status(500).json({ error: "Failed to release reservation." });
  }
});

app.delete("/delete-old-reservations", verifyAuthToken, async (req, res) => {
  try {
    const { start } = getVisibleWeekRange();

    // Query for reservations older than the first day of the current visible week
    const oldReservationsQuery = db.collection("reservations")
      .where("date", "<", start);

    const snap = await oldReservationsQuery.get();

    if (snap.empty) {
      return res.json({ message: "No old reservations found to delete." });
    }

    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // Clear all caches
    cache.clear();

    res.json({
      message: `Successfully deleted ${snap.size} old reservations (older than ${start}).`,
      deletedCount: snap.size
    });
  } catch (e) {
    console.error("Error deleting old reservations:", e);
    res.status(500).json({ error: "Failed to delete old reservations." });
  }
});

// ⚠️ Make the old unbounded list admin-only or remove entirely
app.get("/reservations", verifyAuthToken, async (req, res) => {
  // Keep for admin triage only; not used by the public UI.
  try {
    const snap = await db.collection("reservations").orderBy("date", "desc").limit(500).get();
    const reservations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(reservations);
  } catch (e) {
    console.error("Error fetching reservations:", e);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));