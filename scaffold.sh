#!/usr/bin/env bash
set -euo pipefail

ROOT="live-platform"
mkdir -p "$ROOT"
cd "$ROOT"

### Root files
cat > package.json <<'EOF'
{
  "name": "live-platform",
  "private": true,
  "workspaces": ["services/*"],
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "dev:chat": "pnpm --filter chat-ws dev",
    "dev:orchestrator": "pnpm --filter orchestrator dev",
    "dev:transcoder": "pnpm --filter transcoder dev"
  }
}
EOF

cat > pnpm-workspace.yaml <<'EOF'
packages:
  - "services/*"
EOF

cat > .env.example <<'EOF'
# Shared
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/live
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=live
PUBLIC_BASE_URL=http://localhost:3000

# API
PORT_API=4000
JWT_SECRET=dev-secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
PLATFORM_TAKE_BPS=1200
TOKEN_VALUE_CENTS=10

# Ingest/Origin
INGEST_AUTH_SECRET=ingestdev
INGEST_CALLBACK_BASE=http://api:4000
ORIGIN_PUBLIC_URL=http://localhost:8080
EOF

cat > docker-compose.yml <<'EOF'
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: live
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio:RELEASE.2024-06-04T19-20-08Z
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]
    volumes: [miniodata:/data]

  create-bucket:
    image: minio/mc
    depends_on: [minio]
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin &&
      mc mb -p local/live || true &&
      mc anonymous set download local/live
      "

  origin:
    image: nginx:1.25-alpine
    depends_on: [minio]
    volumes:
      - ./infra/origin-nginx.conf:/etc/nginx/nginx.conf:ro
    ports: ["8080:8080"]

  mediamtx:
    image: bluenviron/mediamtx:1.7.4
    volumes:
      - ./infra/mediamtx.yaml:/mediamtx.yml:ro
    environment:
      MTX_PATH: /mediamtx.yml
    network_mode: service:origin
    depends_on: [origin]

  api:
    build:
      context: ./services/api
    env_file:
      - ./.env
    environment:
      DATABASE_URL: ${POSTGRES_URL}
      REDIS_URL: ${REDIS_URL}
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
      MINIO_BUCKET: live
      ORIGIN_PUBLIC_URL: http://origin:8080
    ports: ["4000:4000"]
    depends_on: [postgres, redis, minio, origin]

  chat-ws:
    build:
      context: ./services/chat-ws
    env_file: [ ./.env ]
    ports: ["4100:4100"]
    depends_on: [redis]

  orchestrator:
    build:
      context: ./services/orchestrator
    env_file: [ ./.env ]
    depends_on: [redis, api]

  transcoder:
    build:
      context: ./services/transcoder
    env_file: [ ./.env ]
    volumes:
      - ./infra/ffmpeg-ladder.sh:/app/ffmpeg-ladder.sh:ro
    depends_on: [minio, orchestrator]

volumes:
  pgdata: {}
  miniodata: {}
EOF

### Infra
mkdir -p infra
cat > infra/origin-nginx.conf <<'EOF'
worker_processes auto;
events { worker_connections 1024; }
http {
  include       mime.types;
  default_type  application/octet-stream;
  sendfile on;
  tcp_nopush on;
  aio threads;
  server {
    listen 8080;
    # Proxy to MinIO for /live and /vod
    location / {
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_pass http://minio:9000/live/;
    }
    # Cache headers for HLS
    location ~* \.(m3u8)$ {
      add_header Cache-Control "public, max-age=1, stale-while-revalidate=10";
      proxy_pass http://minio:9000$request_uri;
    }
    location ~* \.(m4s|mp4|ts)$ {
      add_header Cache-Control "public, max-age=3600, immutable";
      proxy_pass http://minio:9000$request_uri;
    }
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Headers "Range, Origin, Accept, User-Agent, Cache-Control";
    add_header Access-Control-Expose-Headers "Content-Length, Content-Range";
  }
}
EOF

cat > infra/mediamtx.yaml <<'EOF'
paths:
  all:
    readUser: ""
    readPass: ""
    publishUser: ""
    publishPass: ""
    sourceOnDemand: yes
    runOnPublish: |
      curl -s -X POST "$INGEST_CALLBACK_BASE/internal/ingest/start" -H "Content-Type: application/json" -d "{\"path\":\"$MTX_PATH\",\"stream\":\"${RTSP_PATH}\",\"query\":\"${QUERY}\"}" >/dev/null
    runOnPublishRestart: yes

