-- Seed default sources (EN:21, ZH:9)
-- Run after schema.sql in Supabase SQL Editor.

insert into public.sources (name, homepage_url, rss_url, lang, weight, enabled)
values
  -- EN
  ('Cointelegraph', 'https://cointelegraph.com/', 'https://cointelegraph.com/rss', 'en', 3, true),
  ('CoinDesk', 'https://www.coindesk.com/', null, 'en', 3, true),
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
  ('Bitcoin Magazine', 'https://bitcoinmagazine.com/', null, 'en', 2, true),

  -- EN (extra)
  ('CryptoPotato', 'https://cryptopotato.com/', 'https://cryptopotato.com/feed/', 'en', 2, true),
  ('ZyCrypto', 'https://zycrypto.com/', 'https://zycrypto.com/feed/', 'en', 2, true),
  ('CoinGape', 'https://coingape.com/', null, 'en', 2, true),
  ('U.Today', 'https://u.today/', null, 'en', 2, true),
  ('CryptoNews', 'https://cryptonews.com/', null, 'en', 2, true),
  ('The Block', 'https://www.theblock.co/', null, 'en', 2, true),

  -- ZH (RSS may be absent/unstable; ingest script will attempt RSS auto-discovery when rss_url is null)
  ('金色财经', 'https://www.jinse.com/', null, 'zh', 3, true),
  ('Odaily 星球日报', 'https://www.odaily.news/', null, 'zh', 3, true),
  ('PANews', 'https://www.panewslab.com/', null, 'zh', 3, true),
  ('BlockBeats 律动', 'https://www.theblockbeats.info/', null, 'zh', 3, true),
  ('链捕手 ChainCatcher', 'https://www.chaincatcher.com/', null, 'zh', 2, true),
  ('深潮 TechFlow', 'https://www.techflowpost.com/', null, 'zh', 2, true),
  ('Foresight News', 'https://foresightnews.pro/', null, 'zh', 2, true),
  ('8BTC 巴比特', 'https://www.8btc.com/', null, 'zh', 2, true),
  ('吴说区块链', 'https://wublockchain.xyz/', null, 'zh', 2, true)
on conflict (homepage_url) do nothing;


