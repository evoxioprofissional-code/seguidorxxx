/**
 * Aplica as migrations SQL na ordem em supabase/migrations/*.sql.
 *
 * Uso:
 *   DATABASE_URL="postgresql://postgres.<ref>:<senha>@aws-...pooler.supabase.com:6543/postgres" \
 *   node scripts/apply-migrations.mjs
 *
 * A DATABASE_URL é a "Connection string" do painel Supabase
 * (Project Settings -> Database -> Connection string -> URI).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("\n❌ Defina DATABASE_URL (URI de conexão do Supabase).\n");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log("✅ Conectado ao Postgres.\n");

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), "utf8");
    process.stdout.write(`▶ Aplicando ${file} ... `);
    try {
      await client.query(sql);
      console.log("ok");
    } catch (err) {
      console.log("FALHOU");
      console.error(`\n   ${err.message}\n`);
      throw err;
    }
  }
  console.log("\n🎉 Migrations aplicadas com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
