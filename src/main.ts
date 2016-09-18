/// <reference path="jquery.d.ts" />
/// <reference path="interpreter.ts" />




$(document).ready( function(){
	//From http://stackoverflow.com/questions/6637341/use-tab-to-indent-in-textarea
	var textareas = document.getElementsByTagName('textarea');
	var count = textareas.length;
	for(var i=0;i<count;i++){
	    textareas[i].onkeydown = function(e){
	        if(e.keyCode==9 || e.which==9){
	            e.preventDefault();
	            var s = this.selectionStart;
	            this.value = this.value.substring(0,this.selectionStart) + "\t" + this.value.substring(this.selectionEnd);
	            this.selectionEnd = s+1; 
	        }
	    }
	}

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
