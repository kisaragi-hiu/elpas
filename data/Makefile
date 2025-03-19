all: gnu.json nongnu.json org.json jcs.json

gnu.json:
	sh ./elpa-to-json gnu.json "https://elpa.gnu.org/packages/"

nongnu.json:
	sh ./elpa-to-json nongnu.json "https://elpa.nongnu.org/nongnu/"

org.json:
	sh ./elpa-to-json org.json "https://orgmode.org/elpa/"

jcs.json:
	sh ./elpa-to-json jcs-elpa.json "https://jcs-emacs.github.io/jcs-elpa/packages/"