rtmp:
  enable: yes
  listen: :1935

hls:
  enable: no

webrtc: { enable: no }
EOF

cat > infra/ffmpeg-ladder.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
INPUT="${INPUT:-rtmp://localhost:1935/live/$STREAM_KEY}"
OUT="${OUT:-./out}"
MASTER="$OUT/master.m3u8"

TARGET=2
PART=0.4
WINDOW=10

mkdir -p "$OUT"

ffmpeg -y -i "$INPUT" \
  -map 0:v:0 -map 0:a:0 -c:a aac -b:a:160k -ar 48000 -ac 2 \
  -filter:v:0 "fps=30,scale=w=1920:h=1080:force_original_aspect_ratio=decrease" -c:v:0 libx264 -preset veryfast -profile:v:0 high -b:v:0 5000k -maxrate:v:0 5500k -bufsize:v:0 10000k -g $(echo "30*$TARGET" | bc) -keyint_min $(echo "30*$TARGET" | bc) -sc_threshold 0 \
  -filter:v:1 "fps=30,scale=w=1280:h=720:force_original_aspect_ratio=decrease"  -c:v:1 libx264 -preset veryfast -profile:v:1 high -b:v:1 2500k -maxrate:v:1 2800k -bufsize:v:1 6000k -g $(echo "30*$TARGET" | bc) -keyint_min $(echo "30*$TARGET" | bc) -sc_threshold 0 \
  -filter:v:2 "fps=30,scale=w=854:h=480:force_original_aspect_ratio=decrease"   -c:v:2 libx264 -preset veryfast -profile:v:2 main -b:v:2 1200k -maxrate:v:2 1500k -bufsize:v:2 4000k -g $(echo "30*$TARGET" | bc) -keyint_min $(echo "30*$TARGET" | bc) -sc_threshold 0 \
  -filter:v:3 "fps=30,scale=w=640:h=360:force_original_aspect_ratio=decrease"   -c:v:3 libx264 -preset veryfast -profile:v:3 baseline -b:v:3 800k  -maxrate:v:3 900k  -bufsize:v:3 3000k -g $(echo "30*$TARGET" | bc) -keyint_min $(echo "30*$TARGET" | bc) -sc_threshold 0 \
  -f hls -hls_time $TARGET -hls_playlist_type event -hls_flags independent_segments+append_list+omit_endlist+split_by_time+program_date_time \
  -hls_segment_type fmp4 -master_pl_name master.m3u8 \
  -hls_list_size 0 -strftime 1 \
  -hls_segment_filename "$OUT/v%v/seg-%06d.m4s" \
  -hls_fmp4_init_filename "init.mp4" \
  -var_stream_map "v:0,a:0 v:1,a:0 v:2,a:0 v:3,a:0" \
  -master_pl_publish_rate 1 \
  -method PUT "$OUT/v%v/index.m3u8"
EOF
chmod +x infra/ffmpeg-ladder.sh

### Services: API
mkdir -p services/api/{src/routes,src/lib,prisma}
cat > services/api/package.json <<'EOF'
{
  "name": "api",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev --name init"
  },
  "dependencies": {
    "@prisma/client": "^5.19.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "stripe": "^16.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "prisma": "^5.19.1",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "tsx": "^4.15.7",
    "typescript": "^5.6.3"
  }
}
EOF

cat > services/api/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
EOF

