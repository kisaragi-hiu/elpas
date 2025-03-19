all: gnu.json nongnu.json org.json

gnu.json:
	sh ./elpa-to-json gnu "https://elpa.gnu.org/packages/"

nongnu.json:
	sh ./elpa-to-json nongnu "https://elpa.nongnu.org/nongnu/"

org.json:
	sh ./elpa-to-json org "https://orgmode.org/elpa/"
