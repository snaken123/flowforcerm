import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ANNUAL_SERVICE_ID = "cmqs4suqp002cwa80x5vw8jp7";

function addOneYear(dateStr) {
  const d = new Date(dateStr);
  return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
}

// All matched entries: [memberId, startDate, source]
const MATCHED = [
  // === EXACT MATCHES (83) ===
  ["cmqv6wfic005322c6nsm946y4", "2025-08-01", "SAN PEDRO COMMUNITY"],   // John Dale Alzona
  ["cmqv6wft5005722c6tox9454f", "2025-09-01", "SAN PEDRO COMMUNITY"],   // Ivan Mariano
  ["cmqv6wg3v005b22c6v9y0rvni", "2025-09-01", "SOCIALS"],               // Dennis Rayos Marmeto
  ["cmqv6wfyi005922c6v59i4bmu", "2025-09-01", ""],                      // Rasmiyah Alhusinawi
  ["cmqv6wh5f005p22c6ufe0e55v", "2025-09-01", "SAN PEDRO COMMUNITY"],   // Jecka Jungaya
  ["cmqv6wgel005f22c6lwief6s0", "2025-09-01", "SAN PEDRO COMMUNITY"],   // Mike Cinco
  ["cmqvkofj0006fmfxj0hf1jsio", "2025-10-01", "FRIEND REFERRAL"],       // Jason Fernandez
  ["cmqv6wh01005n22c6740r7dqf", "2025-10-01", "SOCIALS"],               // Doreen Firaza
  ["cmqvkoykz00ddmfxjevjvech9", "2025-11-01", "FRIEND REFERRAL"],       // Ian Lancelot
  ["cmqv6whaq005r22c6rotraqy2", "2025-11-01", "SAN PEDRO COMMUNITY"],   // Nina Salido
  ["cmqv6w2vo000f22c6ru4vaifx", "2025-11-01", "SAN PEDRO COMMUNITY"],   // Rensi Rosales
  ["cmqvkp22h00enmfxjaiei8tnb", "2025-11-01", "SOCIALS"],               // Rommel Balagtas
  ["cmqv6w9m2002x22c6s74az1co", "2025-11-01", "FRIEND REFERRAL"],       // Jose Gabriel Ferrer
  ["cmqvkp1rk00ejmfxjt6js10qm", "2025-11-01", "SOCIALS"],               // Hope Angelo Pagas
  ["cmqv6w3s4000r22c6twwv20mu", "2025-11-01", "RE"],                    // Felix Gregorio
  ["cmqv6w1z5000322c6tlfv44en", "2025-11-01", "RE"],                    // Jhumel Bonganciso
  ["cmqvko700003bmfxjd6czgegg", "2025-11-30", "RE"],                    // Cherry Macalintal
  ["cmqvko6ul0039mfxj1atpisnp", "2025-11-30", "RE"],                    // Tommy Macalintal
  ["cmqvkp3l100f7mfxj5p5rywut", "2025-12-31", "SAN PEDRO COMMUNITY"],  // Christian Rivera
  ["cmqvkoh1f006zmfxjd97gklv2", "2025-12-31", "SAN PEDRO COMMUNITY"],  // Marion Sambilay
  ["cmqv6whwg005z22c6etw9848m", "2025-12-31", "SOCIALS"],               // Luke Agcaoili
  ["cmqvkp46z00ffmfxjiy2frsza", "2025-12-31", "SAN PEDRO COMMUNITY"],  // Jamaica Nuarin
  ["cmqv6wi1t006122c6dw2nwlvr", "2025-12-31", "SOCIALS"],               // Jose Luis Tiongson
  ["cmqv6wihw006722c6flssrqeq", "2025-12-31", "FRIEND REFERRAL"],       // Seth Roi Adefuin
  ["cmqv6wjp1006n22c6z443pizm", "2025-12-31", "FRIEND REFERRAL"],       // Katya Espiritu
  ["cmqv6wi76006322c6gjn8kbi7", "2025-12-31", "FRIEND REFERRAL"],       // Calihx Padua
  ["cmqvkp4sx00fnmfxjgbyupw42", "2025-12-31", "FRIEND REFERRAL"],       // Hector Guevarra
  ["cmqvpljhc0039tgm1p61wg6fr", "2025-12-31", "RE"],                    // Elisha Faith Navarez
  ["cmqv6w7df002322c6afy6jye6", "2026-01-31", "RE"],                    // Nicole Ocoma
  ["cmqvkp65y00g5mfxj661t6b5l", "2026-01-31", "SOCIALS"],               // Fernando Bermudez
  ["cmqvpn6nq00mntgm1kbmmim29", "2026-01-31", "FRIEND REFERRAL"],       // Adrian Posadas
  ["cmqvkp8gv00gzmfxj2edyfqu5", "2026-01-31", "FRIEND REFERRAL"],       // Sixto Posadas
  ["cmqvkp8x900h5mfxjp9tmthgq", "2026-01-31", "SAN PEDRO COMMUNITY"],  // Lia Wisnajaya
  ["cmqvplb02000htgm15bm1lwkd", "2026-02-28", "RE"],                    // Mitz Delos Santos
  ["cmqv6w2kw000b22c6jb7liiix", "2026-02-28", "RE"],                    // Luigi Torres
  ["cmqvplbol000ptgm1jb3n7l1b", "2026-02-28", "RE"],                    // Shaun Maverick Back
  ["cmqv6wixz006d22c6rkgd2jz5", "2026-02-28", "SOCIALS"],               // Ana Francine Selorio
  ["cmqvkpbtw00i7mfxjv7v3ndxe", "2026-02-28", "SAN PEDRO COMMUNITY"],  // Justin Salazar
  ["cmqv6w312000h22c6ndhsyqib", "2026-02-28", "RE"],                    // Rian Seranilla
  ["cmqvkpcfx00ifmfxjj1plxbfo", "2026-02-28", "SOCIALS"],               // Nica Alexis Minor (exact)
  ["cmqv6wj8v006h22c6rkek4y7m", "2026-02-28", "SOCIALS"],               // Matthew Galimba
  ["cmqv6w66a001n22c61jzipeiw", "2026-02-28", "RE"],                    // Glenford Alvaira
  ["cmqv6wje8006j22c64fdopaa3", "2026-03-31", "FRIEND REFERRAL"],       // Kvy Anoza
  ["cmqv6wjjl006l22c68ies4tgz", "2026-03-31", "SOCIALS"],               // Brix Franco Pili
  ["cmqv6w4do000z22c6i041e6k9", "2026-03-31", "RE"],                    // Joshua Oliveros
  ["cmqvpna8900nttgm1oxifdkx0", "2026-03-31", "FRIEND REFERRAL"],       // Francis Jimenez
  ["cmqv6wb40003h22c6m4ws7hx3", "2026-03-31", "FRIEND REFERRAL"],       // Irish Vinluan
  ["cmqvkpfh200jjmfxjkpahnjl9", "2026-03-31", "SOCIALS"],               // Saint Espiritu
  ["cmqv6wjzr006r22c6suj4939o", "2026-03-31", "SOCIALS"],               // Rinelyn Miras
  ["cmqv6wkw2007322c69fjomgtf", "2026-04-30", "SOCIALS"],               // Juneph Morado
  ["cmqvpndrt00oztgm180cfahpd", "2026-04-30", "SOCIALS"],               // Marc Jefferson Agdeppa
  ["cmqv6wlhp007b22c6vsg58jer", "2026-04-30", "SOCIALS"],               // Emmanuel Mesoga
  ["cmqv6wln5007d22c6ton4g2v1", "2026-04-30", "SAN PEDRO COMMUNITY"],  // Bea Kalaw
  ["cmqvkpp1500n1mfxjnpi6l82o", "2026-04-30", "SAN PEDRO COMMUNITY"],  // Amanda Kalaw
  ["cmqv6wat9003d22c6mwonmwzu", "2026-04-30", "RE"],                    // Mhello Espejo
  ["cmqv6wm8y007l22c6s6d293w0", "2026-04-30", "SOCIALS"],               // Vincent Cabingue
  ["cmqvplwpy007ltgm1xfafkyj7", "2026-04-30", ""],                      // Adan Castillo
  ["cmqvkprsw00o1mfxjhtd29ksq", "2026-04-30", "SOCIALS"],               // Alexander Rasing
  ["cmqv6wmpc007r22c6o486w5ar", "2026-04-30", "SOCIALS"],               // Vianca Valdez
  ["cmqvpniua00qntgm14csmibkh", "2026-04-30", "SOCIALS"],               // Marjorie Carino
  ["cmqv6wmv2007t22c60ubzv87f", "2026-04-30", "SOCIALS"],               // Allysia Castillo
  ["cmqv6wn0h007v22c61bx2bkng", "2026-04-30", "FRIEND REFERRAL"],       // Damian Efergan
  ["cmqvpm5ep00aftgm1gxr03qsx", "2026-05-31", "RE"],                    // Giovanni Solita
  ["cmqvkpwza00pxmfxjjh5vy1zw", "2026-05-31", "FRIEND REFERRAL"],       // John Matthew Esmale
  ["cmqvpm8hf00bftgm1ulloe0le", "2026-05-31", "FRIEND REFERRAL"],       // August Bautista
  ["cmqvpm8bb00bdtgm1c8tblpx2", "2026-05-31", "FRIEND REFERRAL"],       // Mallory Bautista
  ["cmqv6wnm2008322c615wsw619", "2026-05-31", "SOCIALS"],               // Nigel Gabriel Cabidog
  ["cmqvpleqa001ptgm14zzm9qaj", "2026-05-31", "SAN PEDRO COMMUNITY"],  // Andriella Olaguer
  ["cmqvpnlqm00rltgm129f0nplm", "2026-05-31", "SAN PEDRO COMMUNITY"],  // Adrielle Olaguer
  ["cmqv6wl1l007522c6bhfsz4lq", "2026-05-31", "SOCIALS"],               // Raien Fritz Ticar
  ["cmqvpnpg600sttgm1k7w0er8a", "2026-06-30", "SOCIALS"],               // Danny Fabello
  ["cmqvpnfmo00pltgm1d61nozhe", "2026-06-30", "FRIEND REFERRAL"],       // Deion Tyler Garcia
  ["cmqv6we60004l22c6d00su7mm", "2026-06-30", "RE"],                    // Kaia Ricarro
  ["cmqvkq34i00s5mfxjtyx84md0", "2026-06-30", "SOCIALS"],               // Kai Gamboa
  ["cmqvkosr200b9mfxj47kethrd", "2026-06-30", "RE"],                    // Michael Lim
  ["cmqv6wocw008d22c6a1gil1jq", "2026-06-30", "SOCIALS"],               // Adrian Bravo
  ["cmqvkq4hh00snmfxjoi7kd8q5", "2026-06-30", "SAN PEDRO COMMUNITY"],  // Joephet Pabillon
  ["cmqvpnfsq00pntgm1awxvy8uz", "2026-06-30", "FRIEND REFERRAL"],       // Adi Valerio
  ["cmqvpmwdd00j9tgm1mg9j7u4t", "2026-06-30", "FRIEND REFERRAL"],       // Astrid Ongjoco
  ["cmqvpnrbb00tftgm1f0n1ll4c", "2026-06-30", "SOCIALS"],               // Miguel Alfonso
  ["cmqvpnrhe00thtgm1ohfafw5f", "2026-06-30", "SOCIALS"],               // Ista Prema
  ["cmqv6wp4s008n22c68bz80liq", "2026-06-30", "FRIEND REFERRAL"],       // Jecel Jungaya
  ["cmqv6wpa5008p22c65d1iv0xt", "2026-06-30", "SOCIALS"],               // Jan Asido

  // === FUZZY MATCHES (50 confirmed by middle-name pattern) ===
  ["cmqvpm3dt009rtgm17n72dmx1", "2025-08-01", "FRIEND REFERRAL"],       // Kathleen Berroya (KATH)
  ["cmqvpmk6a00f9tgm1j8fmehqv", "2025-08-01", "FRIEND REFERRAL"],       // John Maverieck Casacop (JOHN CASACOP)
  ["cmqv6wfcz005122c6twneztob", "2025-08-01", "FRIEND REFERRAL"],       // Emerson Paul Bongiad
  ["cmqv6wfnq005522c62bcvbjah", "2025-08-01", "SAN PEDRO COMMUNITY"],   // Fides Zita Gomez
  ["cmqv6w9wt003122c6l68bodoi", "2025-08-01", "FRIEND REFERRAL"],       // Chase Emmanuelle Mapalo
  ["cmqvpmlv000fttgm1txeqhfg8", "2025-09-01", "SOCIALS"],               // Roux Sabrina Gomez
  ["cmqv6wgjy005h22c650ex7ym6", "2025-10-01", "SOCIALS"],               // Nikon L Celis
  ["cmqvpmsg500hztgm1asknqmk0", "2025-11-01", "SOCIALS"],               // Elijah Makisig Sayson
  ["cmqv6w3mr000p22c6ql8whwhn", "2025-11-01", "RE"],                    // Lara Jane San Juan
  ["cmqv6wc7a003v22c6k0omq5uv", "2025-11-30", "RE"],                    // Jarred Drayke Maquiniana
  ["cmqv6wicj006522c6666dixip", "2025-12-31", "FRIEND REFERRAL"],       // Sherwin Adefuin II
  ["cmqv6w8ki002j22c6lnx1ky0s", "2026-01-31", "RE"],                    // Anthony John Prado
  ["cmqv6w2fi000922c6ez2v9mct", "2026-01-31", "RE"],                    // Kevin Ron Villacorte
  ["cmqvpld7e0017tgm19y0fqtoe", "2026-01-31", "RE"],                    // Kaley Yvanna Solita
  ["cmqvpld1c0015tgm1rimdaszs", "2026-01-31", "RE"],                    // Levi Ramnel Solita
  ["cmqvpmsa300hxtgm1wutlhkrt", "2026-01-31", "SOCIALS"],               // Loyd L Sayson
  ["cmqvkp9oi00hfmfxjcoq16d47", "2026-02-28", "FILWEB"],                // Lance Kelvin P Bautista
  ["cmqv6wisn006b22c625w1b5df", "2026-02-28", "FRIEND REFERRAL"],       // Jennyfer A Desipeda
  ["cmqv6wj3c006f22c6gaixc1v3", "2026-02-28", "SOCIALS"],               // Luigi Marvic Feliciano
  ["cmqvkpc5400ibmfxjbuz5jc39", "2026-02-28", "SOCIALS"],               // John Nathaniel Esmale
  ["cmqvpn8vm00ndtgm175vu1sgl", "2026-02-28", "SOCIALS"],               // Rae Maru Lucido
  ["cmqv6wo26008922c6sxmjohxu", "2026-02-28", "FRIEND REFERRAL"],       // Michael Josh Desipeda
  ["cmqvpljne003btgm17x4ty30u", "2026-02-28", "RE"],                    // Katrina Grace Blanco
  ["cmqvpn9py00nntgm16eptwvx5", "2026-03-31", "FRIEND REFERRAL"],       // Jason Cris Tabirara
  ["cmqv6wjue006p22c6vlzy3sv1", "2026-03-31", "FRIEND REFERRAL"],       // Gabriel Ross Alvarado
  ["cmqvkpcfx00ifmfxjj1plxbfo", "2026-03-31", "SOCIALS"],               // Nica Alexis Minor (Alexis Minor)
  ["cmqv6wk53006t22c6wcazqk5t", "2026-03-31", "FRIEND REFERRAL"],       // Catrina Bianca Natalio
  ["cmqv6wkla006z22c6scyxjvet", "2026-04-30", "SOCIALS"],               // Graciela Nabuab
  ["cmqv6w3xh000t22c6adljp4nv", "2026-04-30", "RE"],                    // Al Bien Salvador
  ["cmqv6wlsn007f22c6w6hka0vd", "2026-04-30", "SOCIALS"],               // Ramon Gerardo Soldevilla
  ["cmqvkpovp00mzmfxjzitwo661", "2026-04-30", "SAN PEDRO COMMUNITY"],   // Francis Joseph Tejido
  ["cmqvkpf0n00jdmfxjdr6fjj6s", "2026-04-30", "SOCIALS"],               // Ethan Francis Jagonio
  ["cmqvkpri000nxmfxj8n5lr7zo", "2026-04-30", "SOCIALS"],               // Max Aeder Tamesis
  ["cmqv6wd9t004922c6ga8ddi7j", "2026-04-30", "RE"],                    // Lucia Robert Mendoza
  ["cmqv6wnrg008522c64hisdj5m", "2026-04-30", "SAN PEDRO COMMUNITY"],   // Charles Jacob Abo
  ["cmqv6wn5y007x22c63t3r7nw2", "2026-04-30", "SOCIALS"],               // Soriano Gian Clark
  ["cmqvpnfai00phtgm1hd9p854v", "2026-05-31", "SOCIALS"],               // Ross Admilon Amada
  ["cmqvkpf6400jfmfxj4bw55n9r", "2026-05-31", "FRIEND REFERRAL"],       // Zeven Rillorta
  ["cmqvkpspm00odmfxjwc7wwtjd", "2026-05-31", "FRIEND REFERRAL"],       // Chrixandria Gabrielle Padua
  ["cmqvkpz5600qpmfxjo6gn8i7g", "2026-05-31", "SAN PEDRO COMMUNITY"],  // Liam Andrei Bustos
  ["cmqvkpyo300qjmfxjhwl2e7y4", "2026-05-31", "SAN PEDRO COMMUNITY"],  // Andre N Olaguer
  ["cmqvpnbeo00o7tgm1a22ejiyu", "2026-05-31", "SOCIALS"],               // Gabriel Mozzi Alvar (confirmed)
  ["cmqv6wonp008h22c6ulcfaxlp", "2026-06-30", "FRIEND REFERRAL"],       // Gabriel Ulrich Pablo
  ["cmqv6wozc008l22c60lbpxeoe", "2026-06-30", "FRIEND REFERRAL"],       // Athena Xenelle Layon
  ["cmqv6w7z0002b22c6ilaif48q", "2026-06-30", "RE"],                    // K Aian Orallo
  ["cmqv6wkfu006x22c6mf0p9g0n", "2026-06-30", "FRIEND REFERRAL"],       // Athena Vanelope Roldan
  ["cmqvkprcl00nvmfxjpye1dj2k", "2026-06-30", "SOCIALS"],               // Shandria Zobelle Santiago
  ["cmqv6woib008f22c6l44zxt0d", "2026-06-30", "PERPETUAL"],             // Bon Summer Belle Viala
  ["cmqvkq2tl00s1mfxjf54jei7k", "2026-06-30", "FRIEND REFERRAL"],       // Jose Ferdinand Licop
  ["cmqv6wngn008122c69woq7xm1", "2026-06-30", "SOCIALS"],               // Ava Sofyna Ruiz
  ["cmqvkpr7500ntmfxjimlajawr", "2026-06-30", "SAN PEDRO COMMUNITY"],   // Althea Cersei Valenzuela
  ["cmqvkq4mw00spmfxj7q8351dl", "2026-06-30", "SOCIALS"],               // Aliyah Shannara Valois

  // === SPELLING VARIANT MATCHES (treated as same person) ===
  ["cmqvpm84700bbtgm1hsoqysr8", "2025-08-01", "FRIEND REFERRAL"],       // Leo Miguel Cabuhayan (MIGO)
  ["cmqv6wg98005d22c67zr8jud9", "2025-09-01", "FRIEND REFERRAL"],       // Shiela Mae Alisasis (SHEILA)
  ["cmqvpn5b900m7tgm1dthst4oa", "2026-01-31", "SOCIALS"],               // Cristopher Janus De Guzman
  ["cmqv6wlcb007922c6z398k3ll", "2026-04-30", "SOCIALS"],               // Vanessa Denina
  ["cmqv6wm3m007j22c6yy0v6oih", "2026-04-30", "SOCIALS"],               // Silver Esocta
  ["cmqvkoocg009nmfxjwewa07rr", "2026-05-31", "RE"],                    // Justin Casubuan
  ["cmqvpm1or0097tgm1fa3pu8ap", "2026-04-30", "FRIEND REFERRAL"],       // Chrei Encomienda
  ["cmqv6wo7j008b22c6lkzjo5dn", "2026-06-30", "SOCIALS"],               // Camille Cantalejo
];