cat > services/api/src/env.ts <<'EOF'
import 'dotenv/config';
function req(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}
export const ENV = {
  PORT: Number(process.env.PORT_API ?? 4000),
  DATABASE_URL: req('POSTGRES_URL'),
  REDIS_URL: req('REDIS_URL'),
  MINIO_ENDPOINT: req('MINIO_ENDPOINT'),
  MINIO_ACCESS_KEY: req('MINIO_ACCESS_KEY'),
  MINIO_SECRET_KEY: req('MINIO_SECRET_KEY'),
  MINIO_BUCKET: req('MINIO_BUCKET'),
  STRIPE_SECRET_KEY: req('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: req('STRIPE_WEBHOOK_SECRET'),
  PLATFORM_TAKE_BPS: Number(process.env.PLATFORM_TAKE_BPS ?? 1200),
  TOKEN_VALUE_CENTS: Number(process.env.TOKEN_VALUE_CENTS ?? 10),
  ORIGIN_PUBLIC_URL: req('ORIGIN_PUBLIC_URL'),
  JWT_SECRET: req('JWT_SECRET')
};
EOF

cat > services/api/src/prisma.ts <<'EOF'
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
EOF

cat > services/api/src/lib/bundles.ts <<'EOF'
export type Bundle = { id: string; grossCents: number; bonusTokens: number };
const base: Bundle[] = [
  { id: 'T100', grossCents: 10000, bonusTokens: 0 },
  { id: 'T200', grossCents: 20000, bonusTokens: 40 },
  { id: 'T250', grossCents: 25000, bonusTokens: 50 },
  { id: 'T350', grossCents: 35000, bonusTokens: 120 },
  { id: 'T450', grossCents: 45000, bonusTokens: 320 }
];
export function finalizeBundles(tokenValueCents: number, platformTakeBps: number) {
  return base.map(b => {
    const net = Math.round(b.grossCents * (1 - platformTakeBps / 10000));
    const baseTokens = Math.floor(net / tokenValueCents);
    const finalTokens = baseTokens + b.bonusTokens;
    const residualCents = net - baseTokens * tokenValueCents;
    return { ...b, netCents: net, baseTokens, finalTokens, residualCents };
  });
}
EOF

cat > services/api/src/lib/auth.ts <<'EOF'
import jwt from 'jsonwebtoken';
import { ENV } from '../env.js';
export type JwtUser = { id: string; role: 'viewer'|'creator'|'admin' };
export const sign = (u: JwtUser) => jwt.sign(u, ENV.JWT_SECRET, { expiresIn: '15m' });
export const verify = (t: string) => jwt.verify(t, ENV.JWT_SECRET) as JwtUser;
EOF

cat > services/api/src/lib/earnings.ts <<'EOF'
export const centsFromTokens = (tokens: number, tokenValueCents: number) => tokens * tokenValueCents;
EOF

cat > services/api/src/routes/pricing.ts <<'EOF'
import { Router } from 'express';
import { ENV } from '../env.js';
import { finalizeBundles } from '../lib/bundles.js';
const r = Router();
r.get('/pricing/bundles', async (_req, res) => {
  const bundles = finalizeBundles(ENV.TOKEN_VALUE_CENTS, ENV.PLATFORM_TAKE_BPS);
  res.json(bundles);
});
export default r;
EOF

cat > services/api/src/routes/stripe.ts <<'EOF'
import { Router } from 'express';
import Stripe from 'stripe';
import { ENV } from '../env.js';
import { prisma } from '../prisma.js';
import { finalizeBundles } from '../lib/bundles.js';
import { raw } from 'express';
const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any });

const r = Router();

