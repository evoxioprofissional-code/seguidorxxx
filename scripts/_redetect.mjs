import pg from "pg";
const c = new pg.Client({ connectionString: "postgresql://postgres.novhqlzxqmeruxlirsdw:Ysk7f4BjImxhJhNV@aws-0-us-west-2.pooler.supabase.com:5432/postgres", ssl: { rejectUnauthorized: false } });
await c.connect();

const PLAT = [
  ["instagram", ["instagram","insta"]], ["tiktok", ["tiktok","tik tok"]],
  ["youtube", ["youtube","you tube"]], ["facebook", ["facebook"]],
  ["kwai", ["kwai"]], ["telegram", ["telegram"]], ["twitter", ["twitter"]],
  ["spotify", ["spotify"]], ["twitch", ["twitch"]],
];
// categoria detectada SO PELO NOME (ordem: views/likes/coment/share antes de seguidores p/ evitar ambiguidade fraca)
const CAT = [
  ["visualizacoes", ["visualiz","view","play","watch","assist","impress"]],
  ["curtidas", ["curtida","like","reaç","reac"]],
  ["comentarios", ["coment"]],
  ["compartilhamentos", ["compartilh","share","repost","retweet","salvamento","save"]],
  ["seguidores", ["seguidor","follower","inscrit","subscriber","member","membro"]],
];
const det = (defs, txt) => { const h=(txt||"").toLowerCase(); for(const [id,kws] of defs) if(kws.some(k=>h.includes(k))) return id; return "outros"; };

const ps = await c.query("select provider_service_id, name, category from provider_services");
let changed = 0, mismatchesActive = [];
for (const row of ps.rows) {
  const name = row.name || "";
  let platform = det(PLAT, name);
  if (platform === "outros") platform = det(PLAT, name + " " + (row.category||""));
  const category = det(CAT, name); // SO o nome

  const cur = await c.query("select id, platform, category, active, custom_name from services where provider_service_id=$1", [row.provider_service_id]);
  if (!cur.rows[0]) continue;
  const s = cur.rows[0];
  if (s.platform !== platform || s.category !== category) {
    if (s.active) mismatchesActive.push({ id: row.provider_service_id, name: name.slice(0,45), de: `${s.platform}/${s.category}`, para: `${platform}/${category}` });
    await c.query("update services set platform=$1, category=$2 where id=$3", [platform, category, s.id]);
    changed++;
  }
}
console.log("Serviços reclassificados:", changed);
console.log("\nCORRIGIDOS que estavam ATIVOS (errados no ar):", mismatchesActive.length);
for (const m of mismatchesActive.slice(0,30)) console.log(`  ID ${m.id}: ${m.de} -> ${m.para} | ${m.name}`);
await c.end();