// New entries: [name, startDate, source]
const NEW_ENTRIES = [
  ["LUIS MIGUEL MONTENEGRO", "2025-10-01", "SOCIALS"],
  ["HUMPHREY DIOMALOS", "2025-10-01", "SOCIALS"],
  ["Athena Quinones", "2026-02-28", "SOCIALS"],
  ["Aileen Nano", "2026-03-31", "SOCIALS"],
  ["Naeem Zamur", "2026-04-30", "FRIEND REFERRAL"],
  ["Franchesca Marie Teotoco", "2026-05-31", "SAN PEDRO COMMUNITY"],
  ["Khalil Bertos", "2026-06-30", "SOCIALS"],
  ["Allen Alegria", "2026-06-30", "SOCIALS"],
];

// Look up John Yngwie Abundo separately (spelling variant Yngwei/Yngwie)
const yngwieAbundo = await prisma.member.findFirst({
  where: { lastName: "Abundo", firstName: { contains: "Yngwie" } },
  select: { id: true, firstName: true, lastName: true },
});
if (yngwieAbundo) {
  MATCHED.push([yngwieAbundo.id, "2025-11-01", "SOCIALS"]);
  console.log(`✓ Found John Yngwie Abundo: ${yngwieAbundo.id}`);
} else {
  console.log("⚠ Could not find John Yngwie Abundo — will create as new");
  NEW_ENTRIES.push(["John Yngwei Abundo", "2025-11-01", "SOCIALS"]);
}

