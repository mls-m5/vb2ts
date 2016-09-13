
/// <reference path="tokenizer.ts" />



class Interpreter {

	processStatement(statement: Statement) {
		if (statement.isStatement) {
			let tokens = statement.tokens;
			//First group by paranthesis
			for (let i = tokens.length -1; i >= 0; --i) {
				if (tokens[i].text == "(") {
					for (let j = i + 1; j < tokens.length; ++j) {
						if (tokens[j].text == ")") {
							let group = new Statement();
							group.type = TokenType.ParanthesisGroup;
							group.tokens = tokens.splice(i, j-i+1, group);
							break;
						}
					}
				}
			}


			for (let i = 0; i < tokens.length; ++i) {
				if (tokens[i].type == TokenType.AsKeyword && statement.tokens.length > (i + 1)) {
					tokens[i+1].type = TokenType.DeclarationType;
					if (i > 0 && tokens[i-1].type == TokenType.Word) {
						tokens[i-1].type = TokenType.DeclarationName;
					}
				}
			}

			let first = statement.tokens[0];
			//Checking for variable declarations
			if (first.type == TokenType.ScopeDeclaration) {
				// statement = new VariableDeclaration(statement);
				statement.type = TokenType.VariableDeclaration;

				if (statement.tokens.length > 1) {
					let t = statement.tokens[1];
					if (t.type == TokenType.FunctionKeyword || t.type == TokenType.MethodKeyword) {
						// statement = new FunctionDeclaration(statement);
						statement.type = TokenType.FunctionDeclaration;
						statement.tokens[2].type = TokenType.FunctionName;
						if (tokens[3].type == TokenType.ParanthesisGroup) {
							tokens[3].type = TokenType.FunctionArguments;
						}
					}
				}
			}
			else if (first.type == TokenType.WithKeyword) {
				statement.type = TokenType.WithStatement;
				tokens[1].type = TokenType.WithTarget;
			}
			else if(first.type == TokenType.EndKeyword) {
				statement.type = TokenType.EndStatement;
			}
			else if(first.type == TokenType.ElseKeyword) {
				statement.type = TokenType.ElseStatement;
			}
			else if (first.type == Keywords.set) {
				statement.type = TokenType.Assignment;
				statement.tokens[1].type = TokenType.AssignmentTarget;
			}
			else if (first.text == "for") {
				statement.type = TokenType.Loop;
			}
			else if (first.type == TokenType.Word && statement.tokens.length > 1 &&
				(statement.tokens[1].type == TokenType.Word || statement.tokens[1].type == TokenType.Digit)) {
				statement.type = TokenType.MethodCall;
				first.type = TokenType.FunctionName;

				let args = new Statement();
				args.type = TokenType.MethodArguments;
				args.tokens = statement.tokens.splice(1, statement.tokens.length - 1, args);			
			}
			else if (first.type == TokenType.IfKeyword) {
				statement.type = TokenType.IfStatement;
				for (let i = 1; i < statement.tokens.length; ++i) {
					if (statement.tokens[i].type == TokenType.ThenKeyword) {
						let condition = new Statement();
						condition.type = TokenType.Condition;
						condition.tokens = statement.tokens.splice(1, i - 1, condition);
						break;
					}
				}
			}
			else if (statement.tokens.length > 3 && statement.type != TokenType.Condition && statement.getByType(TokenType.EqualOperator)) {
				statement.type = TokenType.Assignment;
			}

		}
		return statement;
	}

	group(tokens: Token[]) {
		let currentStatement: Statement = new Statement();
		let statements: Statement[] = [];
		
		for (let i in tokens) {
			let t = tokens[i];
			currentStatement.type = TokenType.Line;
			currentStatement.tokens.push(t);
			if (t.hasNewline) {
				currentStatement.textAfter = t.textAfter;
				currentStatement.hasNewline = true;
				t.textAfter = "";
				t.hasNewline = false;
				// try {
					currentStatement = this.processStatement(currentStatement); //Process the statement
				// } catch(e) {
					// console.error(e);
				// }
				statements.push(currentStatement);
				currentStatement = new Statement();
			}
		}

		if (currentStatement.tokens.length > 0) {
			statements.push(currentStatement);
		}
		return statements;
	}
}