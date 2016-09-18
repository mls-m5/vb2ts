
/// <reference path="tokenizer.ts" />

enum ScopeType {
	Function,
	Class,
	Global,
	With,
	ArgumentList,
	Condition,
}

class InterpreterContext {
	interpreterScopeStack: ScopeType[] = [];
	currentScope: ScopeType = ScopeType.Class;
	currentWith: Token;
	classVariables = {};
	localVariables = {};
	caseCount = 0; //A counter for the select case statements to add a break after each select case

	reset() {
		this.currentWith = null;
		this.interpreterScopeStack = [];
		this.currentScope = ScopeType.Class;
		this.classVariables = {};
		this.localVariables = {};
	}

	//Change the scope without pushing
	setScope(scope: ScopeType) {
		this.currentScope = scope;
	}

	declareVariable(name: string, token: Token) {
		if (this.currentScope == ScopeType.Class) {
			this.classVariables[name] = token;
		}
		else {
			this.localVariables[name] = token;
		}
	}

	pushScope(scope: ScopeType) {
		this.interpreterScopeStack.push(this.currentScope);
		this.currentScope = scope;
	}

	isClassVariable(name: string) {
		if (typeof this.classVariables[name] !== 'undefined') {
			if (typeof this.localVariables[name] === 'undefined') {
				return true;
			}
		}
		return false;
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

		//Remove all local variables
		if (this.currentScope == ScopeType.Class) {
			this.localVariables = {};
		}
	}
}

var interpreterContext = new InterpreterContext();


