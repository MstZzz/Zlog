import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const title = process.argv[2];

if (!title) {
  console.log('用法: npm run new "文章标题"');
  console.log('例如: npm run new "我的第一篇文章"');
  process.exit(1);
}

const date = new Date().toISOString().split('T')[0];
const slug = title
  .toLowerCase()
  .replace(/[^\w\u4e00-\u9fff]+/g, '-')
  .replace(/^-|-$/g, '');

const dir = join(import.meta.dirname, '..', 'src', 'data', 'blog');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const file = join(dir, `${slug}.md`);

if (existsSync(file)) {
  console.log(`⚠ 文件已存在: ${file}`);
  process.exit(1);
}

const frontmatter = `---
title: "${title}"
description: ""
date: ${date}
tags: []
draft: false
---

写点什么吧。
`;

writeFileSync(file, frontmatter, 'utf-8');

console.log(`✅ 文章已创建: src/data/blog/${slug}.md`);
console.log(`   打开它，开始写吧！`);
