/// <reference path="jquery.d.ts" />
/// <reference path="interpreter.ts" />




$(document).ready( function(){
	var tokenizer = new Tokenizer();
	var interpreter = new Interpreter();

	var $vb_text = $("#vb_text");
	var $ts_text = $("#ts_text");
	var $structure_view = $("#structure_view");


	$vb_text.on("change keyup paste", function() {
		let tokens = tokenizer.tokenize($vb_text.val());

		let statements = interpreter.group(tokens);

		let output = "";

		interpreterContext.reset();

		for (let s of statements) {
			try {
				output += s.toString();
			}
			catch (e) {
				console.error(e);
			}
		}


		output = "\t" + output.split("\n").join("\n\t");
		// output = (output.replace("\n", "\n\t"));
		output = "class xx { \n " + output + "\n}";

		var wrap = function(text) {
			return '<div class="token">' + text + '</div>'

		}

		var drawStatement = function(statement: Token) {
			if (statement.isStatement) {
				let out = statement.getText() + ": ";
				for (let s of statement.statement().tokens) {
					out += drawStatement(s);
				}
				return wrap(out);
			}
			else {
				return wrap(statement.getText());
			}
		}

		$ts_text.val(output);


		let out2 = "";

		for (let s of statements) {
			try {
				out2 += drawStatement(s) + "<br>";
			}
			catch (e) {
				console.error(e);
			}
		}

		$structure_view.html(out2);
	});	
});
