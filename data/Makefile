combined.json: cache
	deno -A data.ts

cache: cache/gnu.json cache/nongnu.json cache/org.json cache/jcs.json

cache/gnu.json:
	sh ./elpa-to-json cache/gnu.json "https://elpa.gnu.org/packages/"

cache/nongnu.json:
	sh ./elpa-to-json cache/nongnu.json "https://elpa.nongnu.org/nongnu/"

cache/org.json:
	sh ./elpa-to-json cache/org.json "https://orgmode.org/elpa/"

cache/jcs.json:
	sh ./elpa-to-json cache/jcs-elpa.json "https://jcs-emacs.github.io/jcs-elpa/packages/"
