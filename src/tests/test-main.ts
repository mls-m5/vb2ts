

function compareList(a, memberName, b) {
	assert_eq(a.length, b.length, "Lists are not of same length");
	for (let i = 0; i < a.length, i < b.length; ++i) {
		// console.log("comparing " + a[i][memberName] + "with" + b[i]);
		assert_eq(a[i][memberName], b[i]);
	}
}

// declare function require(name:string);
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

function assert(x, message?: string) {
	if (!x) {
		console.log("Assert failed" + message? message: "");
		console.log(new Error().stack);
		++ raisedAssertionErrors;
	}
}

var raisedAssertionErrors: number;
var assertionResult = {};

function test_main() {
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
}