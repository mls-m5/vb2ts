objects= tokenizer.js main.js
target= app.min.js

.PHONY: tests

all: $(objects) tests
	cat $(objects) > ../app.min.js

%.js: %.ts
	tsc $<

tests:
	make -C tests