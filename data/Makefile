all: gnu.json nongnu.json org.json jcs.json

gnu.json:
	sh ./elpa-to-json gnu "https://elpa.gnu.org/packages/"

nongnu.json:
	sh ./elpa-to-json nongnu "https://elpa.nongnu.org/nongnu/"

org.json:
	sh ./elpa-to-json org "https://orgmode.org/elpa/"

# jcs-elpa also has its own archive.json format, but it has less information.
# on the other hand, it might be enough information already.
jcs.json:
	sh ./elpa-to-json jcs-elpa "https://jcs-emacs.github.io/jcs-elpa/packages/"
