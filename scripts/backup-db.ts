import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database backup...");

  // Export all data
  const [articles, articleVersions, articleLinks, folders, tags, articleTags, users] = await Promise.all([
    prisma.article.findMany(),
    prisma.articleVersion.findMany(),
    prisma.articleLink.findMany(),
    prisma.folder.findMany(),
    prisma.tag.findMany(),
    prisma.articleTag.findMany(),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        // Exclude password hash for security
      },
    }),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    data: {
      users,
      folders,
      tags,
      articles,
      articleVersions,
      articleLinks,
      articleTags,
    },
    counts: {
      users: users.length,
      folders: folders.length,
      tags: tags.length,
      articles: articles.length,
      articleVersions: articleVersions.length,
      articleLinks: articleLinks.length,
      articleTags: articleTags.length,
    },
  };

  const filename = `backup_${new Date().toISOString().split("T")[0]}.json`;
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));

  console.log(`\nBackup completed: ${filename}`);
  console.log("Counts:", backup.counts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
