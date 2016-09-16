
/// <reference path="tokenizer.ts" />

enum ScopeType {
	Function,
	Class,
	Global,
	With,
	ArgumentList
}

class InterpreterContext {
	interpreterScopeStack: ScopeType[] = [];
	currentScope: ScopeType = ScopeType.Class;
	currentWith: Token;

	pushScope(scope: ScopeType) {
		this.interpreterScopeStack.push(this.currentScope);
		this.currentScope = scope;
	}

	//Pops the last scope and return to previous scope
	//The scope argument is optional, but can be checked
	//so that the right scope is popped
	popScope(scope?: ScopeType) {
		if (typeof scope === 'undefined') {
			if (this.interpreterScopeStack.length == 0) {
				throw "End statement but no scope to end: scope stack empty";
			}
			this.currentScope = this.interpreterScopeStack.pop();
		}
		else if (scope == this.currentScope) {
			this.currentScope = this.interpreterScopeStack.pop();
		}
		else {
			throw "wrong scope type expected type " + ScopeType[this.currentScope] + " got " + ScopeType[scope];
		}
	}
}

var interpreterContext = new InterpreterContext();


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

			for (let i = 0; i < tokens.length - 1; ++i) {
				if (tokens[i].text == "." && tokens[i + 1].type == TokenType.Word) {
					let group = new Statement();
					group.type = TokenType.MemberNameGroup;
					tokens[i + 1].type = TokenType.MemberName;
					group.tokens = tokens.splice(i, 2, group);
				}
			}

			//Check how witch statements is ment to be to a With-statement
			//that is if there is no name before the dot
			if (tokens[0].type == TokenType.MemberNameGroup) {
				tokens[0].type = TokenType.WithMemberGroup;
			}


			//The same as above but for the whole statement
			for (let i = 1; i < tokens.length; ++i) {
				if (tokens[i].type == TokenType.MemberNameGroup) {
					//Todo: Differentiate between ordinary member groups and with groups
					let tokenBefore = tokens[i - 1];
					if (tokenBefore.type == TokenType.Operator || tokenBefore.text == "(" || tokenBefore.text == ",") {
						tokens[i].type = TokenType.WithMemberGroup;
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

			for (let i = 1; i < tokens.length -1; ++i) {
				if (tokens[i].type == TokenType.AsKeyword) {
					let group = new Statement();
					group.type = TokenType.VariableDeclarationGroup;
					group.tokens = tokens.splice(i - 1, 3, group);
				}
			}

			if (statement.type == TokenType.VariableDeclaration || statement.type == TokenType.FunctionArguments) {
				for (let i = 1; i < tokens.length; ++i) {
					if (isShorthandSign(tokens[i].text)) {
						let group = new Statement();
						tokens[i].type = TokenType.DeclarationType;
						tokens[i].rawText = shorthandVariableTypes[tokens[i].text]; //Replace the type to the actual type
						tokens[i - 1].type = TokenType.DeclarationName;
						group.type = TokenType.VariableDeclarationGroup;
						group.tokens = tokens.splice(i - 1, 2, group);
					}
				}
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