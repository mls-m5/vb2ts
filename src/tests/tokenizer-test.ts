/// <reference path="../tokenizer.ts" />
/// <reference path="test-main.ts" />


var tests = {
	simpleTest: function() {
		var tokenizer = new Tokenizer();
		let tokens = tokenizer.tokenize("  Dim   ");

		assert_eq(tokens.length, 1);
		assert_eq(tokens[0].textBefore, "  ");
		assert_eq(tokens[0].textAfter, "   ");
		assert_eq(tokens[0].text, "dim");
		assert_eq(tokens[0].rawText, "Dim");
	},

	digitTest: function() {
		var tokenizer = new Tokenizer();
		let tokens = tokenizer.tokenize("  a  0  .2 \n");
		
		compareList(tokens, "text", ["a", "0", ".2"]);
		assert_eq(tokens[2].textAfter, " \n");
		assert_eq(tokens[2].type, TokenType.Digit, "Wrong type on digit token");
	},

	assignmentOperatorTest: function() {
		var tokenizer = new Tokenizer();
		let tokens = tokenizer.tokenize(" i = 2 ");

		compareList(tokens, "type", [TokenType.Word, TokenType.EqualOperator, TokenType.Digit]);

	}
}


test_main();
