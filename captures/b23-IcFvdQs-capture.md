# b23.tv IcFvdQs capture

Captured: 2026-05-20 22:35 CST

Original URL:

```text
http://b23.tv/IcFvdQs?K
```

Final browser URL:

```text
https://pan.quark.cn/s/623ef942e474#/list/share
```

## Redirect chain

1. `http://b23.tv/IcFvdQs?K`
   - Status: `302 Moved Temporarily`
   - Location: `https://b23.tv/IcFvdQs?K`
   - Server: `Tengine`

2. `https://b23.tv/IcFvdQs?K`
   - Status: `302 Found`
   - Location: `http://x.uicok.com://mall.bilibili.com?oid=jianlai`
   - Headers include: `X-Cache-Webcdn: BYPASS from blzone08`, `Cache-Control: no-cache`

3. Browser-resolved next hop:
   - Effective URL: `http://x.uicok.com//mall.bilibili.com?oid=jianlai`
   - Status: `302 Found`
   - Location: `https://pan.quark.cn/s/623ef942e474`
   - Server: `nginx`
   - Set-Cookie: `PHPSESSID=...`

4. `https://pan.quark.cn/s/623ef942e474`
   - Status: `200 OK`
   - Server: `Tengine`
   - Content-Type: `text/html; charset=utf-8`
   - Set-Cookie: Quark `ctoken`, `web-grey-id`, signatures

## Browser resource inventory

Rendered page:

```text
https://pan.quark.cn/s/623ef942e474#/list/share
```

Observed assets after load:

- Total: `132`
- Scripts: `17`
- Stylesheets: `11`
- Images: `38`
- Other/API/beacon/iframe: `66`
- Inline SVGs: `5`

Top observed hosts:

| Host | Count | Main kinds |
| --- | ---: | --- |
| `px.wpk.quark.cn` | 34 | telemetry/beacon |
| `image.quark.cn` | 32 | images/data |
| `g.alicdn.com` | 27 | scripts/styles/images |
| `track.lc.quark.cn` | 6 | analytics |
| `pan.quark.cn` | 5 | page APIs |
| `uop.quark.cn` | 3 | login iframe/API |
| `drive-h.quark.cn` | 2 | share token/detail APIs |
| `fourier.taobao.com` | 2 | anti-bot/security |
| `127.0.0.1:9125-9130` | multiple | Quark desktop app probes |

Key page APIs observed:

```text
https://pan.quark.cn/api/computerinfo?fr=pc&platform=pc
https://pan.quark.cn/api/config?fr=pc&platform=pc
https://pan.quark.cn/api/client_version?fr=pc&platform=pc
https://drive-h.quark.cn/1/clouddrive/share/sharepage/token?pr=ucpro&fr=pc&uc_param_str=
https://drive-h.quark.cn/1/clouddrive/share/sharepage/detail?...&pwd_id=623ef942e474...
https://uop.quark.cn/cas/custom/login?custom_login_type=mobile&client_id=532...
```

## Working hypothesis

The interesting part is step 2:

```text
Location: http://x.uicok.com://mall.bilibili.com?oid=jianlai
```

A browser parses this as:

```text
scheme = http
host   = x.uicok.com
path   = //mall.bilibili.com
query  = oid=jianlai
```

So the real external hop is `x.uicok.com`, not `mall.bilibili.com`.

The likely trick is a URL-parser mismatch or allowlist bypass:

- Bilibili recognizes/opens `b23.tv` as its own shortlink domain.
- The b23 redirect target contains a Bilibili-owned-looking substring: `mall.bilibili.com`.
- A stricter browser URL parser still treats `x.uicok.com` as the authority/host.
- `x.uicok.com` then performs the final redirect to Quark.

This capture does not prove which exact Bilibili client-side allowlist check is being bypassed, but it clearly shows the chain and the crafted ambiguous URL.
