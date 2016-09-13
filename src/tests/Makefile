tests = tokenizer-test.js
objects = ../tokenizer.js



all: $(tests)


%.js: %.ts $(objects)
	tsc $< --out $@.tmp
	cat $@.tmp > $@
	rm $@.tmp