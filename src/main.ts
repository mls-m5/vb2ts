/// <reference path="jquery.d.ts" />
/// <reference path="tokenizer.ts" />

$(document).ready( function(){
	var tokenizer = new Tokenizer();

	var $vb_text = $("#vb_text");
	var $ts_text = $("#ts_text");
	var $structure_view = $("#structure_view");


	$vb_text.on("change keyup paste", function() {
		let tokens = tokenizer.tokenize($vb_text.val());

		let statements = tokenizer.group(tokens);

		let output = "";

		for (let s of statements) {
			output += s.toString() + " ";
		}

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
			out2 += drawStatement(s) + "<br>";
		}

		$structure_view.html(out2);
	});	
});
