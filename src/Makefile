objects= tokenizer.js main.js
target= app.min.js

all: $(objects)
	cat $(objects) > ../app.min.js

%.js: %.ts
	tsc $<