r.post('/payments/checkout', async (req, res) => {
  const { bundleId, returnUrl } = req.body ?? {};
  const bundles = finalizeBundles(ENV.TOKEN_VALUE_CENTS, ENV.PLATFORM_TAKE_BPS);
  const bundle = bundles.find(b => b.id === bundleId);
  if (!bundle) return res.status(400).json({ error: 'Invalid bundleId' });
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${returnUrl}?success=1`,
    cancel_url: `${returnUrl}?canceled=1`,
    line_items: [{ price_data: { currency: 'usd', unit_amount: bundle.grossCents, product_data: { name: `Token Bundle ${bundle.id}` } }, quantity: 1 }],
    metadata: { bundleId }
  });
  res.json({ url: session.url });
});

// raw body endpoint for webhook
r.post('/stripe/webhook', raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, ENV.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentIntent = session.payment_intent as string;
    const bundleId = session.metadata?.bundleId!;
    const bundles = finalizeBundles(ENV.TOKEN_VALUE_CENTS, ENV.PLATFORM_TAKE_BPS);
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return res.json({ ok: true });
    const userId = session.client_reference_id || '';
    if (!userId) return res.json({ ok: true });
    const exists = await prisma.tokenPurchase.findFirst({ where: { stripePaymentIntentId: paymentIntent } });
    if (!exists) {
      await prisma.$transaction(async (tx) => {
        await tx.tokenPurchase.create({
          data: {
            userId,
            bundleId,
            stripePaymentIntentId: paymentIntent,
            grossCents: bundle.grossCents,
            platformTakeCents: bundle.grossCents - bundle.netCents,
            netCents: bundle.netCents,
            baseTokens: BigInt(bundle.baseTokens),
            bonusTokens: BigInt(bundle.finalTokens - bundle.baseTokens),
            tokensMinted: BigInt(bundle.finalTokens),
            residualCents: bundle.residualCents
          }
        });
        await tx.wallet.upsert({
          where: { userId },
          create: { userId, balanceTokens: BigInt(bundle.finalTokens) },
          update: { balanceTokens: { increment: BigInt(bundle.finalTokens) } }
        });
        await tx.walletLedger.create({
          data: { userId, type: 'MINT', deltaTokens: BigInt(bundle.finalTokens), referenceId: paymentIntent }
        });
      });
    }
  }
  res.json({ received: true });
});

export default r;
EOF

cat > services/api/src/routes/wallet.ts <<'EOF'
import { Router } from 'express';
import { prisma } from '../prisma.js';
const r = Router();
r.get('/wallet', async (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).end();
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  const ledger = await prisma.walletLedger.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ balanceTokens: wallet?.balanceTokens?.toString() ?? '0', ledger });
});
export default r;
EOF

cat > services/api/src/routes/gifts.ts <<'EOF'
import { Router } from 'express';
import { prisma } from '../prisma.js';
import { ENV } from '../env.js';
const r = Router();
r.post('/gifts', async (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).end();
  const { toCreatorId, tokens, streamId } = req.body ?? {};
  if (!toCreatorId || !Number.isInteger(tokens) || tokens < 1) return res.status(400).json({ error: 'Invalid payload' });

  await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUnique({ where: { userId }, rejectOnNotFound: true });
    if (w.balanceTokens < BigInt(tokens)) throw new Error('INSUFFICIENT_TOKENS');
    await tx.wallet.update({ where: { userId }, data: { balanceTokens: { decrement: BigInt(tokens) } } });
    const gift = await tx.gift.create({
      data: { fromUserId: userId, toCreatorId, tokens: BigInt(tokens), streamId, valueCentsAtGiftTime: tokens * ENV.TOKEN_VALUE_CENTS }
    });
    await tx.walletLedger.create({ data: { userId, type: 'GIFT_SENT', deltaTokens: -BigInt(tokens), referenceId: gift.id } });
    await tx.earningsLedger.create({
      data: { creatorId: toCreatorId, type: 'GIFT_RECEIVED', deltaCents: tokens * ENV.TOKEN_VALUE_CENTS, status: 'pending', referenceId: gift.id }
    });
  });
  res.json({ ok: true });
});
export default r;
EOF

cat > services/api/src/routes/streams.ts <<'EOF'
import { Router } from 'express';
import { prisma } from '../prisma.js';
const r = Router();

r.post('/streams', async (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).end();
  const { title, description, privacy } = req.body ?? {};
  const stream = await prisma.stream.create({ data: { creatorId: userId, title, description, privacy: privacy ?? 'public', status: 'offline', ingestProtocol: 'rtmp' } });
  res.json(stream);
});

r.post('/streams/:id/start', async (req, res) => {
  const { id } = req.params;
  await prisma.stream.update({ where: { id }, data: { status: 'live', startedAt: new Date() } });
  res.json({ ok: true });
});

r.post('/streams/:id/stop', async (req, res) => {
  const { id } = req.params;
  await prisma.stream.update({ where: { id }, data: { status: 'ended', endedAt: new Date() } });
  res.json({ ok: true });
});

export default r;
EOF

cat > services/api/src/index.ts <<'EOF'
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from './env.js';
import pricing from './routes/pricing.js';
import stripeRoutes from './routes/stripe.js';
import wallet from './routes/wallet.js';
import gifts from './routes/gifts.js';
import streams from './routes/streams.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({}));
app.use(cookieParser());

// naive auth stub (replace with real auth)
app.use((req, _res, next) => {
  const uid = req.headers['x-user-id'] as string | undefined;
  (req as any).user = uid ? { id: uid } : null;
  next();
});

app.use('/api', pricing);
app.use('/api', wallet);
app.use('/api', gifts);
app.use('/api', streams);
app.use('/api', stripeRoutes);

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.listen(ENV.PORT, () => console.log(`API on :${ENV.PORT}`));
EOF

cat > services/api/prisma/schema.prisma <<'EOF'
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("POSTGRES_URL") }

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  displayName  String
  role         String   @default("viewer")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  Wallet       Wallet?
  Streams      Stream[]
}

model Stream {
  id             String   @id @default(uuid())
  creatorId      String
  title          String
  description    String?
  status         String   @default("offline")
  ingestProtocol String   @default("rtmp")
  privacy        String   @default("public")
  startedAt      DateTime?
  endedAt        DateTime?
  thumbnailUrl   String?
  creator        User     @relation(fields: [creatorId], references: [id])
}

model Wallet {
  userId        String  @id
  balanceTokens BigInt  @default(0)
  user          User    @relation(fields: [userId], references: [id])
}

model WalletLedger {
  id           String   @id @default(uuid())
  userId       String
  type         String
  deltaTokens  BigInt
  referenceId  String?
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
}

model TokenPurchase {
  id                     String   @id @default(uuid())
  userId                 String
  bundleId               String
  stripePaymentIntentId  String   @unique
  grossCents             Int
  platformTakeCents      Int
  netCents               Int
  baseTokens             BigInt
  bonusTokens            BigInt
  tokensMinted           BigInt
  residualCents          Int
  createdAt              DateTime @default(now())
  user                   User     @relation(fields: [userId], references: [id])
}

model Gift {
  id                   String   @id @default(uuid())
  fromUserId           String
  toCreatorId          String
  streamId             String?
  tokens               BigInt
  valueCentsAtGiftTime Int
  createdAt            DateTime @default(now())
}

model EarningsLedger {
  id          String   @id @default(uuid())
  creatorId   String
  type        String
  deltaCents  Int
  status      String?  // pending | available | locked
  referenceId String?
  createdAt   DateTime @default(now())
}

model Payout {
  id               String   @id @default(uuid())
  creatorId        String
  amountCents      Int
  stripeTransferId String?
  status           String   @default("queued")
  createdAt        DateTime @default(now())
  processedAt      DateTime?
}
EOF

### Services: Web (Next.js)
mkdir -p services/web/src/{pages,components}
cat > services/web/package.json <<'EOF'
{
  "name": "web",
  "private": true,
  "scripts": { "dev": "next dev -p 3000", "build": "next build", "start": "next start -p 3000" },
  "dependencies": { "next": "14.2.10", "react": "18.3.1", "react-dom": "18.3.1", "swr": "^2.2.5" },
  "devDependencies": { "typescript": "^5.6.3", "@types/react": "^18.3.5", "@types/node": "^20.14.12" }
}
EOF

cat > services/web/next.config.mjs <<'EOF'
export default { reactStrictMode: true };
EOF

cat > services/web/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "baseUrl": "."
  },
  "include": ["src/**/*"]
}
EOF

mkdir -p services/web/src/styles
cat > services/web/src/styles.css <<'EOF'
:root { color-scheme: light dark; font-family: system-ui, sans-serif; }
body { margin: 0; padding: 0; }
main { max-width: 900px; margin: 0 auto; }
EOF

cat > services/web/src/pages/_app.tsx <<'EOF'
import type { AppProps } from 'next/app';
import '../styles.css';
export default function App({ Component, pageProps }: AppProps) { return <Component {...pageProps} />; }
EOF

cat > services/web/src/pages/index.tsx <<'EOF'
import useSWR from 'swr';
const fetcher = (u:string)=>fetch(u).then(r=>r.json());
export default function Home() {
  const { data } = useSWR('http://localhost:4000/api/pricing/bundles', fetcher);
  return (
    <main style={{ padding: 24 }}>
      <h1>Live Platform</h1>
      <h2>Token Bundles</h2>
      <ul>
        {data?.map((b: any)=>(
          <li key={b.id}>{b.id}: ${b.grossCents/100} → {b.finalTokens} tokens</li>
        ))}
      </ul>
    </main>
  );
}
EOF

cat > services/web/src/components/Player.tsx <<'EOF'
import React from 'react';
export default function Player({ streamId }: { streamId: string }) {
  return <video controls autoPlay muted style={{ width: '100%', background: '#000' }} />;
}
EOF

mkdir -p services/web/src/pages/stream
cat > services/web/src/pages/stream/[id].tsx <<'EOF'
import { useRouter } from 'next/router';
import Player from '../../components/Player';
export default function StreamPage() {
  const { query } = useRouter();
  const id = query.id as string;
  if (!id) return null;
  return <main style={{ padding: 24 }}>
    <h1>Stream {id}</h1>
    <Player streamId={id}/>
  </main>;
}
EOF

cat > services/web/src/components/BuyTokens.tsx <<'EOF'
import React from 'react';
export function BuyTokens({ bundles }: { bundles: any[] }) {
  const handleBuy = async (bundleId: string) => {
    const r = await fetch('http://localhost:4000/api/payments/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user-1' },
      body: JSON.stringify({ bundleId, returnUrl: 'http://localhost:3000/wallet' })
    });
    const { url } = await r.json();
    window.location.href = url;
  };
  return <div>
    {bundles.map((b:any)=>(
      <button key={b.id} onClick={()=>handleBuy(b.id)} style={{ display: 'block', margin: 8 }}>
        Buy {b.finalTokens} tokens for ${b.grossCents/100}
      </button>
    ))}
  </div>;
}
EOF

cat > services/web/src/pages/wallet.tsx <<'EOF'
import useSWR from 'swr';
const fetcher = (u:string)=>fetch(u, { headers: { 'x-user-id': 'demo-user-1' }}).then(r=>r.json());
export default function Wallet() {
  const { data } = useSWR('http://localhost:4000/api/wallet', fetcher);
  return <main style={{ padding: 24 }}>
    <h1>Wallet</h1>
    <p>Balance: {data?.balanceTokens}</p>
    <h3>Recent</h3>
    <pre>{JSON.stringify(data?.ledger ?? [], null, 2)}</pre>
  </main>;
}
EOF

### Services: chat-ws
mkdir -p services/chat-ws/src
cat > services/chat-ws/package.json <<'EOF'
{
  "name": "chat-ws",
  "type": "module",
  "scripts": { "dev": "tsx watch src/index.ts" },
  "dependencies": { "uWebSockets.js": "uNetworking/uWebSockets.js#v20.47.0" },
  "devDependencies": { "tsx": "^4.15.7", "typescript": "^5.6.3" }
}
EOF

cat > services/chat-ws/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
EOF

cat > services/chat-ws/src/index.ts <<'EOF'
import uWS from 'uWebSockets.js';
const app = uWS.App();
app.ws('/*', {
  message: (ws, msg) => { ws.send(msg); }
});
app.listen(4100, (t)=>console.log('Chat WS on :4100', !!t));
EOF

### Services: orchestrator
mkdir -p services/orchestrator/src
cat > services/orchestrator/package.json <<'EOF'
{
  "name": "orchestrator",
  "type": "module",
  "scripts": { "dev": "tsx watch src/index.ts" },
  "dependencies": { "ioredis": "^5.4.1", "node-fetch": "^3.3.2" },
  "devDependencies": { "tsx": "^4.15.7", "typescript": "^5.6.3" }
}
EOF

cat > services/orchestrator/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
EOF

cat > services/orchestrator/src/index.ts <<'EOF'
console.log('Orchestrator stub running');
EOF

### Services: transcoder
mkdir -p services/transcoder/src
cat > services/transcoder/package.json <<'EOF'
{
  "name": "transcoder",
  "type": "module",
  "scripts": { "dev": "tsx watch src/worker.ts" },
  "dependencies": { "execa": "^9.3.0" },
  "devDependencies": { "tsx": "^4.15.7", "typescript": "^5.6.3" }
}
EOF

cat > services/transcoder/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
EOF

cat > services/transcoder/src/worker.ts <<'EOF'
import { execa } from 'execa';
console.log('Transcoder worker stub');
// execa('bash', ['/app/ffmpeg-ladder.sh'], { stdio: 'inherit' });
EOF

echo "Scaffold complete."
echo
echo "Next steps:"
cat <<'EOF'
1) Copy .env.example to .env and fill secrets (Stripe keys etc.)
   cp .env.example .env

2) Install deps:
   pnpm i
   pnpm --filter api prisma:generate
   pnpm --filter api prisma:migrate

3) Start infra:
   docker compose up -d postgres redis minio origin

4) Run services (separate terminals or with pnpm filters):
   pnpm --filter api dev
   pnpm --filter web dev
   pnpm --filter chat-ws dev
   pnpm --filter orchestrator dev
   pnpm --filter transcoder dev

5) Visit web:
   http://localhost:3000

Note: Stripe checkout/webhooks need real keys; for local dev, mock or skip temporarily.
EOF
