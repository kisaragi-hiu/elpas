.ONESHELL:

json:
	cd data
	bun install
	$(MAKE) combined.json

build:
	cd web
	bun install
	$(MAKE) build

dev:
	cd web
	bun install
	$(MAKE) dev
