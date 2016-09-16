/// <reference path="interpreter.ts" />



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
	WithKeyword,

	VariableDeclarationGroup, //The touple [x] As [type]
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
	WithStatement,
	WithTarget,
	MemberName, //The combination of a period and a word
	MemberNameGroup, //A group that contains the member name
	WithMemberGroup, //A member group that is meant for a With-statement

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
	with: TokenType.WithKeyword,
});


var shorthandVariableTypes = Object.freeze({
	"%": "Integer",
	"&": "Long",
	"@": "Decimal",
	"!": "Single",
	"#": "Double",
	"$": "String",
});

function isShorthandSign(c) {
	return typeof shorthandVariableTypes[c] !== 'undefined';
}

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
	specifier: number; //A more specific type like  scope type

	textBefore: string;
	textAfter = "";
	text = "";
	rawText = ""; //With cases kept
	hasNewline = false;
	row = 0;
	col = 0;
	isStatement = false;

	constructor(public type = TokenType.Word) {
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

	wrap(text: string) {
		return this.textBefore + text + this.textAfter;
	}

	toString() {
		switch (this.type) {
			case TokenType.NewKeyword:
				return this.wrap(this.text);
			case TokenType.ScopeDeclaration:
				if (interpreterContext.currentScope == ScopeType.Class) {
					return this.textBefore;
				}
				else {
					return this.wrap("let");
				}
			case TokenType.NotKeyword:
				return this.textBefore + "!";
			case TokenType.SetKeyword:
				return this.wrap(""); //Hide the keyword, it is not the same in javascript
			default:
				// if (this.text == ".") {
				// 	return this.wrap("_with_tmp" + this.text);
				// }
				return this.wrap(this.rawText);;
		}
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
		return null;
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
	wrap(text: string) {
		return this.getBefore() + text + this.getAfter();
	}

	toString() {
		let text = "";

		switch (this.type) {
			case TokenType.EndStatement:
				interpreterContext.popScope();
				return this.wrap("}");
			case TokenType.IfStatement:
				interpreterContext.pushScope(ScopeType.Function);
				return this.getBefore() + "if (" + this.getByType(TokenType.Condition) + ") {" + this.getAfter();
			case TokenType.ElseStatement:
				return this.getBefore() + "else {" + this.getAfter();
			case TokenType.WithMemberGroup:
				return this.wrap(interpreterContext.currentWith.toString() + "." + this.getByType(TokenType.MemberName));
			case TokenType.VariableDeclarationGroup:
				return this.getBefore() + this.getByType(TokenType.DeclarationName) + ": " + this.getByType(TokenType.DeclarationType) + this.getAfter();
			case TokenType.FunctionDeclaration:
				interpreterContext.pushScope(ScopeType.Function);
				return this.front().textBefore + this.getByType(TokenType.FunctionName) + "" + this.getByType(TokenType.FunctionArguments).toString() + " {" + this.back().textAfter;
			case TokenType.WithStatement:
				interpreterContext.pushScope(ScopeType.With);
				interpreterContext.currentWith = this.getByType(TokenType.WithTarget);
				return this.wrap("{ let _with_tmp = " + this.getByType(TokenType.WithTarget) + ";");
			default:
				break;
		}

		for (let s of this.tokens) {
			text += s.toString();
		}
		return text;
	}
}


enum TokenizerState {
	None,
	Word,
	Space,
	Digit,
	Operators,
	Paranthesis,
};

var operators = "+-*/^.><=%@!#$&"; //Different special characters
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


	let firstCharacter = token.text[0];
	if (token.text.length > 0) {
		if (isDigit(firstCharacter)) {
			token.type = TokenType.Digit;
			return;
		}
		else if (token.text.length > 1 && firstCharacter == "." &&
			isDigit(token.text[1])) {
			token.type = TokenType.Digit;
			return;
		}
	}


	if (operators.indexOf(firstCharacter) >= 0) {
		token.type = TokenType.Operator;
		if (token.text == "=") {
			token.type = TokenType.EqualOperator;
		}
	}

}

function isDigit(character: string) {
	return !isNaN(parseInt(character));
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
					if (state = TokenizerState.Word) {
						//Continue to word if a word is already started
					}
					else {
						if (textAfter.length > 0) {
							pushToken();
						}
						if (state != TokenizerState.Digit && state != TokenizerState.Word && tokenText.length > 0) {
							pushToken();
						}
						let ti = i;
						while (isDigit(c) || c == ".") {
							tokenText += c;
							++col;
							++ti;
							c = text[ti];
						}
						i = ti - 1;
						// let nType = state == TokenizerState.Digit? TokenType.Digit: TokenType.Word;
						// pushToken().type = nType;
						continue; //Skip to the next iteration
					}
				default:
					//Se if there is any token to flush
					if (textAfter.length > 0) {
						pushToken();
					}
					//Then continue with the current token
					if (operators.indexOf(c) >= 0 || paranthesis.indexOf(c) >= 0) {
						if (tokenText.length > 0) {
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
}
