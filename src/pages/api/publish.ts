import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { password, title, description, tags, content, source } = body;

  // 1. Auth
  const adminPassword = import.meta.env.ADMIN_PASSWORD;
  if (!adminPassword || password !== adminPassword) {
    return new Response(JSON.stringify({ ok: false, error: '密码错误' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Validate
  if (!title || !content || !source) {
    return new Response(JSON.stringify({ ok: false, error: '缺少必要字段 (title, content, source)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // source: 'editor' → we build frontmatter + content; 'upload' → content already includes frontmatter
  let fileContent: string;
  if (source === 'editor') {
    const date = body.date || new Date().toISOString().split('T')[0];
    const tagsYaml = (tags || []).map((t: string) => `"${t}"`).join(', ');
    fileContent = `---
title: "${title}"
description: "${description || ''}"
date: ${date}
tags: [${tagsYaml}]
draft: false
---

${content}`;
  } else {
    // source === 'upload' → content is the full .md file including frontmatter
    fileContent = content;
  }

  // 3. Push to GitHub
  const slug = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '');
  const path = `src/data/blog/${slug}.md`;
  const token = import.meta.env.GITHUB_TOKEN;
  const repo = import.meta.env.GITHUB_REPO || 'MstZzz/Zlog';

  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: '服务器未配置 GitHub Token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Check if file exists (to get sha for update)
    let sha = '';
    const checkRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    );
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    // Create or update file
    const fileBase64 = Buffer.from(fileContent, 'utf-8').toString('base64');
    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({
          message: sha ? `更新文章: ${title}` : `新文章: ${title}`,
          content: fileBase64,
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (!putRes.ok) {
      const err = await putRes.json();
      return new Response(JSON.stringify({ ok: false, error: `GitHub API 错误: ${err.message}` }), {
        status: putRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      slug,
      message: sha ? '文章已更新' : '文章已发布',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: `请求失败: ${e.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
