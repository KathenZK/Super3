-- Seed default sources (EN:22, ZH:8)
-- Run after schema.sql in Supabase SQL Editor.

insert into public.sources (name, homepage_url, rss_url, lang, weight, enabled)
values
  -- EN
  ('Cointelegraph', 'https://cointelegraph.com/', 'https://cointelegraph.com/rss', 'en', 3, true),
  -- CoinDesk RSS may be rate-limited/blocked in some regions; enable if it works for you.
  ('CoinDesk', 'https://www.coindesk.com/', 'https://www.coindesk.com/arc/outboundfeeds/rss/', 'en', 3, true),
  ('Decrypt', 'https://decrypt.co/', 'https://decrypt.co/feed', 'en', 3, true),
  ('Blockworks', 'https://blockworks.co/', 'https://blockworks.co/feed', 'en', 3, true),
  ('CryptoSlate', 'https://cryptoslate.com/', 'https://cryptoslate.com/feed/', 'en', 2, true),
  ('NewsBTC', 'https://www.newsbtc.com/', 'https://www.newsbtc.com/feed/', 'en', 2, true),
  ('AMBCrypto', 'https://ambcrypto.com/', 'https://ambcrypto.com/feed/', 'en', 2, true),
  ('BeInCrypto', 'https://beincrypto.com/', 'https://beincrypto.com/feed/', 'en', 2, true),
  ('Crypto Briefing', 'https://cryptobriefing.com/', 'https://cryptobriefing.com/feed/', 'en', 2, true),
  ('CoinJournal', 'https://coinjournal.net/', 'https://coinjournal.net/feed/', 'en', 2, true),
  ('Bitcoinist', 'https://bitcoinist.com/', 'https://bitcoinist.com/feed/', 'en', 2, true),
  ('NullTX', 'https://nulltx.com/', 'https://nulltx.com/feed/', 'en', 2, true),
  ('Daily Hodl', 'https://dailyhodl.com/', 'https://dailyhodl.com/feed/', 'en', 2, true),
  ('The Defiant', 'https://thedefiant.io/', 'https://thedefiant.io/feed', 'en', 2, true),
  ('Bitcoin Magazine', 'https://bitcoinmagazine.com/', 'https://bitcoinmagazine.com/feed', 'en', 2, true),

  -- EN (extra)
  ('CryptoPotato', 'https://cryptopotato.com/', 'https://cryptopotato.com/feed/', 'en', 2, true),
  ('ZyCrypto', 'https://zycrypto.com/', 'https://zycrypto.com/feed/', 'en', 2, true),
  ('CoinGape', 'https://coingape.com/', 'https://coingape.com/feed/', 'en', 2, true),
  ('U.Today', 'https://u.today/', 'https://u.today/rss.php', 'en', 2, true),
  ('CryptoNews', 'https://cryptonews.com/', 'https://cryptonews.com/feed/', 'en', 2, true),
  ('The Block', 'https://www.theblock.co/', 'https://www.theblock.co/rss.xml', 'en', 2, true),
  ('CryptoDaily', 'https://cryptodaily.co.uk/', 'https://cryptodaily.co.uk/feed/', 'en', 2, true),

  -- ZH (RSS may be absent/unstable; ingest script will attempt RSS auto-discovery when rss_url is null)
  ('金色财经', 'https://www.jinse.cn/', null, 'zh', 3, true),
  ('Odaily 星球日报', 'https://www.odaily.news/', null, 'zh', 3, true),
  ('PANews', 'https://www.panewslab.com/', null, 'zh', 3, true),
  ('BlockBeats 律动', 'https://www.theblockbeats.info/', null, 'zh', 3, true),
  ('链捕手 ChainCatcher', 'https://www.chaincatcher.com/', null, 'zh', 2, true),
  ('深潮 TechFlow', 'https://www.techflowpost.com/', null, 'zh', 2, true),
  ('Foresight News', 'https://foresightnews.pro/', null, 'zh', 2, true),
  ('吴说区块链', 'https://wublockchain.xyz/', null, 'zh', 2, true)
on conflict (homepage_url) do nothing;