class Interpreter {
	processStatement(statement: Statement, context = new InterpreterContext) {
		if (statement.isStatement) {
			let tokens = statement.tokens;


			for (let i = 0; i < tokens.length; ++i) {
				if (tokens[i].text == "'") {
					let commentStatement = new Statement(TokenType.CommentStatement);
					tokens[i].type = TokenType.CommentKeyword;
					commentStatement.tokens = tokens.splice(i, tokens.length - i, commentStatement);
					break;
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

			//by paranthesis
			for (let i = tokens.length -1; i >= 0; --i) {
				if (tokens[i].text == "(") {
					for (let j = i + 1; j < tokens.length; ++j) {
						if (tokens[j].text == ")") {
							let group = new Statement();
							group.type = TokenType.ParanthesisGroup;
							group.setTokens(tokens.splice(i, j-i+1, group));
							break;
						}
					}
				}
			}

			for (let i = 0; i < tokens.length - 1; ++i) {
				if (tokens[i].text == "." && tokens[i + 1].type == TokenType.Word) {
					let group = new Statement();
					group.type = TokenType.MemberNameGroup;
					tokens[i + 1].type = TokenType.MemberName;
					group.setTokens(tokens.splice(i, 2, group));
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
						statement.type = TokenType.FunctionDeclaration;
						statement.tokens[2].type = TokenType.FunctionName;
						if (tokens[3].type == TokenType.ParanthesisGroup) {
							tokens[3].type = TokenType.FunctionArguments;
						}
					}
				}
			}
			if (first.type == TokenType.FunctionKeyword || first.type == TokenType.MethodKeyword) {
				statement.type = TokenType.FunctionDeclaration;
				statement.tokens[1].type = TokenType.FunctionName;
				if (tokens[2].type == TokenType.ParanthesisGroup) {
					tokens[2].type = TokenType.FunctionArguments;
				}
			}
			else if (tokens.length == 1 && first.type == TokenType.Word || first.type == TokenType.Identifier) {
				statement.type = TokenType.MethodCall;
				first.type = TokenType.FunctionName;
				let argStatement = new Statement(TokenType.MethodArguments);
				tokens.push(argStatement);
			}
			else if (first.type == TokenType.CallKeyword) {
				statement.type = TokenType.CallStatement;
				statement.tokens[1].type = TokenType.FunctionName;
			}
			else if (first.type == TokenType.SelectKeyword) {
				//Just assuming that the token[1] is case as in "Select Case"
				statement.type = TokenType.SelectCaseStatement;
				if (tokens.length < 3) {
					throw "invalid select case usage: " + statement.toString();
				}
				tokens[2].type = TokenType.SelectCaseTarget;
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
				statement.type = TokenType.ForLoop;
				tokens[1].type = TokenType.ForVariableName;
				for (let i = 2; i < tokens.length -1; ++i) {
					if (tokens[i].type == TokenType.EqualOperator) {
						tokens[i + 1].type = TokenType.ForStart;
					}
					else if (tokens[i].type == TokenType.ToKeyword) {
						tokens[i + 1].type = TokenType.ForStop;
					}
					else if (tokens[i].type == TokenType.StepKeyword) {
						tokens[i + 1].type = TokenType.ForStep;
					}
				}
			}
			else if (first.type == TokenType.Word && statement.tokens.length > 1 &&
				(statement.tokens[1].type == TokenType.Word || statement.tokens[1].type == TokenType.Digit)) {
				statement.type = TokenType.MethodCall;
				first.type = TokenType.FunctionName;

				let args = new Statement();
				args.type = TokenType.MethodArguments;
				args.setTokens(statement.tokens.splice(1, statement.tokens.length - 1, args));			
			}
			else if (first.type == TokenType.IfKeyword) {
				statement.type = TokenType.IfStatement;
				for (let i = 1; i < statement.tokens.length; ++i) {
					if (statement.tokens[i].type == TokenType.ThenKeyword) {
						let condition = new Statement();
						condition.type = TokenType.Condition;
						condition.setTokens(statement.tokens.splice(1, i - 1, condition));
						break;
					}
				}
			}
			else if (first.type == TokenType.OptionKeyword) {
				statement.type = TokenType.OptionStatement;
			}
			else if (first.type == TokenType.CaseKeyword) {
				if (tokens[1].type == TokenType.ElseKeyword) {
					statement.type = TokenType.CaseElseStatement;
				}
				else {
					statement.type = TokenType.CaseStatement;
				}

			}
			else if (first.type == TokenType.ExitKeyword) {
				statement.type = TokenType.ExitStatement;
			}
			else if (statement.tokens.length > 2 && statement.type != TokenType.Condition && statement.getByType(TokenType.EqualOperator)) {
				statement.type = TokenType.Assignment;
			}
			else if(first.type == TokenType.NextKeyword) {
				statement.type = TokenType.NextStatement;
			}
			var groupDeclarations = function(tokens: Token[]) {
				for (let i = 1; i < tokens.length -1; ++i) {
					if (tokens[i].type == TokenType.AsKeyword) {
						let group = new Statement();
						group.type = TokenType.VariableDeclarationGroup;
						group.setTokens(tokens.splice(i - 1, 3, group));
					}
				}
				for (let i = 1; i < tokens.length; ++i) {
					if (isShorthandSign(tokens[i].text)) {
						let group = new Statement();
						tokens[i].type = TokenType.DeclarationType;
						// tokens[i].rawText = shorthandVariableTypes[tokens[i].text]; //Replace the type to the actual type
						tokens[i - 1].type = TokenType.DeclarationName;
						group.type = TokenType.VariableDeclarationGroup;
						group.setTokens(tokens.splice(i - 1, 2, group));
					}
				}
			}

			if (statement.type == TokenType.FunctionDeclaration) {
				let args = statement.getByType(TokenType.FunctionArguments);
				if (args && args.isStatement) {
					let argsStatement = <Statement><any>args;
					groupDeclarations(argsStatement.tokens);
				}
			}

			if (statement.type == TokenType.VariableDeclaration) {

				groupDeclarations(tokens);
				for (let i = 1; i < tokens.length - 1; ++i) {
					if (tokens[i].type == TokenType.Coma) {
						tokens[i].type = TokenType.DeclarationSeparator;
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
			currentStatement = this.processStatement(currentStatement);
			statements.push(currentStatement);
		}
		return statements;
	}
}