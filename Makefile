.ONESHELL:

json:
	cd data
	bun install
	$(MAKE) combined.json

build:
	cd web
	bun install
	$(MAKE) build
