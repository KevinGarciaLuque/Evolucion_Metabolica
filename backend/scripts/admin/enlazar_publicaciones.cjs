// Completa cada publicación de RENACED con DOI/enlace, título, revista y resumen, consultando
// Crossref (y PubMed para el resumen). Solo acepta coincidencias de título muy parecidas.
// Uso (desde backend/):  node scripts/admin/enlazar_publicaciones.cjs
const fs = require("fs");
const path = require("path");
const ARCH = path.join(__dirname, "../../shared/data/publicacionesRenaced.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/<[^>]+>/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const limpiar = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/^abstract\s*/i, "").trim();
const jaccard = (a, b) => {
  const A = new Set(norm(a).split(" ").filter((w) => w.length > 2)), B = new Set(norm(b).split(" ").filter((w) => w.length > 2));
  if (!A.size || !B.size) return 0;
  let i = 0; A.forEach((w) => B.has(w) && i++);
  return i / (A.size + B.size - i);
};
const get = async (url) => { const r = await fetch(url); return r.ok ? r.json() : null; };

// "Autores: Título. Resto…"  →  Título
function tituloDeCita(cita) {
  const i = cita.indexOf(": ");
  const resto = i > 0 ? cita.slice(i + 2) : cita;
  const j = resto.search(/\.\s+[A-Z¿]|\.$/);
  return (j > 0 ? resto.slice(0, j) : resto).trim();
}

async function resumenPubMed(doi) {
  const b = await get(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=${encodeURIComponent(doi)}[AID]`);
  const id = b?.esearchresult?.idlist?.[0];
  if (!id) return { pmid: "", resumen: "" };
  await sleep(350);
  const r = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${id}&retmode=xml`);
  const xml = r.ok ? await r.text() : "";
  const partes = [...xml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => limpiar(m[1]));
  return { pmid: id, resumen: partes.join(" ") };
}

(async () => {
  const lista = JSON.parse(fs.readFileSync(ARCH, "utf8"));
  let ok = 0;
  for (const p of lista) {
    let it = null;
    try {
      const doi = (p.enlace.match(/10\.\d{4,9}\/\S+/) || [])[0];
      if (doi) {
        it = (await get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`))?.message;
      } else {
        const t = tituloDeCita(p.cita);
        const r = await get(`https://api.crossref.org/works?rows=5&query.title=${encodeURIComponent(t)}&query.author=Faradji&select=DOI,title,container-title,abstract,issued`);
        it = (r?.message?.items || []).find((x) => jaccard(t, (x.title || [])[0]) >= 0.8) || null;
      }
      if (it) {
        p.titulo = limpiar((it.title || [])[0]);
        p.revista = (it["container-title"] || [])[0] || "";
        p.enlace = `https://doi.org/${it.DOI}`;
        let res = limpiar(it.abstract);
        if (!res) { await sleep(350); const pm = await resumenPubMed(it.DOI); res = pm.resumen; if (pm.pmid) p.pubmed = `https://pubmed.ncbi.nlm.nih.gov/${pm.pmid}/`; }
        if (res) p.resumen = res.length > 600 ? res.slice(0, 600).replace(/\s+\S*$/, "") + "…" : res;
        ok++;
      }
      console.log(it ? "OK " : "-- ", p.anio, (p.titulo || tituloDeCita(p.cita)).slice(0, 70), p.resumen ? "[resumen]" : "");
    } catch (e) { console.log("ERR", e.message); }
    await sleep(350);
  }
  fs.writeFileSync(ARCH, JSON.stringify(lista, null, 1));
  console.log(`\n${ok}/${lista.length} con enlace verificado; ${lista.filter((p) => p.resumen).length} con resumen`);
})();
