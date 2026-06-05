import { execSync } from 'child_process';

const msg = process.argv[2] || '更新文章';

console.log('📝 提交中...');
execSync('git add .', { stdio: 'inherit' });
execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });
console.log('🚀 推送中...');
execSync('git push', { stdio: 'inherit' });
console.log('✅ 已推送！Vercel 会自动部署，1-2 分钟后生效。');
