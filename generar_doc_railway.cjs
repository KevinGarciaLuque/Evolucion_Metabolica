const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  convertInchesToTwip,
} = require("docx");
const fs = require("fs");

const doc = new Document({
  styles: {
    paragraphStyles: [
      {
        id: "Normal",
        name: "Normal",
        run: { font: "Calibri", size: 22 },
      },
    ],
  },
  sections: [
    {
      properties: {},
      children: [
        // ─────────────────────────────────────────
        // TÍTULO
        // ─────────────────────────────────────────
        new Paragraph({
          text: "Guía: Conectar MySQL Local con Railway",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Proyecto: Evolución Metabólica  |  Fecha: Abril 2026",
              italics: true,
              color: "888888",
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),

        // ─────────────────────────────────────────
        // SECCIÓN 1
        // ─────────────────────────────────────────
        new Paragraph({
          text: "1. Habilitar acceso público en Railway (Public Networking)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun("Por defecto, Railway solo expone el servicio MySQL de forma interna (entre sus propios servicios). Para conectarte desde tu máquina local necesitas activar el acceso público:"),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Paso 1:", bold: true }), new TextRun(" Entra a railway.app e inicia sesión.")],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Paso 2:", bold: true }), new TextRun(" Abre tu proyecto y haz clic en el servicio MySQL.")],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Paso 3:", bold: true }), new TextRun(" Ve a la pestaña Settings → Networking.")],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Paso 4:", bold: true }), new TextRun(" En la sección Public Networking haz clic en Generate Domain / Add Public Port.")],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Paso 5:", bold: true }), new TextRun(" Railway te asigna un host público y un puerto (ejemplo: roundhouse.proxy.rlwy.net : 12345).")],
          bullet: { level: 0 },
          spacing: { after: 300 },
        }),

        // ─────────────────────────────────────────
        // SECCIÓN 2
        // ─────────────────────────────────────────
        new Paragraph({
          text: "2. Obtener las credenciales de conexión",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: "En el servicio MySQL → pestaña Variables, Railway expone las siguientes variables:",
          spacing: { after: 200 },
        }),

        // Tabla de credenciales
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "Variable Railway", bold: true })] })],
                  shading: { type: ShadingType.CLEAR, fill: "4F81BD", color: "FFFFFF" },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "Descripción", bold: true })] })],
                  shading: { type: ShadingType.CLEAR, fill: "4F81BD", color: "FFFFFF" },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "Uso", bold: true })] })],
                  shading: { type: ShadingType.CLEAR, fill: "4F81BD", color: "FFFFFF" },
                }),
              ],
            }),
            ...[
              ["MYSQLHOST", "Host interno (solo entre servicios Railway)", "No usar desde local"],
              ["MYSQLPORT", "Puerto interno (3306)", "No usar desde local"],
              ["MYSQLUSER", "Usuario (root)", "Sí usar"],
              ["MYSQLPASSWORD", "Contraseña autogenerada", "Sí usar"],
              ["MYSQLDATABASE", "Nombre de la BD (railway)", "Sí usar"],
            ].map((row, i) =>
              new TableRow({
                children: row.map((cell) =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun(cell)] })],
                    shading: i % 2 === 0
                      ? { type: ShadingType.CLEAR, fill: "DCE6F1" }
                      : undefined,
                  })
                ),
              })
            ),
          ],
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Importante: ", bold: true }),
            new TextRun("Para conexión externa (desde tu PC local, MySQL Workbench, TablePlus, etc.) debes usar el "),
            new TextRun({ text: "host y puerto PÚBLICOS", bold: true }),
            new TextRun(" generados en el paso anterior, NO los valores de MYSQLHOST/MYSQLPORT."),
          ],
          spacing: { after: 300 },
        }),

        // ─────────────────────────────────────────
        // SECCIÓN 3
        // ─────────────────────────────────────────
        new Paragraph({
          text: "3. Conectarse desde MySQL Workbench",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Paso 1:", bold: true }), new TextRun(" Abre MySQL Workbench → Database → Manage Connections → New.")],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Paso 2:", bold: true }), new TextRun(" Completa los campos:")],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [new TextRun("  •  Hostname: <HOST_PÚBLICO de Railway>")],
          indent: { left: convertInchesToTwip(0.5) },
        }),
        new Paragraph({
          children: [new TextRun("  •  Port: <PUERTO_PÚBLICO de Railway>")],
          indent: { left: convertInchesToTwip(0.5) },
        }),
        new Paragraph({
          children: [new TextRun("  •  Username: root")],
          indent: { left: convertInchesToTwip(0.5) },
        }),
        new Paragraph({
          children: [new TextRun("  •  Password: <MYSQLPASSWORD>")],
          indent: { left: convertInchesToTwip(0.5) },
        }),
        new Paragraph({
          children: [new TextRun("  •  Default Schema: railway")],
          indent: { left: convertInchesToTwip(0.5) },
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Paso 3:", bold: true }), new TextRun(" Clic en Test Connection para verificar.")],
          bullet: { level: 0 },
          spacing: { after: 300 },
        }),

        // ─────────────────────────────────────────
        // SECCIÓN 4
        // ─────────────────────────────────────────
        new Paragraph({
          text: "4. Conectarse desde línea de comandos (mysql CLI)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: "Para conectarte o importar un backup desde tu terminal local:",
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "mysql -h <HOST_PÚBLICO> -P <PUERTO_PÚBLICO> -u root -p railway",
              font: "Courier New",
              size: 20,
            }),
          ],
          shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            left: { style: BorderStyle.SINGLE, size: 6, color: "4F81BD" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
          indent: { left: convertInchesToTwip(0.3), right: convertInchesToTwip(0.3) },
          spacing: { before: 100, after: 100 },
        }),
        new Paragraph({
          text: "Para importar el backup.sql completo:",
          spacing: { before: 300, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "mysql -h <HOST_PÚBLICO> -P <PUERTO_PÚBLICO> -u root -p railway < backup.sql",
              font: "Courier New",
              size: 20,
            }),
          ],
          shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            left: { style: BorderStyle.SINGLE, size: 6, color: "4F81BD" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
          indent: { left: convertInchesToTwip(0.3), right: convertInchesToTwip(0.3) },
          spacing: { before: 100, after: 300 },
        }),

        // ─────────────────────────────────────────
        // SECCIÓN 5
        // ─────────────────────────────────────────
        new Paragraph({
          text: "5. Configurar el .env local para apuntar a Railway (opcional)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: "Si quieres que el backend corriendo en tu PC use la base de datos de Railway (en vez de tu MySQL local), edita el archivo backend/.env:",
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "DB_HOST=<HOST_PÚBLICO>\nDB_PORT=<PUERTO_PÚBLICO>\nDB_USER=root\nDB_PASSWORD=<MYSQLPASSWORD>\nDB_NAME=railway",
              font: "Courier New",
              size: 20,
            }),
          ],
          shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            left: { style: BorderStyle.SINGLE, size: 6, color: "4F81BD" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
          indent: { left: convertInchesToTwip(0.3), right: convertInchesToTwip(0.3) },
          spacing: { before: 100, after: 300 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Nota: ", bold: true }),
            new TextRun("Cuando el backend corre en Railway en producción, usa el host INTERNO (MYSQLHOST) para comunicación dentro de la plataforma, lo cual es más rápido y seguro. El host público solo se necesita para acceso externo."),
          ],
          spacing: { after: 300 },
        }),

        // ─────────────────────────────────────────
        // SECCIÓN 6 — Diagrama
        // ─────────────────────────────────────────
        new Paragraph({
          text: "6. Diagrama de conexiones",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "PC Local", bold: true, size: 24 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun("MySQL Workbench / CLI / .env local")], alignment: AlignmentType.CENTER }),
                  ],
                  shading: { type: ShadingType.CLEAR, fill: "E2EFDA" },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun("──── Puerto Público ────►")], alignment: AlignmentType.CENTER }),
                  ],
                  verticalAlign: "center",
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Railway", bold: true, size: 24 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun("MySQL Service")], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun("(host:puerto público)")], alignment: AlignmentType.CENTER }),
                  ],
                  shading: { type: ShadingType.CLEAR, fill: "FCE4D6" },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("")] }),
                new TableCell({ children: [new Paragraph("")] }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun("▲ Puerto Interno ▲")], alignment: AlignmentType.CENTER }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("")] }),
                new TableCell({ children: [new Paragraph("")] }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Backend Railway", bold: true })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun("(Express/Node.js)")], alignment: AlignmentType.CENTER }),
                  ],
                  shading: { type: ShadingType.CLEAR, fill: "DDEBF7" },
                }),
              ],
            }),
          ],
          spacing: { after: 400 },
        }),

        // ─────────────────────────────────────────
        // SECCIÓN 7 — Resumen rápido
        // ─────────────────────────────────────────
        new Paragraph({
          text: "7. Resumen rápido",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "Paso", bold: true })] })],
                  shading: { type: ShadingType.CLEAR, fill: "4F81BD" },
                  width: { size: 10, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "Acción", bold: true })] })],
                  shading: { type: ShadingType.CLEAR, fill: "4F81BD" },
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "Dónde", bold: true })] })],
                  shading: { type: ShadingType.CLEAR, fill: "4F81BD" },
                  width: { size: 40, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            ...[
              ["1", "Activar Public Networking en el servicio MySQL", "Railway → Settings → Networking"],
              ["2", "Copiar host y puerto públicos generados", "Railway → MySQL → Connect"],
              ["3", "Copiar MYSQLPASSWORD y MYSQLDATABASE", "Railway → MySQL → Variables"],
              ["4", "Conectar con Workbench o CLI usando datos públicos", "Tu PC local"],
              ["5", "Importar backup.sql si es necesario", "Terminal local"],
              ["6", "Actualizar .env local si el backend local usará Railway DB", "backend/.env"],
            ].map((row, i) =>
              new TableRow({
                children: row.map((cell, ci) =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun(cell)] })],
                    shading: i % 2 === 0 && ci === 0
                      ? { type: ShadingType.CLEAR, fill: "DCE6F1" }
                      : i % 2 === 0
                      ? { type: ShadingType.CLEAR, fill: "F7FBFF" }
                      : undefined,
                  })
                ),
              })
            ),
          ],
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "\nDocumento generado automáticamente para el proyecto Evolución Metabólica.",
              italics: true,
              color: "AAAAAA",
              size: 18,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Guia_Conexion_MySQL_Railway.docx", buffer);
  console.log("✅  Archivo generado: Guia_Conexion_MySQL_Railway.docx");
});
