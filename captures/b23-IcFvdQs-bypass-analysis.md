# b23.tv IcFvdQs bypass analysis

Captured at: 2026-05-20 22:35 CST

Original URL:

```text
http://b23.tv/IcFvdQs?K
```

Final browser URL:

```text
https://pan.quark.cn/s/623ef942e474#/list/share
```

## Executive summary

This link appears to rely on a mismatch between:

- a platform/app-side URL trust or allowlist check
- a standards-tolerant browser URL parser

The important redirect is not a normal direct jump from Bilibili to Quark. It is a crafted intermediate URL:

```text
http://x.uicok.com://mall.bilibili.com?oid=jianlai
```

A human or a loose string check may notice `mall.bilibili.com` and treat the URL as Bilibili-related. A browser, however, treats the actual network host as:

```text
x.uicok.com
```

That external host then returns a normal `302` to the Quark share page.

## Captured redirect chain

### Step 1

Request:

```text
GET http://b23.tv/IcFvdQs?K
```

Response:

```text
302 Moved Temporarily
Location: https://b23.tv/IcFvdQs?K
Server: Tengine
Content-Type: text/html
```

Body start:

```html
<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html>
<head><title>302 Found</title></head>
<body>
<center><h1>302 Found</h1></center>
```

Interpretation:

This is only HTTP-to-HTTPS normalization.

### Step 2

Request:

```text
GET https://b23.tv/IcFvdQs?K
```

Response:

```text
302 Found
Location: http://x.uicok.com://mall.bilibili.com?oid=jianlai
Content-Type: text/html; charset=utf-8
Cache-Control: no-cache
X-Cache-Webcdn: BYPASS from blzone08
X-Bili-Trace-Id: 07190d448965fee647d6f53e306a0dc6
Bili-Trace-Id: 47d6f53e306a0dc6
```

Body:

```html
<a href="http://x.uicok.com://mall.bilibili.com?oid=jianlai">Found</a>.
```

Interpretation:

This is the key step. The Bilibili shortlink service itself returns a redirect to a syntactically unusual URL containing both:

```text
x.uicok.com
mall.bilibili.com
```

But only one of them is the real authority/host.

### Step 3

Browser-resolved request:

```text
GET http://x.uicok.com//mall.bilibili.com?oid=jianlai
```

Response:

```text
302 Found
Location: https://pan.quark.cn/s/623ef942e474
Server: nginx
Content-Type: text/html; charset=UTF-8
Set-Cookie: PHPSESSID=...
Cache-Control: no-store, no-cache, must-revalidate
Strict-Transport-Security: max-age=31536000
```

Interpretation:

The actual outbound host is:

```text
x.uicok.com
```

The `//mall.bilibili.com` part became path data on that host, not the destination host.

### Step 4

Request:

```text
GET https://pan.quark.cn/s/623ef942e474
```

Response:

```text
200 OK
Server: Tengine
Content-Type: text/html; charset=utf-8
Cache-Control: no-cache
Set-Cookie: ctoken=...
Set-Cookie: web-grey-id=...
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
```

Final rendered URL:

```text
https://pan.quark.cn/s/623ef942e474#/list/share
```

## URL parsing detail

The crafted URL:

```text
http://x.uicok.com://mall.bilibili.com?oid=jianlai
```

Can be mentally split like this:

```text
scheme: http
authority-ish segment before first slash: x.uicok.com:
path after authority: //mall.bilibili.com
query: oid=jianlai
```

Browsers tolerate the odd empty-port-like colon after the hostname and normalize the navigated URL to:

```text
http://x.uicok.com//mall.bilibili.com?oid=jianlai
```

The host remains:

```text
x.uicok.com
```

The Bilibili-looking part is only path text:

```text
//mall.bilibili.com
```

That means any checker that uses string matching such as "does this URL contain `bilibili.com`?" can be fooled. A correct checker would parse the URL first and inspect the normalized host/eTLD+1.

## Likely bypass logic

Based on the capture, the likely chain is:

1. User posts or opens a `b23.tv` shortlink.
2. Bilibili treats `b23.tv` as a trusted/internal shortlink domain.
3. The shortlink expands to a crafted `Location` containing `mall.bilibili.com`.
4. Some layer may see a Bilibili-owned-looking substring and allow in-app navigation.
5. Browser/network stack follows the URL according to URL parsing rules.
6. Real request goes to `x.uicok.com`.
7. `x.uicok.com` performs a plain `302` to the external Quark URL.

The decisive clue is that the Bilibili shortlink does not directly point to Quark. It points to a parser-confusing URL that hides the real external host in front of a Bilibili-looking path.

## Why this works visually

This string is visually noisy:

```text
http://x.uicok.com://mall.bilibili.com?oid=jianlai
```

People tend to notice:

```text
mall.bilibili.com
```

But URL parsers care about the authority immediately after the first `://`:

```text
http:// x.uicok.com: //mall.bilibili.com?oid=jianlai
```

After normalization, the destination host is still:

```text
x.uicok.com
```

So the trick is not that Bilibili is hosting the Quark page. It is that the URL contains a Bilibili-looking string in a non-host position.

## Observed browser resource inventory

Rendered page:

```text
https://pan.quark.cn/s/623ef942e474#/list/share
```

Observed assets after load:

```text
Total assets: 132
Scripts: 17
Stylesheets: 11
Images: 38
Other/API/beacon/iframe: 66
Inline SVGs: 5
```

Top observed hosts:

