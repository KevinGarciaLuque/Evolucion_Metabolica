const pdfParseModule = require("pdf-parse");
const pdfParse = typeof pdfParseModule === "function" ? pdfParseModule : pdfParseModule.default || Object.values(pdfParseModule)[0];
const fs = require("fs");

const buf = fs.readFileSync("./Helen Zhen .pdf");
pdfParse(buf).then((d) => {
  console.log("=== TEXTO EXTRAIDO DEL PDF ===");
  console.log(d.text);
}).catch(e => console.error(e));

