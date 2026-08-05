import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// All entries from Sheet 1 (duplicate Joephet Pabillon #2 skipped)
const excelRows = [
  { name: "MIGO CABUHAYAN", date: "2025-08-01", source: "FRIEND REFERRAL" },
  { name: "KATH BERROYA", date: "2025-08-01", source: "FRIEND REFERRAL" },
  { name: "JOHN CASACOP", date: "2025-08-01", source: "FRIEND REFERRAL" },
  { name: "EMERSON BONGIAD", date: "2025-08-01", source: "FRIEND REFERRAL" },
  { name: "FIDES GOMEZ", date: "2025-08-01", source: "SAN PEDRO COMMUNITY" },
  { name: "JOHN DALE ALZONA", date: "2025-08-01", source: "SAN PEDRO COMMUNITY" },
  { name: "CHASE MAPALO", date: "2025-08-01", source: "FRIEND REFERRAL" },
  { name: "ROUX GOMEZ", date: "2025-09-01", source: "SOCIALS" },
  { name: "IVAN MARIANO", date: "2025-09-01", source: "SAN PEDRO COMMUNITY" },
  { name: "DENNIS RAYOS MARMETO", date: "2025-09-01", source: "SOCIALS" },
  { name: "RASMIYAH ALHUSINAWI", date: "2025-09-01", source: "" },
  { name: "SHEILA ALISASIS", date: "2025-09-01", source: "FRIEND REFERRAL" },
  { name: "JECKA JUNGAYA", date: "2025-09-01", source: "SAN PEDRO COMMUNITY" },
  { name: "MIKE CINCO", date: "2025-09-01", source: "SAN PEDRO COMMUNITY" },
  { name: "NIKON CELIS", date: "2025-10-01", source: "SOCIALS" },
  { name: "LUIS MIGUEL MONTENEGRO", date: "2025-10-01", source: "SOCIALS" },
  { name: "JASON FERNANDEZ", date: "2025-10-01", source: "FRIEND REFERRAL" },
  { name: "HUMPHREY DIOMALOS", date: "2025-10-01", source: "SOCIALS" },
  { name: "DOREEN FIRAZA", date: "2025-10-01", source: "SOCIALS" },
  { name: "ELIJAH SAYSON", date: "2025-11-01", source: "SOCIALS" },
  { name: "IAN LANCELOT", date: "2025-11-01", source: "FRIEND REFERRAL" },
  { name: "NINA SALIDO", date: "2025-11-01", source: "SAN PEDRO COMMUNITY" },
  { name: "JOHN YNGWEI ABUNDO", date: "2025-11-01", source: "SOCIALS" },
  { name: "RENSI ROSALES", date: "2025-11-01", source: "SAN PEDRO COMMUNITY" },
  { name: "ROMMEL BALAGTAS", date: "2025-11-01", source: "SOCIALS" },
  { name: "JOSE GABRIEL FERRER", date: "2025-11-01", source: "FRIEND REFERRAL" },
  { name: "HOPE ANGELO PAGAS", date: "2025-11-01", source: "SOCIALS" },
  { name: "FELIX GREGORIO", date: "2025-11-01", source: "RE" },
  { name: "LARA SAN JUAN", date: "2025-11-01", source: "RE" },
  { name: "JHUMEL BONGANCISO", date: "2025-11-01", source: "RE" },
  { name: "CHERRY MACALINTAL", date: "2025-11-30", source: "RE" },
  { name: "TOMMY MACALINTAL", date: "2025-11-30", source: "RE" },
  { name: "JARRED MAQUINIANA", date: "2025-11-30", source: "RE" },
  { name: "CHRISTIAN RIVERA", date: "2025-12-31", source: "SAN PEDRO COMMUNITY" },
  { name: "MARION SAMBILAY", date: "2025-12-31", source: "SAN PEDRO COMMUNITY" },
  { name: "LUKE AGCAOILI", date: "2025-12-31", source: "SOCIALS" },
  { name: "JAMAICA NUARIN", date: "2025-12-31", source: "SAN PEDRO COMMUNITY" },
  { name: "JOSE LUIS TIONGSON", date: "2025-12-31", source: "SOCIALS" },
  { name: "SHERWIN ADEFUIN", date: "2025-12-31", source: "FRIEND REFERRAL" },
  { name: "SETH ROI ADEFUIN", date: "2025-12-31", source: "FRIEND REFERRAL" },
  { name: "KATYA ESPIRITU", date: "2025-12-31", source: "FRIEND REFERRAL" },
  { name: "CALIHX PADUA", date: "2025-12-31", source: "FRIEND REFERRAL" },
  { name: "HECTOR GUEVARRA", date: "2025-12-31", source: "FRIEND REFERRAL" },
  { name: "ELISHA FAITH NAVAREZ", date: "2025-12-31", source: "RE" },
  { name: "Anthony Prado", date: "2026-01-31", source: "RE" },
  { name: "Nicole Ocoma", date: "2026-01-31", source: "RE" },
  { name: "Fernando Bermudez", date: "2026-01-31", source: "SOCIALS" },
  { name: "Christopher Janus De Guzman", date: "2026-01-31", source: "SOCIALS" },
  { name: "Kevin Villacorte", date: "2026-01-31", source: "RE" },
  { name: "Kaley Solita", date: "2026-01-31", source: "RE" },
  { name: "Levi Solita", date: "2026-01-31", source: "RE" },
  { name: "Adrian Posadas", date: "2026-01-31", source: "FRIEND REFERRAL" },
  { name: "Sixto Posadas", date: "2026-01-31", source: "FRIEND REFERRAL" },
  { name: "Lia Wisnajaya", date: "2026-01-31", source: "SAN PEDRO COMMUNITY" },
  { name: "Loyd Sayson", date: "2026-01-31", source: "SOCIALS" },
  { name: "Lance Kelvin Bautista", date: "2026-02-28", source: "FILWEB" },
  { name: "Mitz Delos Santos", date: "2026-02-28", source: "RE" },
  { name: "Luigi Torres", date: "2026-02-28", source: "RE" },
  { name: "Shaun Maverick Back", date: "2026-02-28", source: "RE" },
  { name: "Jennyfer Desipeda", date: "2026-02-28", source: "FRIEND REFERRAL" },
  { name: "Ana Francine Selorio", date: "2026-02-28", source: "SOCIALS" },
  { name: "Luigi Feliciano", date: "2026-02-28", source: "SOCIALS" },
  { name: "Justin Salazar", date: "2026-02-28", source: "SAN PEDRO COMMUNITY" },
  { name: "Rian Seranilla", date: "2026-02-28", source: "RE" },
  { name: "Athena Quinones", date: "2026-02-28", source: "SOCIALS" },
  { name: "Nica Alexis Minor", date: "2026-02-28", source: "SOCIALS" },
  { name: "Nathaniel Esmale", date: "2026-02-28", source: "SOCIALS" },
  { name: "Maru Lucido", date: "2026-02-28", source: "SOCIALS" },
  { name: "Michael Desipeda", date: "2026-02-28", source: "FRIEND REFERRAL" },
  { name: "Matthew Galimba", date: "2026-02-28", source: "SOCIALS" },
  { name: "Glenford Alvaira", date: "2026-02-28", source: "RE" },
  { name: "Katrina Blanco", date: "2026-02-28", source: "RE" },
  { name: "Jason Tabirara", date: "2026-03-31", source: "FRIEND REFERRAL" },
  { name: "Kvy Anoza", date: "2026-03-31", source: "FRIEND REFERRAL" },
  { name: "Brix Franco Pili", date: "2026-03-31", source: "SOCIALS" },
  { name: "Joshua Oliveros", date: "2026-03-31", source: "RE" },
  { name: "Francis Jimenez", date: "2026-03-31", source: "FRIEND REFERRAL" },
  { name: "Irish Vinluan", date: "2026-03-31", source: "FRIEND REFERRAL" },
  { name: "Gabriel Alvarado", date: "2026-03-31", source: "FRIEND REFERRAL" },
  { name: "Saint Espiritu", date: "2026-03-31", source: "SOCIALS" },
  { name: "Rinelyn Miras", date: "2026-03-31", source: "SOCIALS" },
  { name: "Alexis Minor", date: "2026-03-31", source: "SOCIALS" },
  { name: "Bianca Natalio", date: "2026-03-31", source: "FRIEND REFERRAL" },
  { name: "Aileen Nano", date: "2026-03-31", source: "SOCIALS" },
  { name: "Chrei Enconmieda", date: "2026-04-30", source: "FRIEND REFERRAL" },
  { name: "Ma. Graciela Nabuab", date: "2026-04-30", source: "SOCIALS" },
  { name: "Juneph Morado", date: "2026-04-30", source: "SOCIALS" },
  { name: "Albien Salvador", date: "2026-04-30", source: "RE" },
  { name: "Marc Jefferson Agdeppa", date: "2026-04-30", source: "SOCIALS" },
  { name: "Vanesa Denina", date: "2026-04-30", source: "SOCIALS" },
  { name: "Emmanuel Mesoga", date: "2026-04-30", source: "SOCIALS" },
  { name: "Naeem Zamur", date: "2026-04-30", source: "FRIEND REFERRAL" },
  { name: "Bea Kalaw", date: "2026-04-30", source: "SAN PEDRO COMMUNITY" },
  { name: "Amanda Kalaw", date: "2026-04-30", source: "SAN PEDRO COMMUNITY" },
  { name: "Ramon Soldevilla", date: "2026-04-30", source: "SOCIALS" },
  { name: "Joseph Tejido", date: "2026-04-30", source: "SAN PEDRO COMMUNITY" },
  { name: "Mhello Espejo", date: "2026-04-30", source: "RE" },
  { name: "Ethan Jagonio", date: "2026-04-30", source: "SOCIALS" },
  { name: "Vincent Cabingue", date: "2026-04-30", source: "SOCIALS" },
  { name: "Silver Ecosta", date: "2026-04-30", source: "SOCIALS" },
  { name: "Adan Castillo", date: "2026-04-30", source: "" },
  { name: "Max Tamesis", date: "2026-04-30", source: "SOCIALS" },
  { name: "Alexander Rasing", date: "2026-04-30", source: "SOCIALS" },
  { name: "Vianca Valdez", date: "2026-04-30", source: "SOCIALS" },
  { name: "Lucia Mendoza", date: "2026-04-30", source: "RE" },
  { name: "Charles Abo", date: "2026-04-30", source: "SAN PEDRO COMMUNITY" },
  { name: "Marjorie Carino", date: "2026-04-30", source: "SOCIALS" },
  { name: "Allysia Castillo", date: "2026-04-30", source: "SOCIALS" },
  { name: "Damian Efergan", date: "2026-04-30", source: "FRIEND REFERRAL" },
  { name: "Soriano Giani Clark", date: "2026-04-30", source: "SOCIALS" },
  { name: "Justin Cabusuan", date: "2026-05-31", source: "RE" },
  { name: "Ross Amada", date: "2026-05-31", source: "SOCIALS" },
  { name: "Franchesca Marie Teotoco", date: "2026-05-31", source: "SAN PEDRO COMMUNITY" },
  { name: "Zeven Rillorta", date: "2026-05-31", source: "FRIEND REFERRAL" },
  { name: "Giovanni Solita", date: "2026-05-31", source: "RE" },
  { name: "John Matthew Esmale", date: "2026-05-31", source: "FRIEND REFERRAL" },
  { name: "August Bautista", date: "2026-05-31", source: "FRIEND REFERRAL" },
  { name: "Mallory Bautista", date: "2026-05-31", source: "FRIEND REFERRAL" },
  { name: "Gabrielle Padua", date: "2026-05-31", source: "FRIEND REFERRAL" },
  { name: "Nigel Gabriel Cabidog", date: "2026-05-31", source: "SOCIALS" },
  { name: "Liam Bustos", date: "2026-05-31", source: "SAN PEDRO COMMUNITY" },
  { name: "Andre Olaguer", date: "2026-05-31", source: "SAN PEDRO COMMUNITY" },
  { name: "Andriella Olaguer", date: "2026-05-31", source: "SAN PEDRO COMMUNITY" },
  { name: "Adrielle Olaguer", date: "2026-05-31", source: "SAN PEDRO COMMUNITY" },
  { name: "Gabriel Alvar", date: "2026-05-31", source: "SOCIALS" },
  { name: "Raien Fritz Ticar", date: "2026-05-31", source: "SOCIALS" },
  { name: "Gabriele Ulrich Pablo", date: "2026-06-30", source: "FRIEND REFERRAL" },
  { name: "Danny Fabello", date: "2026-06-30", source: "SOCIALS" },
  { name: "Deion Tyler Garcia", date: "2026-06-30", source: "FRIEND REFERRAL" },
  { name: "Kaia Ricarro", date: "2026-06-30", source: "RE" },
  { name: "Kai Gamboa", date: "2026-06-30", source: "SOCIALS" },
  { name: "Xenelle Layon", date: "2026-06-30", source: "FRIEND REFERRAL" },
  { name: "Michael Lim", date: "2026-06-30", source: "RE" },
  { name: "Aian Orallo", date: "2026-06-30", source: "RE" },
  { name: "Camille Catanlejo", date: "2026-06-30", source: "SOCIALS" },
  { name: "Vanelope Roldan", date: "2026-06-30", source: "FRIEND REFERRAL" },
  { name: "Shandria Santiago", date: "2026-06-30", source: "SOCIALS" },
  { name: "Adrian Bravo", date: "2026-06-30", source: "SOCIALS" },
  { name: "Bon Summer Viala", date: "2026-06-30", source: "PERPETUAL" },
  { name: "Ferdinand Licop", date: "2026-06-30", source: "FRIEND REFERRAL" },
  { name: "Joephet Pabillon", date: "2026-06-30", source: "SAN PEDRO COMMUNITY" },
  { name: "Adi Valerio", date: "2026-06-30", source: "FRIEND REFERRAL" },
  { name: "Astrid Ongjoco", date: "2026-06-30", source: "FRIEND REFERRAL" },
  { name: "Miguel Alfonso", date: "2026-06-30", source: "SOCIALS" },
  { name: "Ista Prema", date: "2026-06-30", source: "SOCIALS" },
  { name: "Ava Ruiz", date: "2026-06-30", source: "SOCIALS" },
  { name: "Jecel Jungaya", date: "2026-06-30", source: "FRIEND REFERRAL" },
  { name: "Jan Asido", date: "2026-06-30", source: "SOCIALS" },
  { name: "Althea Valenzuela", date: "2026-06-30", source: "SAN PEDRO COMMUNITY" },
  { name: "Aliyah Valois", date: "2026-06-30", source: "SOCIALS" },
  { name: "Khalil Bertos", date: "2026-06-30", source: "SOCIALS" },
  { name: "Allen Alegria", date: "2026-06-30", source: "SOCIALS" },
];