| Host | Count | Main role |
| --- | ---: | --- |
| `px.wpk.quark.cn` | 34 | telemetry / WPK beacon |
| `image.quark.cn` | 32 | images / animation data |
| `g.alicdn.com` | 27 | Quark web app scripts and CSS |
| `track.lc.quark.cn` | 6 | analytics collection |
| `pan.quark.cn` | 5 | page APIs |
| `uop.quark.cn` | 3 | login iframe/API |
| `drive-h.quark.cn` | 2 | share token/detail APIs |
| `fourier.taobao.com` | 2 | security / anti-bot resources |
| `127.0.0.1:9125-9130` | multiple | Quark desktop client probes |
| `fourier.alibaba.com` | 1 | security pixel |
| `at.alicdn.com` | 1 | icon font script |
| `broccoli-static.quark.cn` | 1 | static image |
| `yes-file.quark.cn` | 1 | shared file image |
| `beian.mps.gov.cn` | 1 | public security registration logo |
| `api-album.quark.cn` | 1 | search prefetch |
| `dw-data-channel.quark.cn` | 1 | data channel |

## Key Quark requests observed

Page configuration:

```text
https://pan.quark.cn/api/computerinfo?fr=pc&platform=pc
https://pan.quark.cn/api/config?fr=pc&platform=pc
https://pan.quark.cn/api/client_version?fr=pc&platform=pc
https://pan.quark.cn/api/dd_config?ids=1&fr=pc&platform=pc
```

Share token/detail:

```text
https://drive-h.quark.cn/1/clouddrive/share/sharepage/token?pr=ucpro&fr=pc&uc_param_str=
https://drive-h.quark.cn/1/clouddrive/share/sharepage/detail?pr=ucpro&fr=pc&uc_param_str=&ver=2&pwd_id=623ef942e474&stoken=...&pdir_fid=0&force=0&_page=1&_size=50&_fetch_banner=1&_fetch_share=1&fetch_relate_conversation=1&_fetch_total=1&_sort=file_type:asc,file_name:asc
```

Login iframe/API:

```text
https://uop.quark.cn/cas/custom/login?custom_login_type=mobile&client_id=532&display=pc&chkey=&spm_b=websharedetail&stats_extra=...
https://uop.quark.cn/cas/ajax/getTokenForQrcodeLogin?client_id=532&v=1.2&request_id=...
https://uop.quark.cn/cas/ajax/getServiceTicketByQrcodeToken?client_id=532&v=1.2&request_id=...&token=...
```

Desktop client probes:

```text
http://127.0.0.1:9125/desktop_share_visiting?pwd_id=623ef942e474&passcode=
http://127.0.0.1:9126/desktop_share_visiting?pwd_id=623ef942e474&passcode=
http://127.0.0.1:9127/desktop_share_visiting?pwd_id=623ef942e474&passcode=
http://127.0.0.1:9128/desktop_share_visiting?pwd_id=623ef942e474&passcode=
http://127.0.0.1:9129/desktop_share_visiting?pwd_id=623ef942e474&passcode=
http://127.0.0.1:9130/desktop_share_visiting?pwd_id=623ef942e474&passcode=
http://127.0.0.1:9125/desktop_info
http://127.0.0.1:9126/desktop_info
http://127.0.0.1:9127/desktop_info
http://127.0.0.1:9128/desktop_info
http://127.0.0.1:9129/desktop_info
http://127.0.0.1:9130/desktop_info
```

Security / anti-bot resources:

```text
https://g.alicdn.com/??/AWSC/AWSC/awsc.js,/sd/baxia-entry/baxiaCommon.js
https://g.alicdn.com/AWSC/et/1.83.41/et_f.js
https://g.alicdn.com/secdev/sufei_data/3.9.14/index.js
https://g.alicdn.com/AWSC/fireyejs/1.231.67/fireyejs.js
https://fourier.taobao.com/rp?...
https://fourier.taobao.com/ts?...
https://fourier.alibaba.com/ts?...
```

## Console observations

The rendered Quark page logged several environment checks:

```text
当前quantumIpc环境 [object] getIsPcNative: false
当前环境不是 PC 夸克浏览器
分享详情文件列表加载成功
填码成功
GET biz /desktop_share_visiting
```

Interpretation:

The Quark web app probes whether it is running inside a Quark desktop/native environment. It also repeatedly checks local loopback ports, probably looking for an installed desktop client.

This behavior is separate from the Bilibili-link bypass. It belongs to the final Quark landing page.

## What the capture proves

The capture proves:

- The `b23.tv` shortlink returns a `302` to a crafted ambiguous URL.
- The crafted URL contains `mall.bilibili.com` but actually resolves to `x.uicok.com`.
- `x.uicok.com` then redirects to Quark.
- The final Quark page loads normally and fetches its share detail via Quark APIs.

## What the capture does not prove

The capture does not prove:

- Which exact Bilibili client function allows the link.
- Whether the allow decision happens before or after shortlink expansion.
- Whether the rule is substring-based, domain-based, scheme-based, or a special-case trust rule for `b23.tv`.
- Whether the behavior is identical across Bilibili Android, iOS, web, and desktop.

Those would require client-specific testing with controlled variants and app-side observation.

## Defensive interpretation

A robust link checker should:

1. Follow redirects in a controlled environment.
2. Parse each `Location` using the same URL parser as the actual navigation stack.
3. Compare normalized hosts, not raw strings.
4. Reject or interstitial any URL where a trusted domain appears only in path/query/userinfo.
5. Treat ambiguous forms such as `host://trusted.example` as suspicious unless the parsed host is trusted.

The dangerous pattern in this sample is:

```text
trusted-looking domain appears in the URL string
actual parsed host is different
```

That is the core mechanism.
