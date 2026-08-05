const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // Find items with webViewLink-style photoUrls and convert to thumbnail URLs
  const items = await p.shopItem.findMany({
    where: { photoUrl: { contains: 'drive.google.com/file/d/' } },
    select: { id: true, name: true, photoUrl: true },
  });
  console.log(`Found ${items.length} items with webViewLink photoUrls`);
  for (const item of items) {
    const match = item.photoUrl.match(/\/d\/([^/]+)\//);
    if (!match) { console.log(`  Skipping ${item.name} — no file ID found`); continue; }
    const fileId = match[1];
    const newUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    await p.shopItem.update({ where: { id: item.id }, data: { photoUrl: newUrl } });
    console.log(`  Fixed ${item.name}: ${newUrl}`);
  }
}
main().catch(console.error).finally(() => p.$disconnect());