const members = await prisma.member.findMany({
  select: { id: true, firstName: true, lastName: true },
});

function normalize(s) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function fullName(m) {
  return normalize(`${m.firstName} ${m.lastName}`);
}

// Build lookup: normalized full name -> member
const byExactName = new Map();
for (const m of members) {
  const key = fullName(m);
  if (!byExactName.has(key)) byExactName.set(key, []);
  byExactName.get(key).push(m);
}

const EXACT = [], FUZZY = [], NEW = [];

for (const row of excelRows) {
  const normRow = normalize(row.name);
  const words = normRow.split(" ");

  // 1. Exact match
  if (byExactName.has(normRow)) {
    const matches = byExactName.get(normRow);
    EXACT.push({ row, members: matches, reason: "exact" });
    continue;
  }

  // 2. Fuzzy: all Excel words appear in DB full name (handles middle names)
  const fuzzyMatches = members.filter(m => {
    const dbName = fullName(m);
    return words.every(w => dbName.includes(w));
  });

  // 3. Fuzzy: all DB name words appear in Excel name (handles abbreviated names)
  const reverseMatches = members.filter(m => {
    const dbWords = fullName(m).split(" ");
    return dbWords.every(w => normRow.includes(w));
  });

  const combined = [...new Map([...fuzzyMatches, ...reverseMatches].map(m => [m.id, m])).values()];

  if (combined.length === 1) {
    const dbFullName = `${combined[0].firstName} ${combined[0].lastName}`;
    if (fullName(combined[0]) === normRow) {
      EXACT.push({ row, members: combined, reason: "exact" });
    } else {
      FUZZY.push({ row, members: combined, reason: `DB name: "${dbFullName}"` });
    }
  } else if (combined.length > 1) {
    FUZZY.push({ row, members: combined, reason: `${combined.length} possible matches` });
  } else {
    NEW.push({ row });
  }
}

console.log(`\n========== EXACT MATCHES (${EXACT.length}) ==========`);
for (const e of EXACT) {
  const m = e.members[0];
  console.log(`✓ "${e.row.name}" → ${m.firstName} ${m.lastName} [${m.id}]`);
}

console.log(`\n========== FUZZY / NEEDS CONFIRMATION (${FUZZY.length}) ==========`);
for (const f of FUZZY) {
  console.log(`? "${f.row.name}" | ${f.reason}`);
  for (const m of f.members) console.log(`    → ${m.firstName} ${m.lastName} [${m.id}]`);
}

console.log(`\n========== NEW ENTRIES (${NEW.length}) ==========`);
for (const n of NEW) {
  console.log(`+ "${n.row.name}" | ${n.row.date} | ${n.row.source}`);
}

console.log(`\nSummary: ${EXACT.length} exact, ${FUZZY.length} fuzzy, ${NEW.length} new`);

await prisma.$disconnect();
