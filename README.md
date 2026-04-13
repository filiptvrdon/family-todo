This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Local-First Development

This project uses a local-first architecture. The backend runs on your laptop, and remote access is handled by Tailscale.

### Prerequisites

1.  **Tailscale:** Install on your laptop and client devices.
2.  **Docker:** Required for the local PostgreSQL database.

### Setup

1.  **Tailscale:**
    *   Join all devices to the same Tailscale account.
    *   Enable **MagicDNS** and **HTTPS** in the Tailscale admin console.
    *   On your laptop, run `tailscale cert` to generate certificates for your MagicDNS name.
2.  **Environment:**
    *   `cp .env.example .env.local`
    *   Update `TAILSCALE_HOSTNAME` to `http://<your-hostname>.ts.net:3000` (or `https://<your-hostname>.ts.net` if using `tailscale serve`).
3.  **Database:**
    *   `docker-compose up -d` (ensure PostgreSQL is running)

### Running the Server

To bind to your Tailscale IP (making it reachable from other devices in your tailnet):

```bash
npm run dev:tailscale
```

Your app will be reachable at `http://<your-hostname>.ts.net:3000`.

To enable HTTPS (the padlock) in your browser without complex configuration, run:
```bash
tailscale serve 3000
```
Then you can access the app at `https://<your-hostname>.ts.net` (no port needed).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
