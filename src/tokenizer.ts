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
	Coma,
	ExitKeyword,
	OptionKeyword,
	ExplicitKeyword,
	StepKeyword,
	NextKeyword,
	CommentKeyword,
	AndKeyword,
	OrKeyword,
	MeKeyword,
	CallKeyword,
	SelectKeyword,
	CaseKeyword,
	NothingKeyword,
	ChrFunctionName,

	VariableDeclarationGroup, //The touple [x] As [type]
	ParanthesisGroup,
	FunctionArguments, //A special case of a paranthesis group
	Condition,
	FunctionDeclaration,
	Assignment,
	AssignmentTarget,
	MethodArguments,
	ForLoop,
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
	DeclarationSeparator, //The coma between variable declarations
	ExitStatement,
	OptionStatement,
	NextStatement,
	CommentStatement,
	Identifier,
	CallStatement,
	SelectCaseStatement,
	SelectCaseTarget,
	CaseStatement,
	CaseElseStatement,

	ForStart,
	ForStop,
	ForStep,
	ForVariableName,

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

function isNumeric(num){
    return !isNaN(num)
}

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
	",": TokenType.Coma,
	exit: TokenType.ExitKeyword,
	option: TokenType.OptionKeyword,
	explicit: TokenType.ExplicitKeyword,
	step: TokenType.StepKeyword,
	next: TokenType.NextKeyword,
	"'": TokenType.CommentKeyword,
	and: TokenType.AndKeyword,
	or: TokenType.OrKeyword,
	me: TokenType.MeKeyword,
	call: TokenType.CallKeyword,
	select: TokenType.SelectKeyword,
	case: TokenType.CaseKeyword,
	nothing: TokenType.NothingKeyword,
	chr: TokenType.ChrFunctionName,
});

var keywordTranslations = {
};

function setTranslation(original: string, target: string) {
	keywordTranslations[Keywords[original]] = target;
}
setTranslation("nothing", "null");
setTranslation("else", "} else {");
setTranslation("not", "!");
setTranslation("if", "if"); //For the lower case
setTranslation("new", "new");
setTranslation("'", "//");
setTranslation("and", "&&");
setTranslation("or", "||");
setTranslation("me", "this");
setTranslation("chr", "String.fromCharCode");

var shorthandVariableTypes = Object.freeze({
	"%": "Integer",
	"&": "Long",
	"@": "Decimal",
	"!": "Single",
	"#": "Double",
	"$": "String",
});

