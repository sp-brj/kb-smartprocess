import { test as base } from "./auth.fixture";

// Generate unique names with timestamp to avoid conflicts
function generateTimestamp() {
  return Date.now().toString();
}

type DataFixtures = {
  testArticle: {
    title: string;
    content: string;
    slug: string;
  };
  testFolder: {
    name: string;
    slug: string;
  };
  nestedFolders: {
    level1: string;
    level2: string;
    level3: string;
  };
  timestamp: string;
};

export const test = base.extend<DataFixtures>({
  timestamp: async ({}, use) => {
    const ts = generateTimestamp();
    await use(ts);
  },

  testArticle: async ({ timestamp }, use) => {
    const article = {
      title: `Test Article ${timestamp}`,
      content: `This is test content for article ${timestamp}`,
      slug: `test-article-${timestamp}`,
    };
    await use(article);
  },

  testFolder: async ({ timestamp }, use) => {
    const folder = {
      name: `Test Folder ${timestamp}`,
      slug: `test-folder-${timestamp}`,
    };
    await use(folder);
  },

  nestedFolders: async ({ timestamp }, use) => {
    const folders = {
      level1: `Nav Folder L1 ${timestamp}`,
      level2: `Nav Folder L2 ${timestamp}`,
      level3: `Nav Folder L3 ${timestamp}`,
    };
    await use(folders);
  },
});

export { expect } from "./auth.fixture";
