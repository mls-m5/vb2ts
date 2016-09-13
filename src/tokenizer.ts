
enum TokenType {
	None = 0,
	Word,
	Digit,
	Operator,
	Line,
	Paranthesis,
	Brackets,
	Braces,
	VariableDeclaration,
	PrivateDefinition,
	ScopeDeclaration,
	FunctionKeyword,
	MethodKeyword,
	LoopKeyword,
	ToKeyword,
	EndKeyword,
	AsKeyword,
	IfKeyword,
	ThenKeyword,
	ElseKeyword,
	EqualOperator,
	NotKeyword,
	SetKeyword,
	NewKeyword,
	RedimKeyword,

	ParanthesisGroup,
	FunctionArguments, //A special case of a paranthesis group
	Condition,
	FunctionDeclaration,
	Assignment,
	AssignmentTarget,
	MethodArguments,
	Loop,
	EndStatement,
	IfStatement,
	ElseStatement,
	MethodCall,
	DeclarationType,
	DeclarationName,

	//Name of higher analysis
	FunctionName,
	VariableName
}

//Lowercase because they are compared in lowercase
var ScopeTypes = Object.freeze ({
	dim: 0,
	private: 1,
	public: 2,
	protected: 3,
	static: 4
});

var LoopTypes = Object.freeze({
	"for": 0,
	"while": 1
});

var Keywords = Object.freeze({
	as: TokenType.AsKeyword,
	to: TokenType.ToKeyword,
	sub: TokenType.MethodKeyword,
	function: TokenType.FunctionKeyword,
	end: TokenType.EndKeyword,
	if: TokenType.IfKeyword,
	then: TokenType.ThenKeyword,
	else: TokenType.ElseKeyword,
	"=": TokenType.EqualOperator,
	not: TokenType.NotKeyword,
	set: TokenType.SetKeyword,
	new: TokenType.NewKeyword,
	redim: TokenType.RedimKeyword,
});

enum BlockType {
	Class,
	Function,
	Module,
}

class CodeContext {
	constructor(public type: BlockType) {
	}
}

var classContext = new CodeContext(BlockType.Class);
var functionContext = new CodeContext(BlockType.Function);
var moduleContext = new CodeContext(BlockType.Module);

class Token {
	type: TokenType = TokenType.Word;
	specifier: number; //A more specific type like  scope type

	textBefore: string;
	textAfter = "";
	text = "";
	rawText = ""; //With cases kept
	hasNewline = false;
	row = 0;
	col = 0;
	isStatement = false;

	constructor() {

	}

	statement() {
		if (this.isStatement) {
			return <Statement><any>this;
		}
		else {
			return null;
		}
	}

	setText(text: string) {
		this.rawText = text;
		this.text = text.toLowerCase();
	}

	getText() {
		let text = this.rawText;
		if (this.type && this.type != TokenType.Word) {
			text = "[" + TokenType[this.type] + "] " + text;
		}
		if (this.hasNewline) {
			text += "⏎";
		}
		return text;
	}

	toString() {
		return this.textBefore + this.rawText + this.textAfter;
	}
}

class Statement extends Token {
	isStatement = true;
	tokens: Token[] = [];

	getByType(type: TokenType) {
		for (let t of this.tokens) {
			if (t.type == type) {
				return t;
			}
		}
	}

	constructor(statement?: Statement) {
		super();

		if (statement) {
			this.tokens = statement.tokens;
			this.isStatement = statement.isStatement;
		}
	}

	back() {
		return this.tokens[this.tokens.length - 1];
	}

	front() {
		return this.tokens[0];
	}
	getBefore() {
		return this.front().textBefore;
	}
	getAfter() {
		return this.back().textAfter;
	}

	toString() {
		let text = "";

		switch (this.type) {
			case TokenType.EndStatement:
				return this.getBefore() +  "}" + this.getAfter();
			case TokenType.IfStatement:
				return this.getBefore() + "if (" + this.getByType(TokenType.Condition) + ")" + this.getAfter();
			case TokenType.ElseStatement:
				return this.getBefore() + "else {" + this.getAfter();
			default:
				break;
		}

		for (let s of this.tokens) {
			text += s.toString();
		}
		return text;
	}
}

class VariableDeclaration extends Statement {
	type = TokenType.VariableDeclaration;
	scope: Token;

	constructor(statement: Statement) {
		super(statement);
	}

	toString() {
		return this.getBefore() + this.getByType(TokenType.DeclarationName).toString() + ": " + this.getByType(TokenType.DeclarationType) + this.getAfter();
	}
}

class FunctionDeclaration extends Statement {
	type = TokenType.FunctionDeclaration;
	scope: Token;

