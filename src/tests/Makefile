tests = tokenizer-test.js interpreter-test.js
objects = ../tokenizer.js test-main.js



all: $(tests)


%.js: %.ts
	tsc $< --out $@.tmp
	cat $@.tmp > $@
	rm $@.tmp