import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const url = 'http://127.0.0.1:3000/health';
  console.log(`Pinging local health endpoint: ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`Body: ${text}`);
  } catch (err: any) {
    console.error('Fetch failed:', err.message);
  }
}

main().catch(console.error);
