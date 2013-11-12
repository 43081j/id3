SOURCES = lib/mp4.js node_modules/dataview-extra/dist/dataview-extra.js lib/genres.js node_modules/readerjs/lib/reader.js
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
	
