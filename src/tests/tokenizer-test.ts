/// <reference path="../tokenizer.ts" />


function compareList(a, memberName, b) {
	assert_eq(a.length, b.length, "Lists are not of same length");
	for (let i = 0; i < a.length, i < b.length; ++i) {
		// console.log("comparing " + a[i][memberName] + "with" + b[i]);
		assert_eq(a[i][memberName], b[i]);
	}
}

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




declare function require(name:string);
interface Error {
	stack: string;
}

function assert_eq(x, y, message?: string) {
	if (x != y) {
		console.log("Assert failed " + message? message: "");
		console.log("'" + x + "' not equal to '" + y + "'");
		console.log(new Error().stack);
		++ raisedAssertionErrors;
	}
}

function assert(x) {
	if (!x) {
		console.log("Assert failed");
		console.log(new Error().stack);
		++ raisedAssertionErrors;
	}
}

var raisedAssertionErrors: number;
var assertionResult = {};


console.log("\n\n======= Starting test suit ========\n");
for (let i in tests) {
	raisedAssertionErrors = 0;
	let test = tests[i];

	console.log("-------------- running test " + i + " ----------");
	test();

	if (raisedAssertionErrors) {
		assertionResult[i] = raisedAssertionErrors + " errors";
	}
	else {
		assertionResult[i] = "no errors";
	}
}

console.log("\n\n=======         Result      ========\n");

for (let i in assertionResult) {
	console.log(i + " : " + assertionResult[i]);
}