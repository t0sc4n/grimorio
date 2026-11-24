# Scarica i font di Grimorio (licenza SIL OFL) per servirli dal proprio server, senza passare da Google.
import re, sys, os, urllib.request
out = sys.argv[1]
os.makedirs(os.path.join(out, "fonts"), exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
url = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Alegreya+Sans:wght@400;500;700;800&display=swap"
css = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})).read().decode()
blocks = re.findall(r"/\* ([a-z-]+) \*/\s*(@font-face \{.*?\})", css, re.S)
keep = []
for subset, block in blocks:
    if subset not in ("latin", "latin-ext"):
        continue
    fam = re.search(r"font-family: '([^']+)'", block).group(1)
    weight = re.search(r"font-weight: (\d+)", block).group(1)
    src = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
    name = f"{fam.replace(' ', '')}-{weight}-{subset}.woff2"
    data = urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": UA})).read()
    open(os.path.join(out, "fonts", name), "wb").write(data)
    keep.append(f"/* {fam} {weight} {subset} */\n" + block.replace(src, "/fonts/" + name))
    print(name, len(data))
open(os.path.join(out, "fonts.css"), "w", encoding="utf-8").write("/* Font Cinzel Decorative e Alegreya Sans, licenza SIL Open Font License 1.1 */\n" + "\n".join(keep) + "\n")
print("fonts.css:", len(keep), "varianti")
