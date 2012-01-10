SRC_DIR = src

build: $(SRC_FILES)
	cd $(SRC_DIR); node /usr/local/lib/node_modules/requirejs/bin/r.js -o name=fits optimize=none out=../fits.js baseUrl=.; cd - 