let created = 0, skipped = 0, sourceUpdated = 0, newMembers = 0;

// === PROCESS MATCHED MEMBERS ===
for (const [memberId, startDate, source] of MATCHED) {
  const startDt = new Date(startDate);
  const endDt = addOneYear(startDate);

  // Check if this exact annual membership already exists (same startDate)
  const existing = await prisma.subscription.findFirst({
    where: { memberId, serviceId: ANNUAL_SERVICE_ID, startDate: startDt },
  });
  if (existing) {
    skipped++;
    continue;
  }

  // Create annual membership
  await prisma.subscription.create({
    data: {
      memberId,
      serviceId: ANNUAL_SERVICE_ID,
      billingCycle: "ANNUAL",
      price: 0,
      startDate: startDt,
      endDate: endDt,
      nextBillDate: endDt,
      status: "ACTIVE",
    },
  });
  created++;

  // Update source field if not already set and source is non-empty
  if (source) {
    await prisma.member.updateMany({
      where: { id: memberId, source: null },
      data: { source },
    });
    sourceUpdated++;
  }
}

// === PROCESS NEW MEMBERS ===
for (const [fullName, startDate, source] of NEW_ENTRIES) {
  const parts = fullName.trim().split(/\s+/);
  const lastName = parts.pop();
  const firstName = parts.join(" ");

  // Generate member number
  const last = await prisma.member.findFirst({
    where: { memberNumber: { startsWith: "NS-" } },
    orderBy: { memberNumber: "desc" },
    select: { memberNumber: true },
  });
  const nextNum = last?.memberNumber
    ? parseInt(last.memberNumber.replace("NS-", ""), 10) + 1
    : 1;
  const memberNumber = `NS-${String(nextNum).padStart(5, "0")}`;

  const member = await prisma.member.create({
    data: {
      memberNumber,
      firstName,
      lastName,
      status: "ACTIVE",
      source: source || null,
    },
  });

  const startDt = new Date(startDate);
  const endDt = addOneYear(startDate);

  await prisma.subscription.create({
    data: {
      memberId: member.id,
      serviceId: ANNUAL_SERVICE_ID,
      billingCycle: "ANNUAL",
      price: 0,
      startDate: startDt,
      endDate: endDt,
      nextBillDate: endDt,
      status: "ACTIVE",
    },
  });

  console.log(`+ Created new member: ${firstName} ${lastName} (${memberNumber})`);
  newMembers++;
}

console.log(`\n✅ Done!`);
console.log(`   Annual memberships created: ${created}`);
console.log(`   Skipped (already exist):    ${skipped}`);
console.log(`   Source field updated:        ${sourceUpdated}`);
console.log(`   New member records created:  ${newMembers}`);

await prisma.$disconnect();
