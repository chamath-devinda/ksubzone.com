import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def check_drama(url, label):
    print(f"=== Checking {label}: {url} ===")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            drama = data.get('drama', {})
            seasons = data.get('seasons', [])
            episodes = data.get('episodes', [])
            subtitles = data.get('subtitles', [])
            ep_subs = data.get('episodeSubtitles', [])
            print(f"Drama: {drama.get('title')}")
            print(f"Subtitle summary: {drama.get('subtitleSummary')}")
            print(f"Total episodeSubtitles array length: {len(ep_subs)}")
            for es in ep_subs:
                print(f"  epSub: id={es.get('_id')}, mediaId={es.get('mediaId')}, epNum={es.get('episodeNumber')}, seasonNum={es.get('seasonNumber')}")
            for ep in episodes:
                print(f"  Ep {ep.get('episodeNumber')}: id={ep.get('_id')}, subtitleCount={ep.get('subtitleCount')}")
    except Exception as e:
        print(f"Error checking {label}: {e}")

check_drama("http://127.0.0.1:5000/api/media/dramas/the-affair-was-just-the-beginning", "Local Backend")
print()
check_drama("https://api.ksubzone.com/api/media/dramas/the-affair-was-just-the-beginning", "Direct PHP Live API")
print()
check_drama("https://ksubzone.com/api/media/dramas/the-affair-was-just-the-beginning", "Vercel Rewritten Live URL")

