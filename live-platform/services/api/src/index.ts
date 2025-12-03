// services/api/src/index.ts
import Fastify from "fastify";
import pg from "pg";
import nodemailer from "nodemailer";
import cors from "@fastify/cors";
import { z } from "zod";
import Stripe from "stripe";

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL!;

// Database connection pool
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });

// Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

// Ensure table exists (idempotent)
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

const allowed = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl/postman
    if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    cb(new Error("CORS: origin not allowed"), false);
  },
  credentials: false,
});

// Email transport
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Health check
app.get("/health", async () => {
  const res = await pool.query("SELECT 1 as ok");
  return { ok: res.rows[0].ok === 1 };
});

app.get("/", async () => ({ message: "API up" }));

// -----------------------------
// SUBSCRIBE ENDPOINT
// -----------------------------
app.post("/subscribe", async (req, reply) => {
  const bodySchema = z.object({
    email: z.string().email().max(254),
  });

  let email: string;
  try {
    ({ email } = bodySchema.parse(req.body));
  } catch (e) {
    return reply.code(400).send({ error: "Invalid email" });
  }

  try {
    await ensureTable();
    await pool.query(
      "INSERT INTO subscribers(email) VALUES($1) ON CONFLICT (email) DO NOTHING",
      [email]
    );

    const info = await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.NOTIFY_TO,
      subject: "New Coming Soon subscriber",
      text: `New subscriber: ${email}`,
      html: `<p>New subscriber: <strong>${email}</strong></p>`,
    });

    return reply.send({ ok: true, queued: Boolean(info.messageId) });
  } catch (err) {
    req.log.error({ err }, "subscribe failed");
    return reply.code(500).send({ ok: false });
  }
});

// -----------------------------
// ⭐ STRIPE CHECKOUT ENDPOINT ⭐
// -----------------------------
app.post("/api/checkout", async (req, reply) => {
  const bodySchema = z.object({
    paymentMethodId: z.string().min(1),
  });

  let paymentMethodId: string;

  // Validate body
  try {
    ({ paymentMethodId } = bodySchema.parse(req.body));
  } catch {
    return reply.code(400).send({
      success: false,
      message: "Invalid request",
    });
  }

  try {
    // Create a PaymentIntent (one-time charge)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1999, // $19.99 = 1999 cents
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
    });

    return reply.send({
      success: true,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: any) {
    req.log.error({ err }, "stripe payment failed");
    return reply.code(500).send({
      success: false,
      message: err.message,
    });
  }
});

// -----------------------------
// START SERVER
// -----------------------------
app.listen({ host: "0.0.0.0", port: PORT }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