var typeTranslation = Object.freeze({
	"integer": "number",
	"long": "number",
	"decimal": "number",
	"single": "number",
	"double": "number",
	"string": "string",
	"boolean": "boolean",
	"byte": "number",

	"%": "number",
	"&": "number",
	"@": "number",
	"!": "number",
	"#": "number",
	"$": "string",
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
		let translation = keywordTranslations[this.type];
		if (typeof translation !== 'undefined') {
			return this.wrap(translation);
		}

		switch (this.type) {
			// case TokenType.NewKeyword:
			// 	return this.wrap(this.text);
			case TokenType.ScopeDeclaration:
				if (this.specifier == ScopeTypes.static) {
					return this.wrap("// Static type not supported implement in other way : ");
				}
				else if (interpreterContext.currentScope == ScopeType.Class) {
					return this.textBefore;
				}
				else {
					return this.wrap("let");
				}
			// case TokenType.CommentKeyword:
			// 	return this.wrap("//");
			// case TokenType.NotKeyword:
			// 	return this.textBefore + "!";
			// case TokenType.MeKeyword:
			// 	return this.wrap("this");	
			case TokenType.SetKeyword:
				return this.textBefore;
				// return this.wrap(""); //Hide the keyword, it is not the same in javascript
			case TokenType.CallKeyword:
				return this.textBefore;
			case TokenType.CaseKeyword:
				if (interpreterContext.caseCount++ > 0) {
					//Add breaka statement if it is not the first case statement in the switch
					return this.wrap("break;" + this.textBefore + "case");
				}
				else {
					return this.wrap("case");
				}
			case TokenType.DeclarationType:
				let t = typeTranslation[this.text];
				if (t) {
					return this.wrap(t);
				}
				else {
					return this.wrap(this.rawText);
				}
			case TokenType.DeclarationSeparator:
				if (interpreterContext.currentScope == ScopeType.Class) {
					return this.wrap(";");
				}
				else return this.wrap(this.rawText);
			case TokenType.Word:
				if (interpreterContext.isClassVariable(this.text)) {
					return this.wrap("this." + this.rawText);
				}
				else {
					return this.wrap(this.rawText);
				}
			case TokenType.EqualOperator:
				if (interpreterContext.currentScope == ScopeType.Condition) {
					return this.wrap("==");
				}
				else {
					return this.wrap(this.rawText);
				}
			// case TokenType.AndKeyword:
			// 	return this.wrap("&&");
			// case TokenType.OrKeyword:
			// 	return this.wrap("||");
			default:
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

	constructor(type = TokenType.Word) {
		super(type);
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
	wrap(text: string, semicolon = false) {
		let colontext = semicolon?";":"" ;
		return this.getBefore() + text + colontext + this.getAfter();
	}
	setTokens(tokens: Token[]) {
		this.tokens = tokens;
		// this.textBefore = this.front().textBefore;
		// this.front().textBefore = "";

		// this.textAfter = this.back().textAfter;
		// this.back().textAfter = "";
	}

	toString() {
		let text = "";

		switch (this.type) {
			case TokenType.EndStatement:
				interpreterContext.popScope();
				return this.wrap("}");
			case TokenType.IfStatement:
				interpreterContext.pushScope(ScopeType.Condition);
				//Evaluate the conditions string in "Condition"-context so that
				//it will have double = instead of single
				let conditionText = this.getByType(TokenType.Condition).toString();

				interpreterContext.setScope(ScopeType.Function); //Set the scope without pushing a new one
				return this.wrap("if (" + conditionText + ") {");
			case TokenType.ElseStatement:
				return this.wrap("} else {");
			case TokenType.WithMemberGroup:
				// return this.wrap(interpreterContext.currentWith.toString() + "." + this.getByType(TokenType.MemberName));
				return this.wrap("_with_tmp." + this.getByType(TokenType.MemberName));
			case TokenType.VariableDeclarationGroup:
				let variableNameToken = this.getByType(TokenType.DeclarationName);
				interpreterContext.declareVariable(variableNameToken.text, this);
				let addSemicolon = false;//interpreterContext.currentScope == ScopeType.Class;
				return this.wrap(variableNameToken.rawText + ": " + this.getByType(TokenType.DeclarationType), addSemicolon);
			case TokenType.FunctionDeclaration:
				let functionNameToken = this.getByType(TokenType.FunctionName);
				let functionName: string;
				if (functionNameToken.text == "new" || functionNameToken.text == "class_initialize" ) {
					functionName = "constructor";
				}
				else {
					functionName = functionNameToken.rawText;
				}
				interpreterContext.pushScope(ScopeType.ArgumentList);
				let argsString = this.getByType(TokenType.FunctionArguments).toString();

				interpreterContext.setScope(ScopeType.Function);

				return this.wrap(functionName + "" + argsString + " {");
			case TokenType.WithStatement:
				interpreterContext.pushScope(ScopeType.With);
				interpreterContext.currentWith = this.getByType(TokenType.WithTarget);
				return this.wrap("{ let _with_tmp = " + this.getByType(TokenType.WithTarget) + ";");
			case TokenType.MethodCall:
				return this.wrap(this.getByType(TokenType.FunctionName) + "(" + this.getByType(TokenType.MethodArguments) + ")", true);
			case TokenType.ExitStatement:
				return this.wrap("return", true);
			case TokenType.OptionStatement:
				return "";
			case TokenType.ForLoop:
				let varName = this.getByType(TokenType.ForVariableName);
				let start = this.getByType(TokenType.ForStart);
				let stop = this.getByType(TokenType.ForStop);
				let step = this.getByType(TokenType.ForStep);
				let stepString: string;
				if (step == null) {
					stepString = "++" + varName.rawText;
				}
				else {
					stepString = varName.rawText + " += " + step.rawText;
				}

				interpreterContext.pushScope(ScopeType.Function);

				return this.wrap("for (let " + varName + "= " + start.rawText + "; " + varName + "<= " + stop.rawText + "; " + stepString + ") {");
			case TokenType.NextStatement:
				interpreterContext.popScope(ScopeType.Function);
				return this.wrap("}");
			case TokenType.SelectCaseStatement:
				interpreterContext.pushScope(ScopeType.Function);
				interpreterContext.caseCount = 0;
				return this.wrap("switch(" + this.getByType(TokenType.SelectCaseTarget) + "){");
			case TokenType.CaseElseStatement:
				return this.wrap("break;" + this.getBefore() + "default:");
			default:
				break;
		}

		for (let s of this.tokens) {
			text += s.toString();
		}

		//Hack to add semicolon on assignments
		if (this.type == TokenType.Assignment) {
			let i = text.length - this.back().textAfter.length;
			return text.slice(0, i) + ";" + text.slice(i, text.length - i);
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

var operators = "+-*/'^,.><=%@!#$&"; //Different special characters
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
