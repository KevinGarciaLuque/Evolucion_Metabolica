/**
 * Seed: actualiza edad_debut en todos los pacientes usando los valores
 * del Excel "Niños con MCG con GRAFICOS abril 2.xlsx" (datos de la hoja HMEP).
 * Fuente: datos verificados de la hoja original.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

// DNI → edad al debut (años)
const EDAD_DEBUT = [
  // HMEP
  { dni: '0801-2014-18636', nombre: 'Valery Isabela Arias Rodriguez',         edad: 10 },
  { dni: '0801-2008-14453', nombre: 'Jennifer Adriana Cruz Salgado',           edad: null }, // no registrado
  { dni: '0816-2013-00268', nombre: 'Abner David Silva Clevenger',             edad: 12 },
  { dni: '0611-2011-00182', nombre: 'Wilson Jafeth Flores Garcia',             edad: 9  },
  { dni: '0703-2019-02849', nombre: 'Monica Sofia Quijada Garcia',             edad: 4  },
  { dni: '0801-2013-16148', nombre: 'Ivana Alejandra Baca Izaguirre',          edad: 12 },
  { dni: '1007-2012-00161', nombre: 'Jose Angel Ponce Salazar',                edad: 14 },
  { dni: '0318-2010-02177', nombre: 'Lesly Dayana Melgar Marquez',             edad: 12 },
  { dni: '1511-2013-00067', nombre: 'Estefany Julieth Padilla Mejia',          edad: 2  },
  { dni: '0801-2015-17707', nombre: 'Misleydi Lucila Videa Padilla',           edad: 10 },
  { dni: '0801-2010-21538', nombre: 'Monica Valeria Monjarrez Zuniga',         edad: 14 },
  { dni: '0610-2010-00212', nombre: 'Stefanny Nicolle Ordoñez Dormes',         edad: 11 },
  { dni: '0801-2011-21029', nombre: 'Estrella Dinorah Almendares Castro',      edad: 14 },
  { dni: '0813-2013-00068', nombre: 'Luis Jeancarlo Zelaya Hernandez',         edad: 11 },
  { dni: '0801-2016-02051', nombre: 'Mileidy Saray Mancia Zavala',             edad: 8  },
  { dni: '0801-2012-20179', nombre: 'Elsy Saray Mejia Lagos',                  edad: 7  },
  { dni: '0601-2008-02295', nombre: 'Jafeth David Mondragon Nuñez',            edad: 13 },
  { dni: '0321-2009-00009', nombre: 'Odalis Michelle Pagan Mencia',            edad: 13 },
  { dni: '1501-2012-03075', nombre: 'Mateo Farid Woods Pon',                   edad: 2  },
  { dni: '1503-2016-03107', nombre: 'Wilson Jose Torres Escobar',              edad: 6  },
  { dni: '0615-2015-00223', nombre: 'Saul Andres Escalante Gradiz',            edad: 8  },
  { dni: '0701-2015-00239', nombre: 'Bianca Valentina Almendarez Chacon',      edad: 9  },
  { dni: '0801-2013-05935', nombre: 'Amy Fernanda Castillo Mairena',           edad: 12 },
  { dni: '0801-2011-01788', nombre: 'Helen Anahi Zhen Lara',                   edad: 12 },
  { dni: '0801-2011-19543', nombre: 'Moises David Casco Funez',                edad: 14 },
  { dni: '1709-2010-00597', nombre: 'Keylin Solange Bolaños Styles',           edad: 13 },
  { dni: '0801-2015-22943', nombre: 'Maria Fernanda Molina Nuñez',             edad: 6  },
  { dni: '0806-2009-00124', nombre: 'Dylin Nicolle Bejarano Funes',            edad: 16 },
  { dni: '0801-2011-21457', nombre: 'Angie Mariana Irias Castro',              edad: 14 },
  { dni: '0801-2008-10770', nombre: 'Nelson Samuel Velasquez Velasquez',       edad: 13 },
  { dni: '1512-2009-00034', nombre: 'Yonathan Moises Funes Vindel',            edad: 16 },
  { dni: '0704-2008-00931', nombre: 'Enan Onay Gomez Avila',                   edad: 15 },
  { dni: '0801-2016-11761', nombre: 'Roger Valentin Gutierrez Espinoza',       edad: 8  },
  { dni: '0703-2012-03795', nombre: 'Katherin Mabel Gonzalez Ramirez',         edad: 14 },
  { dni: '0826-2009-00123', nombre: 'Loida Esther Diaz Salgado',               edad: 7  },
  { dni: '0309-2009-00069', nombre: 'Dania Rosmery Vasquez Madrid',            edad: 16 },
];

async function sembrar() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME     || 'evolucion_metabolica',
    port:     Number(process.env.DB_PORT) || 3306,
  });

  console.log('🌱 Actualizando edad_debut...\n');
  let ok = 0, nulo = 0, noEncontrado = 0;

  for (const p of EDAD_DEBUT) {
    if (p.edad === null) {
      console.log(`  ⏭  ${p.nombre}: sin dato de debut`);
      nulo++;
      continue;
    }
    const [res] = await conn.query(
      'UPDATE pacientes SET edad_debut = ? WHERE dni = ?',
      [p.edad, p.dni]
    );
    if (res.affectedRows > 0) {
      console.log(`  ✅ ${p.nombre}: ${p.edad} años`);
      ok++;
    } else {
      console.log(`  ⚠️  No encontrado: ${p.nombre} (DNI: ${p.dni})`);
      noEncontrado++;
    }
  }

  await conn.end();
  console.log(`\n🎉 Listo: ${ok} actualizados, ${nulo} sin dato, ${noEncontrado} no encontrados`);
}

sembrar().catch(e => { console.error(e); process.exit(1); });
