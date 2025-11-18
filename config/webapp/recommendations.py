import time
import traceback

import requests

_cached_cookie = None
_cookie_expiry = 0

def generate_chosic_auth_token():
    try:
        global _cached_cookie, _cookie_expiry
        if _cached_cookie and time.time() < _cookie_expiry:
            return _cached_cookie

        response = requests.post(url="https://www.chosic.com/api/tools/handshake/", headers={"accept": "*/*", "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7", "content-length": "0", "origin": "https://www.chosic.com", "priority": "u=1, i", "referer": "https://www.chosic.com/playlist-generator/", "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\"Windows\"", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-origin", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36", "x-requested-with": "XMLHttpRequest"})
        if response.status_code == 200 and response.cookies:
            first_cookie = next(iter(response.cookies))
            _cached_cookie = {f"{first_cookie.name}": first_cookie.value}
            _cookie_expiry = time.time() + 172800 - 60
            return _cached_cookie
        else:
            print(f'response.status = {response.status_code} with reason {response.reason} or No cookies')
            return None
    except:
        traceback.print_exc()
        return None

def get_songs_recommendations(songs_ids:list, limit:int=25):
    try:
        cookie = generate_chosic_auth_token()
        if not cookie: return None
        print(cookie)

        response = requests.get(url="https://www.chosic.com/api/tools/recommendations", params={"seed_tracks": f"{','.join(songs_ids)},", "limit": f"{limit}"}, headers={ "accept": "application/json, text/javascript, */*; q=0.01", "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7", "app": "playlist_generator", "priority": "u=1, i", "referer": "https://www.chosic.com/playlist-generator/", "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\"Windows\"", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-origin", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36", "x-requested-with": "XMLHttpRequest"}, cookies=cookie)
        if response.status_code == 200:
            response_json = response.json()
            return [{"id": i["id"], "name": f'{i["name"]} (Preview)', "performers": ' & '.join([a["name"] for a in i["artists"]]), "coverart": i["album"]["image_large"] or None, "preview_url": i["preview_url"]} for i in response_json['tracks'] if i["preview_url"]]
        elif response.status_code == 401:
            global _cached_cookie
            _cached_cookie = None
            return None
        else:
            print(f'Unknown status {response.status_code} with reason {response.reason}')
            return None
    except:
        traceback.print_exc()
        return None