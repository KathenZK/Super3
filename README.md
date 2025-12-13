# Super3 (2-day MVP)

Web3 新闻聚合（Stories-first）：先把同一事件在多个站点/多篇文章中 **严格合并成 Story**，首页只展示 Story（不刷屏），再点进 Story 看全部来源。

## Repo 结构

- `apps/web`: Next.js（页面 + API + 采集脚本）
- `supabase/schema.sql`: 数据表 + 视图
- `supabase/seeds/seed_sources.sql`: 默认 30 站种子（EN:22 / ZH:8，RSS 优先；中文源后续可替换扩充）
- `.github/workflows/ingest.yml`: GitHub Actions 定时采集（每 30 分钟）

## 你将得到的功能

- **首页**：Hot(24h) / New（Story 粒度）+ 语言过滤（EN/ZH/All）
- **搜索**：关键词搜索 Story（MVP 先做标题匹配）
- **Story 详情**：列出该 Story 下的全部来源文章
- **采集**：30 分钟抓一次 RSS → 入库 → 48h 严格合并 → 计算 24h 热榜分数

## Supabase 初始化

1) 创建 Supabase 项目
2) 打开 SQL Editor，依次执行：
   - `supabase/schema.sql`
   - `supabase/seeds/seed_sources.sql`

> 提示：中文站点 RSS 可能缺失或不稳定。`rss_url` 为空时，采集脚本会尝试从站点首页自动发现 RSS/Atom。

## 环境变量（Vercel / 本地 / Actions）

需要 **Service Role Key**（仅服务端使用，别暴露到浏览器）。

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 本地运行（可选）

```bash
cd apps/web
npm install
npm run ingest   # 先抓一次数据
npm run dev
```

## Vercel 部署

1) 在 Vercel 导入该仓库
2) 设置 Root Directory 为 `apps/web`
3) 配置环境变量：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
4) 部署后访问首页即可

## GitHub Actions 定时采集

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

工作流：`.github/workflows/ingest.yml`（每 30 分钟运行一次，也可手动触发）