	constructor(statement: Statement) {
		super(statement);
	}

	toString() {
		//Todo: Add arguments
		return this.front().textBefore + this.getByType(TokenType.FunctionName) + "" + this.getByType(TokenType.FunctionArguments).toString() + " {" + this.back().textAfter;
	}

}


class FunctionCall {

}

enum TokenizerState {
	None,
	Word,
	Space,
	Digit,
	Operators,
	Paranthesis,
};

var operators = "+-*/^.><="; //Different special characters
var paranthesis = "()[]";

function setKeywordType(token: Token) {
	for (let scopeType in ScopeTypes) {
		if (token.text == scopeType) {
			token.type = TokenType.ScopeDeclaration;
			token.specifier = ScopeTypes[scopeType];
			return;
		}
	}

	for (let loopType in LoopTypes) {
		if (token.text == loopType) {
			token.type = TokenType.LoopKeyword;
			token.specifier = LoopTypes[loopType];
			return;
		}
	}

	let type = Keywords[token.text];
	if (type) {
		token.type = type;
		return;
	}
}

class Tokenizer {
	tokenize(text: string) {
		let state = TokenizerState.Space;
		let tokens: Token[] = [];

		let textBefore = "";
		let tokenText = "";
		let textAfter = "";
		let row = 1;
		let col = 1;

		let pushToken = function() {
			let token = new Token();
			token.textBefore = textBefore;
			token.textAfter = textAfter;
			token.setText(tokenText);
			switch(state) {
				case TokenizerState.Digit:
					token.type = TokenType.Digit;
					break;
				case TokenizerState.Word:
					token.type = TokenType.Word;
					break;
				case TokenizerState.Operators:
					token.type = TokenType.Operator;
					break;
			}
			setKeywordType(token);

			tokens.push(token);
			textBefore = "";
			textAfter = "";
			tokenText = "";
			state = TokenizerState.None;
			return token;
		}

		let getBackToken = function() {
			return tokens[tokens.length - 1];
		}

		for (let i = 0; i < text.length; ++i) {
			let c = text[i];
			switch (c) {
				case "\n":
				if (tokenText.length > 0) {
					textAfter += c;
					pushToken();
					getBackToken().hasNewline = true;
					row ++;
					col = 1;
				}
				case " ":
				case "\t":
					if (tokenText.length > 0) {
						textAfter += c;
					}
					else {
						textBefore += c;
					}
					break;
				case "0":
				case "1":
				case "2":
				case "3":
				case "4":
				case "5":
				case "6":
				case "7":
				case "8":
				case "9":
				case ".":
					if (textAfter.length > 0) {
						pushToken();
					}
					if (state != TokenizerState.Digit && state != TokenizerState.Word && tokenText.length > 0) {
						pushToken();
					}
					let ti = i;
					while (!isNaN(parseInt(c)) || c == ".") {
						tokenText += c;
						++col;
						++ti;
						c = text[ti];
					}
					i = ti - 1;
					// let nType = state == TokenizerState.Digit? TokenType.Digit: TokenType.Word;
					// pushToken().type = nType;
					continue; //Skip to the next iteration
				default:
					//Se if there is any token to flush
					if (textAfter.length > 0) {
						pushToken();
					}
					//Then continue with the current token
					if (operators.indexOf(c) >= 0 || paranthesis.indexOf(c) >= 0) {
						if (tokenText.length >= 0) {
							pushToken();
						}
						tokenText += c;
						state = TokenizerState.Operators;
					}
					else {
						//This is to make sure that the last spaces/newlines will follow the token
						if (state == TokenizerState.Operators) {
							pushToken().type = TokenType.Operator;
						}
						state == TokenizerState.Word;
						tokenText += c;
					}
					break;
			}
			++col;
		}

		if (tokenText.length > 0) {
			pushToken();
		}

		return tokens;
	}

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
				statement = new VariableDeclaration(statement);

				if (statement.tokens.length > 1) {
					let t = statement.tokens[1];
					if (t.type == TokenType.FunctionKeyword || t.type == TokenType.MethodKeyword) {
						statement = new FunctionDeclaration(statement);
						statement.tokens[2].type = TokenType.FunctionName;
						if (tokens[3].type == TokenType.ParanthesisGroup) {
							tokens[3].type = TokenType.FunctionArguments;
						}
					}
				}
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
			else if (statement.tokens.length > 2 && statement.tokens[0].type == TokenType.Word && statement.tokens[0].type == TokenType.EqualOperator) {
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
				try {
					currentStatement = this.processStatement(currentStatement); //Process the statement
				} catch(e) {
					console.error(e);
				}
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