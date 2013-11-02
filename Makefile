SOURCES = lib/mp4.js lib/dataview.js lib/genres.js lib/reader.js
PRELUDE = common/prelude.js
POSTLUDE = common/postlude.js

all: clobber dist

clobber:
	@rm -f dist/mp4.js

dist: dist/mp4.js mp4.min.js

mp4.min.js: dist/mp4.js
	node_modules/.bin/uglifyjs $< --comments -o $@

dist/mp4.js:
	@cat ${PRELUDE} ${SOURCES} ${POSTLUDE} > $@
	
