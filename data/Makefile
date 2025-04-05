node_modules: package.json
	bun install

# I don't know if finder-known-keywords has another definition elsewhere that
# isn't just finder.el itself. This script we're calling here simply takes Emacs
# to read finder.el and write it out to JSON, which is messy but... works fine.
#
# As long as you know how it works.
finder-known-keywords.json:
	sh ./fetch-finder-known-keywords

combined.json: cache node_modules
	bun collectData.ts

cache: cache/gnu.json cache/nongnu.json cache/jcs.json

cache/gnu.json:
	sh ./elpa-to-json cache/gnu.json "https://elpa.gnu.org/packages/"

cache/nongnu.json:
	sh ./elpa-to-json cache/nongnu.json "https://elpa.nongnu.org/nongnu/"

cache/jcs.json:
	sh ./elpa-to-json cache/jcs-elpa.json "https://jcs-emacs.github.io/jcs-elpa/packages/"
