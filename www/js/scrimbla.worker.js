/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(1);

	// externs;

	var compiler = __webpack_require__(2);

	var ImbaParseError = __webpack_require__(8).ImbaParseError;
	var api = {};

	function normalizeError(e,o){
		if (e.lexer && !(e instanceof ImbaParseError)) {
			e = new ImbaParseError(e,{tokens: e.lexer.tokens,pos: e.lexer.pos});
		};
		// else
		//	console.log 'error has no lexer but is parse-error',e:toJSON
		//	e = {message: e:message}
		
		if (e.toJSON) { // isa ImbaParseError
			// console.log 'converting error to json'
			e = e.toJSON();
		};
		
		if (e instanceof Error) {
			e = {message: e.message};
		};
		
		return e;
	};

	api.compile = function (code,o){
		if(o === undefined) o = {};
		try {
			var res = compiler.compile(code,o);
			var ret = {sourcemap: res.sourcemap,js: {body: res.toString()}};
			return ret;
		} catch (e) {
			return {error: normalizeError(e,o)};
		};
	};

	api.bundle = function (bundle,o){
		if(o === undefined) o = {};
		var output = {FILES: {}};
		
		for (var o1 = bundle.FILES, file, i = 0, keys = Object.keys(o1), l = keys.length; i < l; i++){
			name = keys[i];file = o1[name];if (name.match(/\.imba$/)) {
				var jsname = name.replace(/\.imba$/,'.js');
				var out = output.FILES[jsname] = {
					id: file.id,
					name: jsname
				};
				
				try {
					
					o.filename = name;
					o.sourcePath = name;
					o.targetPath = jsname;
					
					var res = compiler.compile(file.body,o);
					out.sourcemap = res.sourcemap;
					out.body = res.toString();
				} catch (e) {
					out.error = normalizeError(e,o);
				};
			};
		};
		return output;
	};

	api.analyze = function (code,o){
		if(o === undefined) o = {};
		var meta;
		try {
			var ast = compiler.parse(code,o);
			meta = ast.analyze({loglevel: 0});
		} catch (e) {
			// console.log "something wrong {e:message}",o.@tokens,e:toJSON
			e = normalizeError(e,o);
			meta = {warnings: [e]};
		};
		return {meta: meta};
	};

	onmessage = function onmessage(e){
		// console.log 'message to webworker',e:data
		var params = e.data;
		var id = params.id;
		var start = new Date();
		
		if (api[params[0]] instanceof Function) {
			var fn = api[params[0]];
			var result = fn.apply(api,params.slice(1));
			
			result.worker = {
				ref: id,
				action: params[0],
				elapsed: new Date() - start
			};
			
			return postMessage(result);
		};
	};


/***/ },
/* 1 */
/***/ function(module, exports) {

	
	/*
	Imba is the namespace for all runtime related utilities
	@namespace
	*/

	Imba = {VERSION: '1.0.0-beta'};



	/*
	True if running in client environment.
	@return {bool}
	*/

	Imba.isClient = function (){
		return false;
	};

	/*
	True if running in server environment.
	@return {bool}
	*/

	Imba.isServer = function (){
		return false;
	};

	Imba.subclass = function (obj,sup){
		;
		for (var k in sup){
			if (sup.hasOwnProperty(k)) { obj[k] = sup[k] };
		};
		
		obj.prototype = Object.create(sup.prototype);
		obj.__super__ = obj.prototype.__super__ = sup.prototype;
		obj.prototype.initialize = obj.prototype.constructor = obj;
		return obj;
	};

	/*
	Lightweight method for making an object iterable in imbas for/in loops.
	If the compiler cannot say for certain that a target in a for loop is an
	array, it will cache the iterable version before looping.

	```imba
	# this is the whole method
	def Imba.iterable o
		return o ? (o:toArray ? o.toArray : o) : []

	class CustomIterable
		def toArray
			[1,2,3]

	# will return [2,4,6]
	for x in CustomIterable.new
		x * 2

	```
	*/

	Imba.iterable = function (o){
		return (o) ? (((o.toArray) ? (o.toArray()) : (o))) : ([]);
	};

	/*
	Coerces a value into a promise. If value is array it will
	call `Promise.all(value)`, or if it is not a promise it will
	wrap the value in `Promise.resolve(value)`. Used for experimental
	await syntax.
	@return {Promise}
	*/

	Imba.await = function (value){
		if (value instanceof Array) {
			return Promise.all(value);
		} else if (value && value.then) {
			return value;
		} else {
			return Promise.resolve(value);
		};
	};

	var dashRegex = /-./g;

	Imba.toCamelCase = function (str){
		if (str.indexOf('-') >= 0) {
			return str.replace(dashRegex,function(m) { return m.charAt(1).toUpperCase(); });
		} else {
			return str;
		};
	};

	Imba.indexOf = function (a,b){
		return ((b && b.indexOf)) ? (b.indexOf(a)) : ([].indexOf.call(a,b));
	};

	Imba.len = function (a){
		return a && ((a.len instanceof Function) ? (a.len.call(a)) : (a.length)) || 0;
	};

	Imba.prop = function (scope,name,opts){
		if (scope.defineProperty) {
			return scope.defineProperty(name,opts);
		};
		return;
	};

	Imba.attr = function (scope,name,opts){
		if (scope.defineAttribute) {
			return scope.defineAttribute(name,opts);
		};
		
		var getName = Imba.toCamelCase(name);
		var setName = Imba.toCamelCase('set-' + name);
		
		scope.prototype[getName] = function() {
			return this.getAttribute(name);
		};
		
		scope.prototype[setName] = function(value) {
			this.setAttribute(name,value);
			return this;
		};
		return;
	};

	Imba.propDidSet = function (object,property,val,prev){
		var fn = property.watch;
		if (fn instanceof Function) {
			fn.call(object,val,prev,property);
		} else if ((typeof fn=='string'||fn instanceof String) && object[fn]) {
			object[fn](val,prev,property);
		};
		return;
	};


	// Basic events
	function emit__(event,args,node){
		// var node = cbs[event]
		var prev,cb,ret;
		
		while ((prev = node) && (node = node.next)){
			if (cb = node.listener) {
				if (node.path && cb[node.path]) {
					ret = (args) ? (cb[node.path].apply(cb,args)) : (cb[node.path]());
				} else {
					// check if it is a method?
					ret = (args) ? (cb.apply(node,args)) : (cb.call(node));
				};
			};
			
			if (node.times && --node.times <= 0) {
				prev.next = node.next;
				node.listener = null;
			};
		};
		return;
	};

	// method for registering a listener on object
	Imba.listen = function (obj,event,listener,path){
		var $1;
		var cbs,list,tail;
		cbs = obj.__listeners__ || (obj.__listeners__ = {});
		list = cbs[($1 = event)] || (cbs[$1] = {});
		tail = list.tail || (list.tail = (list.next = {}));
		tail.listener = listener;
		tail.path = path;
		list.tail = tail.next = {};
		return tail;
	};

	// register a listener once
	Imba.once = function (obj,event,listener){
		var tail = Imba.listen(obj,event,listener);
		tail.times = 1;
		return tail;
	};

	// remove a listener
	Imba.unlisten = function (obj,event,cb,meth){
		var node,prev;
		var meta = obj.__listeners__;
		if (!meta) { return };
		
		if (node = meta[event]) {
			while ((prev = node) && (node = node.next)){
				if (node == cb || node.listener == cb) {
					prev.next = node.next;
					// check for correct path as well?
					node.listener = null;
					break;
				};
			};
		};
		return;
	};

	// emit event
	Imba.emit = function (obj,event,params){
		var cb;
		if (cb = obj.__listeners__) {
			if (cb[event]) { emit__(event,params,cb[event]) };
			if (cb.all) { emit__(event,[event,params],cb.all) }; // and event != 'all'
		};
		return;
	};

	Imba.observeProperty = function (observer,key,trigger,target,prev){
		if (prev && typeof prev == 'object') {
			Imba.unlisten(prev,'all',observer,trigger);
		};
		if (target && typeof target == 'object') {
			Imba.listen(target,'all',observer,trigger);
		};
		return this;
	};

	Imba;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	
	// var imba = require '../imba'
	var T = __webpack_require__(3);
	var util = __webpack_require__(4);
	var lexer = __webpack_require__(6);
	var rewriter = __webpack_require__(9);
	var parser = exports.parser = __webpack_require__(10).parser;
	var ast = __webpack_require__(11);

	var ImbaParseError = __webpack_require__(8).ImbaParseError;

	// Instantiate a Lexer for our use here.
	var lex = exports.lex = new (lexer.Lexer)();
	var Rewriter = exports.Rewriter = rewriter.Rewriter;
	rewriter = new Rewriter();

	parser.lexer = lex.jisonBridge();
	parser.yy = ast; // everything is exported right here now


	function tokenize(code,o){
		if(o === undefined) o = {};
		try {
			// console.log('tokenize') if o:profile
			if (o.profile) { console.time('tokenize') };
			o._source = code;
			lex.reset();
			var tokens = lex.tokenize(code,o);
			if (o.profile) { console.timeEnd('tokenize') };
			
			if (o.rewrite !== false) {
				tokens = rewriter.rewrite(tokens,o);
			};
			return tokens;
		} catch (err) {
			throw err;
		};
	}; exports.tokenize = tokenize;

	function rewrite(tokens,o){
		if(o === undefined) o = {};
		try {
			if (o.profile) { console.time('rewrite') };
			tokens = rewriter.rewrite(tokens,o);
			if (o.profile) { console.timeEnd('rewrite') };
		} catch (err) {
			throw err;
		};
		return tokens;
	}; exports.rewrite = rewrite;


	function parse(code,o){
		if(o === undefined) o = {};
		var tokens = (code instanceof Array) ? (code) : (tokenize(code,o));
		try {
			if (tokens != code) o._source || (o._source = code);
			o._tokens = tokens;
			return parser.parse(tokens);
		} catch (err) {
			err._code = code;
			if (o.filename) { err._filename = o.filename };
			throw err;
		};
	}; exports.parse = parse;


	function compile(code,o){
		if(o === undefined) o = {};
		try {
			var tokens = tokenize(code,o);
			var ast = parse(tokens,o);
			return ast.compile(o);
		} catch (err) {
			err._code = code;
			if (o.filename) { err._filename = o.filename };
			if (o.evaling) {
				console.log("error during compile",o.filename);
			};
			throw err;
		};
	}; exports.compile = compile;

	function analyze(code,o){
		if(o === undefined) o = {};
		var meta;
		try {
			var ast = parse(code,o);
			meta = ast.analyze(o);
		} catch (e) {
			if (!((e instanceof ImbaParseError))) {
				if (e.lexer) {
					e = new ImbaParseError(e,{tokens: e.lexer.tokens,pos: e.lexer.pos});
				} else {
					throw e;
				};
			};
			meta = {warnings: [e]};
		};
		return meta;
	}; exports.analyze = analyze;


/***/ },
/* 3 */
/***/ function(module, exports) {

	

	var TOK = exports.TOK = {};
	var TTERMINATOR = TOK.TERMINATOR = 1;
	var TIDENTIFIER = TOK.IDENTIFIER = TOK.IVAR = 2;
	var CONST = TOK.CONST = 3;
	var VAR = TOK.VAR = 4;
	var IF = TOK.IF = 5;
	var ELSE = TOK.ELSE = 6;
	var DEF = TOK.DEF = 7;

	function Token(type,value,loc,len){
		this._type = type;
		this._value = value;
		this._loc = (loc != null) ? (loc) : (-1);
		this._len = len || 0;
		this._meta = null;
		this.generated = false;
		this.newLine = false;
		this.spaced = false;
		this.call = false;
		return this;
	};

	exports.Token = Token; // export class 
	Token.prototype.type = function (){
		return this._type;
	};

	Token.prototype.value = function (){
		return this._value;
	};

	Token.prototype.traverse = function (){
		return;
	};

	Token.prototype.c = function (){
		return "" + this._value;
	};

	Token.prototype.toString = function (){
		return this._value;
	};

	Token.prototype.charAt = function (i){
		return this._value.charAt(i);
	};

	Token.prototype.slice = function (i){
		return this._value.slice(i);
	};

	Token.prototype.region = function (){
		return [this._loc,this._loc + (this._len || this._value.length)];
	};

	Token.prototype.sourceMapMarker = function (){
		return (this._loc == -1) ? (':') : (("%$" + (this._loc) + "$%"));
		// @col == -1 ? '' : "%%{@line}${@col}%%"
	};


	function lex(){
		var token = this.tokens[this.pos++];
		var ttag;
		
		if (token) {
			ttag = token._type;
			this.yytext = token;
		} else {
			ttag = '';
		};
		
		return ttag;
	}; exports.lex = lex;


	// export def token typ, val, line, col, len do Token.new(typ,val,line, col or 0, len or 0) # [null,typ,val,loc]
	function token(typ,val){
		return new Token(typ,val,-1,0);
	}; exports.token = token;

	function typ(tok){
		return tok._type;
	}; exports.typ = typ;
	function val(tok){
		return tok._value;
	}; exports.val = val; // tok[offset + 1]
	function line(tok){
		return tok._line;
	}; exports.line = line; // tok[offset + 2]
	function loc(tok){
		return tok._loc;
	}; exports.loc = loc; // tok[offset + 2]

	function setTyp(tok,v){
		return tok._type = v;
	}; exports.setTyp = setTyp;
	function setVal(tok,v){
		return tok._value = v;
	}; exports.setVal = setVal;
	function setLine(tok,v){
		return tok._line = v;
	}; exports.setLine = setLine;
	function setLoc(tok,v){
		return tok._loc = v;
	}; exports.setLoc = setLoc;


	var LBRACKET = exports.LBRACKET = new Token('{','{',0,0,0);
	var RBRACKET = exports.RBRACKET = new Token('}','}',0,0,0);

	var LPAREN = exports.LPAREN = new Token('(','(',0,0,0);
	var RPAREN = exports.RPAREN = new Token(')',')',0,0,0);

	LBRACKET.generated = true;
	RBRACKET.generated = true;
	LPAREN.generated = true;
	RPAREN.generated = true;

	var INDENT = exports.INDENT = new Token('INDENT','2',0,0,0);
	var OUTDENT = exports.OUTDENT = new Token('OUTDENT','2',0,0,0);


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {
	function brace(str){
		var lines = str.match(/\n/);
		// what about indentation?
		
		if (lines) {
			return '{' + str + '\n}';
		} else {
			return '{\n' + str + '\n}';
		};
	}; exports.brace = brace;

	function normalizeIndentation(str){
		var m;
		var reg = /\n+([^\n\S]*)/g;
		var ind = null;
		
		var length_;while (m = reg.exec(str)){
			var attempt = m[1];
			if (ind == null || 0 < (length_ = attempt.length) && length_ < ind.length) {
				ind = attempt;
			};
		};
		
		if (ind) { str = str.replace(RegExp(("\\n" + ind),"g"),'\n') };
		return str;
	}; exports.normalizeIndentation = normalizeIndentation;


	function flatten(arr){
		var out = [];
		arr.forEach(function(v) { return (v instanceof Array) ? (out.push.apply(out,flatten(v))) : (out.push(v)); });
		return out;
	}; exports.flatten = flatten;


	function pascalCase(str){
		return str.replace(/(^|[\-\_\s])(\w)/g,function(m,v,l) { return l.toUpperCase(); });
	}; exports.pascalCase = pascalCase;

	function camelCase(str){
		str = String(str);
		// should add shortcut out
		return str.replace(/([\-\_\s])(\w)/g,function(m,v,l) { return l.toUpperCase(); });
	}; exports.camelCase = camelCase;

	function dashToCamelCase(str){
		str = String(str);
		if (str.indexOf('-') >= 0) {
			// should add shortcut out
			str = str.replace(/([\-\s])(\w)/g,function(m,v,l) { return l.toUpperCase(); });
		};
		return str;
	}; exports.dashToCamelCase = dashToCamelCase;

	function snakeCase(str){
		var str = str.replace(/([\-\s])(\w)/g,'_');
		return str.replace(/()([A-Z])/g,"_$1",function(m,v,l) { return l.toUpperCase(); });
	}; exports.snakeCase = snakeCase;

	function setterSym(sym){
		return dashToCamelCase(("set-" + sym));
	}; exports.setterSym = setterSym;

	function quote(str){
		return '"' + str + '"';
	}; exports.quote = quote;

	function singlequote(str){
		return "'" + str + "'";
	}; exports.singlequote = singlequote;

	function symbolize(str){
		str = String(str);
		var end = str.charAt(str.length - 1);
		
		if (end == '=') {
			str = 'set' + str[0].toUpperCase() + str.slice(1,-1);
		};
		
		if (str.indexOf("-") >= 0) {
			str = str.replace(/([\-\s])(\w)/g,function(m,v,l) { return l.toUpperCase(); });
		};
		
		return str;
	}; exports.symbolize = symbolize;


	function indent(str){
		return String(str).replace(/^/g,"\t").replace(/\n/g,"\n\t").replace(/\n\t$/g,"\n");
	}; exports.indent = indent;

	function bracketize(str,ind){
		if(ind === undefined) ind = true;
		if (ind) { str = "\n" + indent(str) + "\n" };
		return '{' + str + '}';
	}; exports.bracketize = bracketize;

	function parenthesize(str){
		return '(' + String(str) + ')';
	}; exports.parenthesize = parenthesize;

	function unionOfLocations(){
		var $0 = arguments, j = $0.length;
		var locs = new Array(j>0 ? j : 0);
		while(j>0) locs[j-1] = $0[--j];
		var a = Infinity;
		var b = -Infinity;
		
		for (var i = 0, ary = Imba.iterable(locs), len = ary.length, loc; i < len; i++) {
			loc = ary[i];
			if (loc && loc._loc != undefined) {
				loc = loc._loc;
			};
			
			if (loc && (loc.loc instanceof Function)) {
				loc = loc.loc();
			};
			
			if (loc instanceof Array) {
				if (a > loc[0]) { a = loc[0] };
				if (b < loc[0]) { b = loc[1] };
			} else if ((typeof loc=='number'||loc instanceof Number)) {
				if (a > loc) { a = loc };
				if (b < loc) { b = loc };
			};
		};
		
		return [a,b];
	}; exports.unionOfLocations = unionOfLocations;



	function locationToLineColMap(code){
		var lines = code.split(/\n/g);
		var map = [];
		
		var chr;
		var loc = 0;
		var col = 0;
		var line = 0;
		
		while (chr = code[loc]){
			map[loc] = [line,col];
			
			if (chr == '\n') {
				line++;
				col = 0;
			} else {
				col++;
			};
			
			loc++;
		};
		
		return map;
	}; exports.locationToLineColMap = locationToLineColMap;

	function markLineColForTokens(tokens,code){
		return this;
	}; exports.markLineColForTokens = markLineColForTokens;

	function parseArgs(argv,o){
		var env_;
		if(o === undefined) o = {};
		var aliases = o.alias || (o.alias = {});
		var groups = o.groups || (o.groups = []);
		var schema = o.schema || {};
		
		schema.main = {};
		
		var options = {};
		var explicit = {};
		argv = argv || process.argv.slice(2);
		var curr = null;
		var i = 0;
		var m;
		
		while ((i < argv.length)){
			var arg = argv[i];
			i++;
			
			if (m = arg.match(/^\-([a-zA-Z]+)$/)) {
				curr = null;
				var chars = m[1].split('');
				
				for (var i1 = 0, ary = Imba.iterable(chars), len = ary.length, item; i1 < len; i1++) {
					// console.log "parsing {item} at {i}",aliases
					item = ary[i1];
					var key = aliases[item] || item;
					chars[i1] = key;
					options[key] = true;
				};
				
				if (chars.length == 1) {
					curr = chars;
				};
			} else if (m = arg.match(/^\-\-([a-z0-9\-\_A-Z]+)$/)) {
				var val = true;
				key = m[1];
				
				if (key.indexOf('no-') == 0) {
					key = key.substr(3);
					val = false;
				};
				
				for (var j = 0, items = Imba.iterable(groups), len_ = items.length, g; j < len_; j++) {
					g = items[j];
					if (key.substr(0,g.length) == g) {
						console.log('should be part of group');
					};
				};
				
				key = dashToCamelCase(key);
				
				options[key] = val;
				curr = key;
			} else {
				if (!(curr && schema[curr])) {
					curr = 'main';
				};
				
				if (arg.match(/^\d+$/)) {
					arg = parseInt(arg);
				};
				
				val = options[curr];
				if (val == true || val == false) {
					options[curr] = arg;
				} else if ((typeof val=='string'||val instanceof String) || (typeof val=='number'||val instanceof Number)) {
					options[curr] = [val].concat(arg);
				} else if (val instanceof Array) {
					val.push(arg);
				} else {
					options[curr] = arg;
				};
			};
		};
		
		
		if ((typeof (env_ = options.env)=='string'||env_ instanceof String)) {
			options[("ENV_" + (options.env))] = true;
		};
		
		return options;
	}; exports.parseArgs = parseArgs;

	var ansi = exports.ansi = {
		bold: function(text) { return '\u001b[1m' + text + '\u001b[22m'; },
		red: function(text) { return '\u001b[31m' + text + '\u001b[39m'; },
		green: function(text) { return '\u001b[32m' + text + '\u001b[39m'; },
		gray: function(text) { return '\u001b[90m' + text + '\u001b[39m'; },
		white: function(text) { return '\u001b[37m' + text + '\u001b[39m'; }
	};



	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(5)))

/***/ },
/* 5 */
/***/ function(module, exports) {

	// shim for using process in browser
	var process = module.exports = {};

	// cached from whatever global is present so that test runners that stub it
	// don't break things.  But we need to wrap it in a try catch in case it is
	// wrapped in strict mode code which doesn't define any globals.  It's inside a
	// function because try/catches deoptimize in certain engines.

	var cachedSetTimeout;
	var cachedClearTimeout;

	function defaultSetTimout() {
	    throw new Error('setTimeout has not been defined');
	}
	function defaultClearTimeout () {
	    throw new Error('clearTimeout has not been defined');
	}
	(function () {
	    try {
	        if (typeof setTimeout === 'function') {
	            cachedSetTimeout = setTimeout;
	        } else {
	            cachedSetTimeout = defaultSetTimout;
	        }
	    } catch (e) {
	        cachedSetTimeout = defaultSetTimout;
	    }
	    try {
	        if (typeof clearTimeout === 'function') {
	            cachedClearTimeout = clearTimeout;
	        } else {
	            cachedClearTimeout = defaultClearTimeout;
	        }
	    } catch (e) {
	        cachedClearTimeout = defaultClearTimeout;
	    }
	} ())
	function runTimeout(fun) {
	    if (cachedSetTimeout === setTimeout) {
	        //normal enviroments in sane situations
	        return setTimeout(fun, 0);
	    }
	    // if setTimeout wasn't available but was latter defined
	    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
	        cachedSetTimeout = setTimeout;
	        return setTimeout(fun, 0);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedSetTimeout(fun, 0);
	    } catch(e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
	            return cachedSetTimeout.call(null, fun, 0);
	        } catch(e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
	            return cachedSetTimeout.call(this, fun, 0);
	        }
	    }


	}
	function runClearTimeout(marker) {
	    if (cachedClearTimeout === clearTimeout) {
	        //normal enviroments in sane situations
	        return clearTimeout(marker);
	    }
	    // if clearTimeout wasn't available but was latter defined
	    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
	        cachedClearTimeout = clearTimeout;
	        return clearTimeout(marker);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedClearTimeout(marker);
	    } catch (e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
	            return cachedClearTimeout.call(null, marker);
	        } catch (e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
	            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
	            return cachedClearTimeout.call(this, marker);
	        }
	    }



	}
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    if (!draining || !currentQueue) {
	        return;
	    }
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = runTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    runClearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        runTimeout(drainQueue);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	
	var T = __webpack_require__(3);
	var Token = T.Token;

	var INVERSES = __webpack_require__(7).INVERSES;

	var K = 0;

	var ERR = __webpack_require__(8);

	// Constants
	// ---------

	// Keywords that Imba shares in common with JavaScript.
	var JS_KEYWORDS = [
		'true','false','null','this',
		'delete','typeof','in','instanceof',
		'throw','break','continue','debugger',
		'if','else','switch','for','while','do','try','catch','finally',
		'class','extends','super','return'
	];

	// new can be used as a keyword in imba, since object initing is done through
	// MyObject.new. new is a very useful varname.

	// We want to treat return like any regular call for now
	// Must be careful to throw the exceptions in AST, since the parser
	// wont

	// Imba-only keywords. var should move to JS_Keywords
	// some words (like tokid) should be context-specific
	var IMBA_KEYWORDS = [
		'undefined','then','unless','until','loop','of','by',
		'when','def','tag','do','elif','begin','var','let','self','await','import','require'
	];

	var IMBA_CONTEXTUAL_KEYWORDS = ['extend','static','local','export','global','prop'];

	// FixedArray for performance
	// var ALL_KEYWORDS = JS_KEYWORDS.concat(IMBA_KEYWORDS)
	var ALL_KEYWORDS = exports.ALL_KEYWORDS = [
		'true','false','null','this',
		'delete','typeof','in','instanceof',
		'throw','break','continue','debugger',
		'if','else','switch','for','while','do','try','catch','finally',
		'class','extends','super','return',
		'undefined','then','unless','until','loop','of','by',
		'when','def','tag','do','elif','begin','var','let','self','await','import',
		'and','or','is','isnt','not','yes','no','isa','case','nil','require'
	];

	// The list of keywords that are reserved by JavaScript, but not used, or are
	// used by Imba internally. We throw an error when these are encountered,
	// to avoid having a JavaScript error at runtime.  # 'var', 'let', - not inside here
	var RESERVED = ['case','default','function','void','with','const','enum','native'];
	var STRICT_RESERVED = ['case','function','void','const'];

	// The superset of both JavaScript keywords and reserved words, none of which may
	// be used as identifiers or properties.
	var JS_FORBIDDEN = JS_KEYWORDS.concat(RESERVED);

	var METHOD_IDENTIFIER = /^((([\x23]?[\$A-Za-z_\x7f-\uffff][$\-\w\x7f-\uffff]*)([\=]?))|(<=>|\|(?![\|=])))/;
	// removed ~=|~| |&(?![&=])

	// Token matching regexes.
	// added hyphens to identifiers now - to test
	var IDENTIFIER = /^((\$|@@|@|\#)[\wA-Za-z_\-\x7f-\uffff][$\w\x7f-\uffff]*(\-[$\w\x7f-\uffff]+)*|[$A-Za-z_][$\w\x7f-\uffff]*(\-[$\w\x7f-\uffff]+)*)([^\n\S]*:(?![\*\=:$\w\x7f-\uffff]))?/;

	var OBJECT_KEY = /^((\$|@@|@|)[$A-Za-z_\x7f-\uffff\-][$\w\x7f-\uffff\-]*)([^\n\S\s]*:(?![\*\=:$A-Za-z\_\x7f-\uffff]))/;

	var TAG = /^(\<|%)(?=[A-Za-z\#\.\{\@\>])/;

	var TAG_TYPE = /^(\w[\w\d]*:)?(\w[\w\d]*)(-[\w\d]+)*/;
	var TAG_ID = /^#((\w[\w\d]*)(-[\w\d]+)*)/;

	var TAG_ATTR = /^([\.\:]?[\w\_]+([\-\:][\w]+)*)(\s)*\=/;

	var SELECTOR = /^([%\$]{1,2})([\(\w\#\.\[])/;
	var SELECTOR_PART = /^(\#|\.|:|::)?([\w]+(\-[\w]+)*)/;
	var SELECTOR_COMBINATOR = /^ (\+|\>|\~)*\s*(?=[\w\.\#\:\{\*\[])/;

	var SELECTOR_PSEUDO_CLASS = /^(::?)([\w]+(\-[\w]+)*)/;
	var SELECTOR_ATTR_OP = /^(\$=|\~=|\^=|\*=|\|=|=|\!=)/;
	var SELECTOR_ATTR = /^\[([\w\_\-]+)(\$=|\~=|\^=|\*=|\|=|=|\!=)/;

	var SYMBOL = /^\:((([\*\@$\w\x7f-\uffff]+)+([\-\\\:][\w\x7f-\uffff]+)*)|==|\<=\>)/;


	var NUMBER = /^0x[\da-f]+|^0b[01]+|^\d*\.?\d+(?:e[+-]?\d+)?/i;

	var HEREDOC = /^("""|''')([\s\S]*?)(?:\n[^\n\S]*)?\1/;

	var OPERATOR = /^(?:[-=]=>|===|->|=>|!==|[-+*\/%<>&|^!?=]=|=<|>>>=?|([-+:])\1|([&|<>])\2=?|\?\.|\?\:|\.{2,3}|\*(?=[a-zA-Z\_]))/;

	// FIXME splat should only be allowed when the previous thing is spaced or inside call?

	var WHITESPACE = /^[^\n\S]+/;

	var COMMENT = /^###([^#][\s\S]*?)(?:###[^\n\S]*|(?:###)?$)/;
	// COMMENT    = /^###([^#][\s\S]*?)(?:###[^\n\S]*|(?:###)?$)|^(?:\s*(#\s.*|#\s*$))+/
	var INLINE_COMMENT = /^(\s*)(#[ \t\!](.*)|#[ \t]?(?=\n|$))+/;

	var CODE = /^[-=]=>/;

	var MULTI_DENT = /^(?:\n[^\n\S]*)+/;

	var SIMPLESTR = /^'[^\\']*(?:\\.[^\\']*)*'/;

	var JSTOKEN = /^`[^\\`]*(?:\\.[^\\`]*)*`/;

	// Regex-matching-regexes.
	var REGEX = /^(\/(?![\s=])[^[\/\n\\]*(?:(?:\\[\s\S]|\[[^\]\n\\]*(?:\\[\s\S][^\]\n\\]*)*])[^[\/\n\\]*)*\/)([imgy]{0,4})(?!\w)/;

	var HEREGEX = /^\/{3}([\s\S]+?)\/{3}([imgy]{0,4})(?!\w)/;

	var HEREGEX_OMIT = /\s+(?:#.*)?/g;

	// Token cleaning regexes.
	var MULTILINER = /\n/g;

	var HEREDOC_INDENT = /\n+([^\n\S]*)/g;

	var HEREDOC_ILLEGAL = /\*\//;

	// expensive?
	var LINE_CONTINUER = /^\s*(?:,|\??\.(?![.\d])|::)/;

	var TRAILING_SPACES = /\s+$/;

	var CONST_IDENTIFIER = /^[A-Z]/;

	var ENV_FLAG = /^\$\w+\$/;

	var ARGVAR = /^\$\d$/;

	// Compound assignment tokens.
	var COMPOUND_ASSIGN = ['-=','+=','/=','*=','%=','||=','&&=','?=','<<=','>>=','>>>=','&=','^=','|=','=<'];

	// Unary tokens.
	var UNARY = ['!','~','NEW','TYPEOF','DELETE'];

	// Logical tokens.
	var LOGIC = ['&&','||','&','|','^','and','or'];

	// Bit-shifting tokens.
	var SHIFT = ['<<','>>','>>>'];

	// Comparison tokens.
	var COMPARE = ['===','!==','==','!=','<','>','<=','>=','===','!=='];

	// Overideable methods
	var OP_METHODS = ['<=>','<<','..'];

	// Mathematical tokens.
	var MATH = ['*','/','%','∪','∩','√'];

	// Relational tokens that are negatable with `not` prefix.
	var RELATION = ['IN','OF','INSTANCEOF','ISA'];

	// Boolean tokens.
	var BOOL = ['TRUE','FALSE','NULL','UNDEFINED'];

	// Our list is shorter, due to sans-parentheses method calls.
	var NOT_REGEX = ['NUMBER','REGEX','BOOL','TRUE','FALSE','++','--',']'];

	// If the previous token is not spaced, there are more preceding tokens that
	// force a division parse:
	var NOT_SPACED_REGEX = ['NUMBER','REGEX','BOOL','TRUE','FALSE','++','--',']',')','}','THIS','SELF','IDENTIFIER','STRING'];

	// Tokens which could legitimately be invoked or indexed. An opening
	// parentheses or bracket following these tokens will be recorded as the start
	// of a function invocation or indexing operation.
	// really?!

	var UNFINISHED = ['\\','.','?.','?:','UNARY','MATH','+','-','SHIFT','RELATION','COMPARE','LOGIC','COMPOUND_ASSIGN','THROW','EXTENDS'];

	// } should not be callable anymore!!! '}', '::',
	var CALLABLE = ['IDENTIFIER','STRING','REGEX',')',']','THIS','SUPER','TAG_END','IVAR','GVAR','SELF','CONST','NEW','ARGVAR','SYMBOL','RETURN'];

	// optimize for FixedArray
	var INDEXABLE = [
		'IDENTIFIER','STRING','REGEX',')',']','THIS','SUPER','TAG_END','IVAR','GVAR','SELF','CONST','NEW','ARGVAR','SYMBOL','RETURN',
		'NUMBER','BOOL','TAG_SELECTOR','ARGUMENTS','}','TAG_TYPE','TAGID'
	];

	var NOT_KEY_AFTER = ['.','?','?.','UNARY','?:','+','-','*'];

	var GLOBAL_IDENTIFIERS = ['global','exports'];

	// Tokens that, when immediately preceding a `WHEN`, indicate that the `WHEN`
	// occurs at the start of a line. We disambiguate these from trailing whens to
	// avoid an ambiguity in the grammar.
	var LINE_BREAK = ['INDENT','OUTDENT','TERMINATOR'];


	function LexerError(message,file,line){
		this.message = message;
		this.file = file;
		this.line = line;
		return this;
	};
	Imba.subclass(LexerError,SyntaxError);
	exports.LexerError = LexerError; // export class 



	function last(array,back){
		if(back === undefined) back = 0;
		return array[array.length - back - 1];
	};

	function count(str,substr){
		return str.split(substr).length - 1;
	};

	function repeatString(str,times){
		var res = '';
		while (times > 0){
			if (times % 2 == 1) {
				res += str;
			};
			str += str;
			times >>= 1;
		};
		return res;
	};

	var tT = T.typ;
	var tV = T.val;
	var tTs = T.setTyp;
	var tVs = T.setVal;

	// The Lexer class reads a stream of Imba and divvies it up into tokidged
	// tokens. Some potential ambiguity in the grammar has been avoided by
	// pushing some extra smarts into the Lexer.

	// Based on the original lexer.coffee from CoffeeScript
	function Lexer(){
		this.reset();
		this;
	};

	exports.Lexer = Lexer; // export class 
	Lexer.prototype.reset = function (){
		this._code = null;
		this._chunk = null; // The remainder of the source code.
		this._opts = null;
		this._state = {};
		
		this._indent = 0; // The current indentation level.
		this._indebt = 0; // The over-indentation at the current level.
		this._outdebt = 0; // The under-outdentation at the current level.
		
		this._indents = []; // The stack of all current indentation levels.
		this._ends = []; // The stack for pairing up tokens.
		this._contexts = []; // suplements @ends
		this._scopes = [];
		this._nextScope = null; // the scope to add on the next indent
		this._context = null;
		// should rather make it like a statemachine that moves from CLASS_DEF to CLASS_BODY etc
		// Things should compile differently when you are in a CLASS_BODY than when in a DEF_BODY++
		
		this._indentStyle = null;
		this._inTag = false;
		
		this._tokens = []; // Stream of parsed tokens in the form `['TYPE', value, line]`.
		this._seenFor = false;
		this._loc = 0;
		this._locOffset = 0;
		
		this._end = null;
		this._char = null;
		this._bridge = null;
		
		this._last = null;
		this._lastTyp = '';
		this._lastVal = null;
		return this;
	};

	Lexer.prototype.jisonBridge = function (jison){
		return this._bridge = {
			lex: T.lex,
			setInput: function(tokens) {
				this.tokens = tokens;
				return this.pos = 0;
			},
			
			upcomingInput: function() { return ""; }
		};
	};


	Lexer.prototype.tokenize = function (code,o){
		
		var m;
		if(o === undefined) o = {};
		if (code.length == 0) {
			return [];
		};
		
		if (!o.inline) {
			if (WHITESPACE.test(code)) {
				code = ("\n" + code);
				if (code.match(/^\s*$/g)) { return [] };
			};
			
			code = code.replace(/\r/g,'').replace(/[\t ]+$/g,'');
		};
		
		this._last = null;
		this._lastTyp = null;
		this._lastVal = null;
		
		this._code = code;
		this._opts = o;
		this._locOffset = o.loc || 0;
		this._indentStyle = o.indentation || null;
		
		// if the very first line is indented, take this as a gutter
		if (m = code.match(/^([\ \t]*)[^\n\s\t]/)) {
			this._state.gutter = m[1];
		};
		
		if (o.gutter !== undefined) {
			this._state.gutter = o.gutter;
		};
		
		o._tokens = this._tokens;
		
		this.parse(code);
		
		if (!o.inline) this.closeIndentation();
		
		if (!o.silent && this._ends.length) {
			console.log(this._ends);
			this.error(("missing " + (this._ends.pop())));
		};
		
		return this._tokens;
	};

	Lexer.prototype.parse = function (code){
		var i = 0;
		var pi = 0;
		this._loc = this._locOffset + i;
		
		while (this._chunk = code.slice(i)){
			if (this._context && this._context.pop) {
				if (this._context.pop.test(this._chunk)) {
					this.popEnd();
				};
			};
			
			pi = (this._end == 'TAG' && this.tagDefContextToken()) || (this._inTag && this.tagContextToken()) || this.basicContext();
			i += pi;
			this._loc = this._locOffset + i;
		};
		
		return;
	};

	Lexer.prototype.basicContext = function (){
		return this.selectorToken() || this.symbolToken() || this.methodNameToken() || this.identifierToken() || this.whitespaceToken() || this.lineToken() || this.commentToken() || this.heredocToken() || this.tagToken() || this.stringToken() || this.numberToken() || this.regexToken() || this.jsToken() || this.literalToken() || 0;
	};

	Lexer.prototype.moveCaret = function (i){
		return this._loc += i;
	};

	Lexer.prototype.context = function (){
		return this._ends[this._ends.length - 1];
	};

	Lexer.prototype.inContext = function (key){
		var o = this._contexts[this._contexts.length - 1];
		return o && o[key];
	};

	Lexer.prototype.pushEnd = function (val,ctx){
		this._ends.push(val);
		this._contexts.push(this._context = (ctx || {}));
		this._end = val;
		this.refreshScope();
		
		if (ctx && ctx.id) {
			ctx.start = new Token(ctx.id + '_START',val,this._last.region()[1],0);
			this._tokens.push(ctx.start);
		};
		return this;
	};

	Lexer.prototype.popEnd = function (val){
		var popped = this._ends.pop();
		this._end = this._ends[this._ends.length - 1];
		
		// automatically adding a closer if this is defined
		var ctx = this._context;
		if (ctx && ctx.start) {
			ctx.end = new Token(ctx.id + '_END',popped,this._last.region()[1],0);
			ctx.end._start = ctx.start;
			ctx.start._end = ctx.end;
			this._tokens.push(ctx.end);
		};
		
		this._contexts.pop();
		this._context = this._contexts[this._contexts.length - 1];
		
		this.refreshScope();
		return this;
	};

	Lexer.prototype.refreshScope = function (){
		var ctx0 = this._ends[this._ends.length - 1];
		var ctx1 = this._ends[this._ends.length - 2];
		return this._inTag = ctx0 == 'TAG_END' || (ctx1 == 'TAG_END' && ctx0 == 'OUTDENT');
	};



	Lexer.prototype.queueScope = function (val){
		this._scopes[this._indents.length] = val;
		return this;
	};

	Lexer.prototype.popScope = function (val){
		this._scopes.pop();
		return this;
	};

	Lexer.prototype.getScope = function (){
		return this._scopes[this._indents.length - 1];
	};

	Lexer.prototype.scope = function (sym,opts){
		var len = this._ends.push(this._end = sym);
		this._contexts.push(opts || null);
		return sym;
	};


	Lexer.prototype.closeSelector = function (){
		if (this._end == '%') {
			this.token('SELECTOR_END','%',0);
			return this.pair('%');
		};
	};


	Lexer.prototype.openDef = function (){
		return this.pushEnd('DEF');
	};


	Lexer.prototype.closeDef = function (){
		if (this.context() == 'DEF') {
			var prev = last(this._tokens);
			
			if (tT(prev) == 'DEF_FRAGMENT') {
				true;
			} else if (tT(prev) == 'TERMINATOR') {
				var n = this._tokens.pop();
				this.token('DEF_BODY','DEF_BODY',0);
				this._tokens.push(n);
			} else {
				this.token('DEF_BODY','DEF_BODY',0);
			};
			
			this.pair('DEF');
		};
		return;
	};

	Lexer.prototype.tagContextToken = function (){
		var match;
		if (this._chunk[0] == '#') {
			this.token('#','#',1);
			return 1;
		};
		
		if (match = TAG_ATTR.exec(this._chunk)) {
			var l = match[0].length;
			
			this.token('TAG_ATTR',match[1],l - 1); // add to loc?
			this._loc += l - 1;
			this.token('=','=',1);
			this.pushEnd('TAG_ATTR',{id: 'VALUE',pop: /^[\s\n\>]/}); //  [' ','\n','>']
			return l;
		};
		return 0;
	};

	Lexer.prototype.tagDefContextToken = function (){
		// console.log "tagContextToken"
		var match;
		if (match = TAG_TYPE.exec(this._chunk)) {
			this.token('TAG_TYPE',match[0],match[0].length);
			return match[0].length;
		};
		
		if (match = TAG_ID.exec(this._chunk)) {
			var input = match[0];
			this.token('TAG_ID',input,input.length);
			return input.length;
		};
		
		if (this._chunk[0] == '\n') {
			this.pair('TAG');
		};
		
		return 0;
	};


	Lexer.prototype.tagToken = function (){
		var match, ary;
		if (!(match = TAG.exec(this._chunk))) { return 0 };
		var ary = Imba.iterable(match);var input = ary[0],type = ary[1],identifier = ary[2];
		
		if (type == '<') {
			this.token('TAG_START','<',1);
			this.pushEnd(INVERSES.TAG_START);
			
			if (match = TAG_TYPE.exec(this._chunk.substr(1,40))) {
				// special case should probably be handled in AST
				if (match[0] != 'self') {
					this.token('TAG_TYPE',match[0],match[0].length,1);
					return input.length + match[0].length;
				};
			};
			
			if (identifier) {
				if (identifier.substr(0,1) == '{') {
					return type.length;
				} else {
					this.token('TAG_NAME',input.substr(1),0);
				};
			};
		};
		
		return input.length;
	};


	Lexer.prototype.selectorToken = function (){
		var ary;
		var match;
		
		// special handling if we are in this context
		if (this._end == '%') {
			var chr = this._chunk[0];
			var open = this.inContext('open');
			
			// should add for +, ~ etc
			// should maybe rather look for the correct type of character?
			
			if (open && (chr == ' ' || chr == '\n' || chr == ',' || chr == '+' || chr == '~' || chr == ')' || chr == ']')) {
				// console.log "close this selector directly"
				this.token('SELECTOR_END','%',0);
				this.pair('%');
				return 0;
			};
			
			if (match = SELECTOR_COMBINATOR.exec(this._chunk)) {
				// spaces between? -- include the whole
				this.token('SELECTOR_COMBINATOR',match[1] || " ",match[0].length);
				return match[0].length;
			} else if (match = SELECTOR_PART.exec(this._chunk)) {
				var type = match[1];
				var id = match[2];
				
				switch (type) {
					case '.':
						tokid = 'SELECTOR_CLASS';break;
					
					case '#':
						tokid = 'SELECTOR_ID';break;
					
					case ':':
						tokid = 'SELECTOR_PSEUDO_CLASS';break;
					
					case '::':
						tokid = 'SELECTOR_PSEUDO_CLASS';break;
					
					default:
					
						var tokid = 'SELECTOR_TAG';
				
				};
				
				this.token(tokid,match[2],match[0].length);
				return match[0].length;
			} else if (chr == '[') {
				this.token('[','[',1);
				this.pushEnd(']');
				if (match = SELECTOR_ATTR.exec(this._chunk)) {
					// fuck this length shit
					var idoffset = match[0].indexOf(match[1]);
					var opoffset = match[0].indexOf(match[2]);
					this.token('IDENTIFIER',match[1],match[1].length,idoffset);
					this.token('SELECTOR_ATTR_OP',match[2],match[2].length,opoffset);
					return match[0].length;
				};
				return 1;
			} else if (chr == '|') {
				var tok = this._tokens[this._tokens.length - 1];
				tTs(tok,'SELECTOR_NS');
				// tok[0] = 'SELECTOR_NS' # FIX
				return 1;
			} else if (chr == ',') {
				this.token('SELECTOR_GROUP',',',1);
				return 1;
			} else if (chr == '*') {
				this.token('UNIVERSAL_SELECTOR','*',1);
				return 1;
			} else if (chr == ')') {
				this.pair('%');
				this.token('SELECTOR_END',')',1);
				return 1;
			} else if (Imba.indexOf(chr,[')','}',']','']) >= 0) {
				this.pair('%');
				return 0;
			};
		};
		
		if (!(match = SELECTOR.exec(this._chunk))) { return 0 };
		
		var ary = Imba.iterable(match);var input = ary[0],id = ary[1],kind = ary[2];
		
		// this is a closed selector
		if (kind == '(') {
			// token '(','('
			this.token('SELECTOR_START',id,id.length + 1);
			this.pushEnd('%');
			return id.length + 1;
		} else if (id == '%') {
			// we are already scoped in on a selector
			if (this.context() == '%') { return 1 };
			this.token('SELECTOR_START',id,id.length);
			// this is a separate - scope. Full selector should rather be $, and keep the single selector as %
			
			this.pushEnd('%',{open: true});
			// @ends.push '%'
			// make sure a terminator breaks out
			return id.length;
		} else {
			return 0;
		};
	};

	// is this really needed? Should be possible to
	// parse the identifiers and = etc i jison?
	// what is special about methodNameToken? really?
	// this whole step should be removed - it's a huge mess
	Lexer.prototype.methodNameToken = function (){
		// we can optimize this by after a def simply
		// fetching all the way after the def until a space or (
		// and then add this to the def-token itself (as with fragment)
		if (this._chunk[0] == ' ') { return 0 };
		
		var match;
		
		if (this._end == ')') {
			if (this._ends.length > 1) {
				var outerctx = this._ends[this._ends.length - 2];
				if (outerctx == '%' && (match = TAG_ATTR.exec(this._chunk))) {
					this.token('TAG_ATTR_SET',match[1]);
					return match[0].length;
				};
			};
		};
		
		if (!(match = METHOD_IDENTIFIER.exec(this._chunk))) {
			return 0;
		};
		// var prev = last @tokens
		var length = match[0].length;
		
		var id = match[0];
		var ltyp = this._lastTyp;
		var typ = 'IDENTIFIER';
		var pre = id.charAt(0);
		var space = false;
		
		var m4 = match[4]; // might be out of bounds? should rather check charAt
		// drop match 4??
		
		// should this not quit here in practically all cases?
		if (!((ltyp == '.' || ltyp == 'DEF') || (m4 == '!') || match[5])) {
			return 0;
		};
		
		// again, why?
		if (id == 'self' || id == 'this' || id == 'super') { // in ['SELF','THIS']
			return 0;
		};
		
		if (id == 'new') {
			// console.log 'NEW here?'
			// this is wrong -- in the case of <div value=Date.new>
			// we are basically in a nested scope until the next space or >
			if (!(ltyp == '.' && this.inTag())) { typ = 'NEW' };
		};
		
		if (id == '...' && [',','(','CALL_START','BLOCK_PARAM_START','PARAM_START'].indexOf(ltyp) >= 0) {
			return 0;
		};
		
		if (id == '|') {
			// hacky way to implement this
			// with new lexer we'll use { ... } instead, and assume object-context,
			// then go back and correct when we see the context is invalid
			if (ltyp == '(' || ltyp == 'CALL_START') {
				this.token('DO','DO',0);
				this.pushEnd('|');
				this.token('BLOCK_PARAM_START',id,1);
				return length;
			} else if (ltyp == 'DO' || ltyp == '{') {
				this.pushEnd('|');
				this.token('BLOCK_PARAM_START',id,1);
				return length;
			} else if (this._ends[this._ends.length - 1] == '|') {
				this.token('BLOCK_PARAM_END','|',1);
				this.pair('|');
				return length;
			} else {
				return 0;
			};
		};
		
		// whaat?
		// console.log("method identifier",id)
		if ((['&','^','<<','<<<','>>'].indexOf(id) >= 0 || (id == '|' && this.context() != '|'))) {
			return 0;
		};
		
		if (OP_METHODS.indexOf(id) >= 0) {
			space = true;
		};
		
		// not even anything we should use?!?
		if (pre == '@') {
			typ = 'IVAR';
		} else if (pre == '$') {
			true;
		} else if (pre == '#') {
			typ = 'TAGID';
		} else if (CONST_IDENTIFIER.test(pre) || id == 'global' || id == 'exports') {
			// really? seems very strange
			// console.log('global!!',typ,id)
			typ = 'CONST';
		};
		
		// what is this really for?
		if (match[5] && ['IDENTIFIER','CONST','GVAR','CVAR','IVAR','SELF','THIS',']','}',')','NUMBER','STRING'].indexOf(ltyp) >= 0) {
			this.token('.','.',0);
		};
		
		this.token(typ,id,length);
		
		if (space) {
			this._last.spaced = true;
		};
		
		return length;
	};


	Lexer.prototype.inTag = function (){
		var len = this._ends.length;
		if (len > 0) {
			var ctx0 = this._ends[len - 1];
			var ctx1 = (len > 1) ? (this._ends[len - 2]) : (ctx0);
			return ctx0 == 'TAG_END' || (ctx1 == 'TAG_END' && ctx0 == 'OUTDENT');
		};
		return false;
	};

	Lexer.prototype.isKeyword = function (id){
		if ((id == 'attr' || id == 'prop')) {
			var scop = this.getScope();
			var incls = scop == 'CLASS' || scop == 'TAG';
			if (incls) { return true };
		};
		
		if (this._lastTyp == 'ATTR' || this._lastTyp == 'PROP') {
			return false;
		};
		
		return ALL_KEYWORDS.indexOf(id) >= 0;
	};

	// Matches identifying literals: variables, keywords, method names, etc.
	// Check to ensure that JavaScript reserved words aren't being used as
	// identifiers. Because Imba reserves a handful of keywords that are
	// allowed in JavaScript, we're careful not to tokid them as keywords when
	// referenced as property names here, so you can still do `jQuery.is()` even
	// though `is` means `===` otherwise.
	Lexer.prototype.identifierToken = function (){
		var ary;
		var match;
		
		var ctx0 = (this._ends.length > 0) ? (this._ends[this._ends.length - 1]) : (null);
		var ctx1 = (this._ends.length > 1) ? (this._ends[this._ends.length - 2]) : (null);
		var innerctx = ctx0;
		var typ;
		var reserved = false;
		
		var addLoc = false;
		var inTag = ctx0 == 'TAG_END' || (ctx1 == 'TAG_END' && ctx0 == 'OUTDENT');
		
		// console.log ctx1,ctx0
		
		if (inTag && (match = TAG_ATTR.exec(this._chunk))) {
			// console.log 'TAG_ATTR IN tokid',match
			// var prev = last @tokens
			// if the prev is a terminator, we dont really need to care?
			if (this._lastTyp != 'TAG_NAME') {
				if (this._lastTyp == 'TERMINATOR') {
					// console.log('prev was terminator -- drop it?')
					true;
				} else {
					this.token(",",",");
				};
			};
			
			var l = match[0].length;
			
			this.token('TAG_ATTR',match[1],l - 1); // add to loc?
			this._loc += l - 1;
			this.token('=','=',1);
			return l;
		};
		
		// see if this is a plain object-key
		// way too much logic going on here?
		// the ast should normalize whether keys
		// are accessable as keys or strings etc
		if (match = OBJECT_KEY.exec(this._chunk)) {
			var id = match[1];
			typ = 'KEY';
			
			this.token(typ,id,id.length);
			this.moveCaret(id.length);
			// console.log "MATCH",match
			this.token(':',':',match[3].length);
			this.moveCaret(-id.length);
			return match[0].length;
		};
		
		if (!(match = IDENTIFIER.exec(this._chunk))) {
			return 0;
		};
		
		var ary = Imba.iterable(match);var input = ary[0],id = ary[1],typ = ary[2],m3 = ary[3],m4 = ary[4],colon = ary[5];
		var idlen = id.length;
		
		// What is the logic here?
		if (id == 'own' && this.lastTokenType() == 'FOR') {
			this.token('OWN',id,id.length);
			return id.length;
		};
		
		var prev = last(this._tokens);
		var lastTyp = this._lastTyp;
		
		if (lastTyp == '#') {
			this.token('IDENTIFIER',id,idlen);
			return idlen;
		};
		
		// should we force this to be an identifier even if it is a reserved word?
		// this should only happen for when part of object etc
		// will prev ever be @???
		var forcedIdentifier;
		
		// again
		forcedIdentifier = colon || lastTyp == '.' || lastTyp == '?.'; // in ['.', '?.'
		
		
		// temp hack! need to solve for other keywords etc as well
		// problem appears with ternary conditions.
		
		// well -- it should still be an indentifier if in object?
		// forcedIdentifier = no if id in ['undefined','break']
		
		if (colon && lastTyp == '?') { forcedIdentifier = false }; // for ternary
		
		// if we are not at the top level? -- hacky
		if (id == 'tag' && this._chunk.indexOf("tag(") == 0) { // @chunk.match(/^tokid\(/)
			forcedIdentifier = true;
		};
		
		var isKeyword = false;
		
		// console.log "match",match
		// console.log "typ is {typ}"
		// little reason to check for this right here? but I guess it is only a simple check
		if (typ == '$' && ARGVAR.test(id)) { // id.match(/^\$\d$/)
			// console.log "TYP $"
			if (id == '$0') {
				typ = 'ARGUMENTS';
			} else {
				typ = 'ARGVAR';
				id = id.substr(1);
			};
		} else if (typ == '$' && ENV_FLAG.test(id)) {
			typ = 'ENV_FLAG';
			id = id.toUpperCase().slice(1,-1);
		} else if (typ == '@') {
			typ = 'IVAR';
			// id:reserved = yes if colon
		} else if (typ == '#') {
			typ = 'TAGID';
		} else if (typ == '@@') {
			typ = 'CVAR';
		} else if (typ == '$' && !colon) {
			typ = 'IDENTIFIER';
			// typ = 'GVAR'
		} else if (CONST_IDENTIFIER.test(id) || id == 'global' || id == 'exports') {
			// thous should really be handled by the ast instead
			typ = 'CONST';
		} else if (id == 'elif') {
			this.token('ELSE','elif',id.length);
			this.token('IF','if');
			return id.length;
		} else {
			typ = 'IDENTIFIER';
		};
		
		
		
		// this catches all 
		if (!forcedIdentifier && (isKeyword = this.isKeyword(id))) {
			// (id in JS_KEYWORDS or id in IMBA_KEYWORDS)
			
			typ = id.toUpperCase();
			addLoc = true;
			
			// clumsy - but testing performance
			if (typ == 'YES') {
				typ = 'TRUE';
			} else if (typ == 'NO') {
				typ = 'FALSE';
			} else if (typ == 'NIL') {
				typ = 'NULL';
			} else if (typ == 'VAR') {
				if (this._lastVal == 'export') {
					tTs(prev,'EXPORT');
				};
			} else if (typ == 'IF' || typ == 'ELSE' || typ == 'TRUE' || typ == 'FALSE' || typ == 'NULL') {
				true;
			} else if (typ == 'TAG') {
				this.pushEnd('TAG');
			} else if (typ == 'DEF') {
				// should probably shift context and optimize this
				this.openDef();
			} else if (typ == 'DO') {
				if (this.context() == 'DEF') this.closeDef();
			} else if (typ == 'WHEN' && LINE_BREAK.indexOf(this.lastTokenType()) >= 0) {
				typ = 'LEADING_WHEN';
			} else if (typ == 'FOR') {
				this._seenFor = true;
			} else if (typ == 'UNLESS') {
				typ = 'IF'; // WARN
			} else if (UNARY.indexOf(typ) >= 0) {
				typ = 'UNARY';
			} else if (RELATION.indexOf(typ) >= 0) {
				if (typ != 'INSTANCEOF' && typ != 'ISA' && this._seenFor) {
					typ = 'FOR' + typ; // ?
					this._seenFor = false;
				} else {
					typ = 'RELATION';
					
					if (prev._type == 'UNARY') {
						prev._type = 'NOT';
					};
				};
			};
		};
		
		if (id == 'super') {
			typ = 'SUPER';
		};
		
		// do we really want to check this here
		if (!forcedIdentifier) {
			// should already have dealt with this
			
			if (this._lastVal == 'export' && id == 'default') {
				// console.log 'id is default!!!'
				tTs(prev,'EXPORT');
				typ = 'DEFAULT';
			};
			
			// these really should not go here?!?
			switch (id) {
				case '!':
				case 'not':
					typ = 'UNARY';break;
				
				case '==':
				case '!=':
				case '===':
				case '!==':
				case 'is':
				case 'isnt':
					typ = 'COMPARE';break;
				
				case '&&':
				case '||':
				case 'and':
				case 'or':
					typ = 'LOGIC';break;
				
				case 'break':
				case 'continue':
				case 'debugger':
				case 'arguments':
					typ = id.toUpperCase();break;
			
			};
		};
		
		// prev = last @tokens
		var len = input.length;
		
		// should be strict about the order, check this manually instead
		if (typ == 'CLASS' || typ == 'DEF' || typ == 'TAG') {
			this.queueScope(typ);
			
			var i = this._tokens.length;
			
			while (i){
				prev = this._tokens[--i];
				var ctrl = "" + tV(prev);
				if (Imba.indexOf(ctrl,IMBA_CONTEXTUAL_KEYWORDS) >= 0) {
					tTs(prev,ctrl.toUpperCase());
				} else {
					break;
				};
			};
		} else if (typ == 'IF') {
			this.queueScope(typ);
		} else if (typ == 'IMPORT') {
			// could manually parse the whole ting here?
			this.pushEnd('IMPORT');
		} else if (id == 'from' && ctx0 == 'IMPORT') {
			typ = 'FROM';
			this.pair('IMPORT');
		} else if (id == 'as' && ctx0 == 'IMPORT') {
			typ = 'AS';
			this.pair('IMPORT');
		};
		
		if (typ == 'IDENTIFIER') {
			// see if previous was catch -- belongs in rewriter?
			if (lastTyp == 'CATCH') {
				typ = 'CATCH_VAR';
			};
		};
		
		if (colon) {
			// console.log 'colon',colon,typ
			if (typ == 'IDENTIFIER' && NOT_KEY_AFTER.indexOf(this._lastTyp) == -1) {
				typ = 'KEY';
			};
			
			this.token(typ,id,idlen);
			var colonOffset = colon.indexOf(':');
			
			this.moveCaret(idlen + colonOffset);
			// TODO Stop moving caret back and forth
			// console.log idlen,colon,colonOffset
			this.token(':',':',1);
			this.moveCaret(-(idlen + colonOffset));
		} else {
			this.token(typ,id,idlen);
		};
		
		return len;
	};

	// Matches numbers, including decimals, hex, and exponential notation.
	// Be careful not to interfere with ranges-in-progress.
	Lexer.prototype.numberToken = function (){
		var binaryLiteral;
		var match,number,lexedLength;
		
		if (!(match = NUMBER.exec(this._chunk))) { return 0 };
		
		number = match[0];
		lexedLength = number.length;
		
		if (binaryLiteral = /0b([01]+)/.exec(number)) {
			
			number = "" + parseInt(binaryLiteral[1],2);
		};
		
		var prev = last(this._tokens);
		
		if (match[0][0] == '.' && prev && !prev.spaced && ['IDENTIFIER',')','}',']','NUMBER'].indexOf(tT(prev)) >= 0) {
			// console.log "got here"
			this.token(".",".");
			number = number.substr(1);
		};
		
		
		this.token('NUMBER',number,lexedLength);
		return lexedLength;
	};

	Lexer.prototype.symbolToken = function (){
		var match,symbol,prev;
		
		if (!(match = SYMBOL.exec(this._chunk))) { return 0 };
		symbol = match[0];
		prev = last(this._tokens);
		
		// is this a property-access?
		// should invert this -- only allow when prev IS .. 
		// : should be a token itself, with a specification of spacing (LR,R,L,NONE)
		if (prev && !prev.spaced && Imba.indexOf(tT(prev),['(','{','[','.','CALL_START','INDEX_START',',','=','INDENT','TERMINATOR','VALUE_START']) == -1) {
			var access = symbol.split(':')[1]; // really?
			
			this.token('.:',':',1);
			
			this.token('IDENTIFIER',access,access.length,1);
			return access.length + 1;
		} else {
			this.token('SYMBOL',symbol,match[0].length);
			return match[0].length;
		};
	};

	Lexer.prototype.escapeStr = function (str,heredoc,q){
		str = str.replace(MULTILINER,((heredoc) ? ('\\n') : ('')));
		if (q) {
			var r = RegExp(("\\\\[" + q + "]"),"g");
			str = str.replace(r,q);
			str = str.replace(RegExp(("" + q),"g"),'\\$&');
		};
		return str;
		
		// str = str.replace(MULTILINER, '\\n')
		// str = str.replace(/\t/g, '\\t')
	};
	// Matches strings, including multi-line strings. Ensures that quotation marks
	// are balanced within the string's contents, and within nested interpolations.
	Lexer.prototype.stringToken = function (){
		var match,string;
		
		switch (this._chunk.charAt(0)) {
			case "'":
				if (!(match = SIMPLESTR.exec(this._chunk))) { return 0 };
				string = match[0];
				this.token('STRING',this.escapeStr(string),string.length);
				// token 'STRING', (string = match[0]).replace(MULTILINER, '\\\n'), string:length
				break;
			
			case '"':
				if (!(string = this.balancedString(this._chunk,'"'))) { return 0 };
				// what about tripe quoted strings?
				
				if (string.indexOf('{') >= 0) {
					var len = string.length;
					// if this has no interpolation?
					// we are now messing with locations - beware
					this.token('STRING_START',string.charAt(0),1);
					this.interpolateString(string.slice(1,-1));
					this.token('STRING_END',string.charAt(len - 1),1,string.length - 1);
				} else {
					len = string.length;
					// string = string.replace(MULTILINER, '\\\n')
					this.token('STRING',this.escapeStr(string),len);
				};
				break;
			
			default:
			
				return 0;
		
		};
		
		this.moveHead(string);
		return string.length;
	};

	// Matches heredocs, adjusting indentation to the correct level, as heredocs
	// preserve whitespace, but ignore indentation to the left.
	Lexer.prototype.heredocToken = function (){
		var match,heredoc,quote,doc;
		
		if (!(match = HEREDOC.exec(this._chunk))) { return 0 };
		
		heredoc = match[0];
		quote = heredoc.charAt(0);
		var opts = {quote: quote,indent: null,offset: 0};
		doc = this.sanitizeHeredoc(match[2],opts);
		// doc = match[2]
		// console.log "found heredoc {match[0]:length} {doc:length}"
		
		if (quote == '"' && doc.indexOf('{') >= 0) {
			var open = match[1];
			// console.log doc.substr(0,3),match[1]
			// console.log 'heredoc here',open:length,open
			
			this.token('STRING_START',open,open.length);
			this.interpolateString(doc,{heredoc: true,offset: (open.length + opts.offset),quote: quote,indent: opts.realIndent});
			this.token('STRING_END',open,open.length,heredoc.length - open.length);
		} else {
			this.token('STRING',this.makeString(doc,quote,true),0);
		};
		
		this.moveHead(heredoc);
		return heredoc.length;
	};

	// Matches and consumes comments.
	Lexer.prototype.commentToken = function (){
		var match,length,comment,indent,prev;
		
		var typ = 'HERECOMMENT';
		
		if (match = INLINE_COMMENT.exec(this._chunk)) { // .match(INLINE_COMMENT)
			// console.log "match inline comment"
			length = match[0].length;
			indent = match[1];
			comment = match[2];
			
			prev = last(this._tokens);
			var pt = prev && tT(prev);
			var note = '//' + comment.substr(1);
			
			if (this._last && this._last.spaced) {
				note = ' ' + note;
				// console.log "the previous node was SPACED"
			};
			// console.log "comment {note} - indent({indent}) - {length} {comment:length}"
			
			if ((pt && pt != 'INDENT' && pt != 'TERMINATOR') || !pt) {
				// console.log "skip comment"
				// token 'INLINECOMMENT', comment.substr(2)
				// console.log "adding as terminator"
				this.token('TERMINATOR',note,length); // + '\n'
			} else {
				// console.log "add comment ({note})"
				if (pt == 'TERMINATOR') {
					tVs(prev,tV(prev) + note);
					// prev[1] += note
				} else if (pt == 'INDENT') {
					// console.log "adding comment to INDENT: {note}" # why not add directly here?
					this.addLinebreaks(1,note);
				} else {
					// console.log "comment here"
					// should we ever get here?
					this.token(typ,comment.substr(2),length); // are we sure?
				};
			};
			
			return length; // disable now while compiling
		};
		
		// should use exec?
		if (!(match = COMMENT.exec(this._chunk))) { return 0 };
		
		comment = match[0];
		var here = match[1];
		
		if (here) {
			this.token('HERECOMMENT',this.sanitizeHeredoc(here,{herecomment: true,indent: Array(this._indent + 1).join(' ')}),comment.length);
			this.token('TERMINATOR','\n');
		} else {
			this.token('HERECOMMENT',comment,comment.length);
			this.token('TERMINATOR','\n'); // auto? really?
		};
		
		this.moveHead(comment);
		return comment.length;
	};

	// Matches JavaScript interpolated directly into the source via backticks.
	Lexer.prototype.jsToken = function (){
		var match,script;
		
		if (!(this._chunk.charAt(0) == '`' && (match = JSTOKEN.exec(this._chunk)))) { return 0 };
		this.token('JS',(script = match[0]).slice(1,-1));
		return script.length;
	};

	// Matches regular expression literals. Lexing regular expressions is difficult
	// to distinguish from division, so we borrow some basic heuristics from
	// JavaScript and Ruby.
	Lexer.prototype.regexToken = function (){
		var ary;
		var match,length,prev;
		
		if (this._chunk.charAt(0) != '/') { return 0 };
		if (match = HEREGEX.exec(this._chunk)) {
			length = this.heregexToken(match);
			this.moveHead(match[0]);
			return length;
		};
		
		prev = last(this._tokens);
		// FIX
		if (prev && (Imba.indexOf(tT(prev),((prev.spaced) ? (
			NOT_REGEX
		) : (
			NOT_SPACED_REGEX
		))) >= 0)) { return 0 };
		if (!(match = REGEX.exec(this._chunk))) { return 0 };
		var ary = Imba.iterable(match);var m = ary[0],regex = ary[1],flags = ary[2];
		
		this.token('REGEX',("" + regex + flags),m.length);
		return m.length;
	};

	// Matches multiline extended regular expressions.
	// The escaping should rather happen in AST - possibly as an additional flag?
	Lexer.prototype.heregexToken = function (match){
		var ary;
		var ary = Imba.iterable(match);var heregex = ary[0],body = ary[1],flags = ary[2];
		this.token('REGEX',heregex,heregex.length);
		return heregex.length;
	};

	// Matches newlines, indents, and outdents, and determines which is which.
	// If we can detect that the current line is continued onto the the next line,
	// then the newline is suppressed:
	//
	//     elements
	//       .each( ... )
	//       .map( ... )
	//
	// Keeps track of the level of indentation, because a single outdent token
	// can close multiple indents, so we need to know how far in we happen to be.
	Lexer.prototype.lineToken = function (){
		var gutter;
		var match;
		
		if (!(match = MULTI_DENT.exec(this._chunk))) { return 0 };
		
		var indent = match[0];
		var brCount = this.moveHead(indent);
		
		this._seenFor = false;
		// reset column as well?
		var prev = last(this._tokens,1);
		var whitespace = indent.substr(indent.lastIndexOf('\n') + 1);
		var noNewlines = this.unfinished();
		
		if ((/^\n#\s/).test(this._chunk)) {
			this.addLinebreaks(1);
			return 0;
		};
		
		// decide the general line-prefix by the very first line with characters
		
		// if gutter is undefined - we create it on the very first chance we have
		if (this._state.gutter == undefined) {
			this._state.gutter = whitespace;
		};
		
		// if we have a gutter -- remove it
		if (gutter = this._state.gutter || this._opts.gutter) {
			if (whitespace.indexOf(gutter) == 0) {
				whitespace = whitespace.slice(gutter.length);
			} else if (this._chunk[indent.length] === undefined) {
				// if this is the end of code we're okay
				true;
			} else {
				this.warn('incorrect indentation');
				// console.log "GUTTER IS INCORRECT!!",JSON.stringify(indent),JSON.stringify(@chunk[indent:length]),@last # @chunk[indent:length - 1]
			};
			
			// should throw error otherwise?
		};
		
		var size = whitespace.length;
		
		if (this._opts.dropIndentation) {
			return size;
		};
		
		if (size > 0) {
			// seen indent?
			
			if (!this._indentStyle) {
				this._opts.indent = this._indentStyle = whitespace;
			};
			
			var indentSize = 0;
			var offset = 0;
			
			while (true){
				var idx = whitespace.indexOf(this._indentStyle,offset);
				if (idx == offset) {
					indentSize++;
					offset += this._indentStyle.length;
				} else if (offset == whitespace.length) {
					break;
				} else if (this._opts.silent) {
					break;
				} else {
					// workaround to report correct location
					this._loc += indent.length - whitespace.length;
					this.token('INDENT',whitespace,whitespace.length);
					if (!this._opts.silent) {
						return this.error(("inconsistent " + (this._indentStyle) + " indentation"));
					};
				};
			};
			
			size = indentSize;
		};
		
		
		if ((size - this._indebt) == this._indent) {
			if (noNewlines) {
				this.suppressNewlines();
			} else {
				this.newlineToken(brCount);
			};
			return indent.length;
		};
		
		if (size > this._indent) {
			if (noNewlines) {
				this._indebt = size - this._indent;
				this.suppressNewlines();
				return indent.length;
			};
			
			if (this.inTag()) {
				return indent.length;
			};
			
			var diff = size - this._indent + this._outdebt;
			this.closeDef();
			
			var immediate = last(this._tokens);
			
			if (immediate && tT(immediate) == 'TERMINATOR') {
				tTs(immediate,'INDENT');
				// should add terminator inside indent?
				immediate._meta || (immediate._meta = {pre: tV(immediate),post: ''});
				
				// should rather add to meta somehow?!?
				// tVs(immediate,tV(immediate) + '%|%') # crazy
			} else {
				this.token('INDENT',"" + diff,0);
			};
			
			// console.log "indenting", prev, last(@tokens,1)
			// if prev and prev[0] == 'TERMINATOR'
			//   console.log "terminator before indent??"
			
			// check for comments as well ?
			
			this._indents.push(diff);
			this.pushEnd('OUTDENT');
			this._outdebt = this._indebt = 0;
			this.addLinebreaks(brCount);
		} else {
			this._indebt = 0;
			this.outdentToken(this._indent - size,noNewlines,brCount);
			this.addLinebreaks(brCount - 1);
			// console.log "outdent",noNewlines,tokid()
		};
		
		this._indent = size;
		return indent.length;
	};

	// Record an outdent token or multiple tokens, if we happen to be moving back
	// inwards past several recorded indents.
	Lexer.prototype.outdentToken = function (moveOut,noNewlines,newlineCount){
		// here we should also take care to pop / reset the scope-body
		// or context-type for indentation 
		var dent = 0;
		while (moveOut > 0){
			var len = this._indents.length - 1;
			if (this._indents[len] == undefined) {
				moveOut = 0;
			} else if (this._indents[len] == this._outdebt) {
				moveOut -= this._outdebt;
				this._outdebt = 0;
			} else if (this._indents[len] < this._outdebt) {
				this._outdebt -= this._indents[len];
				moveOut -= this._indents[len];
			} else {
				dent = this._indents.pop() - this._outdebt;
				moveOut -= dent;
				this._outdebt = 0;
				
				if (!noNewlines) { this.addLinebreaks(1) };
				
				this.pair('OUTDENT');
				this.token('OUTDENT',"" + dent,0);
			};
		};
		
		if (dent) { this._outdebt -= moveOut };
		
		while (this.lastTokenValue() == ';'){
			this._tokens.pop();
		};
		
		if (!(this.lastTokenType() == 'TERMINATOR' || noNewlines)) { this.token('TERMINATOR','\n',0) };
		// capping scopes so they dont hang around 
		this._scopes.length = this._indents.length;
		
		var ctx = this.context();
		if (ctx == '%' || ctx == 'TAG') { this.pair(ctx) }; // really?
		this.closeDef();
		return this;
	};

	// Matches and consumes non-meaningful whitespace. tokid the previous token
	// as being "spaced", because there are some cases where it makes a difference.
	Lexer.prototype.whitespaceToken = function (){
		var match,nline,prev;
		if (!((match = WHITESPACE.exec(this._chunk)) || (nline = this._chunk.charAt(0) == '\n'))) { return 0 };
		prev = last(this._tokens);
		
		// FIX - why oh why?
		if (prev) {
			if (match) {
				prev.spaced = true;
				// prev.@s = match[0]
				return match[0].length;
			} else {
				prev.newLine = true;
				return 0;
			};
		};
	};

	Lexer.prototype.addNewline = function (){
		return this.token('TERMINATOR','\n');
	};

	Lexer.prototype.moveHead = function (str){
		var br = count(str,'\n');
		return br;
	};


	Lexer.prototype.addLinebreaks = function (count,raw){
		var br;
		
		if (!raw && count == 0) { return this }; // no terminators?
		
		var prev = this._last;
		
		if (!raw) {
			if (count == 1) {
				br = '\n';
			} else if (count == 2) {
				br = '\n\n';
			} else if (count == 3) {
				br = '\n\n\n';
			} else {
				br = repeatString('\n',count);
			};
		};
		// FIX
		if (prev) {
			var t = prev._type; // @lastTyp
			var v = tV(prev);
			
			// we really want to add this
			if (t == 'INDENT') {
				// TODO we want to add to the indent
				// console.log "add the comment to the indent -- pre? {raw} {br}"
				
				var meta = prev._meta || (prev._meta = {pre: '',post: ''});
				meta.post += (raw || br);
				// tVs(v + (raw or br))
				return this;
			} else if (t == 'TERMINATOR') {
				// console.log "already exists terminator {br} {raw}"
				tVs(prev,v + (raw || br));
				return this;
			};
		};
		
		this.token('TERMINATOR',br,0);
		return;
	};

	// Generate a newline token. Consecutive newlines get merged together.
	Lexer.prototype.newlineToken = function (lines){
		
		// while lastTokenValue == ';'
		//	@tokens.pop
		
		this.addLinebreaks(lines);
		
		var ctx = this.context();
		// WARN now import cannot go over multiple lines
		if (ctx == 'TAG' || ctx == 'IMPORT') { this.pair(ctx) };
		this.closeDef(); // close def -- really?
		return this;
	};

	// Use a `\` at a line-ending to suppress the newline.
	// The slash is removed here once its job is done.
	Lexer.prototype.suppressNewlines = function (){
		if (this.value() == '\\') { this._tokens.pop() };
		return this;
	};

	// We treat all other single characters as a token. E.g.: `( ) , . !`
	// Multi-character operators are also literal tokens, so that Jison can assign
	// the proper order of operations. There are some symbols that we tokid specially
	// here. `;` and newlines are both treated as a `TERMINATOR`, we distinguish
	// parentheses that indicate a method call from regular parentheses, and so on.
	Lexer.prototype.literalToken = function (){
		var match,value;
		if (match = OPERATOR.exec(this._chunk)) {
			value = match[0];
			if (CODE.test(value)) this.tagParameters();
		} else {
			value = this._chunk.charAt(0);
		};
		
		var end1 = this._ends[this._ends.length - 1];
		var end2 = this._ends[this._ends.length - 2];
		
		var inTag = end1 == 'TAG_END' || end1 == 'OUTDENT' && end2 == 'TAG_END';
		
		var tokid = value;
		var prev = last(this._tokens);
		var pt = prev && tT(prev);
		var pv = prev && tV(prev);
		var length = value.length;
		
		// is this needed?
		if (value == '=' && prev) {
			
			if (pv == '||' || pv == '&&') { // in ['||', '&&']
				tTs(prev,'COMPOUND_ASSIGN');
				tVs(prev,pv + '='); // need to change the length as well
				prev._len = this._loc - prev._loc + value.length;
				return value.length;
			};
		};
		
		if (value == ';') {
			this._seenFor = false;
			tokid = 'TERMINATOR';
		} else if (value == '(' && inTag && pt != '=' && prev.spaced) { // FIXed
			// console.log 'spaced before ( in tokid'
			// FIXME - should rather add a special token like TAG_PARAMS_START
			this.token(',',',');
		} else if (value == '->' && inTag) {
			tokid = 'TAG_END';
			this.pair('TAG_END');
		} else if (value == '=>' && inTag) {
			tokid = 'TAG_END';
			this.pair('TAG_END');
		} else if (value == '/>' && inTag) {
			tokid = 'TAG_END';
			this.pair('TAG_END');
		} else if (value == '>' && inTag) {
			tokid = 'TAG_END';
			this.pair('TAG_END');
		} else if (value == '>' && this.context() == 'DEF') {
			// console.log('picked up >!!')
			tokid = 'DEF_FRAGMENT';
			
			// elif value is 'TERMINATOR' and end1 is '%' 
			// 	closeSelector()
		} else if (value == 'TERMINATOR' && end1 == 'DEF') {
			this.closeDef();
		} else if (value == '&' && this.context() == 'DEF') {
			// console.log("okay!")
			tokid = 'BLOCK_ARG';
			// change the next identifier instead?
		} else if (value == '*' && this._chunk.charAt(1).match(/[A-Za-z\_\@\[]/) && (prev.spaced || [',','(','[','{','|','\n','\t'].indexOf(pv) >= 0)) {
			tokid = "SPLAT";
		} else if (value == '√') {
			tokid = 'SQRT';
		} else if (value == 'ƒ') {
			tokid = 'DO';
		} else if (Imba.indexOf(value,MATH) >= 0) {
			tokid = 'MATH';
		} else if (Imba.indexOf(value,COMPARE) >= 0) {
			tokid = 'COMPARE';
		} else if (Imba.indexOf(value,COMPOUND_ASSIGN) >= 0) {
			tokid = 'COMPOUND_ASSIGN';
		} else if (Imba.indexOf(value,UNARY) >= 0) {
			tokid = 'UNARY';
		} else if (Imba.indexOf(value,SHIFT) >= 0) {
			tokid = 'SHIFT';
		} else if (Imba.indexOf(value,LOGIC) >= 0) {
			tokid = 'LOGIC'; // or value is '?' and prev?:spaced 
		} else if (prev && !prev.spaced) {
			if (value == '(' && Imba.indexOf(pt,CALLABLE) >= 0) {
				// not using this ???
				// prev[0] = 'FUNC_EXIST' if prev[0] is '?'
				tokid = 'CALL_START';
			} else if (value == '[' && Imba.indexOf(pt,INDEXABLE) >= 0) {
				tokid = 'INDEX_START';
				if (pt == '?') { tTs(prev,'INDEX_SOAK') };
				// prev[0] = 'INDEX_SOAK' if prev[0] == '?'
			};
		};
		
		switch (value) {
			case '(':
			case '{':
			case '[':
				this.pushEnd(INVERSES[value]);break;
			
			case ')':
			case '}':
			case ']':
				this.pair(value);break;
		
		};
		
		// hacky rule to try to allow for tuple-assignments in blocks
		// if value is ',' and prev[0] is 'IDENTIFIER' and @tokens[@tokens:length - 2][0] in ['TERMINATOR','INDENT']
		//   # token "TUPLE", "tuple" # should rather insert it somewhere else, no?
		//   console.log("found comma")
		
		this.token(tokid,value,value.length);
		return value.length;
	};

	// Token Manipulators
	// ------------------

	// Sanitize a heredoc or herecomment by
	// erasing all external indentation on the left-hand side.
	Lexer.prototype.sanitizeHeredoc = function (doc,options){
		var match;
		var indent = options.indent;
		var herecomment = options.herecomment;
		
		if (herecomment) {
			if (HEREDOC_ILLEGAL.test(doc)) {
				this.error("block comment cannot contain '*/' starting");
			};
			if (doc.indexOf('\n') <= 0) { return doc };
		} else {
			var length_;while (match = HEREDOC_INDENT.exec(doc)){
				var attempt = match[1];
				if (indent == null || 0 < (length_ = attempt.length) && length_ < indent.length) {
					indent = attempt;
				};
			};
		};
		
		if (indent) { doc = doc.replace(RegExp(("\\n" + indent),"g"),'\n') };
		if (!herecomment) {
			if (doc[0] == '\n') {
				options.offset = indent.length + 1;
			};
			doc = doc.replace(/^\n/,'');
		};
		options.realIndent = indent;
		return doc;
	};

	// A source of ambiguity in our grammar used to be parameter lists in function
	// definitions versus argument lists in function calls. Walk backwards, tokidging
	// parameters specially in order to make things easier for the parser.
	Lexer.prototype.tagParameters = function (){
		var tok;
		if (this.lastTokenType() != ')') { return this };
		var stack = [];
		var tokens = this._tokens;
		var i = tokens.length;
		
		tTs(tokens[--i],'PARAM_END');
		
		while (tok = tokens[--i]){
			var t = tT(tok);
			switch (t) {
				case ')':
					stack.push(tok);
					break;
				
				case '(':
				case 'CALL_START':
					if (stack.length) {
						stack.pop();
					} else if (t == '(') {
						tTs(tok,'PARAM_START');
						return this;
					} else {
						return this;
					};
					break;
			
			};
		};
		
		return this;
	};

	// Close up all remaining open blocks at the end of the file.
	Lexer.prototype.closeIndentation = function (){
		if (this.context() == 'IMPORT') { this.pair(this.context()) };
		this.closeDef();
		this.closeSelector();
		return this.outdentToken(this._indent,false,0);
	};

	// Matches a balanced group such as a single or double-quoted string. Pass in
	// a series of delimiters, all of which must be nested correctly within the
	// contents of the string. This method allows us to have strings within
	// interpolations within strings, ad infinitum.
	Lexer.prototype.balancedString = function (str,end){
		var match,letter,prev;
		
		var stack = [end];
		var i = 0;
		
		// could it not happen here?
		while (i < (str.length - 1)){
			i++;
			letter = str.charAt(i);
			switch (letter) {
				case '\\':
					i++;
					continue;
					break;
				
				case end:
					stack.pop();
					if (!stack.length) {
						var v = str.slice(0,i + 1);
						return v;
					};
					end = stack[stack.length - 1];
					continue;
					break;
			
			};
			
			if (end == '}' && (letter == '"' || letter == "'")) {
				stack.push(end = letter);
			} else if (end == '}' && letter == '/' && (match = (HEREGEX.exec(str.slice(i)) || REGEX.exec(str.slice(i))))) {
				i += match[0].length - 1;
			} else if (end == '}' && letter == '{') {
				stack.push(end = '}');
			} else if (end == '"' && letter == '{') {
				stack.push(end = '}');
			};
			prev = letter;
		};
		
		if (!this._opts.silent) { return this.error(("missing " + (stack.pop()) + ", starting")) };
	};

	// Expand variables and expressions inside double-quoted strings using
	// braces for substitution of arbitrary expressions.
	//
	//     "Hello {name.capitalize}."
	//
	// If it encounters an interpolation, this method will recursively create a
	// new Lexer, tokenize the interpolated contents, and merge them into the
	// token stream.
	Lexer.prototype.interpolateString = function (str,options){
		
		if(options === undefined) options = {};
		var heredoc = options.heredoc;
		var quote = options.quote;
		var regex = options.regex;
		var prefix = options.prefix;
		var indent = options.indent;
		
		var startLoc = this._loc;
		var tokens = [];
		var pi = 0;
		var i = -1;
		var locOffset = options.offset || 1;
		var strlen = str.length;
		var letter;
		var expr;
		
		var isInterpolated = false;
		// out of bounds
		
		while (letter = str[i += 1]){
			if (letter == '\\') {
				i += 1;
				continue;
			};
			
			if (letter == '\n' && indent) {
				locOffset += indent.length;
			};
			
			if (!(str[i] == '{' && (expr = this.balancedString(str.slice(i),'}')))) {
				continue;
			};
			
			isInterpolated = true;
			
			// these have no real sense of location or anything?
			if (pi < i) {
				// this is the prefix-string - before any item
				var tok = new Token('NEOSTRING',this.escapeStr(str.slice(pi,i),heredoc,quote),this._loc + pi + locOffset,i - pi);
				// tok.@loc = @loc + pi
				// tok.@len = i - pi + 2
				tokens.push(tok);
			};
			
			tokens.push(new Token('{{','{',this._loc + i + locOffset,1));
			
			var inner = expr.slice(1,-1);
			
			// remove leading spaces 
			// need to keep track of how much whitespace we dropped from the start
			inner = inner.replace(/^[^\n\S]+/,'');
			
			if (inner.length) {
				// we need to remember the loc we start at
				// console.log('interpolate from loc',@loc,i)
				// really? why not just add to the stack??
				// what about the added 
				// should share with the selector no?
				// console.log "tokenize inner parts of string",inner
				var spaces = 0;
				var offset = this._loc + i + (expr.length - inner.length) - 1;
				// why create a whole new lexer? Should rather reuse one
				// much better to simply move into interpolation mode where
				// we continue parsing until we meet unpaired }
				var nested = new Lexer().tokenize(inner,{inline: true,rewrite: false,loc: offset + locOffset});
				// console.log nested.pop
				
				if (nested[0] && tT(nested[0]) == 'TERMINATOR') {
					nested.shift();
				};
				
				if (nested.length) {
					tokens.push.apply(tokens,nested); // T.token('TOKENS',nested,0)
				};
			};
			
			// should rather add the amount by which our lexer has moved?
			i += expr.length - 1;
			tokens.push(new Token('}}','}',this._loc + i + locOffset,1));
			pi = i + 1;
		};
		
		// adding the last part of the string here
		if (i >= pi && pi < str.length) {
			// set the length as well - or?
			// the string after?
			// console.log 'push neostring'
			tokens.push(new Token('NEOSTRING',this.escapeStr(str.slice(pi),heredoc,quote),this._loc + pi + locOffset,str.length - pi));
		};
		
		// console.log tokens:length
		if (regex) { return tokens };
		
		if (!tokens.length) { return this.token('NEOSTRING','""') };
		
		for (var j = 0, len = tokens.length; j < len; j++) {
			this._tokens.push(tokens[j]);
		};
		
		return tokens;
	};

	// Matches a balanced group such as a single or double-quoted string. Pass in
	// a series of delimiters, all of which must be nested correctly within the
	// contents of the string. This method allows us to have strings within
	// interpolations within strings, ad infinitum.
	Lexer.prototype.balancedSelector = function (str,end){
		var prev;
		var letter;
		var stack = [end];
		// FIXME
		for (var len = str.length, i = 1, rd = len - i; (rd > 0) ? (i < len) : (i > len); (rd > 0) ? (i++) : (i--)) {
			switch (letter = str.charAt(i)) {
				case '\\':
					i++;
					continue;
					break;
				
				case end:
					stack.pop();
					if (!stack.length) {
						return str.slice(0,i + 1);
					};
					
					end = stack[stack.length - 1];
					continue;
					break;
			
			};
			if (end == '}' && letter == [')']) {
				stack.push(end = letter);
			} else if (end == '}' && letter == '{') {
				stack.push(end = '}');
			} else if (end == ')' && letter == '{') {
				stack.push(end = '}');
			};
			prev = letter; // what, why?
		};
		
		return this.error(("missing " + (stack.pop()) + ", starting"));
	};

	// Pairs up a closing token, ensuring that all listed pairs of tokens are
	// correctly balanced throughout the course of the token stream.
	Lexer.prototype.pair = function (tok){
		var wanted = last(this._ends);
		if (tok != wanted) {
			if (!('OUTDENT' == wanted)) { this.error(("unmatched " + tok)) };
			var size = last(this._indents);
			this._indent -= size;
			this.outdentToken(size,true,0);
			return this.pair(tok);
		};
		return this.popEnd();
	};


	// Helpers
	// -------

	// Add a token to the results, taking note of the line number.
	Lexer.prototype.token = function (id,value,len,offset){
		this._lastTyp = id;
		this._lastVal = value;
		var tok = this._last = new Token(id,value,this._loc + (offset || 0),len || 0);
		this._tokens.push(tok);
		return;
	};

	Lexer.prototype.lastTokenType = function (){
		var token = this._tokens[this._tokens.length - 1];
		return (token) ? (tT(token)) : ('NONE');
	};

	Lexer.prototype.lastTokenValue = function (){
		var token = this._tokens[this._tokens.length - 1];
		return (token) ? (token._value) : ('');
	};

	// Peek at a tokid in the current token stream.
	Lexer.prototype.tokid = function (index,val){
		var tok;
		if (tok = last(this._tokens,index)) {
			if (val) { tTs(tok,val) };
			return tT(tok);
		} else {
			return null;
		};
	};

	// Peek at a value in the current token stream.
	Lexer.prototype.value = function (index,val){
		var tok;
		if (tok = last(this._tokens,index)) {
			if (val) { tVs(tok,val) };
			return tV(tok);
		} else {
			return null;
		};
	};


	// Are we in the midst of an unfinished expression?
	Lexer.prototype.unfinished = function (){
		if (LINE_CONTINUER.test(this._chunk)) { return true };
		return UNFINISHED.indexOf(this._lastTyp) >= 0;
	};

	// Converts newlines for string literals.
	Lexer.prototype.escapeLines = function (str,heredoc){
		return str.replace(MULTILINER,((heredoc) ? ('\\n') : ('')));
	};

	// Constructs a string token by escaping quotes and newlines.
	Lexer.prototype.makeString = function (body,quote,heredoc){
		if (!body) { return quote + quote };
		body = body.replace(/\\([\s\S])/g,function(match,contents) {
			return ((contents == '\n' || contents == quote)) ? (contents) : (match);
		});
		// Does not work now
		body = body.replace(RegExp(("" + quote),"g"),'\\$&');
		return quote + this.escapeLines(body,heredoc) + quote;
	};

	// Throws a syntax error on the current `@line`.
	Lexer.prototype.error = function (message,len){
		if ((typeof this._line=='number'||this._line instanceof Number)) { message = ("" + message + " on line " + (this._line)) };
		
		if (len) {
			message += (" [" + (this._loc) + ":" + (this._loc + len) + "]");
		};
		
		var err = new SyntaxError(message);
		err.line = this._line;
		// err:columnNumber
		err = new ERR.ImbaParseError(err,{tokens: this._tokens,pos: this._tokens.length});
		err.region = [this._loc,this._loc + (len || 0)];
		throw err;
	};

	Lexer.prototype.warn = function (message){
		var ary = this._tokens.warnings || (this._tokens.warnings = []);
		ary.push(message);
		console.warn(message);
		return this;
	};



/***/ },
/* 7 */
/***/ function(module, exports) {

	// List of the token pairs that must be balanced.
	var BALANCED_PAIRS = exports.BALANCED_PAIRS = [
		['(',')'],
		['[',']'],
		['{','}'],
		['{{','}}'],
		['INDENT','OUTDENT'],
		['CALL_START','CALL_END'],
		['PARAM_START','PARAM_END'],
		['INDEX_START','INDEX_END'],
		['TAG_START','TAG_END'],
		['BLOCK_PARAM_START','BLOCK_PARAM_END']
	];

	// The inverse mappings of `BALANCED_PAIRS` we're trying to fix up, so we can
	// look things up from either end.
	var INVERSES = exports.INVERSES = {};

	// The tokens that signal the start/end of a balanced pair.
	// var EXPRESSION_START = []
	// var EXPRESSION_END   = []

	for (var i = 0, ary = Imba.iterable(BALANCED_PAIRS), len = ary.length, pair; i < len; i++) {
		pair = ary[i];
		var left = pair[0];
		var rite = pair[1];
		INVERSES[rite] = left;
		INVERSES[left] = rite;
	};


	var ALL_KEYWORDS = exports.ALL_KEYWORDS = [
		'true','false','null','this',
		'delete','typeof','in','instanceof',
		'throw','break','continue','debugger',
		'if','else','switch','for','while','do','try','catch','finally',
		'class','extends','super','return',
		'undefined','then','unless','until','loop','of','by',
		'when','def','tag','do','elif','begin','var','let','self','await','import',
		'and','or','is','isnt','not','yes','no','isa','case','nil','require'
	];

	var TOK = exports.TOK = {
		TERMINATOR: 'TERMINATOR',
		INDENT: 'INDENT',
		OUTDENT: 'OUTDENT',
		DEF_BODY: 'DEF_BODY',
		THEN: 'THEN',
		CATCH: 'CATCH'
	};

	var OPERATOR_ALIASES = exports.OPERATOR_ALIASES = {
		and: '&&',
		or: '||',
		is: '==',
		isnt: '!=',
		isa: 'instanceof'
	};

	var HEREGEX_OMIT = exports.HEREGEX_OMIT = /\s+(?:#.*)?/g;
	var HEREGEX = exports.HEREGEX = /^\/{3}([\s\S]+?)\/{3}([imgy]{0,4})(?!\w)/;


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	// create separate error-types with all the logic

	var util = __webpack_require__(4);

	function ImbaParseError(e,o){
		this.error = e;
		this.message = e.message;
		this.filename = e.filename;
		this.line = e.line;
		this._options = o || {};
		this;
	};

	Imba.subclass(ImbaParseError,Error);
	exports.ImbaParseError = ImbaParseError; // export class 
	ImbaParseError.wrap = function (err){
		// what about the stacktrace?
		return new ImbaParseError(err);
	};

	ImbaParseError.prototype.set = function (opts){
		this._options || (this._options = {});
		for (var i = 0, keys = Object.keys(opts), l = keys.length; i < l; i++){
			this._options[keys[i]] = opts[keys[i]];
		};
		return this;
	};

	ImbaParseError.prototype.start = function (){
		var o = this._options;
		var idx = o.pos - 1;
		var tok = o.tokens && o.tokens[idx];
		while (tok && tok._loc == -1){
			tok = o.tokens[--idx];
		};
		return tok;
	};

	ImbaParseError.prototype.desc = function (){
		var o = this._options;
		var msg = this.message;
		if (o.token && o.token._loc == -1) {
			return 'Syntax Error';
		} else {
			return msg;
		};
	};

	ImbaParseError.prototype.loc = function (){
		var start_;
		return (start_ = this.start()) && start_.region  &&  start_.region();
	};

	ImbaParseError.prototype.toJSON = function (){
		var o = this._options;
		var tok = this.start();
		return {warn: true,message: this.desc(),loc: this.loc()};
	};

	ImbaParseError.prototype.excerpt = function (pars){
		
		if(!pars||pars.constructor !== Object) pars = {};
		var gutter = pars.gutter !== undefined ? pars.gutter : true;
		var colors = pars.colors !== undefined ? pars.colors : false;
		var details = pars.details !== undefined ? pars.details : true;
		var code = this._code;
		var loc = this.loc();
		var lines = code.split(/\n/g);
		var locmap = util.locationToLineColMap(code);
		var lc = locmap[loc[0]] || [0,0];
		var ln = lc[0];
		var col = lc[1];
		var line = lines[ln];
		
		var ln0 = Math.max(0,ln - 2);
		var ln1 = Math.min(ln0 + 5,lines.length);
		var lni = ln - ln0;
		var l = ln0;
		
		var res = [];while (l < ln1){
			res.push((line = lines[l++]));
		};var out = res;
		
		if (gutter) {
			out = out.map(function(line,i) {
				var prefix = ("" + (ln0 + i + 1));
				while (prefix.length < String(ln1).length){
					prefix = (" " + prefix);
				};
				if (i == lni) {
					return ("   -> " + prefix + " | " + line);
				} else {
					return ("      " + prefix + " | " + line);
				};
			});
		};
		
		if (colors) {
			out[lni] = util.ansi.red(util.ansi.bold(out[lni]));
		};
		
		if (details) {
			out.unshift(this.message);
		};
		
		return out.join('\n');
	};

	ImbaParseError.prototype.prettyMessage = function (){
		var excerpt;
		return excerpt = this.excerpt();
	};


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {
	// The Imba language has a good deal of optional syntax, implicit syntax,
	// and shorthand syntax. This can greatly complicate a grammar and bloat
	// the resulting parse table. Instead of making the parser handle it all, we take
	// a series of passes over the token stream, using this **Rewriter** to convert
	// shorthand into the unambiguous long form, add implicit indentation and
	// parentheses, and generally clean things up.


	var T = __webpack_require__(3);
	var Token = T.Token;

	var v8;


	var constants$ = __webpack_require__(7), INVERSES = constants$.INVERSES, BALANCED_PAIRS = constants$.BALANCED_PAIRS, TOK = constants$.TOK;

	// var TERMINATOR = TERMINATOR

	var TERMINATOR = 'TERMINATOR';
	var INDENT = 'INDENT';
	var OUTDENT = 'OUTDENT';
	var DEF_BODY = 'DEF_BODY';
	var THEN = 'THEN';
	var CATCH = 'CATCH';

	var arrayToHash = function(ary) {
		var hash = {};
		for (var i = 0, items = Imba.iterable(ary), len = items.length; i < len; i++) {
			hash[items[i]] = 1;
		};
		return hash;
	};

	// var EXPRESSION_START = ['(','[','{','INDENT','CALL_START','PARAM_START','INDEX_START','BLOCK_PARAM_START','STRING_START','{{', 'TAG_START']
	// var EXPRESSION_END   = [')',']','}','OUTDENT','CALL_END','PARAM_END','INDEX_END','BLOCK_PARAM_END','STRING_END','}}', 'TAG_END']
	// Tokens that indicate the close of a clause of an expression.
	var EXPRESSION_CLOSE = [')',']','}','OUTDENT','CALL_END','PARAM_END','INDEX_END','BLOCK_PARAM_END','STRING_END','}}','TAG_END','CATCH','WHEN','ELSE','FINALLY'];

	var EXPRESSION_CLOSE_HASH = arrayToHash(EXPRESSION_CLOSE);

	var EXPRESSION_START = {
		'(': 1,
		'[': 1,
		'{': 1,
		'{{': 1,
		'INDENT': 1,
		'CALL_START': 1,
		'PARAM_START': 1,
		'INDEX_START': 1,
		'BLOCK_PARAM_START': 1,
		'STRING_START': 1,
		'TAG_START': 1
	};

	var EXPRESSION_END = {
		')': 1,
		']': 1,
		'}': 1,
		'}}': 1,
		'OUTDENT': 1,
		'CALL_END': 1,
		'PARAM_END': 1,
		'INDEX_END': 1,
		'BLOCK_PARAM_END': 1,
		'STRING_END': 1,
		'TAG_END': 1
	};

	var SINGLE_LINERS = {
		ELSE: 1,
		TRY: 1,
		FINALLY: 1,
		THEN: 1,
		BLOCK_PARAM_END: 1,
		DO: 1,
		BEGIN: 1,
		CATCH_VAR: 1
	};

	var SINGLE_CLOSERS_MAP = {
		TERMINATOR: true,
		CATCH: true,
		FINALLY: true,
		ELSE: true,
		OUTDENT: true,
		LEADING_WHEN: true
	};

	var IMPLICIT_FUNC_MAP = {
		'IDENTIFIER': 1,
		'SUPER': 1,
		'@': 1,
		'THIS': 1,
		'SELF': 1,
		'TAG_END': 1,
		'IVAR': 1,
		'GVAR': 1,
		'CONST': 1,
		'ARGVAR': 1,
		'NEW': 1,
		'BREAK': 1,
		'CONTINUE': 1,
		'RETURN': 1
	};

	var IMPLICIT_CALL_MAP = {
		'SELECTOR': 1,
		'IDENTIFIER': 1,
		'NUMBER': 1,
		'STRING': 1,
		'SYMBOL': 1,
		'JS': 1,
		'REGEX': 1,
		'NEW': 1,
		'CLASS': 1,
		'IF': 1,
		'UNLESS': 1,
		'TRY': 1,
		'SWITCH': 1,
		'THIS': 1,
		'BOOL': 1,
		'TRUE': 1,
		'FALSE': 1,
		'NULL': 1,
		'UNDEFINED': 1,
		'UNARY': 1,
		'SUPER': 1,
		'IVAR': 1,
		'GVAR': 1,
		'CONST': 1,
		'ARGVAR': 1,
		'SELF': 1,
		'@': 1,
		'[': 1,
		'(': 1,
		'{': 1,
		'--': 1,
		'++': 1,
		'TAGID': 1,
		'#': 1,
		'TAG_START': 1,
		'PARAM_START': 1,
		'SELECTOR_START': 1,
		'STRING_START': 1,
		'IDREF': 1,
		'SPLAT': 1,
		'DO': 1,
		'BLOCK_ARG': 1,
		'FOR': 1,
		'CONTINUE': 1,
		'BREAK': 1
	};


	var IDENTIFIERS = ['IDENTIFIER','GVAR','IVAR','CVAR','CONST','ARGVAR'];



	// Tokens that, if followed by an `IMPLICIT_CALL`, indicate a function invocation.
	var IMPLICIT_FUNC = ['IDENTIFIER','SUPER','@','THIS','SELF','EVENT','TRIGGER','TAG_END','IVAR',
	'GVAR','CONST','ARGVAR','NEW','BREAK','CONTINUE','RETURN'];

	// If preceded by an `IMPLICIT_FUNC`, indicates a function invocation.
	var IMPLICIT_CALL = [
		'SELECTOR','IDENTIFIER','NUMBER','STRING','SYMBOL','JS','REGEX','NEW','PARAM_START','CLASS',
		'IF','UNLESS','TRY','SWITCH','THIS','BOOL','TRUE','FALSE','NULL','UNDEFINED','UNARY','SUPER','IVAR','GVAR','CONST','ARGVAR','SELF',
		'@','[','(','{','--','++','SELECTOR','TAG_START','TAGID','#','SELECTOR_START','IDREF','SPLAT','DO','BLOCK_ARG',
		'FOR','STRING_START','CONTINUE','BREAK'
	]; // '->', '=>', why does it not work with symbol?

	var IMPLICIT_INDENT_CALL = [
		'FOR'
	];
	// is not do an implicit call??

	var IMPLICIT_UNSPACED_CALL = ['+','-'];

	// Tokens indicating that the implicit call must enclose a block of expressions.
	var IMPLICIT_BLOCK = ['{','[',',','BLOCK_PARAM_END','DO']; // '->', '=>', 

	var IMPLICIT_BLOCK_MAP = arrayToHash(IMPLICIT_BLOCK);

	var CONDITIONAL_ASSIGN = ['||=','&&=','?=','&=','|='];
	var COMPOUND_ASSIGN = ['-=','+=','/=','*=','%=','||=','&&=','?=','<<=','>>=','>>>=','&=','^=','|='];
	var UNARY = ['!','~','NEW','TYPEOF','DELETE'];
	var LOGIC = ['&&','||','&','|','^'];

	// optimize for fixed arrays
	var NO_IMPLICIT_BLOCK_CALL = [
		'CALL_END','=','DEF_BODY','(','CALL_START',',',':','RETURN',
		'-=','+=','/=','*=','%=','||=','&&=','?=','<<=','>>=','>>>=','&=','^=','|='
	]; // .concat(COMPOUND_ASSIGN)

	var NO_CALL_TAG = ['CLASS','IF','UNLESS','TAG','WHILE','FOR','UNTIL','CATCH','FINALLY','MODULE','LEADING_WHEN'];

	var NO_CALL_TAG_MAP = arrayToHash(NO_CALL_TAG);


	// console.log NO_IMPLICIT_BLOCK_CALL:length
	// NO_IMPLICIT_BLOCK_CALL
	// IMPLICIT_COMMA = ['->', '=>', '{', '[', 'NUMBER', 'STRING', 'SYMBOL', 'IDENTIFIER','DO']

	var IMPLICIT_COMMA = ['DO'];

	// Tokens that always mark the end of an implicit call for single-liners.
	var IMPLICIT_END = ['POST_IF','POST_UNLESS','POST_FOR','WHILE','UNTIL','WHEN','BY','LOOP','TERMINATOR','DEF_BODY','DEF_FRAGMENT'];

	var IMPLICIT_END_MAP = {
		POST_IF: true,
		POST_UNLESS: true,
		POST_FOR: true,
		WHILE: true,
		UNTIL: true,
		WHEN: true,
		BY: true,
		LOOP: true,
		TERMINATOR: true,
		DEF_BODY: true,
		DEF_FRAGMENT: true
	};

	// Single-line flavors of block expressions that have unclosed endings.
	// The grammar can't disambiguate them, so we insert the implicit indentation.
	// var SINGLE_LINERS    = ['ELSE', 'TRY', 'FINALLY', 'THEN','BLOCK_PARAM_END','DO','BEGIN','CATCH_VAR'] # '->', '=>', really?
	var SINGLE_CLOSERS = ['TERMINATOR','CATCH','FINALLY','ELSE','OUTDENT','LEADING_WHEN'];
	var LINEBREAKS = ['TERMINATOR','INDENT','OUTDENT']; // Tokens that end a line.

	var CALLCOUNT = 0;
	// Based on the original rewriter.coffee from CoffeeScript
	function Rewriter(){
		this._tokens = [];
		this._options = {};
		this._len = 0;
		this._starter = null;
		this;
	};

	exports.Rewriter = Rewriter; // export class 
	Rewriter.prototype.reset = function (){
		return this;
	};

	Rewriter.prototype.tokens = function (){
		return this._tokens;
	};

	// Helpful snippet for debugging:
	//     console.log (t[0] + '/' + t[1] for t in @tokens).join ' '
	// Rewrite the token stream in multiple passes, one logical filter at
	// a time. This could certainly be changed into a single pass through the
	// stream, with a big ol' efficient switch, but it's much nicer to work with
	// like this. The order of these passes matters -- indentation must be
	// corrected before implicit parentheses can be wrapped around blocks of code.
	Rewriter.prototype.rewrite = function (tokens,opts){
		if(opts === undefined) opts = {};
		this.reset();
		
		this._tokens = tokens;
		this._options = opts;
		
		var i = 0;
		var k = tokens.length;
		// flag empty methods
		while (i < (k - 1)){
			var token = tokens[i];
			
			if (token._type == 'DEF_BODY') {
				var next = tokens[i + 1];
				if (next && next._type == TERMINATOR) {
					token._type = 'DEF_EMPTY';
				};
			};
			i++;
		};
		
		this.step("all");
		if (CALLCOUNT) { console.log(CALLCOUNT) };
		return this._tokens;
	};

	Rewriter.prototype.all = function (){
		this.step("ensureFirstLine");
		this.step("removeLeadingNewlines");
		this.step("removeMidExpressionNewlines");
		this.step("tagDefArguments");
		this.step("closeOpenCalls");
		this.step("closeOpenIndexes");
		this.step("closeOpenTags");
		this.step("addImplicitIndentation");
		this.step("tagPostfixConditionals");
		this.step("addImplicitBraces");
		return this.step("addImplicitParentheses");
	};

	Rewriter.prototype.step = function (fn){
		
		
		this[fn]();
		
		if (v8) {
			var opt = v8.getOptimizationStatus(this[fn]);
			if (opt != 1) {
				process.stdout.write(("" + fn + ": " + opt + "\n"));
				v8.optimizeFunctionOnNextCall(this[fn]);
			};
			
			// if opt == 2
			// v8.optimizeFunctionOnNextCall(this[fn])
			//	v8:helpers.printStatus(this[fn])
			// console.log v8.getOptimizationStatus(this[fn])
		};
		
		
		
		return;
	};

	// Rewrite the token stream, looking one token ahead and behind.
	// Allow the return value of the block to tell us how many tokens to move
	// forwards (or backwards) in the stream, to make sure we don't miss anything
	// as tokens are inserted and removed, and the stream changes length under
	// our feet.
	Rewriter.prototype.scanTokens = function (block){
		var tokens = this._tokens;
		
		var i = 0;
		while (i < tokens.length){
			i += block.call(this,tokens[i],i,tokens);
		};
		return true;
	};

	Rewriter.prototype.detectEnd = function (i,condition,action,state){
		
		if(state === undefined) state = {};
		var tokens = this._tokens;
		var levels = 0;
		var token;
		var t,v;
		
		while (i < tokens.length){
			token = tokens[i];
			
			if (levels == 0 && condition.call(this,token,i,tokens,state)) {
				return action.call(this,token,i,tokens,state);
			};
			
			if (!token || levels < 0) {
				return action.call(this,token,i - 1,tokens,state);
			};
			
			t = token._type;
			
			if (EXPRESSION_START[t]) {
				levels += 1;
			} else if (EXPRESSION_END[t]) {
				levels -= 1;
			};
			i += 1;
		};
		
		return i - 1;
	};

	Rewriter.prototype.ensureFirstLine = function (){
		var token = this._tokens[0];
		
		if (token._type === TERMINATOR) {
			this._tokens.unshift(T.token('BODYSTART','BODYSTART'));
			// @tokens = [T.token('BODYSTART','BODYSTART')].concat(@tokens)
		};
		return;
	};

	// Leading newlines would introduce an ambiguity in the grammar, so we
	// dispatch them here.
	Rewriter.prototype.removeLeadingNewlines = function (){
		var at = 0;
		
		var i = 0; // @tokens:length
		var tokens = this._tokens;
		var token;
		var l = tokens.length;
		
		while (i < l){
			token = tokens[i];
			if (token._type !== TERMINATOR) {
				at = i;break;
			};
			i++;
		};
		
		if (at) { tokens.splice(0,at) };
		return;
	};

	// Some blocks occur in the middle of expressions -- when we're expecting
	// this, remove their trailing newlines.
	Rewriter.prototype.removeMidExpressionNewlines = function (){
		
		return this.scanTokens(function(token,i,tokens) { // do |token,i,tokens|
			var next = (tokens.length > (i + 1)) ? (tokens[i + 1]) : (null);
			if (!(token._type === TERMINATOR && next && EXPRESSION_CLOSE_HASH[next._type])) { return 1 }; // .indexOf(next) >= 0
			if (next && next._type == OUTDENT) { return 1 };
			// return 1
			tokens.splice(i,1);
			return 0;
		});
	};


	Rewriter.prototype.tagDefArguments = function (){
		return true;
	};

	// The lexer has tagged the opening parenthesis of a method call. Match it with
	// its paired close. We have the mis-nested outdent case included here for
	// calls that close on the same line, just before their outdent.
	Rewriter.prototype.closeOpenCalls = function (){
		var condition = function(token,i,tokens) {
			var t = token._type;
			return (t == ')' || t == 'CALL_END') || t == OUTDENT && this.tokenType(i - 1) == ')';
		};
		
		var action = function(token,i,tokens) {
			var t = token._type;
			if (t === OUTDENT) { token = tokens[i - 1] };
			// var tok = @tokens[t == OUTDENT ? i - 1 : i]
			token._type = 'CALL_END';
			return;
			// T.setTyp(tok,'CALL_END')
		};
		
		this.scanTokens(function(token,i,tokens) {
			if (token._type === 'CALL_START') { this.detectEnd(i + 1,condition,action) };
			return 1;
		});
		
		return;
	};

	// The lexer has tagged the opening parenthesis of an indexing operation call.
	// Match it with its paired close.
	Rewriter.prototype.closeOpenIndexes = function (){
		// why differentiate between index and []
		var self = this;
		var condition = function(token,i) { return token._type === ']' || token._type === 'INDEX_END'; };
		var action = function(token,i) { return token._type = 'INDEX_END'; };
		
		return self.scanTokens(function(token,i,tokens) {
			if (token._type === 'INDEX_START') { self.detectEnd(i + 1,condition,action) };
			return 1;
		});
	};

	// The lexer has tagged the opening parenthesis of an indexing operation call.
	// Match it with its paired close. Should be done in lexer directly
	Rewriter.prototype.closeOpenTags = function (){
		var self = this;
		var condition = function(token,i) { return token._type == '>' || token._type == 'TAG_END'; };
		var action = function(token,i) { return token._type = 'TAG_END'; };
		
		return self.scanTokens(function(token,i,tokens) {
			if (token._type === 'TAG_START') { self.detectEnd(i + 1,condition,action) };
			return 1;
		});
	};

	Rewriter.prototype.addImplicitBlockCalls = function (){
		var i = 1;
		var tokens = this._tokens;
		
		// can use shared states for these
		while (i < tokens.length){
			
			var token = tokens[i];
			var t = token._type;
			var v = token._value;
			// hmm
			if (t == 'DO' && (v == 'INDEX_END' || v == 'IDENTIFIER' || v == 'NEW')) {
				tokens.splice(i + 1,0,T.token('CALL_END',')'));
				tokens.splice(i + 1,0,T.token('CALL_START','('));
				i++;
			};
			i++;
		};
		
		return;
	};

	// Object literals may be written with implicit braces, for simple cases.
	// Insert the missing braces here, so that the parser doesn't have to.

	Rewriter.prototype.addLeftBrace = function (){
		return this;
	};

	Rewriter.prototype.addImplicitBraces = function (){
		var self = this;
		var stack = [];
		var start = null;
		var startIndent = 0;
		var startIdx = null;
		var baseCtx = ['ROOT',0];
		
		var noBraceContext = ['IF','TERNARY','FOR'];
		
		var noBrace = false;
		
		var action = function(token,i) {
			return self._tokens.splice(i,0,T.RBRACKET);
		};
		
		var open = function(token,i) {
			return self._tokens.splice(i,0,T.LBRACKET);
		};
		
		var close = function(token,i) {
			return self._tokens.splice(i,0,T.RBRACKET);
		};
		
		var stackToken = function(a,b) {
			return [a,b];
		};
		
		// method is called so many times
		return self.scanTokens(function(token,i,tokens) {
			var type = token._type;
			var v = token._value;
			
			var ctx = (stack.length) ? (stack[stack.length - 1]) : (baseCtx);
			var idx;
			
			if (noBraceContext.indexOf(type) >= 0) {
				stack.push(stackToken(type,i));
				return 1;
			};
			
			if (v == '?') {
				stack.push(stackToken('TERNARY',i));
				return 1;
			};
			
			// no need to test for this here as well as in
			if (EXPRESSION_START[type]) {
				if (type === INDENT && noBraceContext.indexOf(ctx[0]) >= 0) {
					stack.pop();
				};
				
				if (type === INDENT && self.tokenType(i - 1) == '{') {
					stack.push(stackToken('{',i)); // should not autogenerate another?
				} else {
					stack.push(stackToken(type,i));
				};
				return 1;
			};
			
			if (EXPRESSION_END[type]) {
				if (ctx[0] == 'TERNARY') {
					stack.pop();
				};
				
				start = stack.pop();
				start[2] = i;
				
				// seems like the stack should use tokens, no?)
				if (start[0] == '{' && start.generated) {
					close(token,i);
					return 1;
				};
				
				return 1;
			};
			
			// is this correct? same for if/class etc?
			if (ctx[0] == 'TERNARY' && (type === TERMINATOR || type === OUTDENT)) {
				stack.pop();
				return 1;
			};
			
			if (noBraceContext.indexOf(ctx[0]) >= 0 && type === INDENT) {
				stack.pop();
				return 1;
			};
			
			
			if (type == ',') {
				if (ctx[0] == '{' && ctx.generated) {
					tokens.splice(i,0,T.RBRACKET);
					stack.pop();
					return 2;
				} else {
					return 1;
				};
				true;
			};
			
			// found a type
			if (type == ':' && ctx[0] != '{' && ctx[0] != 'TERNARY' && (noBraceContext.indexOf(ctx[0]) == -1)) {
				// could just check if the end was right before this?
				
				if (start && start[2] == i - 1) {
					idx = start[1] - 1; // these are the stackTokens
				} else {
					idx = i - 2; // if start then start[1] - 1 else i - 2
					// idx = idx - 1 if tokenType(idx) is TERMINATOR
				};
				
				while (self.tokenType(idx - 1) === 'HERECOMMENT'){
					idx -= 2;
				};
				
				var t0 = tokens[idx - 1];
				
				if (t0 && T.typ(t0) == '}' && t0.generated) {
					tokens.splice(idx - 1,1);
					var s = stackToken('{');
					s.generated = true;
					stack.push(s);
					return 0;
				} else if (t0 && T.typ(t0) == ',' && self.tokenType(idx - 2) == '}') {
					tokens.splice(idx - 2,1);
					s = stackToken('{');
					s.generated = true;
					stack.push(s);
					return 0;
				} else {
					s = stackToken('{');
					s.generated = true;
					stack.push(s);
					open(token,idx + 1);
					return 2;
				};
			};
			
			// we probably need to run through autocall first?!
			
			if (type == 'DO') { // and ctx:generated
				var prev = T.typ(tokens[i - 1]);
				if (['NUMBER','STRING','REGEX','SYMBOL',']','}',')','STRING_END'].indexOf(prev) >= 0) {
					
					var tok = T.token(',',',');
					tok.generated = true;
					tokens.splice(i,0,tok);
					
					if (ctx.generated) {
						close(token,i);
						stack.pop();
						return 2;
					};
				};
			};
			
			if (ctx.generated && (type === TERMINATOR || type === OUTDENT || type === 'DEF_BODY')) {
				close(token,i);
				stack.pop();
				return 2;
			};
			
			return 1;
		});
	};

	// Methods may be optionally called without parentheses, for simple cases.
	// Insert the implicit parentheses here, so that the parser doesn't have to
	// deal with them.
	// Practically everything will now be callable this way (every identifier)
	Rewriter.prototype.addImplicitParentheses = function (){
		var self = this;
		var tokens = self._tokens;
		
		var noCall = false;
		var seenFor = false;
		var endCallAtTerminator = false;
		
		var seenSingle = false;
		var seenControl = false;
		
		var callObject = false;
		var callIndent = false;
		
		var parensAction = function(token,i,tokens) {
			return tokens.splice(i,0,T.token('CALL_END',')'));
		};
		
		// function will not be optimized in single run
		// could tro to move this out
		var parensCond = function(token,i,tokens) {
			
			var type = token._type;
			
			if (!seenSingle && token.fromThen) {
				return true;
			};
			
			var ifelse = type == 'IF' || type == 'UNLESS' || type == 'ELSE';
			
			if (ifelse || type === 'CATCH') {
				seenSingle = true;
			};
			
			if (ifelse || type === 'SWITCH' || type == 'TRY') {
				seenControl = true;
			};
			
			var prev = self.tokenType(i - 1);
			
			if ((type == '.' || type == '?.' || type == '::') && prev === OUTDENT) {
				return true;
			};
			
			if (endCallAtTerminator && (type === INDENT || type === TERMINATOR)) {
				return true;
			};
			
			if ((type == 'WHEN' || type == 'BY') && !seenFor) {
				// console.log "dont close implicit call outside for"
				return false;
			};
			
			var post = (tokens.length > (i + 1)) ? (tokens[i + 1]) : (null);
			var postTyp = post && post._type;
			
			if (token.generated || prev === ',') {
				return false;
			};
			
			var cond1 = (IMPLICIT_END_MAP[type] || (type == INDENT && !seenControl) || (type == 'DOS' && prev != '='));
			
			if (!cond1) {
				return false;
			};
			
			if (type !== INDENT) {
				return true;
			};
			
			if (!IMPLICIT_BLOCK_MAP[prev] && self.tokenType(i - 2) != 'CLASS' && !(post && ((post.generated && postTyp == '{') || IMPLICIT_CALL_MAP[postTyp]))) {
				return true;
			};
			
			return false;
		};
		
		var i = 0;
		
		while (tokens.length > (i + 1)){
			var token = tokens[i];
			var type = token._type;
			
			var prev = (i > 0) ? (tokens[i - 1]) : (null);
			var next = tokens[i + 1];
			
			var pt = prev && prev._type;
			var nt = next && next._type;
			
			if (type === INDENT && (pt == ')' || pt == ']')) {
				noCall = true;
			};
			
			if (NO_CALL_TAG_MAP[pt]) { // .indexOf(pt) >= 0
				// CALLCOUNT++
				// console.log("seen nocall tag {pt} ({pt} {type} {nt})")
				endCallAtTerminator = true;
				noCall = true;
				if (pt == 'FOR') {
					seenFor = true;
				};
			};
			
			callObject = false;
			callIndent = false;
			
			if (!noCall && type == INDENT && next) {
				var prevImpFunc = pt && IMPLICIT_FUNC_MAP[pt];
				var nextImpCall = nt && IMPLICIT_CALL_MAP[nt];
				
				callObject = ((next.generated && nt == '{') || nextImpCall) && prevImpFunc;
				callIndent = nextImpCall && prevImpFunc;
			};
			
			seenSingle = false;
			seenControl = false;
			
			// this is not correct if this is inside a block,no?
			if ((type == TERMINATOR || type == OUTDENT || type == INDENT)) {
				endCallAtTerminator = false;
				noCall = false;
			};
			
			if (type == '?' && prev && !prev.spaced) {
				token.call = true;
			};
			
			// where does fromThem come from?
			if (token.fromThen) {
				i += 1;continue;
			};
			
			// here we deal with :spaced and :newLine
			if (!(callObject || callIndent || (prev && prev.spaced) && (prev.call || IMPLICIT_FUNC_MAP[pt]) && (IMPLICIT_CALL_MAP[type] || !(token.spaced || token.newLine) && IMPLICIT_UNSPACED_CALL.indexOf(type) >= 0))) {
				i += 1;continue;
			};
			
			// cache where we want to splice -- add them later
			tokens.splice(i,0,T.token('CALL_START','('));
			// CALLCOUNT++
			
			self.detectEnd(i + 1,parensCond,parensAction);
			
			if (prev._type == '?') {
				prev._type = 'FUNC_EXIST';
			};
			
			i += 2;
			
			// need to reset after a match
			endCallAtTerminator = false;
			noCall = false;
			seenFor = false;
		};
		
		return;
	};



	Rewriter.prototype.indentCondition = function (token,i,tokens){
		var t = token._type;
		return SINGLE_CLOSERS_MAP[t] && token._value !== ';' && !(t == 'ELSE' && this._starter != 'IF' && this._starter != 'THEN');
	};

	Rewriter.prototype.indentAction = function (token,i,tokens){
		var idx = (this.tokenType(i - 1) === ',') ? ((i - 1)) : (i);
		tokens.splice(idx,0,T.OUTDENT);
		return;
	};


	// Because our grammar is LALR(1), it can't handle some single-line
	// expressions that lack ending delimiters. The **Rewriter** adds the implicit
	// blocks, so it doesn't need to. ')' can close a single-line block,
	// but we need to make sure it's balanced.
	Rewriter.prototype.addImplicitIndentation = function (){
		
		var lookup1 = {
			OUTDENT: 1,
			TERMINATOR: 1,
			FINALLY: 1
		};
		
		var i = 0;
		var tokens = this._tokens;
		var starter;
		
		while (i < tokens.length){
			var token = tokens[i];
			var type = token._type;
			var next = this.tokenType(i + 1);
			
			// why are we removing terminators after then? should be able to handle
			if (type === TERMINATOR && next === THEN) {
				tokens.splice(i,1);
				continue;
			};
			
			if (type === CATCH && lookup1[this.tokenType(i + 2)]) {
				tokens.splice(i + 2,0,T.token(INDENT,'2'),T.token(OUTDENT,'2'));
				i += 4;
				continue;
			};
			
			if (SINGLE_LINERS[type] && (next != INDENT && next != 'BLOCK_PARAM_START') && !(type == 'ELSE' && next == 'IF') && type != 'ELIF') {
				this._starter = starter = type;
				
				var indent = T.token(INDENT,'2');
				if (starter === THEN) { indent.fromThen = true };
				indent.generated = true;
				tokens.splice(i + 1,0,indent);
				this.detectEnd(i + 2,this.indentCondition,this.indentAction);
				if (type === THEN) { tokens.splice(i,1) };
			};
			i++;
		};
		
		return;
	};

	// Tag postfix conditionals as such, so that we can parse them with a
	// different precedence.
	Rewriter.prototype.tagPostfixConditionals = function (){
		var self = this;
		var condition = function(token,i,tokens) { return token._type === TERMINATOR || token._type === INDENT; };
		var action = function(token,i,tokens,s) {
			if (token._type != INDENT) { return T.setTyp(s.original,'POST_' + s.original._type) };
		};
		
		return self.scanTokens(function(token,i,tokens) {
			var typ = token._type;
			if (!(typ == 'IF' || typ == 'FOR')) { return 1 };
			self.detectEnd(i + 1,condition,action,{original: token});
			return 1;
		});
	};

	// Look up a type by token index.
	Rewriter.prototype.type = function (i){
		// if i < 0 then return null
		throw "deprecated";
		var tok = this._tokens[i];
		return tok && tok._type;
	};

	Rewriter.prototype.injectToken = function (index,token){
		return this;
	};

	Rewriter.prototype.tokenType = function (i){
		if (i < 0 || i >= this._tokens.length) {
			// CALLCOUNT++
			return null;
		};
		
		var tok = this._tokens[i];
		return tok && tok._type;
	};

	// Constants
	// ---------

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(5)))

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	/* parser generated by jison-fork */
	var parser = (function(){
	var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,4],$V1=[1,6],$V2=[1,33],$V3=[1,34],$V4=[1,35],$V5=[1,36],$V6=[1,77],$V7=[1,119],$V8=[1,95],$V9=[1,132],$Va=[1,125],$Vb=[1,126],$Vc=[1,127],$Vd=[1,124],$Ve=[1,128],$Vf=[1,135],$Vg=[1,118],$Vh=[1,136],$Vi=[1,82],$Vj=[1,83],$Vk=[1,84],$Vl=[1,85],$Vm=[1,86],$Vn=[1,87],$Vo=[1,88],$Vp=[1,75],$Vq=[1,122],$Vr=[1,117],$Vs=[1,90],$Vt=[1,73],$Vu=[1,38],$Vv=[1,68],$Vw=[1,69],$Vx=[1,70],$Vy=[1,114],$Vz=[1,92],$VA=[1,93],$VB=[1,89],$VC=[1,29],$VD=[1,30],$VE=[1,98],$VF=[1,97],$VG=[1,115],$VH=[1,116],$VI=[1,123],$VJ=[1,12],$VK=[1,130],$VL=[1,131],$VM=[1,99],$VN=[1,80],$VO=[1,39],$VP=[1,45],$VQ=[1,113],$VR=[1,71],$VS=[1,91],$VT=[1,129],$VU=[1,62],$VV=[1,76],$VW=[1,108],$VX=[1,109],$VY=[1,110],$VZ=[1,133],$V_=[1,134],$V$=[1,66],$V01=[1,107],$V11=[1,54],$V21=[1,55],$V31=[1,56],$V41=[1,57],$V51=[1,58],$V61=[1,59],$V71=[1,138],$V81=[1,6,11,148],$V91=[1,140],$Va1=[1,6,11,14,148],$Vb1=[1,148],$Vc1=[1,149],$Vd1=[1,152],$Ve1=[1,153],$Vf1=[1,145],$Vg1=[1,144],$Vh1=[1,146],$Vi1=[1,147],$Vj1=[1,150],$Vk1=[1,151],$Vl1=[1,156],$Vm1=[1,6,10,11,14,23,79,97,104,118,125,136,146,148,158,178,208,209,220,221,222,227,228,237,246,247,250,251,254,255,256,257],$Vn1=[2,268],$Vo1=[1,163],$Vp1=[1,167],$Vq1=[1,165],$Vr1=[1,166],$Vs1=[1,169],$Vt1=[1,168],$Vu1=[1,6,10,11,14,23,97,104,148],$Vv1=[1,6,11,14,148,220,222,227,228,246],$Vw1=[1,6,10,11,14,22,23,79,95,97,104,117,118,125,136,146,148,155,158,178,189,190,192,204,208,209,220,221,222,227,228,237,246,247,250,251,254,255,256,257],$Vx1=[2,237],$Vy1=[1,6,10,11,14,22,23,79,95,97,104,117,118,122,125,136,146,148,155,158,178,189,190,192,204,208,209,220,221,222,227,228,237,246,247,250,251,254,255,256,257],$Vz1=[2,233],$VA1=[61,62,95,98,112,117,119,121],$VB1=[1,213],$VC1=[1,218],$VD1=[1,6,10,11,14,22,23,79,95,97,104,117,118,122,125,136,146,148,155,158,178,189,190,192,204,208,209,220,221,222,227,228,237,246,247,250,251,252,253,254,255,256,257,258],$VE1=[1,228],$VF1=[1,225],$VG1=[1,230],$VH1=[1,268],$VI1=[1,269],$VJ1=[57,96],$VK1=[2,251],$VL1=[1,281],$VM1=[1,280],$VN1=[92,93,94,95,98,99,100,101,102,103,107,109],$VO1=[1,293],$VP1=[1,6,10,11,14,22,23,61,62,79,95,97,98,104,112,117,118,119,121,122,125,136,146,148,155,158,178,189,190,192,204,208,209,220,221,222,227,228,237,246,247,250,251,252,253,254,255,256,257,258],$VQ1=[1,299],$VR1=[57,96,103,233],$VS1=[1,6,10,11,14,22,23,75,77,78,79,95,97,104,117,118,125,136,146,148,155,158,178,189,190,192,204,208,209,220,221,222,227,228,237,246,247,250,251,254,255,256,257],$VT1=[1,6,10,11,14,22,23,79,95,97,104,117,118,125,136,146,148,155,158,178,189,190,192,204,208,209,215,216,220,221,222,227,228,237,240,242,245,246,247,250,251,254,255,256,257],$VU1=[57,61,62,66],$VV1=[1,331],$VW1=[1,332],$VX1=[1,6,10,11,14,23,79,97,104,118,125,146,148,158,208,209,220,221,222,227,228,237,246],$VY1=[1,6,10,11,14,23,79,97,104,118,125,136,146,148,158,178,208,209,220,221,222,227,228,237,246,247,250,251,254,255,257],$VZ1=[1,346],$V_1=[1,350],$V$1=[1,6,11,14,23,79,97,104,118,125,136,146,148,158,178,208,209,220,221,222,227,228,237,246,247,250,251,254,255,256,257],$V02=[1,6,10,11,14,22,23,79,96,97,104,118,125,136,146,148,158,178,208,209,220,221,222,227,228,237,246,247,250,251,254,255,256,257],$V12=[14,29],$V22=[1,6,11,14,29,148,220,222,227,228,246],$V32=[2,289],$V42=[1,6,10,11,14,22,23,79,95,97,104,117,118,122,125,136,146,148,155,158,178,189,190,192,204,208,209,220,221,222,227,228,235,236,237,246,247,250,251,252,253,254,255,256,257,258],$V52=[2,190],$V62=[1,374],$V72=[6,10,11,14,23,104],$V82=[2,192],$V92=[1,384],$Va2=[1,385],$Vb2=[1,386],$Vc2=[1,6,10,11,14,23,79,97,104,118,125,146,148,158,208,209,228,237,246],$Vd2=[1,6,10,11,14,23,79,97,104,118,125,146,148,158,208,209,221,228,237,246],$Ve2=[235,236],$Vf2=[14,235,236],$Vg2=[1,6,11,14,23,79,97,104,118,125,146,148,158,178,208,209,220,221,222,227,228,237,246,247,250,251,254,255,256,257],$Vh2=[1,400],$Vi2=[6,10,11,14,97],$Vj2=[6,10,11,14,97,146],$Vk2=[95,98],$Vl2=[1,410],$Vm2=[1,411],$Vn2=[22,95,98,170,171],$Vo2=[1,6,10,11,14,23,79,97,104,118,125,136,146,148,158,178,208,209,220,221,222,227,228,237,246,247,250,251,255,257],$Vp2=[1,6,10,11,14,23,79,97,104,118,125,146,148,158,208,209,221,237],$Vq2=[20,21,24,25,27,33,36,57,61,62,64,66,68,70,72,74,80,81,82,83,84,85,86,87,90,96,103,110,118,131,132,133,134,140,141,147,154,155,162,163,165,181,183,185,193,194,196,201,202,205,206,212,218,220,222,224,227,228,238,244,248,249,250,251,252,253],$Vr2=[1,6,10,11,14,23,79,97,104,118,125,136,146,148,158,178,208,209,220,221,222,227,228,237,240,245,246,247,250,251,254,255,256,257],$Vs2=[11,240,242],$Vt2=[1,460],$Vu2=[2,191],$Vv2=[6,10,11],$Vw2=[1,468],$Vx2=[14,23,158],$Vy2=[1,6,10,11,14,23,79,97,104,118,125,146,148,158,208,209,220,222,227,228,237,246],$Vz2=[1,483],$VA2=[57,66,96],$VB2=[14,23],$VC2=[1,498],$VD2=[10,14],$VE2=[1,544],$VF2=[6,10];
	var parser = {trace: function trace() { },
	yy: {},
	symbols_: {"error":2,"Root":3,"Body":4,"Block":5,"TERMINATOR":6,"BODYSTART":7,"Line":8,"Terminator":9,"INDENT":10,"OUTDENT":11,"Splat":12,"Expression":13,",":14,"Comment":15,"Statement":16,"ExportStatement":17,"Return":18,"Throw":19,"STATEMENT":20,"BREAK":21,"CALL_START":22,"CALL_END":23,"CONTINUE":24,"DEBUGGER":25,"ImportStatement":26,"IMPORT":27,"ImportArgList":28,"FROM":29,"ImportFrom":30,"AS":31,"ImportArg":32,"STRING":33,"VarIdentifier":34,"Require":35,"REQUIRE":36,"RequireArg":37,"Literal":38,"Parenthetical":39,"Await":40,"Value":41,"Code":42,"Operation":43,"Assign":44,"If":45,"Ternary":46,"Try":47,"While":48,"For":49,"Switch":50,"Class":51,"Module":52,"TagDeclaration":53,"Tag":54,"Property":55,"Identifier":56,"IDENTIFIER":57,"Key":58,"KEY":59,"Ivar":60,"IVAR":61,"CVAR":62,"Gvar":63,"GVAR":64,"Const":65,"CONST":66,"Argvar":67,"ARGVAR":68,"Symbol":69,"SYMBOL":70,"AlphaNumeric":71,"NUMBER":72,"InterpolatedString":73,"STRING_START":74,"NEOSTRING":75,"Interpolation":76,"STRING_END":77,"{{":78,"}}":79,"JS":80,"REGEX":81,"BOOL":82,"TRUE":83,"FALSE":84,"NULL":85,"UNDEFINED":86,"RETURN":87,"Arguments":88,"TagSelector":89,"SELECTOR_START":90,"TagSelectorType":91,"SELECTOR_NS":92,"SELECTOR_ID":93,"SELECTOR_CLASS":94,".":95,"{":96,"}":97,"#":98,"SELECTOR_COMBINATOR":99,"SELECTOR_PSEUDO_CLASS":100,"SELECTOR_GROUP":101,"UNIVERSAL_SELECTOR":102,"[":103,"]":104,"SELECTOR_ATTR_OP":105,"TagSelectorAttrValue":106,"SELECTOR_TAG":107,"Selector":108,"SELECTOR_END":109,"TAG_START":110,"TagOptions":111,"TAG_END":112,"TagBody":113,"TagTypeName":114,"Self":115,"TAG_TYPE":116,"INDEX_START":117,"INDEX_END":118,"@":119,"TagAttr":120,"TAG_ATTR":121,"=":122,"TagAttrValue":123,"VALUE_START":124,"VALUE_END":125,"ArgList":126,"TagTypeDef":127,"EXPORT":128,"DEFAULT":129,"TagDeclarationBlock":130,"EXTEND":131,"LOCAL":132,"GLOBAL":133,"TAG":134,"TagType":135,"COMPARE":136,"TagDeclKeywords":137,"TAG_ID":138,"TagId":139,"IDREF":140,"TAGID":141,"Assignable":142,"Outdent":143,"AssignObj":144,"ObjAssignable":145,":":146,"(":147,")":148,"HERECOMMENT":149,"COMMENT":150,"Method":151,"Do":152,"Begin":153,"BEGIN":154,"DO":155,"BLOCK_PARAM_START":156,"ParamList":157,"BLOCK_PARAM_END":158,"PropType":159,"PropertyIdentifier":160,"Object":161,"PROP":162,"ATTR":163,"MethodDeclaration":164,"DEF":165,"MethodScope":166,"MethodScopeType":167,"MethodIdentifier":168,"MethodBody":169,"DEF_BODY":170,"DEF_EMPTY":171,"This":172,"OptComma":173,"Param":174,"Array":175,"ParamVar":176,"SPLAT":177,"LOGIC":178,"BLOCK_ARG":179,"VarReference":180,"VAR":181,"VarAssignable":182,"LET":183,"SimpleAssignable":184,"ENV_FLAG":185,"NEW":186,"Super":187,"SoakableOp":188,"?:":189,".:":190,"IndexValue":191,"?.":192,"SUPER":193,"AWAIT":194,"Range":195,"ARGUMENTS":196,"Invocation":197,"Slice":198,"AssignList":199,"ClassStart":200,"CLASS":201,"MODULE":202,"OptFuncExist":203,"FUNC_EXIST":204,"THIS":205,"SELF":206,"RangeDots":207,"..":208,"...":209,"Arg":210,"SimpleArgs":211,"TRY":212,"Catch":213,"Finally":214,"FINALLY":215,"CATCH":216,"CATCH_VAR":217,"THROW":218,"WhileSource":219,"WHILE":220,"WHEN":221,"UNTIL":222,"Loop":223,"LOOP":224,"ForBody":225,"ForKeyword":226,"FOR":227,"POST_FOR":228,"ForBlock":229,"ForStart":230,"ForSource":231,"ForVariables":232,"OWN":233,"ForValue":234,"FORIN":235,"FOROF":236,"BY":237,"SWITCH":238,"Whens":239,"ELSE":240,"When":241,"LEADING_WHEN":242,"IfBlock":243,"IF":244,"ELIF":245,"POST_IF":246,"?":247,"UNARY":248,"SQRT":249,"-":250,"+":251,"--":252,"++":253,"MATH":254,"SHIFT":255,"NOT":256,"RELATION":257,"COMPOUND_ASSIGN":258,"$accept":0,"$end":1},
	terminals_: {2:"error",6:"TERMINATOR",7:"BODYSTART",10:"INDENT",11:"OUTDENT",14:",",20:"STATEMENT",21:"BREAK",22:"CALL_START",23:"CALL_END",24:"CONTINUE",25:"DEBUGGER",27:"IMPORT",29:"FROM",31:"AS",33:"STRING",36:"REQUIRE",57:"IDENTIFIER",59:"KEY",61:"IVAR",62:"CVAR",64:"GVAR",66:"CONST",68:"ARGVAR",70:"SYMBOL",72:"NUMBER",74:"STRING_START",75:"NEOSTRING",77:"STRING_END",78:"{{",79:"}}",80:"JS",81:"REGEX",82:"BOOL",83:"TRUE",84:"FALSE",85:"NULL",86:"UNDEFINED",87:"RETURN",90:"SELECTOR_START",92:"SELECTOR_NS",93:"SELECTOR_ID",94:"SELECTOR_CLASS",95:".",96:"{",97:"}",98:"#",99:"SELECTOR_COMBINATOR",100:"SELECTOR_PSEUDO_CLASS",101:"SELECTOR_GROUP",102:"UNIVERSAL_SELECTOR",103:"[",104:"]",105:"SELECTOR_ATTR_OP",107:"SELECTOR_TAG",109:"SELECTOR_END",110:"TAG_START",112:"TAG_END",116:"TAG_TYPE",117:"INDEX_START",118:"INDEX_END",119:"@",121:"TAG_ATTR",122:"=",124:"VALUE_START",125:"VALUE_END",128:"EXPORT",129:"DEFAULT",131:"EXTEND",132:"LOCAL",133:"GLOBAL",134:"TAG",136:"COMPARE",138:"TAG_ID",140:"IDREF",141:"TAGID",146:":",147:"(",148:")",149:"HERECOMMENT",150:"COMMENT",154:"BEGIN",155:"DO",156:"BLOCK_PARAM_START",158:"BLOCK_PARAM_END",162:"PROP",163:"ATTR",165:"DEF",170:"DEF_BODY",171:"DEF_EMPTY",177:"SPLAT",178:"LOGIC",179:"BLOCK_ARG",181:"VAR",183:"LET",185:"ENV_FLAG",186:"NEW",189:"?:",190:".:",192:"?.",193:"SUPER",194:"AWAIT",196:"ARGUMENTS",201:"CLASS",202:"MODULE",204:"FUNC_EXIST",205:"THIS",206:"SELF",208:"..",209:"...",212:"TRY",215:"FINALLY",216:"CATCH",217:"CATCH_VAR",218:"THROW",220:"WHILE",221:"WHEN",222:"UNTIL",224:"LOOP",227:"FOR",228:"POST_FOR",233:"OWN",235:"FORIN",236:"FOROF",237:"BY",238:"SWITCH",240:"ELSE",242:"LEADING_WHEN",244:"IF",245:"ELIF",246:"POST_IF",247:"?",248:"UNARY",249:"SQRT",250:"-",251:"+",252:"--",253:"++",254:"MATH",255:"SHIFT",256:"NOT",257:"RELATION",258:"COMPOUND_ASSIGN"},
	productions_: [0,[3,0],[3,1],[3,2],[4,1],[4,1],[4,3],[4,2],[9,1],[5,2],[5,3],[5,4],[8,1],[8,1],[8,3],[8,3],[8,1],[8,1],[8,1],[16,1],[16,1],[16,1],[16,1],[16,4],[16,1],[16,4],[16,1],[16,1],[26,4],[26,4],[26,2],[30,1],[28,1],[28,3],[32,1],[35,2],[37,1],[37,1],[37,0],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[56,1],[58,1],[60,1],[60,1],[63,1],[65,1],[67,1],[69,1],[71,1],[71,1],[71,1],[71,1],[73,1],[73,2],[73,2],[73,2],[76,2],[76,3],[38,1],[38,1],[38,1],[38,1],[38,1],[38,1],[38,1],[38,1],[18,2],[18,2],[18,1],[89,1],[89,2],[89,2],[89,2],[89,2],[89,5],[89,5],[89,2],[89,2],[89,2],[89,2],[89,4],[89,6],[91,1],[108,2],[106,1],[106,1],[106,3],[54,3],[54,4],[54,5],[114,1],[114,1],[114,1],[114,0],[111,1],[111,3],[111,4],[111,3],[111,3],[111,5],[111,5],[111,3],[111,2],[111,5],[111,2],[120,1],[120,3],[123,3],[113,3],[113,3],[113,1],[127,1],[127,3],[17,3],[17,2],[53,1],[53,2],[53,2],[53,2],[130,2],[130,3],[130,4],[130,5],[137,0],[137,1],[135,1],[135,1],[139,1],[139,1],[44,3],[44,5],[144,1],[144,3],[144,5],[144,1],[145,1],[145,1],[145,1],[145,1],[145,1],[145,1],[145,3],[15,1],[15,1],[42,1],[42,1],[42,1],[153,2],[152,2],[152,5],[55,3],[55,5],[55,2],[159,1],[159,1],[160,1],[160,3],[151,1],[151,2],[164,8],[164,5],[164,6],[164,3],[167,1],[167,1],[168,1],[168,1],[168,3],[169,2],[169,2],[169,1],[166,1],[166,1],[166,1],[166,1],[173,0],[173,1],[157,0],[157,1],[157,3],[174,1],[174,1],[174,1],[174,2],[174,2],[174,2],[174,3],[176,1],[12,2],[180,3],[180,2],[180,2],[180,3],[34,1],[34,1],[182,1],[182,1],[182,1],[184,1],[184,1],[184,1],[184,1],[184,1],[184,1],[184,1],[184,1],[184,3],[184,3],[184,3],[184,3],[184,3],[184,3],[184,3],[184,3],[184,4],[188,1],[188,1],[187,1],[142,1],[142,1],[142,1],[40,2],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[41,1],[191,1],[191,1],[161,4],[199,0],[199,1],[199,3],[199,4],[199,6],[51,1],[51,2],[51,2],[51,2],[200,2],[200,3],[200,4],[200,5],[52,2],[52,3],[197,3],[197,2],[203,0],[203,1],[88,2],[88,4],[172,1],[115,1],[175,2],[175,4],[207,1],[207,1],[195,5],[198,3],[198,2],[198,2],[126,1],[126,3],[126,4],[126,4],[126,6],[143,2],[143,1],[210,1],[210,1],[210,1],[210,1],[211,1],[211,3],[47,2],[47,3],[47,3],[47,4],[214,2],[213,3],[19,2],[39,3],[39,5],[219,2],[219,4],[219,2],[219,4],[48,2],[48,2],[48,2],[48,1],[223,2],[223,2],[49,2],[49,2],[49,2],[226,1],[226,1],[229,2],[225,2],[225,2],[230,2],[230,3],[234,1],[234,1],[234,1],[232,1],[232,3],[231,2],[231,2],[231,4],[231,4],[231,4],[231,6],[231,6],[50,5],[50,7],[50,4],[50,6],[239,1],[239,2],[241,3],[241,4],[243,3],[243,5],[243,4],[243,3],[45,1],[45,3],[45,3],[46,5],[43,2],[43,2],[43,2],[43,2],[43,2],[43,2],[43,2],[43,2],[43,3],[43,3],[43,3],[43,3],[43,3],[43,3],[43,4],[43,3],[43,3],[43,5]],
	performAction: function performAction(self, yytext, yy, yystate /* action[1] */, $$ /* vstack */) {
	/* self == yyval */

	var $0 = $$.length - 1;
	switch (yystate) {
	case 1:
	return self.$ = new yy.Root([]);
	break;
	case 2:
	return self.$ = new yy.Root($$[$0]);
	break;
	case 3:
	return self.$ = $$[$0-1];
	break;
	case 4:
	self.$ = new yy.Block([]);
	break;
	case 5:
	self.$ = new yy.Block([$$[$0]]);
	break;
	case 6:
	self.$ = $$[$0-2].break($$[$0-1]).add($$[$0]);
	break;
	case 7:
	self.$ = $$[$0-1].break($$[$0]);
	break;
	case 8:
	self.$ = new yy.Terminator($$[$0]);
	break;
	case 9:
	self.$ = new yy.Block([]).indented($$[$0-1],$$[$0]);
	break;
	case 10: case 123:
	self.$ = $$[$0-1].indented($$[$0-2],$$[$0]);
	break;
	case 11:
	self.$ = $$[$0-1].prebreak($$[$0-2]).indented($$[$0-3],$$[$0]);
	break;
	case 12: case 13: case 16: case 17: case 18: case 19: case 20: case 27: case 31: case 34: case 36: case 37: case 38: case 39: case 40: case 41: case 42: case 43: case 44: case 45: case 46: case 47: case 48: case 49: case 50: case 51: case 52: case 53: case 54: case 65: case 66: case 73: case 99: case 100: case 105: case 130: case 138: case 149: case 150: case 151: case 152: case 153: case 154: case 155: case 159: case 160: case 161: case 168: case 169: case 170: case 172: case 180: case 181: case 183: case 186: case 187: case 188: case 189: case 190: case 191: case 202: case 208: case 209: case 210: case 211: case 212: case 214: case 216: case 217: case 218: case 219: case 233: case 234: case 235: case 237: case 238: case 239: case 240: case 241: case 243: case 244: case 245: case 246: case 247: case 256: case 288: case 289: case 290: case 291: case 292: case 293: case 311: case 317: case 318: case 324: case 340: case 348:
	self.$ = $$[$0];
	break;
	case 14: case 15:
	self.$ = $$[$0-2].addExpression($$[$0]);
	break;
	case 21: case 74:
	self.$ = new yy.Literal($$[$0]);
	break;
	case 22:
	self.$ = new yy.BreakStatement($$[$0]);
	break;
	case 23:
	self.$ = new yy.BreakStatement($$[$0-3],$$[$0-1]);
	break;
	case 24:
	self.$ = new yy.ContinueStatement($$[$0]);
	break;
	case 25:
	self.$ = new yy.ContinueStatement($$[$0-3],$$[$0-1]);
	break;
	case 26:
	self.$ = new yy.DebuggerStatement($$[$0]);
	break;
	case 28:
	self.$ = new yy.ImportStatement($$[$0-2],$$[$0]);
	break;
	case 29:
	self.$ = new yy.ImportStatement(null,$$[$0-2],$$[$0]);
	break;
	case 30:
	self.$ = new yy.ImportStatement(null,$$[$0]);
	break;
	case 32: case 193: case 327:
	self.$ = [$$[$0]];
	break;
	case 33: case 194:
	self.$ = $$[$0-2].concat($$[$0]);
	break;
	case 35:
	self.$ = new yy.Require($$[$0]).set({keyword: $$[$0-1]});
	break;
	case 55: case 56:
	self.$ = new yy.Identifier($$[$0]);
	break;
	case 57: case 58:
	self.$ = new yy.Ivar($$[$0]);
	break;
	case 59:
	self.$ = new yy.Gvar($$[$0]);
	break;
	case 60:
	self.$ = new yy.Const($$[$0]);
	break;
	case 61:
	self.$ = new yy.Argvar($$[$0]);
	break;
	case 62:
	self.$ = new yy.Symbol($$[$0]);
	break;
	case 63:
	self.$ = new yy.Num($$[$0]);
	break;
	case 64:
	self.$ = new yy.Str($$[$0]);
	break;
	case 67:
	self.$ = new yy.InterpolatedString([],{open: $$[$0]});
	break;
	case 68:
	self.$ = $$[$0-1].add($$[$0]);
	break;
	case 69:
	self.$ = $$[$0] ? ($$[$0-1].add($$[$0])) : ($$[$0-1]);
	break;
	case 70:
	self.$ = $$[$0-1].option('close',$$[$0]);
	break;
	case 71:
	self.$ = null;
	break;
	case 72: case 98: case 101: case 122: case 124: case 156: case 171: case 182: case 287:
	self.$ = $$[$0-1];
	break;
	case 75:
	self.$ = new yy.RegExp($$[$0]);
	break;
	case 76:
	self.$ = new yy.Bool($$[$0]);
	break;
	case 77:
	self.$ = new yy.True($$[$0]);
	break;
	case 78:
	self.$ = new yy.False($$[$0]);
	break;
	case 79:
	self.$ = new yy.Nil($$[$0]);
	break;
	case 80:
	self.$ = new yy.Undefined($$[$0]);
	break;
	case 81: case 82:
	self.$ = new yy.Return($$[$0]);
	break;
	case 83:
	self.$ = new yy.Return();
	break;
	case 84:
	self.$ = new yy.Selector([],{type: $$[$0]});
	break;
	case 85:
	self.$ = $$[$0-1].add(new yy.SelectorType($$[$0]),'tag');
	break;
	case 86:
	self.$ = $$[$0-1].add(new yy.SelectorNamespace($$[$0]),'ns');
	break;
	case 87:
	self.$ = $$[$0-1].add(new yy.SelectorId($$[$0]),'id');
	break;
	case 88:
	self.$ = $$[$0-1].add(new yy.SelectorClass($$[$0]),'class');
	break;
	case 89:
	self.$ = $$[$0-4].add(new yy.SelectorClass($$[$0-1]),'class');
	break;
	case 90:
	self.$ = $$[$0-4].add(new yy.SelectorId($$[$0-1]),'id');
	break;
	case 91:
	self.$ = $$[$0-1].add(new yy.SelectorCombinator($$[$0]),'sep');
	break;
	case 92:
	self.$ = $$[$0-1].add(new yy.SelectorPseudoClass($$[$0]),'pseudoclass');
	break;
	case 93:
	self.$ = $$[$0-1].group();
	break;
	case 94:
	self.$ = $$[$0-1].add(new yy.SelectorUniversal($$[$0]),'universal');
	break;
	case 95:
	self.$ = $$[$0-3].add(new yy.SelectorAttribute($$[$0-1]),'attr');
	break;
	case 96:
	self.$ = $$[$0-5].add(new yy.SelectorAttribute($$[$0-3],$$[$0-2],$$[$0-1]),'attr');
	break;
	case 97: case 106: case 107: case 140: case 141:
	self.$ = new yy.TagTypeIdentifier($$[$0]);
	break;
	case 102:
	self.$ = $$[$0-1].set({open: $$[$0-2],close: $$[$0]});
	break;
	case 103:
	self.$ = $$[$0-2].set({body: $$[$0],open: $$[$0-3],close: $$[$0-1]});
	break;
	case 104:
	self.$ = new yy.TagWrapper($$[$0-2],$$[$0-4],$$[$0]);
	break;
	case 108:
	self.$ = new yy.TagTypeIdentifier('div');
	break;
	case 109:
	self.$ = new yy.Tag({type: $$[$0]});
	break;
	case 110:
	self.$ = $$[$0-2].addSymbol($$[$0]);
	break;
	case 111:
	self.$ = $$[$0-3].addIndex($$[$0-1]);
	break;
	case 112: case 113:
	self.$ = $$[$0-2].addClass($$[$0]);
	break;
	case 114:
	self.$ = $$[$0-4].addClass($$[$0-1]);
	break;
	case 115:
	self.$ = $$[$0-4].set({key: $$[$0-1]});
	break;
	case 116:
	self.$ = $$[$0-2].set({id: $$[$0]});
	break;
	case 117:
	self.$ = $$[$0-1].set({ivar: $$[$0]});
	break;
	case 118:
	self.$ = $$[$0-4].set({id: $$[$0-1]});
	break;
	case 119:
	self.$ = $$[$0-1].addAttribute($$[$0]);
	break;
	case 120:
	self.$ = new yy.TagAttr($$[$0],$$[$0]);
	break;
	case 121:
	self.$ = new yy.TagAttr($$[$0-2],$$[$0],$$[$0-1]);
	break;
	case 125: case 282:
	self.$ = new yy.ArgList([$$[$0]]);
	break;
	case 126:
	self.$ = new yy.TagDesc($$[$0]);
	break;
	case 127:
	self.$ = $$[$0-2].classes($$[$0]);
	break;
	case 128:
	self.$ = new yy.Export($$[$0]).set({'default': $$[$0-1],keyword: $$[$0-2]});
	break;
	case 129:
	self.$ = new yy.Export($$[$0]).set({keyword: $$[$0-1]});
	break;
	case 131:
	self.$ = $$[$0].set({extension: true});
	break;
	case 132:
	self.$ = $$[$0].set({local: true});
	break;
	case 133: case 173: case 259:
	self.$ = $$[$0].set({global: $$[$0-1]});
	break;
	case 134:
	self.$ = new yy.TagDeclaration($$[$0]).set({keyword: $$[$0-1]});
	break;
	case 135:
	self.$ = new yy.TagDeclaration($$[$0-1],null,$$[$0]).set({keyword: $$[$0-2]});
	break;
	case 136:
	self.$ = new yy.TagDeclaration($$[$0-2],$$[$0]).set({keyword: $$[$0-3]});
	break;
	case 137:
	self.$ = new yy.TagDeclaration($$[$0-3],$$[$0-1],$$[$0]).set({keyword: $$[$0-4]});
	break;
	case 139:
	self.$ = ['yy.extend'];
	break;
	case 142: case 143:
	self.$ = new yy.TagId($$[$0]);
	break;
	case 144:
	self.$ = new yy.Assign($$[$0-1],$$[$0-2],$$[$0]);
	break;
	case 145:
	self.$ = new yy.Assign($$[$0-3],$$[$0-4],$$[$0-1].indented($$[$0-2],$$[$0]));
	break;
	case 146:
	self.$ = new yy.ObjAttr($$[$0]);
	break;
	case 147:
	self.$ = new yy.ObjAttr($$[$0-2],$$[$0],'object');
	break;
	case 148:
	self.$ = new yy.ObjAttr($$[$0-4],$$[$0-1].indented($$[$0-2],$$[$0]),'object');
	break;
	case 157:
	self.$ = new yy.Comment($$[$0],true);
	break;
	case 158:
	self.$ = new yy.Comment($$[$0],false);
	break;
	case 162:
	self.$ = new yy.Begin($$[$0]);
	break;
	case 163:
	self.$ = new yy.Lambda([],$$[$0],null,null,{bound: true,keyword: $$[$0-1]});
	break;
	case 164:
	self.$ = new yy.Lambda($$[$0-2],$$[$0],null,null,{bound: true,keyword: $$[$0-4]});
	break;
	case 165:
	self.$ = new yy.PropertyDeclaration($$[$0-1],$$[$0],$$[$0-2]);
	break;
	case 166:
	self.$ = new yy.PropertyDeclaration($$[$0-3],$$[$0-1],$$[$0-4]);
	break;
	case 167:
	self.$ = new yy.PropertyDeclaration($$[$0],null,$$[$0-1]);
	break;
	case 174:
	self.$ = new yy.MethodDeclaration($$[$0-2],$$[$0],$$[$0-4],$$[$0-6],$$[$0-5]).set({def: $$[$0-7]});
	break;
	case 175:
	self.$ = new yy.MethodDeclaration([],$$[$0],$$[$0-1],$$[$0-3],$$[$0-2]).set({def: $$[$0-4]});
	break;
	case 176:
	self.$ = new yy.MethodDeclaration($$[$0-2],$$[$0],$$[$0-4],null).set({def: $$[$0-5]});
	break;
	case 177:
	self.$ = new yy.MethodDeclaration([],$$[$0],$$[$0-1],null).set({def: $$[$0-2]});
	break;
	case 178:
	self.$ = {static: true};
	break;
	case 179:
	self.$ = {};
	break;
	case 184:
	self.$ = $$[$0].body();
	break;
	case 185: case 192:
	self.$ = [];
	break;
	case 195:
	self.$ = new yy.NamedParams($$[$0]);
	break;
	case 196:
	self.$ = new yy.ArrayParams($$[$0]);
	break;
	case 197:
	self.$ = new yy.RequiredParam($$[$0]);
	break;
	case 198:
	self.$ = new yy.SplatParam($$[$0],null,$$[$0-1]);
	break;
	case 199: case 200:
	self.$ = new yy.BlockParam($$[$0],null,$$[$0-1]);
	break;
	case 201:
	self.$ = new yy.OptionalParam($$[$0-2],$$[$0],$$[$0-1]);
	break;
	case 203:
	self.$ = yy.SPLAT($$[$0]);
	break;
	case 204: case 207:
	self.$ = yy.SPLAT(new yy.VarReference($$[$0],$$[$0-2]),$$[$0-1]);
	break;
	case 205: case 206:
	self.$ = new yy.VarReference($$[$0],$$[$0-1]);
	break;
	case 213:
	self.$ = new yy.EnvFlag($$[$0]);
	break;
	case 215:
	self.$ = new yy.IvarAccess('.',null,$$[$0]);
	break;
	case 220:
	self.$ = new yy.VarOrAccess($$[$0]);
	break;
	case 221:
	self.$ = new yy.New($$[$0-2]);
	break;
	case 222:
	self.$ = new yy.SuperAccess('.',$$[$0-2],$$[$0]);
	break;
	case 223:
	self.$ = new yy.PropertyAccess($$[$0-1],$$[$0-2],$$[$0]);
	break;
	case 224: case 225: case 226: case 228:
	self.$ = new yy.Access($$[$0-1],$$[$0-2],$$[$0]);
	break;
	case 227:
	self.$ = new yy.Access('.',$$[$0-2],new yy.Identifier($$[$0].value()));
	break;
	case 229:
	self.$ = new yy.IndexAccess('.',$$[$0-3],$$[$0-1]);
	break;
	case 232:
	self.$ = yy.SUPER;
	break;
	case 236:
	self.$ = new yy.Await($$[$0]).set({keyword: $$[$0-1]});
	break;
	case 242:
	self.$ = yy.ARGUMENTS;
	break;
	case 248:
	self.$ = new yy.Index($$[$0]);
	break;
	case 249:
	self.$ = new yy.Slice($$[$0]);
	break;
	case 250:
	self.$ = new yy.Obj($$[$0-2],$$[$0-3].generated);
	break;
	case 251:
	self.$ = new yy.AssignList([]);
	break;
	case 252:
	self.$ = new yy.AssignList([$$[$0]]);
	break;
	case 253: case 283:
	self.$ = $$[$0-2].add($$[$0]);
	break;
	case 254: case 284:
	self.$ = $$[$0-3].add($$[$0-1]).add($$[$0]);
	break;
	case 255:
	self.$ = $$[$0-5].concat($$[$0-2].indented($$[$0-3],$$[$0]));
	break;
	case 257:
	self.$ = $$[$0].set({extension: $$[$0-1]});
	break;
	case 258:
	self.$ = $$[$0].set({local: $$[$0-1]});
	break;
	case 260:
	self.$ = new yy.ClassDeclaration($$[$0],null,[]).set({keyword: $$[$0-1]});
	break;
	case 261:
	self.$ = new yy.ClassDeclaration($$[$0-1],null,$$[$0]).set({keyword: $$[$0-2]});
	break;
	case 262:
	self.$ = new yy.ClassDeclaration($$[$0-2],$$[$0],[]).set({keyword: $$[$0-3]});
	break;
	case 263:
	self.$ = new yy.ClassDeclaration($$[$0-3],$$[$0-1],$$[$0]).set({keyword: $$[$0-4]});
	break;
	case 264:
	self.$ = new yy.Module($$[$0]);
	break;
	case 265:
	self.$ = new yy.Module($$[$0-1],null,$$[$0]);
	break;
	case 266:
	self.$ = new yy.Call($$[$0-2],$$[$0],$$[$0-1]);
	break;
	case 267:
	self.$ = $$[$0-1].addBlock($$[$0]);
	break;
	case 268:
	self.$ = false;
	break;
	case 269:
	self.$ = true;
	break;
	case 270:
	self.$ = new yy.ArgList([]);
	break;
	case 271:
	self.$ = $$[$0-2];
	break;
	case 272:
	self.$ = new yy.This($$[$0]);
	break;
	case 273:
	self.$ = new yy.Self($$[$0]);
	break;
	case 274:
	self.$ = new yy.Arr(new yy.ArgList([]));
	break;
	case 275:
	self.$ = new yy.Arr($$[$0-2]);
	break;
	case 276:
	self.$ = '..';
	break;
	case 277:
	self.$ = '...';
	break;
	case 278:
	self.$ = yy.OP($$[$0-2],$$[$0-3],$$[$0-1]);
	break;
	case 279:
	self.$ = new yy.Range($$[$0-2],$$[$0],$$[$0-1]);
	break;
	case 280:
	self.$ = new yy.Range($$[$0-1],null,$$[$0]);
	break;
	case 281:
	self.$ = new yy.Range(null,$$[$0],$$[$0-1]);
	break;
	case 285:
	self.$ = $$[$0-2].indented($$[$0-3],$$[$0]);
	break;
	case 286:
	self.$ = $$[$0-5].concat($$[$0-2]);
	break;
	case 294:
	self.$ = [].concat($$[$0-2],$$[$0]);
	break;
	case 295:
	self.$ = new yy.Try($$[$0]);
	break;
	case 296:
	self.$ = new yy.Try($$[$0-1],$$[$0]);
	break;
	case 297:
	self.$ = new yy.Try($$[$0-1],null,$$[$0]);
	break;
	case 298:
	self.$ = new yy.Try($$[$0-2],$$[$0-1],$$[$0]);
	break;
	case 299:
	self.$ = new yy.Finally($$[$0]);
	break;
	case 300:
	self.$ = new yy.Catch($$[$0],$$[$0-1]);
	break;
	case 301:
	self.$ = new yy.Throw($$[$0]);
	break;
	case 302:
	self.$ = new yy.Parens($$[$0-1],$$[$0-2],$$[$0]);
	break;
	case 303:
	self.$ = new yy.Parens($$[$0-2],$$[$0-4],$$[$0]);
	break;
	case 304:
	self.$ = new yy.While($$[$0],{keyword: $$[$0-1]});
	break;
	case 305:
	self.$ = new yy.While($$[$0-2],{guard: $$[$0],keyword: $$[$0-3]});
	break;
	case 306:
	self.$ = new yy.While($$[$0],{invert: true,keyword: $$[$0-1]});
	break;
	case 307:
	self.$ = new yy.While($$[$0-2],{invert: true,guard: $$[$0],keyword: $$[$0-3]});
	break;
	case 308: case 316: case 319:
	self.$ = $$[$0-1].addBody($$[$0]);
	break;
	case 309: case 310:
	self.$ = $$[$0].addBody(yy.Block.wrap([$$[$0-1]]));
	break;
	case 312:
	self.$ = new yy.While(new yy.Literal('true',{keyword: $$[$0-1]})).addBody($$[$0]);
	break;
	case 313:
	self.$ = new yy.While(new yy.Literal('true',{keyword: $$[$0-1]})).addBody(yy.Block.wrap([$$[$0]]));
	break;
	case 314: case 315:
	self.$ = $$[$0].addBody([$$[$0-1]]);
	break;
	case 320:
	self.$ = {source: new yy.ValueNode($$[$0])};
	break;
	case 321:
	self.$ = $$[$0].configure({own: $$[$0-1].own,name: $$[$0-1][0],index: $$[$0-1][1],keyword: $$[$0-1].keyword});
	break;
	case 322:
	self.$ = ($$[$0].keyword = $$[$0-1]) && $$[$0];
	break;
	case 323:
	self.$ = ($$[$0].own = true) && ($$[$0].keyword = $$[$0-2]) && $$[$0];
	break;
	case 325: case 326:
	self.$ = new yy.ValueNode($$[$0]);
	break;
	case 328:
	self.$ = [$$[$0-2],$$[$0]];
	break;
	case 329:
	self.$ = new yy.ForIn({source: $$[$0]});
	break;
	case 330:
	self.$ = new yy.ForOf({source: $$[$0],object: true});
	break;
	case 331:
	self.$ = new yy.ForIn({source: $$[$0-2],guard: $$[$0]});
	break;
	case 332:
	self.$ = new yy.ForOf({source: $$[$0-2],guard: $$[$0],object: true});
	break;
	case 333:
	self.$ = new yy.ForIn({source: $$[$0-2],step: $$[$0]});
	break;
	case 334:
	self.$ = new yy.ForIn({source: $$[$0-4],guard: $$[$0-2],step: $$[$0]});
	break;
	case 335:
	self.$ = new yy.ForIn({source: $$[$0-4],step: $$[$0-2],guard: $$[$0]});
	break;
	case 336:
	self.$ = new yy.Switch($$[$0-3],$$[$0-1]);
	break;
	case 337:
	self.$ = new yy.Switch($$[$0-5],$$[$0-3],$$[$0-1]);
	break;
	case 338:
	self.$ = new yy.Switch(null,$$[$0-1]);
	break;
	case 339:
	self.$ = new yy.Switch(null,$$[$0-3],$$[$0-1]);
	break;
	case 341:
	self.$ = $$[$0-1].concat($$[$0]);
	break;
	case 342:
	self.$ = [new yy.SwitchCase($$[$0-1],$$[$0])];
	break;
	case 343:
	self.$ = [new yy.SwitchCase($$[$0-2],$$[$0-1])];
	break;
	case 344:
	self.$ = new yy.If($$[$0-1],$$[$0],{type: $$[$0-2]});
	break;
	case 345:
	self.$ = $$[$0-4].addElse(new yy.If($$[$0-1],$$[$0],{type: $$[$0-2]}));
	break;
	case 346:
	self.$ = $$[$0-3].addElse(new yy.If($$[$0-1],$$[$0],{type: $$[$0-2]}));
	break;
	case 347:
	self.$ = $$[$0-2].addElse($$[$0]);
	break;
	case 349:
	self.$ = new yy.If($$[$0],new yy.Block([$$[$0-2]]),{type: $$[$0-1],statement: true});
	break;
	case 350:
	self.$ = new yy.If($$[$0],new yy.Block([$$[$0-2]]),{type: $$[$0-1]});
	break;
	case 351:
	self.$ = yy.If.ternary($$[$0-4],$$[$0-2],$$[$0]);
	break;
	case 352: case 353:
	self.$ = yy.OP($$[$0-1],$$[$0]);
	break;
	case 354:
	self.$ = new yy.Op('-',$$[$0]);
	break;
	case 355:
	self.$ = new yy.Op('+',$$[$0]);
	break;
	case 356:
	self.$ = new yy.UnaryOp('--',null,$$[$0]);
	break;
	case 357:
	self.$ = new yy.UnaryOp('++',null,$$[$0]);
	break;
	case 358:
	self.$ = new yy.UnaryOp('--',$$[$0-1],null,true);
	break;
	case 359:
	self.$ = new yy.UnaryOp('++',$$[$0-1],null,true);
	break;
	case 360: case 361:
	self.$ = new yy.Op($$[$0-1],$$[$0-2],$$[$0]);
	break;
	case 362: case 363: case 364: case 365: case 367:
	self.$ = yy.OP($$[$0-1],$$[$0-2],$$[$0]);
	break;
	case 366:
	self.$ = yy.OP($$[$0-1],$$[$0-3],$$[$0]).invert($$[$0-2]);
	break;
	case 368:
	self.$ = yy.OP_COMPOUND($$[$0-1]._value,$$[$0-1],$$[$0-2],$$[$0]);
	break;
	case 369:
	self.$ = yy.OP_COMPOUND($$[$0-3]._value,$$[$0-4],$$[$0-1].indented($$[$0-2],$$[$0]));
	break;
	}
	},
	table: [{1:[2,1],3:1,4:2,5:3,7:$V0,8:5,10:$V1,12:7,13:8,15:9,16:10,17:11,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,128:$Vu,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{1:[3]},{1:[2,2],6:$V71,9:137},{6:[1,139]},o($V81,[2,4]),o($V81,[2,5],{14:$V91}),{4:142,6:[1,143],7:$V0,8:5,11:[1,141],12:7,13:8,15:9,16:10,17:11,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,128:$Vu,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Va1,[2,12]),o($Va1,[2,13],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Va1,[2,16]),o($Va1,[2,17],{226:111,230:112,219:157,225:158,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vl1}),o($Va1,[2,18]),{13:159,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vm1,[2,39]),o($Vm1,[2,40],{203:161,152:162,188:164,22:$Vn1,95:$Vo1,117:$Vp1,155:$VF,189:$Vq1,190:$Vr1,192:$Vs1,204:$Vt1}),o($Vm1,[2,41]),o($Vm1,[2,42]),o($Vm1,[2,43]),o($Vm1,[2,44]),o($Vm1,[2,45]),o($Vm1,[2,46]),o($Vm1,[2,47]),o($Vm1,[2,48]),o($Vm1,[2,49]),o($Vm1,[2,50]),o($Vm1,[2,51]),o($Vm1,[2,52]),o($Vm1,[2,53]),o($Vm1,[2,54]),o($Vu1,[2,157]),o($Vu1,[2,158]),o($Vv1,[2,19]),o($Vv1,[2,20]),o($Vv1,[2,21]),o($Vv1,[2,22],{22:[1,170]}),o($Vv1,[2,24],{22:[1,171]}),o($Vv1,[2,26]),o($Vv1,[2,27]),{13:173,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,129:[1,172],130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:174,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vw1,$Vx1,{122:[1,175]}),o($Vw1,[2,238]),o($Vw1,[2,239]),o($Vw1,[2,240]),o($Vw1,[2,241]),o($Vw1,[2,242]),o($Vw1,[2,243]),o($Vw1,[2,244]),o($Vw1,[2,245]),o($Vw1,[2,246]),o($Vw1,[2,247]),o($Vm1,[2,159]),o($Vm1,[2,160]),o($Vm1,[2,161]),{13:176,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:177,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:178,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:179,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{33:$V7,35:50,36:$V8,38:42,39:43,41:181,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,115:104,139:47,140:$Vz,141:$VA,142:182,147:$VB,161:79,172:46,175:78,180:105,181:$VK,183:$VL,184:180,185:$VM,187:41,193:$VN,195:44,196:$VP,197:49,205:$VS,206:$VT},{33:$V7,35:50,36:$V8,38:42,39:43,41:181,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,115:104,139:47,140:$Vz,141:$VA,142:182,147:$VB,161:79,172:46,175:78,180:105,181:$VK,183:$VL,184:183,185:$VM,187:41,193:$VN,195:44,196:$VP,197:49,205:$VS,206:$VT},o($Vy1,$Vz1,{252:[1,184],253:[1,185],258:[1,186]}),o($Vm1,[2,348],{240:[1,187],245:[1,188]}),{5:189,10:$V1},{5:190,10:$V1},o($Vm1,[2,311]),{5:191,10:$V1},{10:[1,193],13:192,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vm1,[2,256]),{130:195,134:$Vy,200:194,201:$VQ},{130:197,134:$Vy,200:196,201:$VQ},{130:199,134:$Vy,164:200,165:$VI,200:198,201:$VQ},{33:$V7,35:50,36:$V8,38:42,39:43,41:181,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,115:104,139:47,140:$Vz,141:$VA,142:182,147:$VB,161:79,172:46,175:78,180:105,181:$VK,183:$VL,184:201,185:$VM,187:41,193:$VN,195:44,196:$VP,197:49,205:$VS,206:$VT},o($Vm1,[2,130]),o($VA1,[2,108],{111:202,114:204,115:205,57:[1,206],96:[1,203],116:[1,207],206:$VT}),{56:209,57:$V9,96:[1,210],160:208},o($Vv1,[2,83],{40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,18:31,19:32,26:37,142:40,187:41,38:42,39:43,195:44,172:46,139:47,108:48,197:49,35:50,151:51,152:52,153:53,184:60,243:61,219:63,223:64,225:65,200:67,130:72,159:74,175:78,161:79,71:81,89:94,164:96,65:100,60:101,63:102,67:103,115:104,180:105,56:106,226:111,230:112,69:120,73:121,16:160,13:211,88:212,20:$V2,21:$V3,22:$VB1,24:$V4,25:$V5,27:$V6,33:$V7,36:$V8,57:$V9,61:$Va,62:$Vb,64:$Vc,66:$Vd,68:$Ve,70:$Vf,72:$Vg,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,90:$Vq,96:$Vr,103:$Vs,110:$Vt,131:$Vv,132:$Vw,133:$Vx,134:$Vy,140:$Vz,141:$VA,147:$VB,154:$VE,155:$VF,162:$VG,163:$VH,165:$VI,181:$VK,183:$VL,185:$VM,193:$VN,194:$VO,196:$VP,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,224:$VY,238:$V$,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61}),{13:214,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{28:215,30:216,32:217,33:$VC1,34:219,56:221,57:$V9,65:220,66:$Vd},o($Vy1,[2,234]),o($Vy1,[2,235]),o($VD1,[2,232]),o($Vw1,[2,73]),o($Vw1,[2,74]),o($Vw1,[2,75]),o($Vw1,[2,76]),o($Vw1,[2,77]),o($Vw1,[2,78]),o($Vw1,[2,79]),o($Vw1,[2,80]),{4:222,7:$V0,8:5,10:[1,223],12:7,13:8,15:9,16:10,17:11,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,128:$Vu,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{10:$VE1,12:229,13:224,15:231,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,104:$VF1,108:48,110:$Vt,115:104,126:226,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,178:$VG1,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,210:227,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o([1,6,10,11,14,22,23,79,95,97,98,104,117,118,125,136,146,148,155,158,178,189,190,192,204,208,209,220,221,222,227,228,237,246,247,250,251,254,255,256,257],[2,272]),o($Vw1,[2,142]),o($Vw1,[2,143]),{91:233,92:[1,234],93:[1,235],94:[1,236],95:[1,237],98:[1,238],99:[1,239],100:[1,240],101:[1,241],102:[1,242],103:[1,243],107:[1,244],109:[1,232]},o($Vw1,[2,38],{71:81,69:120,73:121,37:245,38:246,39:247,33:$V7,70:$Vf,72:$Vg,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,147:$VB}),o($Vm1,[2,172]),{5:248,10:$V1,156:[1,249]},{5:250,10:$V1},o($VD1,[2,213]),o($VD1,[2,214]),o($VD1,[2,215]),o($VD1,[2,216]),o($VD1,[2,217]),o($VD1,[2,218]),o($VD1,[2,219]),o($VD1,[2,220]),{13:251,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:252,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:253,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{5:254,10:$V1,13:255,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{56:260,57:$V9,96:$Vr,103:$Vs,161:262,175:261,195:256,232:257,233:[1,258],234:259},{231:263,235:[1,264],236:[1,265]},{33:$V7,35:50,36:$V8,38:42,39:43,41:181,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,115:104,139:47,140:$Vz,141:$VA,142:182,147:$VB,161:79,172:46,175:78,180:105,181:$VK,183:$VL,184:266,185:$VM,187:41,193:$VN,195:44,196:$VP,197:49,205:$VS,206:$VT},{116:$VH1,135:267,138:$VI1},o($VJ1,[2,168]),o($VJ1,[2,169]),o([6,10,14,97],$VK1,{69:120,73:121,199:270,144:271,145:272,15:273,56:274,65:275,58:276,71:277,60:278,63:279,33:$V7,57:$V9,59:$VL1,61:$Va,62:$Vb,64:$Vc,66:$Vd,70:$Vf,72:$Vg,74:$Vh,147:$VM1,149:$VC,150:$VD}),o($Vw1,[2,63]),o($Vw1,[2,64]),o($Vw1,[2,65]),o($Vw1,[2,66],{76:283,75:[1,282],77:[1,284],78:[1,285]}),o($VN1,[2,84]),{56:291,57:$V9,63:290,64:$Vc,65:292,66:$Vd,96:$VO1,115:289,166:286,168:287,172:288,205:$VS,206:$VT},o([1,6,10,11,14,22,23,29,79,95,97,98,104,117,118,122,125,136,146,148,155,158,170,171,178,189,190,192,204,208,209,220,221,222,227,228,237,246,247,250,251,252,253,254,255,256,257,258],[2,60]),o($VP1,[2,57]),o($VP1,[2,58]),o([1,6,10,11,14,22,23,79,95,97,98,104,117,118,122,125,136,146,148,155,158,178,189,190,192,204,208,209,220,221,222,227,228,237,246,247,250,251,252,253,254,255,256,257,258],[2,59]),o($VD1,[2,61]),o($VP1,[2,273]),{56:297,57:$V9,65:296,66:$Vd,103:$VQ1,175:298,177:[1,294],182:295},{56:297,57:$V9,65:296,66:$Vd,103:$VQ1,175:298,177:[1,301],182:300},o([1,6,10,11,14,22,23,29,79,95,96,97,98,104,105,117,118,122,125,136,146,148,155,158,170,171,178,189,190,192,204,208,209,220,221,222,227,228,235,236,237,246,247,250,251,252,253,254,255,256,257,258],[2,55]),o($VR1,[2,317]),o($VR1,[2,318]),o($VD1,[2,62]),o($VS1,[2,67]),o($V81,[2,7],{12:7,13:8,15:9,16:10,17:11,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,18:31,19:32,26:37,142:40,187:41,38:42,39:43,195:44,172:46,139:47,108:48,197:49,35:50,151:51,152:52,153:53,184:60,243:61,219:63,223:64,225:65,200:67,130:72,159:74,175:78,161:79,71:81,89:94,164:96,65:100,60:101,63:102,67:103,115:104,180:105,56:106,226:111,230:112,69:120,73:121,8:302,20:$V2,21:$V3,24:$V4,25:$V5,27:$V6,33:$V7,36:$V8,57:$V9,61:$Va,62:$Vb,64:$Vc,66:$Vd,68:$Ve,70:$Vf,72:$Vg,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,90:$Vq,96:$Vr,103:$Vs,110:$Vt,128:$Vu,131:$Vv,132:$Vw,133:$Vx,134:$Vy,140:$Vz,141:$VA,147:$VB,149:$VC,150:$VD,154:$VE,155:$VF,162:$VG,163:$VH,165:$VI,177:$VJ,181:$VK,183:$VL,185:$VM,193:$VN,194:$VO,196:$VP,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,220:$VW,222:$VX,224:$VY,227:$VZ,228:$V_,238:$V$,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61}),o([1,6,11,20,21,24,25,27,33,36,57,59,61,62,64,66,68,70,72,74,80,81,82,83,84,85,86,87,90,96,103,110,128,131,132,133,134,140,141,147,148,149,150,154,155,162,163,165,177,178,181,183,185,193,194,196,201,202,205,206,212,218,220,222,224,227,228,238,244,248,249,250,251,252,253],[2,8]),{1:[2,3]},{12:304,13:303,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($VT1,[2,9]),{6:$V71,9:137,11:[1,305]},{4:306,7:$V0,8:5,12:7,13:8,15:9,16:10,17:11,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,128:$Vu,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:307,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:308,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:309,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:310,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:311,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:312,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{257:[1,313]},{13:314,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:315,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:316,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vm1,[2,310]),o($Vm1,[2,315]),{13:317,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vm1,[2,309]),o($Vm1,[2,314]),o([1,6,10,11,14,23,104,148],[2,203],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),{219:157,220:$VW,222:$VX,225:158,226:111,227:$VZ,228:$V_,230:112,246:$Vl1},{22:$VB1,88:318},o($Vw1,[2,267]),o($VU1,[2,230],{187:320,69:321,70:$Vf,186:[1,319],193:$VN}),{56:322,57:$V9,60:323,61:$Va,62:$Vb,65:324,66:$Vd},{56:325,57:$V9},{56:326,57:$V9},{13:328,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,191:327,193:$VN,194:$VO,195:44,196:$VP,197:49,198:329,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,207:330,208:$VV1,209:$VW1,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{22:[2,269]},o($VU1,[2,231]),{13:333,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:334,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:335,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Va1,[2,129],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($VX1,[2,236],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),{10:[1,337],13:336,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($VY1,[2,352],{226:111,230:112,219:154,225:155,256:$Vj1}),o($VY1,[2,353],{226:111,230:112,219:154,225:155,256:$Vj1}),o($VY1,[2,354],{226:111,230:112,219:154,225:155,256:$Vj1}),o($VY1,[2,355],{226:111,230:112,219:154,225:155,256:$Vj1}),o($Vm1,[2,356],{22:$Vz1,95:$Vz1,117:$Vz1,155:$Vz1,189:$Vz1,190:$Vz1,192:$Vz1,204:$Vz1}),{22:$Vn1,95:$Vo1,117:$Vp1,152:162,155:$VF,188:164,189:$Vq1,190:$Vr1,192:$Vs1,203:161,204:$Vt1},o([22,95,117,155,189,190,192,204],$Vx1),o($Vm1,[2,357],{22:$Vz1,95:$Vz1,117:$Vz1,155:$Vz1,189:$Vz1,190:$Vz1,192:$Vz1,204:$Vz1}),o($Vm1,[2,358]),o($Vm1,[2,359]),{10:[1,339],13:338,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{5:341,10:$V1,244:[1,340]},{13:342,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vm1,[2,295],{213:343,214:344,215:$VZ1,216:[1,345]}),o($Vm1,[2,308]),o($Vm1,[2,316]),{10:[1,347],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},{239:348,241:349,242:$V_1},o($Vm1,[2,257]),o($Vm1,[2,131]),o($Vm1,[2,258]),o($Vm1,[2,132]),o($Vm1,[2,259]),o($Vm1,[2,133]),o($Vm1,[2,173]),o($V$1,[2,264],{5:351,10:$V1,22:$Vz1,95:$Vz1,117:$Vz1,155:$Vz1,189:$Vz1,190:$Vz1,192:$Vz1,204:$Vz1}),{60:357,61:$Va,62:$Vb,95:[1,353],98:[1,356],112:[1,352],117:[1,354],119:[1,355],120:358,121:[1,359]},{13:360,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($VA1,[2,109]),o($VA1,[2,105]),o($VA1,[2,106]),o($VA1,[2,107]),o($Vm1,[2,167],{161:361,22:[1,362],96:$Vr}),o($V02,[2,170]),{13:363,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vv1,[2,81],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vv1,[2,82]),{10:$VE1,12:229,13:366,15:231,16:160,18:31,19:32,20:$V2,21:$V3,23:[1,364],24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,126:365,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,178:$VG1,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,210:227,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vv1,[2,301],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),{14:[1,368],29:[1,367]},o($Vv1,[2,30],{31:[1,369]}),o($V12,[2,32]),o([1,6,11,14,31,148,220,222,227,228,246],[2,31]),o($V22,[2,34]),o($V22,[2,208]),o($V22,[2,209]),{6:$V71,9:137,148:[1,370]},{4:371,7:$V0,8:5,12:7,13:8,15:9,16:10,17:11,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,128:$Vu,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o([6,10,14,104],$V32,{226:111,230:112,219:154,225:155,207:372,136:$Vb1,178:$Vc1,208:$VV1,209:$VW1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($V42,[2,274]),o([6,10,104],$V52,{173:373,14:$V62}),o($V72,[2,282]),{10:$VE1,12:229,13:366,15:231,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,126:375,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,178:$VG1,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,210:227,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($V72,[2,290]),o($V72,[2,291]),o($V72,[2,292]),o($Vw1,[2,98]),o($VN1,[2,85]),o($VN1,[2,86]),o($VN1,[2,87]),o($VN1,[2,88]),{96:[1,376]},{96:[1,377]},o($VN1,[2,91]),o($VN1,[2,92]),o($VN1,[2,93]),o($VN1,[2,94]),{56:378,57:$V9},o($VN1,[2,97]),o($Vw1,[2,35]),o($Vw1,[2,36]),o($Vw1,[2,37]),o($Vw1,[2,163]),o([14,158],$V82,{157:379,174:380,161:381,175:382,176:383,56:387,57:$V9,96:$Vr,103:$VQ1,177:$V92,178:$Va2,179:$Vb2}),o($Vm1,[2,162]),{5:388,10:$V1,136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($Vc2,[2,304],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,221:[1,389],222:$VX,227:$VZ,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vc2,[2,306],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,221:[1,390],222:$VX,227:$VZ,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vm1,[2,312]),o($Vd2,[2,313],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vm1,[2,320]),o($Ve2,[2,322]),{56:260,57:$V9,96:$Vr,103:$VQ1,161:262,175:261,232:391,234:259},o($Ve2,[2,327],{14:[1,392]}),o($Vf2,[2,324]),o($Vf2,[2,325]),o($Vf2,[2,326]),o($Vm1,[2,321]),{13:393,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:394,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vg2,[2,260],{5:395,10:$V1,22:$Vz1,95:$Vz1,117:$Vz1,155:$Vz1,189:$Vz1,190:$Vz1,192:$Vz1,204:$Vz1,136:[1,396]}),o($Vg2,[2,134],{5:397,10:$V1,136:[1,398]}),o($Vm1,[2,140]),o($Vm1,[2,141]),o([6,10,97],$V52,{173:399,14:$Vh2}),o($Vi2,[2,252]),o($Vi2,[2,146],{146:[1,401]}),o($Vi2,[2,149]),o($Vj2,[2,150]),o($Vj2,[2,151]),o($Vj2,[2,152]),o($Vj2,[2,153]),o($Vj2,[2,154]),o($Vj2,[2,155]),{13:402,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vj2,[2,56]),o($VS1,[2,68]),o($VS1,[2,69]),o($VS1,[2,70]),{13:404,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,79:[1,403],80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{95:[1,406],98:[1,407],167:405},o($Vk2,[2,186],{169:409,22:[1,408],170:$Vl2,171:$Vm2}),o($Vk2,[2,187]),o($Vk2,[2,188]),o($Vk2,[2,189]),o($Vn2,[2,180]),o($Vn2,[2,181]),{13:412,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{56:297,57:$V9,65:296,66:$Vd,103:$VQ1,175:298,182:413},o($VD1,[2,205]),o($VD1,[2,210]),o($VD1,[2,211]),o($VD1,[2,212]),{10:$VE1,12:229,13:366,15:231,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,104:$VF1,108:48,110:$Vt,115:104,126:226,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,178:$VG1,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,210:227,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($VD1,[2,206]),{56:297,57:$V9,65:296,66:$Vd,103:$VQ1,175:298,182:414},o($V81,[2,6],{14:$V91}),o($Va1,[2,14],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Va1,[2,15]),o($VT1,[2,10]),{6:$V71,9:137,11:[1,415]},o($Vo2,[2,360],{226:111,230:112,219:154,225:155,254:$Vh1,256:$Vj1}),o($Vo2,[2,361],{226:111,230:112,219:154,225:155,254:$Vh1,256:$Vj1}),o($VY1,[2,362],{226:111,230:112,219:154,225:155,256:$Vj1}),o([1,6,10,11,14,23,79,97,104,118,125,136,146,148,158,178,208,209,220,221,222,227,228,237,246,247,255,257],[2,363],{226:111,230:112,219:154,225:155,250:$Vf1,251:$Vg1,254:$Vh1,256:$Vj1}),o([1,6,10,11,14,23,79,97,104,118,125,136,146,148,158,178,208,209,220,221,222,227,228,237,246,247],[2,364],{226:111,230:112,219:154,225:155,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o([1,6,10,11,14,23,79,97,104,118,125,146,148,158,178,208,209,220,221,222,227,228,237,246,247],[2,365],{226:111,230:112,219:154,225:155,136:$Vb1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),{13:416,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o([1,6,10,11,14,23,79,97,104,118,125,136,146,148,158,178,208,209,220,221,222,227,228,237,246,247,257],[2,367],{226:111,230:112,219:154,225:155,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1}),o($Vp2,[2,350],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),{136:$Vb1,146:[1,417],178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($Vp2,[2,349],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vw1,[2,266]),o($VD1,[2,221]),o($VD1,[2,222]),o($VD1,[2,227]),o($VD1,[2,223]),o($VD1,[2,226]),o($VD1,[2,228]),o($VD1,[2,224]),o($VD1,[2,225]),{118:[1,418]},{118:[2,248],136:$Vb1,178:$Vc1,207:419,208:$VV1,209:$VW1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},{118:[2,249]},{13:420,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vq2,[2,276]),o($Vq2,[2,277]),{23:[1,421],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},{23:[1,422],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($Va1,[2,128],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($VX1,[2,144],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),{13:423,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($VX1,[2,368],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),{13:424,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:425,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vr2,[2,347]),{5:426,10:$V1,136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($Vm1,[2,296],{214:427,215:$VZ1}),o($Vm1,[2,297]),{217:[1,428]},{5:429,10:$V1},{239:430,241:349,242:$V_1},{11:[1,431],240:[1,432],241:433,242:$V_1},o($Vs2,[2,340]),{13:435,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,211:434,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vm1,[2,265]),o($V$1,[2,102],{113:436,54:439,10:[1,437],22:[1,438],110:$Vt}),{57:[1,441],66:[1,442],70:[1,440],96:[1,443]},{13:444,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{96:[1,445]},{57:[1,446],96:[1,447]},o($VA1,[2,117]),o($VA1,[2,119]),o($VA1,[2,120],{122:[1,448]}),{97:[1,449],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($Vm1,[2,165]),{96:$Vr,161:450},{97:[1,451],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($Vw1,[2,270]),o([6,10,23],$V52,{173:452,14:$V62}),o($V72,$V32,{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),{30:453,33:$VC1},{32:454,34:219,56:221,57:$V9,65:220,66:$Vd},{32:455,34:219,56:221,57:$V9,65:220,66:$Vd},o($Vw1,[2,302]),{6:$V71,9:137,11:[1,456]},{13:457,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{6:$V71,9:459,10:$Vt2,104:[1,458]},o([6,10,11,23,104],$Vu2,{40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,18:31,19:32,26:37,142:40,187:41,38:42,39:43,195:44,172:46,139:47,108:48,197:49,35:50,151:51,152:52,153:53,184:60,243:61,219:63,223:64,225:65,200:67,130:72,159:74,175:78,161:79,71:81,89:94,164:96,65:100,60:101,63:102,67:103,115:104,180:105,56:106,226:111,230:112,69:120,73:121,16:160,12:229,15:231,13:366,210:461,20:$V2,21:$V3,24:$V4,25:$V5,27:$V6,33:$V7,36:$V8,57:$V9,61:$Va,62:$Vb,64:$Vc,66:$Vd,68:$Ve,70:$Vf,72:$Vg,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,90:$Vq,96:$Vr,103:$Vs,110:$Vt,131:$Vv,132:$Vw,133:$Vx,134:$Vy,140:$Vz,141:$VA,147:$VB,149:$VC,150:$VD,154:$VE,155:$VF,162:$VG,163:$VH,165:$VI,177:$VJ,178:$VG1,181:$VK,183:$VL,185:$VM,193:$VN,194:$VO,196:$VP,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,220:$VW,222:$VX,224:$VY,227:$VZ,228:$V_,238:$V$,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61}),o($Vv2,$V52,{173:462,14:$V62}),{13:463,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:464,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{104:[1,465],105:[1,466]},{14:$Vw2,158:[1,467]},o($Vx2,[2,193]),o($Vx2,[2,195]),o($Vx2,[2,196]),o($Vx2,[2,197],{122:[1,469]}),{56:387,57:$V9,176:470},{56:387,57:$V9,176:471},{56:387,57:$V9,176:472},o([14,23,122,158],[2,202]),o($Vr2,[2,344]),{13:473,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:474,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Ve2,[2,323]),{56:260,57:$V9,96:$Vr,103:$VQ1,161:262,175:261,234:475},o([1,6,10,11,14,23,79,97,104,118,125,146,148,158,208,209,220,222,227,228,246],[2,329],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,221:[1,476],237:[1,477],247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vy2,[2,330],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,221:[1,478],247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vm1,[2,261]),{13:479,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vm1,[2,135]),{116:$VH1,135:480,138:$VI1},{6:$V71,9:482,10:$Vz2,97:[1,481]},o([6,10,11,97],$Vu2,{69:120,73:121,145:272,15:273,56:274,65:275,58:276,71:277,60:278,63:279,144:484,33:$V7,57:$V9,59:$VL1,61:$Va,62:$Vb,64:$Vc,66:$Vd,70:$Vf,72:$Vg,74:$Vh,147:$VM1,149:$VC,150:$VD}),{10:[1,486],13:485,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{136:$Vb1,148:[1,487],178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($VS1,[2,71]),{79:[1,488],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},{56:291,57:$V9,65:292,66:$Vd,96:$VO1,168:489},o($VA2,[2,178]),o($VA2,[2,179]),o($VB2,$V82,{174:380,161:381,175:382,176:383,56:387,157:490,57:$V9,96:$Vr,103:$VQ1,177:$V92,178:$Va2,179:$Vb2}),o($Vm1,[2,177]),{5:491,10:$V1,152:492,155:$VF},o($Vm1,[2,185]),{97:[1,493],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($VD1,[2,204]),o($VD1,[2,207]),o($VT1,[2,11]),o($VY1,[2,366],{226:111,230:112,219:154,225:155,256:$Vj1}),{13:494,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($VD1,[2,229]),{13:495,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,118:[2,280],130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{118:[2,281],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($Vv1,[2,23]),o($Vv1,[2,25]),{6:$V71,9:497,11:$VC2,136:$Vb1,143:496,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},{6:$V71,9:497,11:$VC2,136:$Vb1,143:499,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},{5:500,10:$V1,136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($Vr2,[2,346]),o($Vm1,[2,298]),{5:501,10:$V1},o($Vm1,[2,299]),{11:[1,502],240:[1,503],241:433,242:$V_1},o($Vm1,[2,338]),{5:504,10:$V1},o($Vs2,[2,341]),{5:505,10:$V1,14:[1,506]},o($VD2,[2,293],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vm1,[2,103]),{10:$VE1,12:229,13:366,15:231,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,126:507,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,178:$VG1,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,210:227,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{10:$VE1,12:229,13:366,15:231,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,126:508,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,178:$VG1,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,210:227,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vm1,[2,125]),o($VA1,[2,110]),o($VA1,[2,112]),o($VA1,[2,113]),{13:509,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{118:[1,510],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},{13:511,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($VA1,[2,116]),{13:512,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{123:513,124:[1,514]},{112:[1,515]},{23:[1,516]},o($V02,[2,171]),{6:$V71,9:459,10:$Vt2,23:[1,517]},o($Vv1,[2,28]),o($V12,[2,33]),o($Vv1,[2,29]),{148:[1,518]},{104:[1,519],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($V42,[2,275]),{12:229,13:366,15:231,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,178:$VG1,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,210:520,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{10:$VE1,12:229,13:366,15:231,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,126:521,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,178:$VG1,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,210:227,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($V72,[2,283]),{6:$V71,9:523,10:$Vt2,11:$VC2,143:522},{97:[1,524],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},{97:[1,525],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($VN1,[2,95]),{33:$V7,57:[1,527],69:120,70:$Vf,71:528,72:$Vg,73:121,74:$Vh,96:[1,529],106:526},{5:530,10:$V1},{56:387,57:$V9,96:$Vr,103:$VQ1,161:381,174:531,175:382,176:383,177:$V92,178:$Va2,179:$Vb2},{13:532,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vx2,[2,198]),o($Vx2,[2,199]),o($Vx2,[2,200]),o($Vd2,[2,305],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vd2,[2,307],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Ve2,[2,328]),{13:533,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:534,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:535,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o([1,6,11,14,23,79,97,104,118,125,146,148,158,208,209,221,228,237,246],[2,262],{226:111,230:112,219:154,225:155,5:536,10:$V1,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($V$1,[2,136],{5:537,10:$V1}),o([1,6,10,11,14,22,23,79,95,97,104,117,118,122,125,136,146,148,155,158,178,189,190,192,204,208,209,220,221,222,227,228,235,236,237,246,247,250,251,254,255,256,257],[2,250]),{15:273,33:$V7,56:274,57:$V9,58:276,59:$VL1,60:278,61:$Va,62:$Vb,63:279,64:$Vc,65:275,66:$Vd,69:120,70:$Vf,71:277,72:$Vg,73:121,74:$Vh,144:538,145:272,147:$VM1,149:$VC,150:$VD},o([6,10,11,14],$VK1,{69:120,73:121,144:271,145:272,15:273,56:274,65:275,58:276,71:277,60:278,63:279,199:539,33:$V7,57:$V9,59:$VL1,61:$Va,62:$Vb,64:$Vc,66:$Vd,70:$Vf,72:$Vg,74:$Vh,147:$VM1,149:$VC,150:$VD}),o($Vi2,[2,253]),o($Vi2,[2,147],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),{13:540,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vj2,[2,156]),o($VS1,[2,72]),{22:[1,541],169:542,170:$Vl2,171:$Vm2},{14:$Vw2,23:[1,543]},o($Vm1,[2,183]),o($Vm1,[2,184]),o($Vn2,[2,182]),o([1,6,10,11,14,23,79,97,104,118,125,146,148,158,208,209,220,221,222,227,228,237,246,247],[2,351],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),{118:[2,279],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($Vm1,[2,145]),{11:$VE2},o($Vm1,[2,288]),o($Vm1,[2,369]),o($Vr2,[2,345]),o([1,6,10,11,14,23,79,97,104,118,125,136,146,148,158,178,208,209,215,220,221,222,227,228,237,246,247,250,251,254,255,256,257],[2,300]),o($Vm1,[2,336]),{5:545,10:$V1},{11:[1,546]},o($Vs2,[2,342],{6:[1,547]}),{13:548,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($VF2,$V52,{173:550,11:[1,549],14:$V62}),o($VF2,$V52,{173:550,14:$V62,23:[1,551]}),{97:[1,552],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($VA1,[2,111]),{97:[1,553],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},{97:[1,554],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($VA1,[2,121]),{13:555,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vm1,[2,104]),o($Vm1,[2,166]),o($Vw1,[2,271]),o($Vw1,[2,303]),o($Vw1,[2,278]),o($V72,[2,284]),o($Vv2,$V52,{173:556,14:$V62}),o($V72,[2,285]),{11:$VE2,12:229,13:366,15:231,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,149:$VC,150:$VD,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,177:$VJ,178:$VG1,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,210:520,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($VN1,[2,89]),o($VN1,[2,90]),{104:[1,557]},{104:[2,99]},{104:[2,100]},{13:558,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},o($Vw1,[2,164]),o($Vx2,[2,194]),o($Vx2,[2,201],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o([1,6,10,11,14,23,79,97,104,118,125,146,148,158,208,209,220,221,222,227,228,246],[2,331],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,237:[1,559],247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vy2,[2,333],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,221:[1,560],247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($VX1,[2,332],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vm1,[2,263]),o($Vm1,[2,137]),o($Vi2,[2,254]),o($Vv2,$V52,{173:561,14:$Vh2}),{6:$V71,9:497,11:$VC2,136:$Vb1,143:562,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},o($VB2,$V82,{174:380,161:381,175:382,176:383,56:387,157:563,57:$V9,96:$Vr,103:$VQ1,177:$V92,178:$Va2,179:$Vb2}),o($Vm1,[2,175]),{169:564,170:$Vl2,171:$Vm2},o($Vm1,[2,287]),{6:$V71,9:497,11:$VC2,143:565},o($Vm1,[2,339]),o($Vs2,[2,343]),o($VD2,[2,294],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,220:$VW,222:$VX,227:$VZ,228:$V_,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vm1,[2,123]),{6:$V71,9:459,10:$Vt2},o($Vm1,[2,124]),o($VA1,[2,114]),o($VA1,[2,115]),o($VA1,[2,118]),{125:[1,566],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},{6:$V71,9:523,10:$Vt2,11:$VC2,143:567},o($VN1,[2,96]),{97:[1,568],136:$Vb1,178:$Vc1,219:154,220:$VW,222:$VX,225:155,226:111,227:$VZ,228:$V_,230:112,246:$Vd1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1},{13:569,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{13:570,16:160,18:31,19:32,20:$V2,21:$V3,24:$V4,25:$V5,26:37,27:$V6,33:$V7,35:50,36:$V8,38:42,39:43,40:13,41:14,42:15,43:16,44:17,45:18,46:19,47:20,48:21,49:22,50:23,51:24,52:25,53:26,54:27,55:28,56:106,57:$V9,60:101,61:$Va,62:$Vb,63:102,64:$Vc,65:100,66:$Vd,67:103,68:$Ve,69:120,70:$Vf,71:81,72:$Vg,73:121,74:$Vh,80:$Vi,81:$Vj,82:$Vk,83:$Vl,84:$Vm,85:$Vn,86:$Vo,87:$Vp,89:94,90:$Vq,96:$Vr,103:$Vs,108:48,110:$Vt,115:104,130:72,131:$Vv,132:$Vw,133:$Vx,134:$Vy,139:47,140:$Vz,141:$VA,142:40,147:$VB,151:51,152:52,153:53,154:$VE,155:$VF,159:74,161:79,162:$VG,163:$VH,164:96,165:$VI,172:46,175:78,180:105,181:$VK,183:$VL,184:60,185:$VM,187:41,193:$VN,194:$VO,195:44,196:$VP,197:49,200:67,201:$VQ,202:$VR,205:$VS,206:$VT,212:$VU,218:$VV,219:63,220:$VW,222:$VX,223:64,224:$VY,225:65,226:111,227:$VZ,228:$V_,230:112,238:$V$,243:61,244:$V01,248:$V11,249:$V21,250:$V31,251:$V41,252:$V51,253:$V61},{6:$V71,9:572,10:$Vz2,11:$VC2,143:571},o($Vi2,[2,148]),{14:$Vw2,23:[1,573]},o($Vm1,[2,176]),o($Vm1,[2,337]),o($VA1,[2,122]),o($V72,[2,286]),{104:[2,101]},o($VX1,[2,334],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($VX1,[2,335],{226:111,230:112,219:154,225:155,136:$Vb1,178:$Vc1,247:$Ve1,250:$Vf1,251:$Vg1,254:$Vh1,255:$Vi1,256:$Vj1,257:$Vk1}),o($Vi2,[2,255]),{11:$VE2,15:273,33:$V7,56:274,57:$V9,58:276,59:$VL1,60:278,61:$Va,62:$Vb,63:279,64:$Vc,65:275,66:$Vd,69:120,70:$Vf,71:277,72:$Vg,73:121,74:$Vh,144:538,145:272,147:$VM1,149:$VC,150:$VD},{169:574,170:$Vl2,171:$Vm2},o($Vm1,[2,174])],
	defaultActions: {139:[2,3],168:[2,269],329:[2,249],527:[2,99],528:[2,100],568:[2,101]},
	parseError: function parseError(str, hash) {
	    if (hash.recoverable) {
	        this.trace(str);
	    } else {
	        throw new Error(str);
	    }
	},
	parse: function parse(input) {

	    // For Imba we are going to drop most of the features that are not used
	    // Locations are provided by the tokens from the lexer directly - so drop yylloc
	    // We dont really need the shared state (it seems)

	    var self = this,
	        stack = [0],
	        tstack = [], // token stack
	        vstack = [null], // semantic value stack
	        table = this.table,
	        yytext = '',
	        yylineno = 0,
	        yyleng = 0,
	        recovering = 0,
	        TERROR = 2,
	        EOF = 1;

	    // var args = lstack.slice.call(arguments, 1);
	    //this.reductionCount = this.shiftCount = 0;

	    var lexer = Object.create(this.lexer);
	    var yy = this.yy;

	    lexer.setInput(input,yy);

	    if (typeof yy.parseError === 'function') {
	        this.parseError = yy.parseError;
	    } else {
	        this.parseError = Object.getPrototypeOf(this).parseError; // what?
	    }

	    function popStack (n) {
	        stack.length = stack.length - 2 * n;
	        vstack.length = vstack.length - n;
	    }

	    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;

	    function handleError(){
	        var error_rule_depth;
	        var errStr = '';

	        // Return the rule stack depth where the nearest error rule can be found.
	        // Return FALSE when no error recovery rule was found.
	        // we have no rules now
	        function locateNearestErrorRecoveryRule(state) {
	            var stack_probe = stack.length - 1;
	            var depth = 0;

	            // try to recover from error
	            for(;;) {
	                // check for error recovery rule in this state
	                if ((TERROR.toString()) in table[state]) {
	                    return depth;
	                }
	                if (state === 0 || stack_probe < 2) {
	                    return false; // No suitable error recovery rule available.
	                }
	                stack_probe -= 2; // popStack(1): [symbol, action]
	                state = stack[stack_probe];
	                ++depth;
	            }
	        }

	        if (!recovering) {
	            // first see if there's any chance at hitting an error recovery rule:
	            error_rule_depth = locateNearestErrorRecoveryRule(state);

	            // Report error
	            expected = [];

	            var tsym = lexer.yytext;
	            var tok = self.terminals_[symbol] || symbol;
	            var tloc = tsym ? tsym._loc : -1;
	            var tpos = tloc != -1 ? "[" + tsym._loc + ":" + tsym._len + "]" : '[0:0]';

	            if (lexer.showPosition) {
	                errStr = 'Parse error at '+(tpos)+":\n"+lexer.showPosition()+"\nExpecting "+expected.join(', ') + ", got '" + (self.terminals_[symbol] || symbol)+ "'";
	            } else {
	                errStr = 'Parse error at '+(tpos)+": Unexpected " + (symbol == EOF ? "end of input" : ("'"+(tok)+"'"));
	            }

	            self.parseError(errStr, {
	                lexer: lexer,
	                text: lexer.match,
	                token: tok,
	                line: lexer.yylineno,
	                expected: expected,
	                recoverable: (error_rule_depth !== false)
	            });
	        } else if (preErrorSymbol !== EOF) {
	            error_rule_depth = locateNearestErrorRecoveryRule(state);
	        }

	        // just recovered from another error
	        if (recovering == 3) {
	            if (symbol === EOF || preErrorSymbol === EOF) {
	                throw new Error(errStr || 'Parsing halted while starting to recover from another error.');
	            }

	            // discard current lookahead and grab another
	            yytext = lexer.yytext;
	        }

	        // try to recover from error
	        if (error_rule_depth === false) {
	            throw new Error(errStr || 'Parsing halted. No suitable error recovery rule available.');
	        }
	        popStack(error_rule_depth);
	        preErrorSymbol = (symbol == TERROR ? null : symbol); // save the lookahead token
	        symbol = TERROR;         // insert generic error symbol as new lookahead
	        state = stack[stack.length-1];
	        action = table[state] && table[state][TERROR];
	        recovering = 3; // allow 3 real symbols to be shifted before reporting a new error
	    }


	    var __sym = this.symbols_;
	    var __prod = this.productions_;

	    while (true) {
	        // retreive state number from top of stack
	        state = stack[stack.length - 1];

	        if (symbol === null || typeof symbol == 'undefined') {
	            symbol = __sym[lexer.lex()] || EOF;
	        }
	        action = table[state] && table[state][symbol];

	_handle_error:
	        if (typeof action === 'undefined' || !action.length || !action[0]) {
	            handleError();
	        }

	        switch (action[0]) {
	            case 1: // shift
	                stack.push(symbol);
	                stack.push(action[1]); // push state
	                vstack.push(lexer.yytext);
	                
	                symbol = null;
	                if (!preErrorSymbol) { // normal execution/no error
	                    yytext = lexer.yytext;
	                    if (recovering > 0) {
	                        recovering--;
	                    }
	                } else {
	                    // error just occurred, resume old lookahead f/ before error
	                    symbol = preErrorSymbol;
	                    preErrorSymbol = null;
	                }
	                break;

	            case 2:
	                len = __prod[action[1]][1];
	                // perform semantic action
	                yyval.$ = vstack[vstack.length-len];
	                r = this.performAction(yyval, yytext, yy, action[1], vstack);
	                if (typeof r !== 'undefined') {
	                    return r;
	                }

	                while(len > 0) {
	                    stack.pop();
	                    stack.pop();
	                    vstack.pop();
	                    len--;
	                }

	                stack.push(__prod[action[1]][0]);
	                newState = table[stack[stack.length-2]][stack[stack.length-1]];
	                stack.push(newState);
	                vstack.push(yyval.$);
	                break;

	            case 3:
	                return true;
	        }
	    }

	    return true;
	}};

	function Parser () {
	  this.yy = {};
	}
	Parser.prototype = parser;parser.Parser = Parser;
	return new Parser;
	})();


	if (true) {
	exports.parser = parser;
	exports.Parser = parser.Parser;
	exports.parse = function () { return parser.parse.apply(parser, arguments); };
	}

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// TODO Create Expression - make all expressions inherit from these?

	var helpers = __webpack_require__(4);
	var constants = __webpack_require__(7);

	var ImbaParseError = __webpack_require__(8).ImbaParseError;
	var Token = __webpack_require__(3).Token;
	var SourceMap = __webpack_require__(12).SourceMap;

	var AST = exports.AST = {};

	// Helpers for operators
	var OP = exports.OP = function(op,l,r) {
		var o = String(op);
		switch (o) {
			case '.':
				if ((typeof r=='string'||r instanceof String)) { r = new Identifier(r) };
				// r = r.value if r isa VarOrAccess
				return new Access(op,l,r);
				break;
			
			case '=':
				if (l instanceof Tuple) { return new TupleAssign(op,l,r) };
				return new Assign(op,l,r);
				break;
			
			case '?=':
			case '||=':
			case '&&=':
				return new ConditionalAssign(op,l,r);
				break;
			
			case '+=':
			case '-=':
			case '*=':
			case '/=':
			case '^=':
			case '%=':
				return new CompoundAssign(op,l,r);
				break;
			
			case '?.':
				if (r instanceof VarOrAccess) {
					r = r.value();
				};
				
				// depends on the right side - this is wrong
				return new PropertyAccess(op,l,r);
				break;
			
			case 'instanceof':
			case 'isa':
				return new InstanceOf(op,l,r);
				break;
			
			case 'in':
				return new In(op,l,r);
				break;
			
			case 'typeof':
				return new TypeOf(op,l,r);
				break;
			
			case 'delete':
				return new Delete(op,l,r);
				break;
			
			case '--':
			case '++':
			case '!':
			case '√':
			case 'not': // alias
				return new UnaryOp(op,l,r);
				break;
			
			case '>':
			case '<':
			case '>=':
			case '<=':
			case '==':
			case '===':
			case '!=':
			case '!==':
				return new ComparisonOp(op,l,r);
				break;
			
			case '∩':
			case '∪':
				return new MathOp(op,l,r);
				break;
			
			case '..':
			case '...':
				return new Range(op,l,r);
				break;
			
			default:
			
				return new Op(op,l,r);
		
		};
	};

	var OP_COMPOUND = exports.OP_COMPOUND = function(sym,op,l,r) {
		// console.log "?. soak operator",sym
		if (sym == '?.') {
			console.log("?. soak operator");
			return null;
		};
		if (sym == '?=' || sym == '||=' || sym == '&&=') {
			return new ConditionalAssign(op,l,r);
		} else {
			return new CompoundAssign(op,l,r);
		};
	};

	var OPTS = {};
	var ROOT = null;

	var NODES = exports.NODES = [];

	var LIT = function(val) {
		return new Literal(val);
	};

	var SYM = function(val) {
		return new Symbol(val);
	};

	var IF = function(cond,body,alt) {
		var node = new If(cond,body);
		if (alt) { node.addElse(alt) };
		return node;
	};

	var FN = function(pars,body) {
		return new Func(pars,body);
	};

	var CALL = function(callee,pars) {
		// possibly return instead(!)
		if(pars === undefined) pars = [];
		return new Call(callee,pars);
	};

	var CALLSELF = function(name,pars) {
		if(pars === undefined) pars = [];
		var ref = new Identifier(name);
		return new Call(OP('.',SELF,ref),pars);
	};

	var BLOCK = function() {
		return Block.wrap([].slice.call(arguments));
	};

	var WHILE = function(test,code) {
		return new While(test).addBody(code);
	};

	var SPLAT = exports.SPLAT = function(value) {
		if (value instanceof Assign) {
			value.setLeft(new Splat(value.left()));
			return value;
		} else {
			return new Splat(value);
		};
	};

	var SEMICOLON_TEST = /;(\s*\/\/.*)?[\n\s\t]*$/;
	var RESERVED_TEST = /^(default|char|for)$/;

	// captures error from parser
	function parseError(str,o){
		// find nearest token
		var err;
		
		if (o.lexer) {
			var token = o.lexer.yytext;
			// console.log o:lexer:pos,token.@loc
			err = new ImbaParseError({message: str},{
				pos: o.lexer.pos,
				tokens: o.lexer.tokens,
				token: o.lexer.yytext,
				meta: o
			});
			
			throw err;
			
			// should find the closest token with actual position
			// str = "[{token.@loc}:{token.@len || String(token):length}] {str}"
		};
		var e = new Error(str);
		e.lexer = o.lexer;
		e.options = o;
		throw e;
	}; exports.parseError = parseError;

	function c__(obj){
		return (typeof obj == 'string') ? (obj) : (obj.c());
	};

	function mark__(tok){
		if (tok && (OPTS.sourceMapInline || OPTS.sourceMap) && tok.sourceMapMarker) {
			return tok.sourceMapMarker();
		} else {
			return '';
		};
	};

	function num__(num){
		return new Num(num);
	};

	function str__(str){
		// should pack in token?!?
		return new Str(str);
	};

	function blk__(obj){
		return (obj instanceof Array) ? (Block.wrap(obj)) : (obj);
	};

	function sym__(obj){
		// console.log "sym {obj}"
		return helpers.symbolize(String(obj));
	};

	function cary__(ary){
		return ary.map(function(v) { return (typeof v == 'string') ? (v) : (v.c()); });
	};

	function dump__(obj,key){
		if (obj instanceof Array) {
			return obj.map(function(v) { return (v && v.dump) ? (v.dump(key)) : (v); });
		} else if (obj && obj.dump) {
			return obj.dump();
		};
	};

	function compact__(ary){
		if (ary instanceof ListNode) {
			return ary.compact();
		};
		
		return ary.filter(function(v) { return v != undefined && v != null; });
	};

	function reduce__(res,ary){
		for (var i = 0, items = Imba.iterable(ary), len = items.length, v; i < len; i++) {
			v = items[i];
			(v instanceof Array) ? (reduce__(res,v)) : (res.push(v));
		};
		return;
	};

	function flatten__(ary,compact){
		if(compact === undefined) compact = false;
		var out = [];
		for (var i = 0, items = Imba.iterable(ary), len = items.length, v; i < len; i++) {
			v = items[i];
			(v instanceof Array) ? (reduce__(out,v)) : (out.push(v));
		};
		return out;
	};

	AST.parse = function (str,opts){
		if(opts === undefined) opts = {};
		var indent = str.match(/\t+/)[0];
		// really? Require the compiler, not this
		return Imbac.parse(str,opts);
	};

	AST.inline = function (str,opts){
		if(opts === undefined) opts = {};
		return this.parse(str,opts).body();
	};

	AST.node = function (typ,pars){
		if (typ == 'call') {
			if (pars[0].c() == 'return') {
				pars[0] = 'tata';
			};
			return new Call(pars[0],pars[1],pars[2]);
		};
	};


	AST.escapeComments = function (str){
		if (!str) { return '' };
		return str;
	};


	var shortRefCache = [];

	function counterToShortRef(nr){
		var base = "A".charCodeAt(0);
		
		while (shortRefCache.length <= nr){
			var num = shortRefCache.length + 1;
			var str = "";
			
			while (true){
				num -= 1;
				str = String.fromCharCode(base + (num % 26)) + str;
				num = Math.floor(num / 26);
				if (num <= 0) { break; };
			};
			
			shortRefCache.push(str);
		};
		return shortRefCache[nr];
	};

	function truthy__(node){
		
		if (node instanceof True) {
			return true;
		};
		
		if (node instanceof False) {
			return false;
		};
		
		if (node.isTruthy) {
			return node.isTruthy();
		};
		
		return undefined;
	};

	function Indentation(a,b){
		this._open = a;
		this._close = b;
		this;
	};

	exports.Indentation = Indentation; // export class 
	Indentation.prototype.open = function(v){ return this._open; }
	Indentation.prototype.setOpen = function(v){ this._open = v; return this; };
	Indentation.prototype.close = function(v){ return this._close; }
	Indentation.prototype.setClose = function(v){ this._close = v; return this; };

	Indentation.prototype.isGenerated = function (){
		return this._open && this._open.generated;
	};

	Indentation.prototype.aloc = function (){
		return this._open && this._open._loc || 0;
	};

	Indentation.prototype.bloc = function (){
		return this._close && this._close._loc || 0;
	};

	Indentation.prototype.wrap = function (str){
		var om = this._open && this._open._meta;
		var pre = om && om.pre || '';
		var post = om && om.post || '';
		var esc = AST.escapeComments;
		var out = this._close;
		
		// the first newline should not be indented?
		str = post.replace(/^\n/,'') + str;
		str = str.replace(/^/g,"\t").replace(/\n/g,"\n\t").replace(/\n\t$/g,"\n");
		
		str = pre + '\n' + str;
		if (out instanceof Terminator) { str += out.c() };
		if (str[str.length - 1] != '\n') { str = str + '\n' };
		return str;
	};

	var INDENT = new Indentation({},{});

	function Stash(){
		this._entities = [];
	};

	Stash.prototype.add = function (item){
		this._entities.unshift(item);
		return this;
	};

	Stash.prototype.pluck = function (item){
		var match = null;
		for (var i = 0, ary = Imba.iterable(this._entities), len = ary.length, entity; i < len; i++) {
			entity = ary[i];
			if (entity == item || (entity instanceof item)) {
				match = entity;
				this._entities.splice(i,1);
				return match;
			};
		};
		return null;
	};


	function Stack(){
		this.reset();
	};

	exports.Stack = Stack; // export class 
	Stack.prototype.loglevel = function(v){ return this._loglevel; }
	Stack.prototype.setLoglevel = function(v){ this._loglevel = v; return this; };
	Stack.prototype.nodes = function(v){ return this._nodes; }
	Stack.prototype.setNodes = function(v){ this._nodes = v; return this; };
	Stack.prototype.scopes = function(v){ return this._scopes; }
	Stack.prototype.setScopes = function(v){ this._scopes = v; return this; };

	Stack.prototype.reset = function (){
		this._nodes = [];
		this._scoping = [];
		this._scopes = [];
		this._stash = new Stash(this);
		this._loglevel = 3;
		this._counter = 0;
		this._counters = {};
		return this;
	};

	Stack.prototype.incr = function (name){
		var $1;
		this._counters[($1 = name)] || (this._counters[$1] = 0);
		return this._counters[name] += 1;
	};

	Stack.prototype.stash = function (){
		return this._stash;
	};

	Stack.prototype.option = function (key){
		return this._options && this._options[key];
	};

	Stack.prototype.platform = function (){
		return this._options.target;
	};

	Stack.prototype.env = function (key){
		var e;
		var val = this._options[("ENV_" + key)];
		if (val != undefined) { return val };
		
		if (this.platform() && Imba.indexOf(key,['WEB','NODE','WEBWORKER']) >= 0) {
			return this.platform().toUpperCase() == key;
		};
		
		// console.log 'lookup env var',key,@options:env
		
		if (e = this._options.env) {
			if (e.hasOwnProperty(key)) {
				return e[key];
			} else if (e.hasOwnProperty(key.toLowerCase())) {
				return e[key.toLowerCase()];
			};
		};
		
		if (process.env) {
			val = process.env[key.toUpperCase()];
			if (val != undefined) {
				return val;
			};
			return null;
		};
		
		return undefined;
	};


	Stack.prototype.addScope = function (scope){
		this._scopes.push(scope);
		return this;
	};

	Stack.prototype.traverse = function (node){
		return this;
	};

	Stack.prototype.push = function (node){
		this._nodes.push(node);
		// not sure if we have already defined a scope?
		return this;
	};

	Stack.prototype.pop = function (node){
		this._nodes.pop(); // (node)
		return this;
	};

	Stack.prototype.parent = function (){
		return this._nodes[this._nodes.length - 2];
	};

	Stack.prototype.current = function (){
		return this._nodes[this._nodes.length - 1];
	};

	Stack.prototype.up = function (test){
		test || (test = function(v) { return !(v instanceof VarOrAccess); });
		
		if (test.prototype instanceof Node) {
			var typ = test;
			test = function(v) { return v instanceof typ; };
		};
		
		var i = this._nodes.length - 2; // key
		while (i >= 0){
			var node = this._nodes[i];
			if (test(node)) { return node };
			i -= 1;
		};
		return null;
	};

	Stack.prototype.relative = function (node,offset){
		if(offset === undefined) offset = 0;
		var idx = this._nodes.indexOf(node);
		return (idx >= 0) ? (this._nodes[idx + offset]) : (null);
	};

	Stack.prototype.scope = function (lvl){
		if(lvl === undefined) lvl = 0;
		var i = this._nodes.length - 1 - lvl;
		while (i >= 0){
			var node = this._nodes[i];
			if (node._scope) { return node._scope };
			i -= 1;
		};
		return null;
	};

	Stack.prototype.scopes = function (){
		// include deeper scopes as well?
		var scopes = [];
		var i = this._nodes.length - 1;
		while (i >= 0){
			var node = this._nodes[i];
			if (node._scope) { scopes.push(node._scope) };
			i -= 1;
		};
		return scopes;
	};

	Stack.prototype.method = function (){
		return this.up(MethodDeclaration);
	};

	Stack.prototype.block = function (){
		return this.up(Block);
	};

	Stack.prototype.isExpression = function (){
		var i = this._nodes.length - 1;
		while (i >= 0){
			var node = this._nodes[i];
			// why are we not using isExpression here as well?
			if ((node instanceof Code) || (node instanceof Loop)) {
				return false;
			};
			if (node.isExpression()) {
				return true;
			};
			// probably not the right test - need to be more explicit
			i -= 1;
		};
		return false;
	};

	Stack.prototype.toString = function (){
		return ("Stack(" + this._nodes.join(" -> ") + ")");
	};

	Stack.prototype.isAnalyzing = function (){
		return this._analyzing;
	};

	Stack.prototype.scoping = function (){
		return this._nodes.filter(function(n) { return n._scope; }).map(function(n) { return n._scope; });
	};

	// Lots of globals -- really need to deal with one stack per file / context
	var STACK = exports.STACK = new Stack();

	GLOBSTACK = STACK;

	// use a bitmask for these

	function Node(){
		this.setup();
		this;
	};

	exports.Node = Node; // export class 
	Node.prototype.o = function(v){ return this._o; }
	Node.prototype.setO = function(v){ this._o = v; return this; };
	Node.prototype.options = function(v){ return this._options; }
	Node.prototype.setOptions = function(v){ this._options = v; return this; };
	Node.prototype.traversed = function(v){ return this._traversed; }
	Node.prototype.setTraversed = function(v){ this._traversed = v; return this; };

	Node.prototype.safechain = function (){
		return false;
	};

	Node.prototype.p = function (){
		// allow controlling this from CLI
		if (STACK.loglevel() > 0) {
			console.log.apply(console,arguments);
		};
		return this;
	};

	Node.prototype.typeName = function (){
		return this.constructor.name;
	};

	Node.prototype.namepath = function (){
		return this.typeName();
	};

	Node.prototype.setup = function (){
		this._expression = false;
		this._traversed = false;
		this._parens = false;
		this._cache = null;
		this._value = null;
		return this;
	};

	Node.prototype.set = function (obj){
		this._options || (this._options = {});
		for (var i = 0, keys = Object.keys(obj), l = keys.length; i < l; i++){
			this._options[keys[i]] = obj[keys[i]];
		};
		return this;
	};

	// get and set
	Node.prototype.option = function (key,val){
		if (val != undefined) {
			this._options || (this._options = {});
			this._options[key] = val;
			return this;
		};
		
		return this._options && this._options[key];
	};

	Node.prototype.configure = function (obj){
		return this.set(obj);
	};

	Node.prototype.region = function (){
		return [0,0];
	};

	Node.prototype.loc = function (){
		return [0,0];
	};

	Node.prototype.token = function (){
		return null;
	};

	Node.prototype.compile = function (){
		return this;
	};

	Node.prototype.visit = function (){
		return this;
	};

	Node.prototype.stack = function (){
		return STACK;
	};

	Node.prototype.isString = function (){
		return false;
	};

	Node.prototype.isPrimitive = function (deep){
		return false;
	};

	Node.prototype.isReserved = function (){
		return false;
	};

	// should rather do traversals
	// o = {}, up, key, index
	Node.prototype.traverse = function (){
		if (this._traversed) {
			return this;
		};
		// NODES.push(self)
		this._traversed = true;
		STACK.push(this);
		this.visit(STACK);
		STACK.pop(this);
		return this;
	};

	Node.prototype.inspect = function (){
		return {type: this.constructor.toString()};
	};

	Node.prototype.js = function (o){
		return "NODE";
	};

	Node.prototype.toString = function (){
		return ("" + (this.constructor.name));
	};

	// swallow might be better name
	Node.prototype.consume = function (node){
		if (node instanceof PushAssign) {
			return new PushAssign(node.op(),node.left(),this);
		};
		
		if (node instanceof Assign) {
			// node.right = self
			return OP(node.op(),node.left(),this);
		} else if (node instanceof Op) {
			return OP(node.op(),node.left(),this);
		} else if (node instanceof Return) {
			return new Return(this);
		};
		return this;
	};

	Node.prototype.toExpression = function (){
		this._expression = true;
		return this;
	};

	Node.prototype.forceExpression = function (){
		this._expression = true;
		return this;
	};

	Node.prototype.isExpressable = function (){
		return true;
	};

	Node.prototype.isExpression = function (){
		return this._expression || false;
	};

	Node.prototype.hasSideEffects = function (){
		return true;
	};

	Node.prototype.isUsed = function (){
		return true;
	};

	Node.prototype.shouldParenthesize = function (){
		return false;
	};

	Node.prototype.block = function (){
		return Block.wrap([this]);
	};

	Node.prototype.node = function (){
		return this;
	};

	Node.prototype.scope__ = function (){
		return STACK.scope();
	};

	Node.prototype.up = function (){
		return STACK.parent();
	};

	Node.prototype.util = function (){
		return Util;
	};

	Node.prototype.receiver = function (){
		return this;
	};

	Node.prototype.addExpression = function (expr){
		// might be better to nest this up after parsing is done?
		var node = new ExpressionBlock([this]);
		return node.addExpression(expr);
	};


	Node.prototype.indented = function (a,b){
		
		if (a instanceof Indentation) {
			this._indentation = a;
			return this;
		};
		
		// this is a _BIG_ hack
		if (b instanceof Array) {
			this.add(b[0]);
			b = b[1];
		};
		
		// if indent and indent.match(/\:/)
		this._indentation || (this._indentation = (a && b) ? (new Indentation(a,b)) : (INDENT));
		return this;
	};

	Node.prototype.prebreak = function (term){
		if(term === undefined) term = '\n';
		return this;
	};

	Node.prototype.invert = function (){
		return OP('!',this);
	};

	Node.prototype.cache = function (o){
		if(o === undefined) o = {};
		this._cache = o;
		o.var = this.scope__().temporary(this,o);
		o.lookups = 0;
		return this;
	};

	Node.prototype.cachevar = function (){
		return this._cache && this._cache.var;
	};

	Node.prototype.decache = function (){
		if (this._cache) {
			this.cachevar().free();
			this._cache = null;
		};
		return this;
	};

	// is this without side-effects? hmm - what does it even do?
	Node.prototype.predeclare = function (){
		if (this._cache) {
			this.scope__().vars().swap(this._cache.var,this);
		};
		return this;
	};

	// the "name-suggestion" for nodes if they need to be cached
	Node.prototype.alias = function (){
		return null;
	};

	Node.prototype.warn = function (text,opts){
		if(opts === undefined) opts = {};
		opts.message = text;
		opts.loc || (opts.loc = this.loc());
		this.scope__().root().warn(opts);
		return this;
	};

	Node.prototype.c = function (o){
		var indent;
		var s = STACK;
		var ch = this._cache;
		if (ch && ch.cached) { return this.c_cached(ch) };
		
		s.push(this);
		if (o && o.expression) this.forceExpression();
		
		if (o && o.indent) {
			this._indentation || (this._indentation = INDENT);
		};
		
		var out = this.js(s,o);
		
		// really? why not call this somewhere else?
		var paren = this.shouldParenthesize();
		
		if (indent = this._indentation) {
			out = indent.wrap(out,o);
		};
		
		// should move this somewhere else really
		if (paren) { out = ("(" + out + ")") };
		if (o && o.braces) {
			if (indent) {
				out = '{' + out + '}';
			} else {
				out = '{ ' + out + ' }';
			};
		};
		
		s.pop(this);
		
		if (ch = this._cache) {
			if (!ch.manual) { out = ("" + (ch.var.c()) + " = " + out) };
			var par = s.current();
			if ((par instanceof Access) || (par instanceof Op)) { out = '(' + out + ')' }; // others? #
			ch.cached = true;
		};
		return out;
	};

	Node.prototype.c_cached = function (cache){
		cache.lookups++;
		if (cache.uses == cache.lookups) { cache.var.free() };
		return cache.var.c(); // recompile every time??
	};

	function ValueNode(value){
		this.setup();
		this._value = this.load(value);
	};

	Imba.subclass(ValueNode,Node);
	exports.ValueNode = ValueNode; // export class 
	ValueNode.prototype.value = function(v){ return this._value; }
	ValueNode.prototype.setValue = function(v){ this._value = v; return this; };

	ValueNode.prototype.load = function (value){
		return value;
	};

	ValueNode.prototype.js = function (o){
		return (typeof this._value == 'string') ? (this._value) : (this._value.c());
	};

	ValueNode.prototype.visit = function (){
		
		if (this._value instanceof Node) { this._value.traverse() }; //  && @value:traverse
		return this;
	};

	ValueNode.prototype.region = function (){
		return [this._value._loc,this._value._loc + this._value._len];
	};


	function Statement(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(Statement,ValueNode);
	exports.Statement = Statement; // export class 
	Statement.prototype.isExpressable = function (){
		return false;
	};


	function Meta(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(Meta,ValueNode);
	exports.Meta = Meta; // export class 
	Meta.prototype.isPrimitive = function (deep){
		return true;
	};

	function Comment(){ return Meta.apply(this,arguments) };

	Imba.subclass(Comment,Meta);
	exports.Comment = Comment; // export class 
	Comment.prototype.visit = function (){
		var block, next;
		if (block = this.up()) {
			var idx = block.indexOf(this) + 1;
			if (block.index(idx) instanceof Terminator) { idx += 1 };
			if (next = block.index(idx)) {
				next._desc = this;
			};
		};
		
		return this;
	};

	Comment.prototype.toDoc = function (){
		return helpers.normalizeIndentation("" + this._value._value);
	};

	Comment.prototype.toJSON = function (){
		return helpers.normalizeIndentation("" + this._value._value);
	};

	Comment.prototype.c = function (o){
		var v = this._value._value;
		if (o && o.expression || v.match(/\n/) || this._value.type() == 'HERECOMMENT') { // multiline?
			return ("/*" + v + "*/");
		} else {
			return ("// " + v);
		};
	};

	function Terminator(v){
		this._value = v;
		this;
	};

	Imba.subclass(Terminator,Meta);
	exports.Terminator = Terminator; // export class 
	Terminator.prototype.traverse = function (){
		return this;
	};

	Terminator.prototype.loc = function (){
		return [this._value._loc,this._value._loc + this._value._value.length];
	};

	Terminator.prototype.c = function (){
		return this._value.c();
	};

	function Newline(v){
		this._traversed = false;
		this._value = v || '\n';
	};

	Imba.subclass(Newline,Terminator);
	exports.Newline = Newline; // export class 
	Newline.prototype.c = function (){
		return c__(this._value);
	};


	// weird place?
	function Index(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(Index,ValueNode);
	exports.Index = Index; // export class 
	Index.prototype.js = function (o){
		return this._value.c();
	};

	function ListNode(list){
		this.setup();
		this._nodes = this.load(list || []);
		this._indentation = null;
	};

	// PERF acces @nodes directly?
	Imba.subclass(ListNode,Node);
	exports.ListNode = ListNode; // export class 
	ListNode.prototype.nodes = function(v){ return this._nodes; }
	ListNode.prototype.setNodes = function(v){ this._nodes = v; return this; };

	ListNode.prototype.list = function (){
		return this._nodes;
	};

	ListNode.prototype.compact = function (){
		this._nodes = compact__(this._nodes);
		return this;
	};

	ListNode.prototype.load = function (list){
		return list;
	};

	ListNode.prototype.concat = function (other){
		// need to store indented content as well?
		this._nodes = this.nodes().concat((other instanceof Array) ? (other) : (other.nodes()));
		return this;
	};

	ListNode.prototype.swap = function (item,other){
		var idx = this.indexOf(item);
		if (idx >= 0) { this.nodes()[idx] = other };
		return this;
	};

	ListNode.prototype.push = function (item){
		this._nodes.push(item);
		return this;
	};

	ListNode.prototype.pop = function (){
		var end = this._nodes.pop();
		return end;
	};

	ListNode.prototype.add = function (item){
		this._nodes.push(item);
		return this;
	};

	ListNode.prototype.unshift = function (item,br){
		if (br) { this._nodes.unshift(BR) };
		this._nodes.unshift(item);
		return this;
	};

	// test
	ListNode.prototype.slice = function (a,b){
		return new this.constructor(this._nodes.slice(a,b));
	};

	ListNode.prototype.break = function (br,pre){
		if(pre === undefined) pre = false;
		if (typeof br == 'string') { br = new Terminator(br) };
		(pre) ? (this.unshift(br)) : (this.push(br));
		return this;
	};

	ListNode.prototype.some = function (cb){
		for (var i = 0, ary = Imba.iterable(this._nodes), len = ary.length; i < len; i++) {
			if (cb(ary[i])) { return true };
		};
		return false;
	};

	ListNode.prototype.every = function (cb){
		for (var i = 0, ary = Imba.iterable(this._nodes), len = ary.length; i < len; i++) {
			if (!cb(ary[i])) { return false };
		};
		return true;
	};

	ListNode.prototype.filter = function (cb){
		return this._nodes.filter(cb);
	};

	ListNode.prototype.pluck = function (cb){
		var item = this.filter(cb)[0];
		if (item) { this.remove(item) };
		return item;
	};

	ListNode.prototype.indexOf = function (item){
		return this._nodes.indexOf(item);
	};

	ListNode.prototype.index = function (i){
		return this._nodes[i];
	};

	ListNode.prototype.remove = function (item){
		var idx = this._nodes.indexOf(item);
		if (idx >= 0) { this._nodes.splice(idx,1) };
		return this;
	};

	ListNode.prototype.removeAt = function (idx){
		var item = this._nodes[idx];
		if (idx >= 0) { this._nodes.splice(idx,1) };
		return item;
	};


	ListNode.prototype.replace = function (original,replacement){
		var idx = this._nodes.indexOf(original);
		if (idx >= 0) {
			if (replacement instanceof Array) {
				this._nodes.splice.apply(this._nodes,[].concat([idx,1], [].slice.call(replacement)));
			} else {
				this._nodes[idx] = replacement;
			};
		};
		return this;
	};

	ListNode.prototype.first = function (){
		return this._nodes[0];
	};

	ListNode.prototype.last = function (){
		var i = this._nodes.length;
		while (i){
			i = i - 1;
			var v = this._nodes[i];
			if (!((v instanceof Meta))) { return v };
		};
		return null;
	};

	ListNode.prototype.map = function (fn){
		return this._nodes.map(fn);
	};

	ListNode.prototype.forEach = function (fn){
		return this._nodes.forEach(fn);
	};

	ListNode.prototype.remap = function (fn){
		this._nodes = this.map(fn);
		return this;
	};

	ListNode.prototype.count = function (){
		return this._nodes.length;
	};

	ListNode.prototype.realCount = function (){
		var k = 0;
		for (var i = 0, ary = Imba.iterable(this._nodes), len = ary.length, node; i < len; i++) {
			node = ary[i];
			if (node && !(node instanceof Meta)) { k++ };
		};
		return k;
	};

	ListNode.prototype.visit = function (){
		for (var i = 0, ary = Imba.iterable(this._nodes), len = ary.length, node; i < len; i++) {
			node = ary[i];
			node && node.traverse();
		};
		return this;
	};

	ListNode.prototype.isExpressable = function (){
		for (var i = 0, ary = Imba.iterable(this.nodes()), len = ary.length, node; i < len; i++) {
			node = ary[i];
			if (node && !node.isExpressable()) { return false };
		};
		
		return true;
	};

	ListNode.prototype.toArray = function (){
		return this._nodes;
	};

	ListNode.prototype.delimiter = function (){
		return this._delimiter || ",";
	};

	ListNode.prototype.js = function (o,pars){
		if(!pars||pars.constructor !== Object) pars = {};
		var nodes = pars.nodes !== undefined ? pars.nodes : this._nodes;
		var delim = ',';
		var express = delim != ';';
		var last = this.last();
		
		var i = 0;
		var l = nodes.length;
		var str = "";
		
		for (var j = 0, ary = Imba.iterable(nodes), len = ary.length, arg; j < len; j++) {
			arg = ary[j];
			var part = (typeof arg == 'string') ? (arg) : (((arg) ? (arg.c({expression: express})) : ('')));
			str += part;
			if (part && (!express || arg != last) && !(arg instanceof Meta)) { str += delim };
		};
		
		return str;
	};

	ListNode.prototype.indented = function (a,b){
		if (a instanceof Indentation) {
			this._indentation = a;
			return this;
		};
		
		this._indentation || (this._indentation = (a && b) ? (new Indentation(a,b)) : (INDENT));
		return this;
	};


	function ArgList(){ return ListNode.apply(this,arguments) };

	Imba.subclass(ArgList,ListNode);
	exports.ArgList = ArgList; // export class 


	function AssignList(){ return ArgList.apply(this,arguments) };

	Imba.subclass(AssignList,ArgList);
	exports.AssignList = AssignList; // export class 
	AssignList.prototype.concat = function (other){
		if (this._nodes.length == 0 && (other instanceof AssignList)) {
			return other;
		} else {
			AssignList.__super__.concat.call(this,other);
		};
		// need to store indented content as well?
		// @nodes = nodes.concat(other isa Array ? other : other.nodes)
		return this;
	};


	function Block(list){
		this.setup();
		this._nodes = list || [];
		this._head = null;
		this._indentation = null;
	};

	Imba.subclass(Block,ListNode);
	exports.Block = Block; // export class 
	Block.prototype.head = function(v){ return this._head; }
	Block.prototype.setHead = function(v){ this._head = v; return this; };

	Block.wrap = function (ary){
		if (!((ary instanceof Array))) {
			throw new SyntaxError("what");
		};
		return (ary.length == 1 && (ary[0] instanceof Block)) ? (ary[0]) : (new Block(ary));
	};

	Block.prototype.visit = function (){
		if (this._scope) { this._scope.visit() };
		
		for (var i = 0, ary = Imba.iterable(this._nodes), len = ary.length, node; i < len; i++) {
			node = ary[i];
			node && node.traverse();
		};
		return this;
	};

	Block.prototype.block = function (){
		return this;
	};

	Block.prototype.loc = function (){
		// rather indents, no?
		var opt, ind;
		if (opt = this.option('ends')) {
			var a = opt[0].loc();
			var b = opt[1].loc();
			
			if (!a) { this.p(("no loc for " + (opt[0]))) };
			if (!b) { this.p(("no loc for " + (opt[1]))) };
			
			return [a[0],b[1]];
		} else if (ind = this._indentation) {
			return [ind.aloc(),ind.bloc()];
		} else {
			// first node
			var a1 = this._nodes[0];
			var b1 = this._nodes[this._nodes.length - 1];
			return [a1 && a1.loc()[0] || 0,b1 && b1.loc()[1] || 0];
		};
	};

	// go through children and unwrap inner nodes
	Block.prototype.unwrap = function (){
		var ary = [];
		for (var i = 0, items = Imba.iterable(this.nodes()), len = items.length, node; i < len; i++) {
			node = items[i];
			if (node instanceof Block) {
				ary.push.apply(ary,node.unwrap());
			} else {
				ary.push(node);
			};
		};
		return ary;
	};

	Block.prototype.push = function (item){
		this._nodes.push(item);
		return this;
	};

	Block.prototype.add = function (item){
		this._nodes.push(item);
		return this;
	};

	// This is just to work as an inplace replacement of nodes.coffee
	// After things are working okay we'll do bigger refactorings
	Block.prototype.compile = function (o){
		if(o === undefined) o = {};
		var root = new Root(this,o);
		return root.compile(o);
	};


	// Not sure if we should create a separate block?
	Block.prototype.analyze = function (o){
		if(o === undefined) o = {};
		return this;
	};

	Block.prototype.cpart = function (node){
		var out = (typeof node == 'string') ? (node) : (((node) ? (node.c()) : ("")));
		if (out == null || out == undefined || out == "") { return "" };
		
		if (out instanceof Array) {
			var str = "";
			var l = out.length;
			var i = 0;
			while (i < l){
				str += this.cpart(out[i++]);
			};
			return str;
		};
		
		var hasSemiColon = SEMICOLON_TEST.test(out);
		if (!(hasSemiColon || (node instanceof Meta))) { out += ";" };
		return out;
	};

	Block.prototype.js = function (o,opts){
		var ast = this._nodes;
		var l = ast.length;
		// really?
		var express = this.isExpression() || o.isExpression() || (this.option('express') && this.isExpressable());
		if (ast.length == 0) { return '' };
		
		if (express) {
			return Block.__super__.js.call(this,o,{nodes: ast});
		};
		
		var str = "";
		for (var i = 0, ary = Imba.iterable(ast), len = ary.length; i < len; i++) {
			str += this.cpart(ary[i]);
		};
		
		// now add the head items as well
		if (this._head && this._head.length > 0) {
			var prefix = "";
			for (var j = 0, items = Imba.iterable(this._head), len_ = items.length; j < len_; j++) {
				var hv = this.cpart(items[j]);
				if (hv) { prefix += hv + '\n' };
			};
			str = prefix + str;
		};
		return str;
	};


	// Should this create the function as well?
	Block.prototype.defers = function (original,replacement){
		var idx = this._nodes.indexOf(original);
		if (idx >= 0) { this._nodes[idx] = replacement };
		var rest = this._nodes.splice(idx + 1);
		return rest;
	};

	Block.prototype.expressions = function (){
		var expressions = [];
		for (var i = 0, ary = Imba.iterable(this.nodes()), len = ary.length, node; i < len; i++) {
			node = ary[i];
			if (!((node instanceof Terminator))) { expressions.push(node) };
		};
		return expressions;
	};


	Block.prototype.consume = function (node){
		var before;
		if (node instanceof TagTree) { // special case?!?
			this._nodes = this._nodes.map(function(child) {
				return child.consume(node);
			});
			
			var real = this.expressions();
			// console.log 'Block.consume TagTree',node.@loop
			// FIXME should not include terminators and comments when counting
			// should only wrap the content in array (returning all parts)
			// for if/else blocks -- not loops
			
			// we need to compare the real length
			if (!node._loop && real.length > 1) {
				var nr = node.blocks().push(this);
				var arr = new Arr(new ArgList(this._nodes));
				arr.indented(this._indentation);
				this._indentation = null;
				
				if (node.reactive()) {
					this._nodes = [Util.callImba("static",[arr,new Num(nr)])];
				} else {
					this._nodes = [arr];
				};
			};
			
			
			
			return this;
		} else if (node instanceof TagPushAssign) {
			// console.log 'TagPushAssign'
			var real1 = this.expressions();
			
			this._nodes = this._nodes.map(function(child) {
				if (Imba.indexOf(child,real1) >= 0 && !(child instanceof Assign)) {
					// console.log "{child}"
					return child.consume(node);
				} else {
					return child;
				};
			});
			
			return this;
		};
		
		// can also return super if it is expressable, but should we really?
		if (before = this.last()) {
			var after = before.consume(node);
			if (after != before) {
				if (after instanceof Block) {
					after = after.nodes();
				};
				
				this.replace(before,after);
			};
		};
		
		return this;
	};


	Block.prototype.isExpressable = function (){
		if (!this._nodes.every(function(v) { return v.isExpressable(); })) { return false };
		return true;
	};

	Block.prototype.isExpression = function (){
		
		return this.option('express') || this._expression;
	};


	// this is almost like the old VarDeclarations but without the values
	function VarBlock(){ return ListNode.apply(this,arguments) };

	Imba.subclass(VarBlock,ListNode);
	exports.VarBlock = VarBlock; // export class 
	VarBlock.prototype.load = function (list){
		var first = list[0];
		
		if (first instanceof Assign) {
			this._type = first.left()._type;
		} else if (first instanceof VarReference) {
			this._type = first._type;
		};
		// @type = list[0] and list[0].type
		return list;
	};

	// TODO All these inner items should rather be straight up literals
	// or basic localvars - without any care whatsoever about adding var to the
	// beginning etc.
	VarBlock.prototype.addExpression = function (expr){
		
		if (expr instanceof Assign) {
			// make sure the left-side is a var-reference
			// this should be a different type of assign, no?
			if (expr.left() instanceof VarOrAccess) {
				expr.setLeft(new VarReference(expr.left().value(),this._type));
			};
			
			this.push(expr);
		} else if (expr instanceof Assign) {
			this.addExpression(expr.left()); // make sure this is a valid thing?
			// make this into a tuple instead
			// does not need to be a tuple?
			return new TupleAssign('=',new Tuple(this.nodes()),expr.right());
		} else if (expr instanceof VarOrAccess) {
			// this is really a VarReference
			this.push(new VarReference(expr.value(),this._type));
		} else if ((expr instanceof Splat) && (expr.node() instanceof VarOrAccess)) {
			expr.setValue(new VarReference(expr.node().value(),this._type));
			this.push(expr);
		} else {
			this.p(("VarBlock.addExpression " + this + " <- " + expr));
			throw "VarBlock does not allow non-variable expressions";
		};
		return this;
	};


	VarBlock.prototype.isExpressable = function (){
		// we would need to force-drop the variables, makes little sense
		// but, it could be, could just push the variables out?
		return false;
	};

	VarBlock.prototype.js = function (o){
		var code = compact__(flatten__(cary__(this.nodes())));
		code = code.filter(function(n) { return n != null && n != undefined && n != EMPTY; });
		var out = code.join(",");
		// we just need to trust that the variables have been autodeclared beforehand
		// if we are inside an expression
		if (!o.isExpression()) { out = "var " + out };
		return out;
	};


	VarBlock.prototype.consume = function (node){
		// It doesnt make much sense for a VarBlock to consume anything
		// it should probably return void for methods
		return this;
	};


	// Could inherit from valueNode
	function Parens(value,open,close){
		this.setup();
		this._open = open;
		this._close = close;
		this._value = this.load(value);
	};

	Imba.subclass(Parens,ValueNode);
	exports.Parens = Parens; // export class 
	Parens.prototype.load = function (value){
		this._noparen = false;
		return ((value instanceof Block) && value.count() == 1) ? (value.first()) : (value);
	};

	Parens.prototype.isString = function (){
		// checking if this is an interpolated string
		return this._open && String(this._open) == '("' || this.value().isString();
	};

	Parens.prototype.js = function (o){
		
		var par = this.up();
		var v = this._value;
		var str = null;
		
		if (v instanceof Func) { this._noparen = true };
		
		if (par instanceof Block) {
			// is it worth it?
			if (!o.isExpression()) { this._noparen = true };
			str = (v instanceof Array) ? (cary__(v)) : (v.c({expression: o.isExpression()}));
		} else {
			str = (v instanceof Array) ? (cary__(v)) : (v.c({expression: true}));
		};
		
		// check if we really need parens here?
		return str;
	};

	Parens.prototype.set = function (obj){
		console.log(("Parens set " + JSON.stringify(obj)));
		return Parens.__super__.set.call(this,obj);
	};


	Parens.prototype.shouldParenthesize = function (){
		// no need to parenthesize if this is a line in a block
		if (this._noparen) { return false }; //  or par isa ArgList
		return true;
	};


	Parens.prototype.prebreak = function (br){
		Parens.__super__.prebreak.call(this,br);
		console.log("PREBREAK");
		if (this._value) { this._value.prebreak(br) };
		return this;
	};


	Parens.prototype.isExpressable = function (){
		return this._value.isExpressable();
	};

	Parens.prototype.consume = function (node){
		return this._value.consume(node);
	};


	// Could inherit from valueNode
	// an explicit expression-block (with parens) is somewhat different
	// can be used to return after an expression
	function ExpressionBlock(){ return ListNode.apply(this,arguments) };

	Imba.subclass(ExpressionBlock,ListNode);
	exports.ExpressionBlock = ExpressionBlock; // export class 
	ExpressionBlock.prototype.c = function (o){
		return this.map(function(item) { return item.c(o); }).join(",");
	};

	ExpressionBlock.prototype.consume = function (node){
		return this.value().consume(node);
	};

	ExpressionBlock.prototype.addExpression = function (expr){
		// Need to take care of the splat here to.. hazzle
		if (expr.node() instanceof Assign) {
			this.push(expr.left());
			// make this into a tuple instead
			// possibly fix this as well?!?
			return new TupleAssign('=',new Tuple(this.nodes()),expr.right());
		} else {
			this.push(expr);
		};
		return this;
	};



	// STATEMENTS

	function Return(v){
		this._traversed = false;
		this._value = ((v instanceof ArgList) && v.count() == 1) ? (v.last()) : (v);
		return this;
	};

	Imba.subclass(Return,Statement);
	exports.Return = Return; // export class 
	Return.prototype.value = function(v){ return this._value; }
	Return.prototype.setValue = function(v){ this._value = v; return this; };

	Return.prototype.visit = function (){
		if (this._value && this._value.traverse) { return this._value.traverse() };
	};

	Return.prototype.js = function (o){
		var v = this._value;
		
		if (v instanceof ArgList) {
			return ("return [" + v.c({expression: true}) + "]");
		} else if (v) {
			return ("return " + v.c({expression: true}));
		} else {
			return "return";
		};
	};

	Return.prototype.c = function (){
		if (!(this.value()) || this.value().isExpressable()) { return Return.__super__.c.apply(this,arguments) };
		return this.value().consume(this).c();
	};

	Return.prototype.consume = function (node){
		return this;
	};

	function ImplicitReturn(){ return Return.apply(this,arguments) };

	Imba.subclass(ImplicitReturn,Return);
	exports.ImplicitReturn = ImplicitReturn; // export class 


	function GreedyReturn(){ return ImplicitReturn.apply(this,arguments) };

	Imba.subclass(GreedyReturn,ImplicitReturn);
	exports.GreedyReturn = GreedyReturn; // export class 


	// cannot live inside an expression(!)
	function Throw(){ return Statement.apply(this,arguments) };

	Imba.subclass(Throw,Statement);
	exports.Throw = Throw; // export class 
	Throw.prototype.js = function (o){
		return ("throw " + (this.value().c()));
	};

	Throw.prototype.consume = function (node){
		// ROADMAP should possibly consume to the value of throw and then throw?
		return this;
	};


	function LoopFlowStatement(lit,expr){
		this.setLiteral(lit);
		this.setExpression(expr);
	};

	Imba.subclass(LoopFlowStatement,Statement);
	exports.LoopFlowStatement = LoopFlowStatement; // export class 
	LoopFlowStatement.prototype.literal = function(v){ return this._literal; }
	LoopFlowStatement.prototype.setLiteral = function(v){ this._literal = v; return this; };
	LoopFlowStatement.prototype.expression = function(v){ return this._expression; }
	LoopFlowStatement.prototype.setExpression = function(v){ this._expression = v; return this; };

	LoopFlowStatement.prototype.visit = function (){
		if (this.expression()) { return this.expression().traverse() };
	};

	LoopFlowStatement.prototype.consume = function (node){
		return this;
	};

	LoopFlowStatement.prototype.c = function (){
		if (!(this.expression())) { return LoopFlowStatement.__super__.c.apply(this,arguments) };
		// get up to the outer loop
		var _loop = STACK.up(Loop);
		
		// need to fix the grammar for this. Right now it
		// is like a fake call, but should only care about the first argument
		var expr = this.expression();
		
		if (_loop.catcher()) {
			expr = expr.consume(_loop.catcher());
			var copy = new this.constructor(this.literal());
			return new Block([expr,copy]).c();
		} else if (expr) {
			copy = new this.constructor(this.literal());
			return new Block([expr,copy]).c();
		} else {
			return LoopFlowStatement.__super__.c.apply(this,arguments);
		};
		// return "loopflow"
	};


	function BreakStatement(){ return LoopFlowStatement.apply(this,arguments) };

	Imba.subclass(BreakStatement,LoopFlowStatement);
	exports.BreakStatement = BreakStatement; // export class 
	BreakStatement.prototype.js = function (o){
		return "break";
	};

	function ContinueStatement(){ return LoopFlowStatement.apply(this,arguments) };

	Imba.subclass(ContinueStatement,LoopFlowStatement);
	exports.ContinueStatement = ContinueStatement; // export class 
	ContinueStatement.prototype.js = function (o){
		return "continue";
	};

	function DebuggerStatement(){ return Statement.apply(this,arguments) };

	Imba.subclass(DebuggerStatement,Statement);
	exports.DebuggerStatement = DebuggerStatement; // export class 



	// PARAMS

	function Param(name,defaults,typ){
		// could have introduced bugs by moving back to identifier here
		this._traversed = false;
		this._name = name;
		this._defaults = defaults;
		this._typ = typ;
		this._variable = null;
	};

	Imba.subclass(Param,Node);
	exports.Param = Param; // export class 
	Param.prototype.name = function(v){ return this._name; }
	Param.prototype.setName = function(v){ this._name = v; return this; };
	Param.prototype.index = function(v){ return this._index; }
	Param.prototype.setIndex = function(v){ this._index = v; return this; };
	Param.prototype.defaults = function(v){ return this._defaults; }
	Param.prototype.setDefaults = function(v){ this._defaults = v; return this; };
	Param.prototype.splat = function(v){ return this._splat; }
	Param.prototype.setSplat = function(v){ this._splat = v; return this; };
	Param.prototype.variable = function(v){ return this._variable; }
	Param.prototype.setVariable = function(v){ this._variable = v; return this; };

	Param.prototype.varname = function (){
		return (this._variable) ? (this._variable.c()) : (this.name());
	};

	Param.prototype.js = function (o){
		if (this._variable) { return this._variable.c() };
		
		if (this.defaults()) {
			// should not include any source-mapping here?
			return ("if(" + (this.name().c()) + " == null) " + (this.name().c()) + " = " + (this.defaults().c()));
		};
		// see if this is the initial declarator?
	};

	Param.prototype.visit = function (){
		var variable_, v_;
		if (this._defaults) { this._defaults.traverse() };
		(variable_ = this.variable()) || ((this.setVariable(v_ = this.scope__().register(this.name(),this)),v_));
		
		if (this._name instanceof Identifier) {
			// change type here?
			if (this._name._value) { this._name._value._type = "PARAMVAR" };
			this._name.references(this._variable);
			this._variable.addReference(this._name);
			// console.log @name.c, "got here!! {@name:constructor}"
			// @name.@token.@variable = @variable if @name.@token
		};
		
		return this;
	};

	Param.prototype.assignment = function (){
		return OP('=',this.variable().accessor(),this.defaults());
	};

	Param.prototype.isExpressable = function (){
		return !(this.defaults()) || this.defaults().isExpressable();
	};

	Param.prototype.dump = function (){
		return {loc: this.loc()};
	};

	Param.prototype.loc = function (){
		return this._name && this._name.region();
	};

	Param.prototype.toJSON = function (){
		return {
			type: this.typeName(),
			name: this.name(),
			defaults: this.defaults()
		};
	};


	function SplatParam(){ return Param.apply(this,arguments) };

	Imba.subclass(SplatParam,Param);
	exports.SplatParam = SplatParam; // export class 
	SplatParam.prototype.loc = function (){
		// hacky.. cannot know for sure that this is right?
		var r = this.name().region();
		return [r[0] - 1,r[1]];
	};

	function BlockParam(){ return Param.apply(this,arguments) };

	Imba.subclass(BlockParam,Param);
	exports.BlockParam = BlockParam; // export class 
	BlockParam.prototype.c = function (){
		return "blockparam";
	};

	BlockParam.prototype.loc = function (){
		// hacky.. cannot know for sure that this is right?
		var r = this.name().region();
		return [r[0] - 1,r[1]];
	};


	function OptionalParam(){ return Param.apply(this,arguments) };

	Imba.subclass(OptionalParam,Param);
	exports.OptionalParam = OptionalParam; // export class 


	function NamedParam(){ return Param.apply(this,arguments) };

	Imba.subclass(NamedParam,Param);
	exports.NamedParam = NamedParam; // export class 


	function RequiredParam(){ return Param.apply(this,arguments) };

	Imba.subclass(RequiredParam,Param);
	exports.RequiredParam = RequiredParam; // export class 


	function NamedParams(){ return ListNode.apply(this,arguments) };

	Imba.subclass(NamedParams,ListNode);
	exports.NamedParams = NamedParams; // export class 
	NamedParams.prototype.index = function(v){ return this._index; }
	NamedParams.prototype.setIndex = function(v){ this._index = v; return this; };
	NamedParams.prototype.variable = function(v){ return this._variable; }
	NamedParams.prototype.setVariable = function(v){ this._variable = v; return this; };

	NamedParams.prototype.load = function (list){
		var load = function(k) { return new NamedParam(k.key(),k.value()); };
		return (list instanceof Obj) ? (list.value().map(load)) : (list);
	};

	NamedParams.prototype.visit = function (){
		var s = this.scope__();
		this._variable || (this._variable = s.temporary(this,{pool: 'keypars'}));
		this._variable.predeclared();
		
		// this is a listnode, which will automatically traverse
		// and visit all children
		NamedParams.__super__.visit.apply(this,arguments);
		// register the inner variables as well(!)
		return this;
	};


	NamedParams.prototype.varname = function (){
		return this.variable().c();
	};

	NamedParams.prototype.name = function (){
		return this.varname();
	};

	NamedParams.prototype.js = function (o){
		return "namedpar";
	};

	NamedParams.prototype.toJSON = function (){
		return {
			type: this.typeName(),
			nodes: this.filter(function(v) { return v instanceof NamedParam; })
		};
	};


	function IndexedParam(){ return Param.apply(this,arguments) };

	Imba.subclass(IndexedParam,Param);
	exports.IndexedParam = IndexedParam; // export class 
	IndexedParam.prototype.parent = function(v){ return this._parent; }
	IndexedParam.prototype.setParent = function(v){ this._parent = v; return this; };
	IndexedParam.prototype.subindex = function(v){ return this._subindex; }
	IndexedParam.prototype.setSubindex = function(v){ this._subindex = v; return this; };

	IndexedParam.prototype.visit = function (){
		// BUG The defaults should probably be looked up like vars
		var variable_, v_;
		(variable_ = this.variable()) || ((this.setVariable(v_ = this.scope__().register(this.name(),this)),v_));
		this.variable().proxy(this.parent().variable(),this.subindex());
		return this;
	};


	function ArrayParams(){ return ListNode.apply(this,arguments) };

	Imba.subclass(ArrayParams,ListNode);
	exports.ArrayParams = ArrayParams; // export class 
	ArrayParams.prototype.index = function(v){ return this._index; }
	ArrayParams.prototype.setIndex = function(v){ this._index = v; return this; };
	ArrayParams.prototype.variable = function(v){ return this._variable; }
	ArrayParams.prototype.setVariable = function(v){ this._variable = v; return this; };

	ArrayParams.prototype.visit = function (){
		var s = this.scope__();
		this._variable || (this._variable = s.temporary(this,{pool: 'keypars'}));
		this._variable.predeclared();
		
		// now when we loop through these inner params - we create the pars
		// with the correct name, but bind them to the parent
		return ArrayParams.__super__.visit.apply(this,arguments);
	};

	ArrayParams.prototype.name = function (){
		return this.variable().c();
	};

	ArrayParams.prototype.load = function (list){
		var self = this;
		if (!((list instanceof Arr))) { return null };
		// try the basic first
		if (!list.splat()) {
			return list.value().map(function(v,i) {
				// must make sure the params are supported here
				// should really not parse any array at all(!)
				var name = v;
				if (v instanceof VarOrAccess) {
					// FIX?
					name = v.value().value();
					// this is accepted
				};
				return self.parse(name,v,i);
			});
		};
	};

	ArrayParams.prototype.parse = function (name,child,i){
		var param = new IndexedParam(name,null);
		
		param.setParent(this);
		param.setSubindex(i);
		return param;
	};

	ArrayParams.prototype.head = function (ast){
		return this;
	};

	function ParamList(){ return ListNode.apply(this,arguments) };

	Imba.subclass(ParamList,ListNode);
	exports.ParamList = ParamList; // export class 
	ParamList.prototype.splat = function(v){ return this._splat; }
	ParamList.prototype.setSplat = function(v){ this._splat = v; return this; };
	ParamList.prototype.block = function(v){ return this._block; }
	ParamList.prototype.setBlock = function(v){ this._block = v; return this; };

	ParamList.prototype.at = function (index,force,name){
		if(force === undefined) force = false;
		if(name === undefined) name = null;
		if (force) {
			while (this.count() <= index){
				this.add(new Param(this.count() == index && name || ("_" + this.count())));
			};
			// need to visit at the same time, no?
		};
		return this.list()[index];
	};

	ParamList.prototype.metadata = function (){
		return this.filter(function(par) { return !(par instanceof Meta); });
	};

	ParamList.prototype.toJSON = function (){
		return this.metadata();
	};

	ParamList.prototype.visit = function (){
		this._splat = this.filter(function(par) { return par instanceof SplatParam; })[0];
		var blk = this.filter(function(par) { return par instanceof BlockParam; });
		
		if (blk.length > 1) {
			blk[1].warn("a method can only have one &block parameter");
		} else if (blk[0] && blk[0] != this.last()) {
			blk[0].warn("&block must be the last parameter of a method");
			// warn "&block must be the last parameter of a method", blk[0]
		};
		
		// add more warnings later(!)
		// should probably throw error as well to stop compilation
		
		// need to register the required-pars as variables
		return ParamList.__super__.visit.apply(this,arguments);
	};

	ParamList.prototype.js = function (o){
		if (this.count() == 0) { return EMPTY };
		if (o.parent() instanceof Block) { return this.head(o) };
		
		// items = map(|arg| arg.name.c ).compact
		// return null unless items[0]
		
		if (o.parent() instanceof Code) {
			// remove the splat, for sure.. need to handle the other items as well
			// this is messy with references to argvars etc etc. Fix
			var pars = this.nodes();
			// pars = filter(|arg| arg != @splat && !(arg isa BlockParam)) if @splat
			if (this._splat) { pars = this.filter(function(arg) { return (arg instanceof RequiredParam) || (arg instanceof OptionalParam); }) };
			return compact__(pars.map(function(arg) { return c__(arg.varname()); })).join(",");
		} else {
			throw "not implemented paramlist js";
			return "ta" + compact__(this.map(function(arg) { return arg.c(); })).join(",");
		};
	};

	ParamList.prototype.head = function (o){
		var reg = [];
		var opt = [];
		var blk = null;
		var splat = null;
		var named = null;
		var arys = [];
		var signature = [];
		var idx = 0;
		
		this.nodes().forEach(function(par,i) {
			par.setIndex(idx);
			if (par instanceof NamedParams) {
				signature.push('named');
				named = par;
			} else if (par instanceof OptionalParam) {
				signature.push('opt');
				opt.push(par);
			} else if (par instanceof BlockParam) {
				signature.push('blk');
				blk = par;
			} else if (par instanceof SplatParam) {
				signature.push('splat');
				splat = par;
				idx -= 1; // this should really be removed from the list, no?
			} else if (par instanceof ArrayParams) {
				arys.push(par);
				signature.push('ary');
			} else {
				signature.push('reg');
				reg.push(par);
			};
			return idx++;
		});
		
		if (named) {
			var namedvar = named.variable();
		};
		
		// var opt = nodes.filter(|n| n isa OptionalParam)
		// var blk = nodes.filter(|n| n isa BlockParam)[0]
		// var splat = nodes.filter(|n| n isa SplatParam)[0]
		
		// simple situation where we simply switch
		// can probably optimize by not looking at arguments at all
		var ast = [];
		var isFunc = function(js) { return ("typeof " + js + " == 'function'"); };
		
		// This is broken when dealing with iframes anc XSS scripting
		// but for now it is the best test for actual arguments
		// can also do constructor.name == 'Object'
		var isObj = function(js) { return ("" + js + ".constructor === Object"); };
		var isntObj = function(js) { return ("" + js + ".constructor !== Object"); };
		// should handle some common cases in a cleaner (less verbose) manner
		// does this work with default params after optional ones? Is that even worth anything?
		// this only works in one direction now, unlike TupleAssign
		
		// we dont really check the length etc now -- so it is buggy for lots of arguments
		
		// if we have optional params in the regular order etc we can go the easy route
		// slightly hacky now. Should refactor all of these to use the signature?
		if (!named && !splat && !blk && opt.length > 0 && signature.join(" ").match(/opt$/)) {
			for (var i = 0, len_ = opt.length, par; i < len_; i++) {
				par = opt[i];
				ast.push(("if(" + (par.name().c()) + " === undefined) " + (par.name().c()) + " = " + (par.defaults().c())));
			};
		} else if (named && !splat && !blk && opt.length == 0) { // and no block?!
			// different shorthands
			// if named
			ast.push(("if(!" + (namedvar.c()) + "||" + isntObj(namedvar.c()) + ") " + (namedvar.c()) + " = \{\}"));
		} else if (blk && opt.length == 1 && !splat && !named) {
			var op = opt[0];
			var opn = op.name().c();
			var bn = blk.name().c();
			ast.push(("if(" + bn + "==undefined && " + isFunc(opn) + ") " + bn + " = " + opn + "," + opn + " = " + (op.defaults().c())));
			ast.push(("if(" + opn + "==undefined) " + opn + " = " + (op.defaults().c())));
		} else if (blk && named && opt.length == 0 && !splat) {
			bn = blk.name().c();
			ast.push(("if(" + bn + "==undefined && " + isFunc(namedvar.c()) + ") " + bn + " = " + (namedvar.c()) + "," + (namedvar.c()) + " = \{\}"));
			ast.push(("else if(!" + (namedvar.c()) + "||" + isntObj(namedvar.c()) + ") " + (namedvar.c()) + " = \{\}"));
		} else if (opt.length > 0 || splat) { // && blk  # && !splat
			
			var argvar = this.scope__().temporary(this,{pool: 'arguments'}).predeclared().c();
			var len = this.scope__().temporary(this,{pool: 'counter'}).predeclared().c();
			
			var last = ("" + argvar + "[" + len + "-1]");
			var pop = ("" + argvar + "[--" + len + "]");
			ast.push(("var " + argvar + " = arguments, " + len + " = " + argvar + ".length"));
			
			if (blk) {
				bn = blk.name().c();
				if (splat) {
					ast.push(("var " + bn + " = " + isFunc(last) + " ? " + pop + " : null"));
				} else if (reg.length > 0) {
					// ast.push "// several regs really?"
					ast.push(("var " + bn + " = " + len + " > " + (reg.length) + " && " + isFunc(last) + " ? " + pop + " : null"));
				} else {
					ast.push(("var " + bn + " = " + isFunc(last) + " ? " + pop + " : null"));
				};
			};
			
			// if we have named params - look for them before splat
			// should probably loop through pars in the same order they were added
			// should it be prioritized above optional objects??
			if (named) {
				// should not include it when there is a splat?
				ast.push(("var " + (namedvar.c()) + " = " + last + "&&" + isObj(last) + " ? " + pop + " : \{\}"));
			};
			
			for (var i1 = 0, len__ = opt.length, par1; i1 < len__; i1++) {
				par1 = opt[i1];
				ast.push(("if(" + len + " < " + (par1.index() + 1) + ") " + (par1.name().c()) + " = " + (par1.defaults().c())));
			};
			
			// add the splat
			if (splat) {
				var sn = splat.name().c();
				var si = splat.index();
				
				if (si == 0) {
					ast.push(("var " + sn + " = new Array(" + len + ">" + si + " ? " + len + " : 0)"));
					ast.push(("while(" + len + ">" + si + ") " + sn + "[" + len + "-1] = " + pop));
				} else {
					ast.push(("var " + sn + " = new Array(" + len + ">" + si + " ? " + len + "-" + si + " : 0)"));
					ast.push(("while(" + len + ">" + si + ") " + sn + "[--" + len + " - " + si + "] = " + argvar + "[" + len + "]"));
				};
			};
			
			// if named
			// 	for k,i in named.nodes
			// 		# OP('.',namedvar) <- this is the right way, with invalid names etc
			// 		var op = OP('.',namedvar,k.key).c
			// 		ast.push "var {k.key.c} = {op} !== undefined ? {op} : {k.value.c}"
			
			// if named
			
			// return ast.join(";\n") + ";"
			// return "if({opt[0].name.c} instanceof Function) {blk.c} = {opt[0].c};"
		} else if (opt.length > 0) {
			for (var i2 = 0, length_ = opt.length, par2; i2 < length_; i2++) {
				par2 = opt[i2];
				ast.push(("if(" + (par2.name().c()) + " === undefined) " + (par2.name().c()) + " = " + (par2.defaults().c())));
			};
		};
		
		// now set stuff if named params(!)
		
		if (named) {
			for (var i3 = 0, ary = Imba.iterable(named.nodes()), $1 = ary.length, k; i3 < $1; i3++) {
				// console.log "named var {k.c}"
				k = ary[i3];
				op = OP('.',namedvar,k.c()).c();
				ast.push(("var " + (k.c()) + " = " + op + " !== undefined ? " + op + " : " + (k.defaults().c())));
			};
		};
		
		if (arys.length) {
			for (var i4 = 0, $1 = arys.length; i4 < $1; i4++) {
				// create tuples
				arys[i4].head(o,ast,this);
				// ast.push v.c
			};
		};
		
		
		
		// if opt:length == 0
		return (ast.length > 0) ? ((ast.join(";\n") + ";")) : (EMPTY);
	};


	// Legacy. Should move away from this?
	function VariableDeclaration(){ return ListNode.apply(this,arguments) };

	Imba.subclass(VariableDeclaration,ListNode);
	exports.VariableDeclaration = VariableDeclaration; // export class 
	VariableDeclaration.prototype.kind = function(v){ return this._kind; }
	VariableDeclaration.prototype.setKind = function(v){ this._kind = v; return this; };

	// we want to register these variables in
	VariableDeclaration.prototype.add = function (name,init,pos){
		if(pos === undefined) pos = -1;
		var vardec = new VariableDeclarator(name,init);
		if (name instanceof Variable) { (vardec.setVariable(name),name) };
		(pos == 0) ? (this.unshift(vardec)) : (this.push(vardec));
		return vardec;
	};

	VariableDeclaration.prototype.load = function (list){
		// temporary solution!!!
		return list.map(function(par) { return new VariableDeclarator(par.name(),par.defaults(),par.splat()); });
	};

	VariableDeclaration.prototype.isExpressable = function (){
		return this.nodes().every(function(item) { return item.isExpressable(); });
	};

	VariableDeclaration.prototype.js = function (o){
		if (this.count() == 0) { return EMPTY };
		
		if (this.count() == 1 && !(this.isExpressable())) {
			this.first().variable().autodeclare();
			var node = this.first().assignment();
			return node.c();
		};
		
		// FIX PERFORMANCE
		var out = compact__(cary__(this.nodes())).join(", ");
		return (out) ? (("var " + out)) : ("");
	};

	function VariableDeclarator(){ return Param.apply(this,arguments) };

	Imba.subclass(VariableDeclarator,Param);
	exports.VariableDeclarator = VariableDeclarator; // export class 
	VariableDeclarator.prototype.visit = function (){
		// even if we should traverse the defaults as if this variable does not exist
		// we need to preregister it and then activate it later
		var variable_, v_;
		(variable_ = this.variable()) || ((this.setVariable(v_ = this.scope__().register(this.name(),null)),v_));
		if (this.defaults()) { this.defaults().traverse() };
		// WARN what if it is already declared?
		this.variable().setDeclarator(this);
		this.variable().addReference(this.name());
		return this;
	};

	// needs to be linked up to the actual scoped variables, no?
	VariableDeclarator.prototype.js = function (o){
		if (this.variable()._proxy) { return null };
		
		var defs = this.defaults();
		// FIXME need to deal with var-defines within other statements etc
		// FIXME need better syntax for this
		if (defs != null && defs != undefined) {
			// console.log "defaults is {defaults}"
			if (defs instanceof Node) { defs = defs.c({expression: true}) };
			
			return ("" + (this.variable().c()) + " = " + defs);
		} else {
			return ("" + (this.variable().c()));
		};
	};

	VariableDeclarator.prototype.accessor = function (){
		return this;
	};


	// TODO clean up and refactor all the different representations of vars
	// VarName, VarReference, LocalVarAccess?
	function VarName(a,b){
		VarName.__super__.constructor.apply(this,arguments);
		this._splat = b;
	};

	Imba.subclass(VarName,ValueNode);
	exports.VarName = VarName; // export class 
	VarName.prototype.variable = function(v){ return this._variable; }
	VarName.prototype.setVariable = function(v){ this._variable = v; return this; };
	VarName.prototype.splat = function(v){ return this._splat; }
	VarName.prototype.setSplat = function(v){ this._splat = v; return this; };

	VarName.prototype.visit = function (){
		// should we not lookup instead?
		// FIXME p "register value {value.c}"
		var variable_, v_;
		(variable_ = this.variable()) || ((this.setVariable(v_ = this.scope__().register(this.value().c(),null)),v_));
		this.variable().setDeclarator(this);
		this.variable().addReference(this.value());
		return this;
	};

	VarName.prototype.js = function (o){
		return this.variable().c();
	};

	VarName.prototype.c = function (){
		return this.variable().c();
	};


	function VarList(t,l,r){
		this._traversed = false;
		this._type = this.type();
		this._left = l;
		this._right = r;
	};

	Imba.subclass(VarList,Node);
	exports.VarList = VarList; // export class 
	VarList.prototype.type = function(v){ return this._type; }
	VarList.prototype.setType = function(v){ this._type = v; return this; }; // let / var / const
	VarList.prototype.left = function(v){ return this._left; }
	VarList.prototype.setLeft = function(v){ this._left = v; return this; };
	VarList.prototype.right = function(v){ return this._right; }
	VarList.prototype.setRight = function(v){ this._right = v; return this; };

	// format :type, :left, :right

	// should throw error if there are more values on right than left

	VarList.prototype.visit = function (){
		
		// we need to carefully traverse children in the right order
		// since we should be able to reference
		var r;
		for (var i = 0, ary = Imba.iterable(this.left()), len = ary.length; i < len; i++) {
			ary[i].traverse(); // this should really be a var-declaration
			if (r = this.right()[i]) { r.traverse() };
		};
		return this;
	};

	VarList.prototype.js = function (o){
		// for the regular items
		var pairs = [];
		var ll = this.left().length;
		var rl = this.right().length;
		var v = null;
		
		// splatting here we come
		if (ll > 1 && rl == 1) {
			this.p("multiassign!");
			var r = this.right()[0];
			r.cache();
			for (var i = 0, ary = Imba.iterable(this.left()), len = ary.length, l; i < len; i++) {
				l = ary[i];
				if (l.splat()) {
					throw "not supported?";
					this.p("splat"); // FIX reimplement slice?
					if (i == ll - 1) {
						v = this.util().slice(r,i);
						this.p("last");
					} else {
						v = this.util().slice(r,i,-(ll - i) + 1);
					};
				} else {
					v = OP('.',r,num__(i));
				};
				
				pairs.push(OP('=',l,v));
			};
		} else {
			for (var i1 = 0, items = Imba.iterable(this.left()), len_ = items.length, l1; i1 < len_; i1++) {
				l1 = items[i1];
				r = this.right()[i1];
				pairs.push((r) ? (OP('=',l1.variable().accessor(),r)) : (l1));
			};
		};
		
		return ("var " + (pairs.c()));
	};


	// CODE

	function Code(){ return Node.apply(this,arguments) };

	Imba.subclass(Code,Node);
	exports.Code = Code; // export class 
	Code.prototype.head = function(v){ return this._head; }
	Code.prototype.setHead = function(v){ this._head = v; return this; };
	Code.prototype.body = function(v){ return this._body; }
	Code.prototype.setBody = function(v){ this._body = v; return this; };
	Code.prototype.scope = function(v){ return this._scope; }
	Code.prototype.setScope = function(v){ this._scope = v; return this; };
	Code.prototype.params = function(v){ return this._params; }
	Code.prototype.setParams = function(v){ this._params = v; return this; };

	Code.prototype.scopetype = function (){
		return Scope;
	};

	Code.prototype.visit = function (){
		if (this._scope) { this._scope.visit() };
		// @scope.parent = STACK.scope(1) if @scope
		return this;
	};


	// Rename to Program?
	function Root(body,opts){
		this._traversed = false;
		this._body = blk__(body);
		this._scope = new RootScope(this,null);
		this._options = {};
	};

	Imba.subclass(Root,Code);
	exports.Root = Root; // export class 
	Root.prototype.loc = function (){
		return this._body.loc();
	};

	Root.prototype.visit = function (){
		ROOT = STACK.ROOT = this._scope;
		this.scope().visit();
		return this.body().traverse();
	};

	Root.prototype.compile = function (o){
		STACK.reset(); // -- nested compilation does not work now
		OPTS = STACK._options = this._options = o || {};
		
		this.traverse();
		
		var out = this.c();
		var result = {
			js: out,
			ast: this,
			warnings: this.scope().warnings(),
			options: o,
			toString: function() { return this.js; }
		};
		if (o.sourceMapInline || o.sourceMap) {
			result.sourcemap = new SourceMap(result).generate();
		};
		
		return result;
	};

	Root.prototype.js = function (o){
		var out;
		if (this._options.bare) {
			out = this.scope().c();
		} else {
			this.body().consume(new ImplicitReturn());
			out = this.scope().c({indent: true});
			out = out.replace(/^\n?/,'\n');
			out = out.replace(/\n?$/,'\n\n');
			out = '(function(){' + out + '})();';
		};
		
		// find and replace shebangs
		var shebangs = [];
		out = out.replace(/^[ \t]*\/\/(\!.+)$/mg,function(m,shebang) {
			shebang = shebang.replace(/\bimba\b/g,'node');
			shebangs.push(("#" + shebang + "\n"));
			return "";
		});
		
		out = shebangs.join('') + out;
		
		return out;
	};


	Root.prototype.analyze = function (o){
		// loglevel: 0, entities: no, scopes: yes
		if(o === undefined) o = {};
		STACK.setLoglevel(o.loglevel || 0);
		STACK._analyzing = true;
		ROOT = STACK.ROOT = this._scope;
		OPTS = STACK._options = {
			target: o.target,
			loglevel: o.loglevel || 0,
			analysis: {
				entities: (o.entities || false),
				scopes: ((o.scopes == null) ? (o.scopes = true) : (o.scopes))
			}
		};
		
		this.traverse();
		STACK._analyzing = false;
		
		return this.scope().dump();
	};

	Root.prototype.inspect = function (){
		return true;
	};

	function ClassDeclaration(name,superclass,body){
		// what about the namespace?
		this._traversed = false;
		this._name = name;
		this._superclass = superclass;
		this._scope = new ClassScope(this);
		this._body = blk__(body);
		this;
	};

	Imba.subclass(ClassDeclaration,Code);
	exports.ClassDeclaration = ClassDeclaration; // export class 
	ClassDeclaration.prototype.name = function(v){ return this._name; }
	ClassDeclaration.prototype.setName = function(v){ this._name = v; return this; };
	ClassDeclaration.prototype.superclass = function(v){ return this._superclass; }
	ClassDeclaration.prototype.setSuperclass = function(v){ this._superclass = v; return this; };
	ClassDeclaration.prototype.initor = function(v){ return this._initor; }
	ClassDeclaration.prototype.setInitor = function(v){ this._initor = v; return this; };

	ClassDeclaration.prototype.consume = function (node){
		if (node instanceof Return) {
			this.option('return',true);
			return this;
		};
		return ClassDeclaration.__super__.consume.apply(this,arguments);
	};

	ClassDeclaration.prototype.namepath = function (){
		return this._namepath || (this._namepath = ("" + (this.name().c())));
	};

	ClassDeclaration.prototype.metadata = function (){
		var superclass_;
		return {
			type: 'class',
			namepath: this.namepath(),
			inherits: (superclass_ = this.superclass()) && superclass_.namepath  &&  superclass_.namepath(),
			path: this.name().c().toString(),
			desc: this._desc,
			loc: this.loc()
		};
	};

	ClassDeclaration.prototype.toJSON = function (){
		return this.metadata();
	};

	ClassDeclaration.prototype.visit = function (){
		// replace with some advanced lookup?
		ROOT.entities().add(this.namepath(),this);
		this.scope().visit();
		this.body().traverse();
		return this;
	};

	ClassDeclaration.prototype.js = function (o){
		this.scope().virtualize(); // is this always needed?
		this.scope().context().setValue(this.name());
		this.scope().context().setReference(this.name());
		// should probably also warn about stuff etc
		if (this.option('extension')) {
			return this.body().c();
		};
		
		var head = [];
		var o = this._options || {};
		var cname = (this.name() instanceof Access) ? (this.name().right()) : (this.name());
		var namespaced = this.name() != cname;
		var initor = null;
		var sup = this.superclass();
		
		var bodyindex = -1;
		var spaces = this.body().filter(function(item) { return item instanceof Terminator; });
		var mark = mark__(this.option('keyword'));
		
		this.body().map(function(c,i) {
			if ((c instanceof MethodDeclaration) && c.type() == 'constructor') {
				return bodyindex = i;
			};
		});
		
		if (bodyindex >= 0) {
			initor = this.body().removeAt(bodyindex);
		};
		
		// var initor = body.pluck do |c| c isa MethodDeclaration && c.type == :constructor
		// compile the cname
		if (typeof cname != 'string') { cname = cname.c() };
		
		var cpath = (typeof this.name() == 'string') ? (this.name()) : (this.name().c());
		
		this._cname = cname;
		this._cpath = cpath;
		
		if (!initor) {
			if (sup) {
				initor = ("" + mark + "function " + cname + "()\{ return " + (sup.c()) + ".apply(this,arguments) \};\n\n");
			} else {
				initor = ("" + mark + "function " + cname + "()") + '{ };\n\n';
			};
		} else {
			initor.setName(cname);
			initor = initor.c() + ';';
		};
		
		// if we are defining a class inside a namespace etc -- how should we set up the class?
		
		if (namespaced) {
			// should use Nodes to build this instead
			initor = ("" + cpath + " = " + initor); // OP('=',name,initor)
		};
		
		head.push(initor); // // @class {cname}\n
		
		if (bodyindex >= 0) {
			// add the space after initor?
			if (this.body().index(bodyindex) instanceof Terminator) {
				head.push(this.body().removeAt(bodyindex));
			};
		} else {
			// head.push(Terminator.new('\n\n'))
			true;
		};
		
		if (sup) {
			// console.log "deal with superclass!"
			// head.push("// extending the superclass\nimba$class({name.c},{sup.c});\n\n")
			head.push(new Util.Subclass([this.name(),sup]));
		};
		
		// only if it is not namespaced
		if (o.global && !namespaced) { // option(:global)
			head.push(("global." + cname + " = " + cpath + "; // global class \n"))
		};
		
		if (o.export && !namespaced) {
			head.push(("exports." + ((o.default) ? ('default') : (cname)) + " = " + cpath + "; // export class \n"))
		};
		
		// FIXME
		// if namespaced and (o:local or o:export)
		// 	console.log "namespaced classes are implicitly local/global depending on the namespace"
		
		if (this.option('return')) {
			this.body().push(("return " + cpath + ";"));
		};
		
		for (var i = 0, ary = Imba.iterable(head.reverse()), len = ary.length; i < len; i++) {
			this.body().unshift(ary[i]);
		};
		this.body()._indentation = null;
		var end = this.body().index(this.body().count() - 1);
		if ((end instanceof Terminator) && end.c().length == 1) { this.body().pop() };
		
		var out = this.body().c();
		
		return out;
	};


	function TagDeclaration(name,superclass,body){
		this._traversed = false;
		this._name = name;
		this._superclass = superclass;
		this._scope = new TagScope(this);
		this._body = blk__(body || []);
	};

	Imba.subclass(TagDeclaration,Code);
	exports.TagDeclaration = TagDeclaration; // export class 
	TagDeclaration.prototype.name = function(v){ return this._name; }
	TagDeclaration.prototype.setName = function(v){ this._name = v; return this; };
	TagDeclaration.prototype.superclass = function(v){ return this._superclass; }
	TagDeclaration.prototype.setSuperclass = function(v){ this._superclass = v; return this; };
	TagDeclaration.prototype.initor = function(v){ return this._initor; }
	TagDeclaration.prototype.setInitor = function(v){ this._initor = v; return this; };

	TagDeclaration.prototype.namepath = function (){
		return ("<" + this.name() + ">");
	};

	TagDeclaration.prototype.toJSON = function (){
		return {
			type: 'tag',
			namepath: this.namepath(),
			inherits: (this.superclass()) ? (("<" + (this.superclass().name()) + ">")) : (null),
			loc: this.loc(),
			desc: this._desc
		};
	};

	TagDeclaration.prototype.consume = function (node){
		if (node instanceof Return) {
			this.option('return',true);
			return this;
		};
		return TagDeclaration.__super__.consume.apply(this,arguments);
	};

	TagDeclaration.prototype.visit = function (){
		if (String(this.name()).match(/^[A-Z]/)) {
			this.set({isClass: true});
		};
		
		ROOT.entities().register(this); // what if this is not local?
		
		for (var i = 0, ary = Imba.iterable(STACK.scopes()), len = ary.length, scope; i < len; i++) {
			scope = ary[i];
			if (i > 0 && (scope instanceof TagScope)) {
				scope.node().option('hasLocalTags',true);
				this.option('parent',scope.node());
				break;
			};
		};
		
		// replace with some advanced lookup?
		this.scope().visit();
		return this.body().traverse();
	};

	TagDeclaration.prototype.id = function (){
		return this.name().id();
	};

	TagDeclaration.prototype.tagspace = function (){
		var ctx = this.scope().closure().tagContextPath();
		return (this.name().ns()) ? (("" + ctx + ".ns(" + helpers.singlequote(this.name().ns()) + ")")) : (ctx);
	};

	TagDeclaration.prototype.js = function (o){
		this.scope().context().setValue(this._ctx = this.scope().declare('tag',null,{system: true}));
		
		var ns = this.name().ns();
		var mark = mark__(this.option('keyword'));
		var params = [];
		
		params.push(helpers.singlequote(this.name().name()));
		var cbody = this.body().c();
		
		if (this.superclass()) {
			// WARN what if the superclass has a namespace?
			// what if it is a regular class?
			var supname = this.superclass().name();
			if (!supname[0].match(/[A-Z]/)) {
				supname = helpers.singlequote(supname);
			};
			params.push(supname);
		};
		
		if (this.body().count()) {
			if (this.option('hasLocalTags')) {
				params.push(("function(" + (this._ctx.c()) + "," + (this.scope().closure().tagContextPath()) + ")\{" + cbody + "\}"));
			} else {
				params.push(("function(" + (this._ctx.c()) + ")\{" + cbody + "\}"));
			};
		};
		
		var meth = (this.option('extension')) ? ('extendTag') : ('defineTag');
		
		var js = ("" + mark + this.tagspace() + "." + meth + "(" + params.join(', ') + ")");
		
		
		if (this.option('isClass')) {
			var cname = this.name().name();
			// declare variable
			js = ("var " + cname + " = " + js);
			// only if it is not namespaced
			// if o:global and !namespaced # option(:global)
			//	js.push("global.{cname} = {cpath}; // global class \n")
			if (this.option('export')) {
				js = ("" + js + "\nexports." + ((this.option('default')) ? ('default') : (cname)) + " = " + cname + ";");
			};
			
			if (this.option('return')) {
				js += ("\nreturn " + cname + ";");
			};
		} else {
			if (this.option('return')) {
				js = "return " + js;
			};
		};
		
		
		return js;
		
		// return out
	};

	function Func(params,body,name,target,o){
		this._options = o;
		var typ = this.scopetype();
		this._traversed = false;
		this._body = blk__(body);
		this._scope || (this._scope = (o && o.scope) || new typ(this));
		this._scope.setParams(this._params = new ParamList(params));
		this._name = name || '';
		this._target = target;
		this._type = 'function';
		this._variable = null;
		this;
	};

	Imba.subclass(Func,Code);
	exports.Func = Func; // export class 
	Func.prototype.name = function(v){ return this._name; }
	Func.prototype.setName = function(v){ this._name = v; return this; };
	Func.prototype.params = function(v){ return this._params; }
	Func.prototype.setParams = function(v){ this._params = v; return this; };
	Func.prototype.target = function(v){ return this._target; }
	Func.prototype.setTarget = function(v){ this._target = v; return this; };
	Func.prototype.options = function(v){ return this._options; }
	Func.prototype.setOptions = function(v){ this._options = v; return this; };
	Func.prototype.type = function(v){ return this._type; }
	Func.prototype.setType = function(v){ this._type = v; return this; };
	Func.prototype.context = function(v){ return this._context; }
	Func.prototype.setContext = function(v){ this._context = v; return this; };

	Func.prototype.scopetype = function (){
		return FunctionScope;
	};

	Func.prototype.nonlocals = function (){
		return this._scope._nonlocals;
	};

	Func.prototype.visit = function (){
		this.scope().visit();
		this._context = this.scope().parent();
		this._params.traverse();
		return this._body.traverse(); // so soon?
	};


	Func.prototype.js = function (o){
		if (!this.option('noreturn')) { this.body().consume(new ImplicitReturn()) };
		var ind = this.body()._indentation;
		// var s = ind and ind.@open
		if (ind && ind.isGenerated()) { this.body()._indentation = null };
		var code = this.scope().c({indent: (!ind || !ind.isGenerated()),braces: true});
		
		// args = params.map do |par| par.name
		// head = params.map do |par| par.c
		// code = [head,body.c(expression: no)].flatten__.compact.join("\n").wrap
		// FIXME creating the function-name this way is prone to create naming-collisions
		// will need to wrap the value in a FunctionName which takes care of looking up scope
		// and possibly dealing with it
		var name = (typeof this._name == 'string') ? (this._name) : (this._name.c());
		name = (name) ? (' ' + name.replace(/\./g,'_')) : ('');
		var out = ("function" + name + "(" + (this.params().c()) + ") ") + code;
		if (this.option('eval')) { out = ("(" + out + ")()") };
		return out;
	};

	Func.prototype.shouldParenthesize = function (par){
		if(par === undefined) par = this.up();
		return (par instanceof Call) && par.callee() == this;
		// if up as a call? Only if we are
	};


	function Lambda(){ return Func.apply(this,arguments) };

	Imba.subclass(Lambda,Func);
	exports.Lambda = Lambda; // export class 
	Lambda.prototype.scopetype = function (){
		var k = this.option('keyword');
		return ((k && k._value == 'ƒ')) ? ((MethodScope)) : ((LambdaScope));
	};


	function TagFragmentFunc(){ return Func.apply(this,arguments) };

	Imba.subclass(TagFragmentFunc,Func);
	exports.TagFragmentFunc = TagFragmentFunc; // export class 
	TagFragmentFunc.prototype.scopetype = function (){
		// caching still needs to be local no matter what?
		return (this.option('closed')) ? ((MethodScope)) : ((LambdaScope));
	};

	function MethodDeclaration(){ return Func.apply(this,arguments) };

	Imba.subclass(MethodDeclaration,Func);
	exports.MethodDeclaration = MethodDeclaration; // export class 
	MethodDeclaration.prototype.variable = function(v){ return this._variable; }
	MethodDeclaration.prototype.setVariable = function(v){ this._variable = v; return this; };

	MethodDeclaration.prototype.scopetype = function (){
		return MethodScope;
	};

	MethodDeclaration.prototype.consume = function (node){
		if (node instanceof Return) {
			this.option('return',true);
			return this;
		};
		return MethodDeclaration.__super__.consume.apply(this,arguments);
	};

	MethodDeclaration.prototype.metadata = function (){
		return {
			type: "method",
			name: "" + this.name(),
			namepath: this.namepath(),
			params: this._params.metadata(),
			desc: this._desc,
			scopenr: this.scope()._nr,
			loc: this.loc()
		};
	};

	MethodDeclaration.prototype.loc = function (){
		var d;
		if (d = this.option('def')) {
			return [d._loc,this.body().loc()[1]];
		} else {
			return [0,0];
		};
	};


	MethodDeclaration.prototype.toJSON = function (){
		return this.metadata();
	};

	MethodDeclaration.prototype.namepath = function (){
		if (this._namepath) { return this._namepath };
		
		var name = String(this.name());
		var sep = ((this.option('static')) ? ('.') : ('#'));
		if (this.target()) {
			return this._namepath = this._target.namepath() + sep + name;
		} else {
			return this._namepath = '&' + name;
		};
	};

	MethodDeclaration.prototype.visit = function (){
		// @desc = stack.stash.pluck(Comment)
		// @desc = stack.stash.pluck(Comment)
		// prebreak # make sure this has a break?
		var variable;
		this.scope().visit();
		
		if (String(this.name()).match(/\=$/)) {
			this.set({chainable: true});
		};
		
		if (this.option('greedy')) {
			this.warn("deprecated");
			// set(greedy: true)
			var tree = new TagTree();
			this._body = this.body().consume(tree);
			// body.nodes = [Arr.new(body.nodes)]
		};
		
		this._context = this.scope().parent().closure();
		this._params.traverse();
		
		if (String(this.name()) == 'initialize') {
			if ((this.context() instanceof ClassScope) && !(this.context() instanceof TagScope)) {
				this.setType('constructor');
			};
		};
		
		if (this.target() instanceof Self) {
			this._target = this._context.context();
			this.set({static: true});
		};
		
		if (this.context() instanceof ClassScope) {
			this.context().annotate(this);
			this._target || (this._target = this.context().context());
			// register as class-method?
			// should register for this
			// console.log "context is classscope {@name}"
		};
		
		if (!this._target) {
			// should not be registered on the outermost closure?
			this._variable = this.context().register(this.name(),this,{type: 'meth'});
		};
		
		if (this.target() instanceof Identifier) {
			if (variable = this.scope().lookup(this.target().toString())) {
				this.setTarget(variable);
			};
		};
		
		ROOT.entities().add(this.namepath(),this);
		this._body.traverse(); // so soon?
		return this;
	};

	MethodDeclaration.prototype.supername = function (){
		return (this.type() == 'constructor') ? (this.type()) : (this.name());
	};


	// FIXME export global etc are NOT valid for methods inside any other scope than
	// the outermost scope (root)

	MethodDeclaration.prototype.js = function (o){
		// FIXME Do this in the grammar - remnants of old implementation
		if (!(this.type() == 'constructor' || this.option('noreturn'))) {
			if (this.option('chainable')) {
				this.body().add(new ImplicitReturn(this.scope().context()));
			} else if (this.option('greedy')) {
				// haaack
				this.body().consume(new GreedyReturn());
			} else {
				this.body().consume(new ImplicitReturn());
			};
		};
		
		var code = this.scope().c({indent: true,braces: true});
		
		// same for Func -- should generalize
		var name = (typeof this._name == 'string') ? (this._name) : (this._name.c());
		name = name.replace(/\./g,'_');
		
		// var name = self.name.c.replace(/\./g,'_') # WHAT?
		var foot = [];
		
		var left = "";
		var func = ("(" + (this.params().c()) + ")") + code; // .wrap
		var target = this.target();
		var decl = !this.option('global') && !this.option('export');
		
		if (target instanceof ScopeContext) {
			// the target is a scope context
			target = null;
		};
		
		var ctx = this.context();
		var out = "";
		var mark = mark__(this.option('def'));
		// if ctx
		
		var fname = sym__(this.name());
		// console.log "symbolize {self.name} -- {fname}"
		var fdecl = fname; // decl ? fname : ''
		
		if ((ctx instanceof ClassScope) && !target) {
			if (this.type() == 'constructor') {
				out = ("" + mark + "function " + fname + func);
			} else if (this.option('static')) {
				out = ("" + mark + (ctx.context().c()) + "." + fname + " = function " + func);
			} else {
				out = ("" + mark + (ctx.context().c()) + ".prototype." + fname + " = function " + func);
			};
		} else if ((ctx instanceof RootScope) && !target) {
			// register method as a root-function, but with auto-call? hmm
			// should probably set using variable directly instead, no?
			out = ("" + mark + "function " + fdecl + func);
		} else if (target && this.option('static')) {
			out = ("" + mark + (target.c()) + "." + fname + " = function " + func);
		} else if (target) {
			out = ("" + mark + (target.c()) + ".prototype." + fname + " = function " + func);
		} else {
			out = ("" + mark + "function " + fdecl + func);
		};
		
		if (this.option('global')) {
			out = ("" + fname + " = " + out);
		};
		
		if (this.option('export')) {
			out = ("" + out + "; exports." + ((this.option('default')) ? ('default') : (fname)) + " = " + fname + ";");
			if (this.option('return')) { out = ("" + out + "; return " + fname + ";") };
		} else if (this.option('return')) {
			out = ("return " + out);
		};
		
		return out;
	};


	function TagFragmentDeclaration(){ return MethodDeclaration.apply(this,arguments) };

	Imba.subclass(TagFragmentDeclaration,MethodDeclaration);
	exports.TagFragmentDeclaration = TagFragmentDeclaration; // export class 



	function PropertyDeclaration(name,options,token){
		this._token = token;
		this._traversed = false;
		this._name = name;
		this._options = options || new Obj(new AssignList());
	};

	Imba.subclass(PropertyDeclaration,Node);
	exports.PropertyDeclaration = PropertyDeclaration; // export class 
	var propTemplate = '${headers}\n${path}${getterKey} = function(v){ return ${get}; }\n${path}.${setter} = function(v){ ${set}; return this; }\n${init}';

	var propWatchTemplate = '${headers}\n${path}${getterKey} = function(v){ return ${get}; }\n${path}.${setter} = function(v){\n	var a = this.${getter}();\n	if(v != a) { ${set}; }\n	if(v != a) { ${ondirty} }\n	return this;\n}\n${init}';

	PropertyDeclaration.prototype.name = function(v){ return this._name; }
	PropertyDeclaration.prototype.setName = function(v){ this._name = v; return this; };
	PropertyDeclaration.prototype.options = function(v){ return this._options; }
	PropertyDeclaration.prototype.setOptions = function(v){ this._options = v; return this; };

	PropertyDeclaration.prototype.visit = function (){
		this._options.traverse();
		return this;
	};

	// This will soon support bindings / listeners etc, much more
	// advanced generated code based on options passed in.
	PropertyDeclaration.prototype.c = function (){
		var o = this.options();
		var ast = "";
		var key = this.name().js();
		var scope = STACK.scope();
		
		var addDesc = o.keys().length;
		
		var pars = o.hash();
		
		var isAttr = (this._token && String(this._token) == 'attr') || o.key('attr');
		
		var js = {
			key: key,
			getter: key,
			getterKey: (RESERVED_TEST.test(key)) ? (("['" + key + "']")) : (("." + key)),
			setter: sym__(("set-" + key)),
			scope: ("" + (scope.context().c())),
			path: '${scope}.prototype',
			set: ("this._" + key + " = v"),
			get: ("this._" + key),
			init: "",
			headers: "",
			ondirty: ""
		};
		
		
		if (pars.inline) {
			if ((pars.inline instanceof Bool) && !pars.inline.isTruthy()) {
				o.remove('inline');
				return ("Imba." + (this._token) + "(" + (js.scope) + ",'" + (this.name().value()) + "'," + (o.c()) + ")").replace(',{})',')');
			};
		};
		
		var tpl = propTemplate;
		
		o.add('name',new Symbol(key));
		
		if (pars.watch) {
			if (!((pars.watch instanceof Bool) && !pars.watch.isTruthy())) { tpl = propWatchTemplate };
			var wfn = ("" + key + "DidSet");
			
			if (pars.watch instanceof Symbol) {
				wfn = pars.watch;
			} else if (pars.watch instanceof Str) {
				wfn = pars.watch;
			} else if (pars.watch instanceof Bool) {
				o.key('watch').setValue(new Symbol(("" + key + "DidSet")));
			} else {
				wfn = null;
			};
			
			if (wfn) {
				var fn = OP('.',new This(),wfn);
				js.ondirty = OP('&&',fn,CALL(fn,['v','a',("this.__" + key)])).c();
			} else {
				js.ondirty = ("Imba.propDidSet(this,this.__" + key + ",v,a)");
			};
		};
		
		
		if (pars.observe) {
			if (pars.observe instanceof Bool) {
				o.key('observe').setValue(new Symbol(("" + key + "DidEmit")));
			};
			
			tpl = propWatchTemplate;
			js.ondirty = ("Imba.observeProperty(this,'" + key + "'," + (o.key('observe').value().c()) + ",v,a);") + (js.ondirty || '');
			// OP('&&',fn,CALL(fn,['v','a',"this.__{key}"])).c
		};
		
		if (!isAttr && o.key('dom')) {
			js.set = ("if (v != this.dom()." + (this.name().value()) + ") \{ this.dom()." + (this.name().value()) + " = v \}");
			js.get = ("this.dom()." + (this.name().value()));
		};
		
		if (isAttr) { // (@token and String(@token) == 'attr') or o.key(:dom) or o.key(:attr)
			var attrKey = (o.key('dom') instanceof Str) ? (o.key('dom')) : (this.name().value());
			// need to make sure o has a key for attr then - so that the delegate can know?
			js.set = ("this.setAttribute('" + attrKey + "',v)");
			js.get = ("this.getAttribute('" + attrKey + "')");
		} else if (o.key('delegate')) {
			// if we have a delegate
			js.set = ("v = this.__" + key + ".delegate.set(this,'" + key + "',v,this.__" + key + ")");
			js.get = ("this.__" + key + ".delegate.get(this,'" + key + "',this.__" + key + ")");
		};
		
		
		
		if (pars.default) {
			if (o.key('dom')) {
				// FIXME go through class-method setAttribute instead
				js.init = ("" + (js.scope) + ".dom().setAttribute('" + key + "'," + (pars.default.c()) + ");");
			} else {
				// if this is not a primitive - it MUST be included in the
				// getter / setter instead
				// FIXME throw warning if the default is not a primitive object
				js.init = ("" + (js.scope) + ".prototype._" + key + " = " + (pars.default.c()) + ";");
			};
		};
		
		if (o.key('chainable')) {
			js.get = ("v !== undefined ? (this." + (js.setter) + "(v),this) : " + (js.get));
		};
		
		
		js.options = o.c();
		
		if (addDesc) {
			js.headers = ("" + (js.path) + ".__" + (js.getter) + " = " + (js.options) + ";");
		};
		
		var reg = /\$\{(\w+)\}/gm;
		// var tpl = o.key(:watch) ? propWatchTemplate : propTemplate
		var out = tpl.replace(reg,function(m,a) { return js[a]; });
		// run another time for nesting. hacky
		out = out.replace(reg,function(m,a) { return js[a]; });
		// out = out.replace(/\n\s*$/,'')
		out = out.replace(/^\s+|\s+$/g,'');
		
		// if o.key(:v)
		return out;
	};



	// Literals should probably not inherit from the same parent
	// as arrays, tuples, objects would be better off inheriting
	// from listnode.

	function Literal(v){
		this._traversed = false;
		this._expression = true;
		this._cache = null;
		this._raw = null;
		this._value = v;
	};

	Imba.subclass(Literal,ValueNode);
	exports.Literal = Literal; // export class 
	Literal.prototype.toString = function (){
		return "" + this.value();
	};

	Literal.prototype.hasSideEffects = function (){
		return false;
	};


	function Bool(v){
		this._value = v;
		this._raw = (String(v) == "true") ? (true) : (false);
	};

	Imba.subclass(Bool,Literal);
	exports.Bool = Bool; // export class 
	Bool.prototype.cache = function (){
		return this;
	};

	Bool.prototype.isPrimitive = function (){
		return true;
	};

	Bool.prototype.truthy = function (){
		return String(this.value()) == "true";
		// yes
	};

	Bool.prototype.js = function (o){
		return String(this._value);
	};

	Bool.prototype.c = function (){
		STACK._counter += 1;
		// undefined should not be a bool
		return String(this._value);
		// @raw ? "true" : "false"
	};

	Bool.prototype.toJSON = function (){
		return {type: 'Bool',value: this._value};
	};

	Bool.prototype.loc = function (){
		return (this._value.region) ? (this._value.region()) : ([0,0]);
	};

	function Undefined(){ return Literal.apply(this,arguments) };

	Imba.subclass(Undefined,Literal);
	exports.Undefined = Undefined; // export class 
	Undefined.prototype.isPrimitive = function (){
		return true;
	};

	Undefined.prototype.isTruthy = function (){
		return false;
	};

	Undefined.prototype.c = function (){
		return mark__(this._value) + "undefined";
	};

	function Nil(){ return Literal.apply(this,arguments) };

	Imba.subclass(Nil,Literal);
	exports.Nil = Nil; // export class 
	Nil.prototype.isPrimitive = function (){
		return true;
	};

	Nil.prototype.isTruthy = function (){
		return false;
	};

	Nil.prototype.c = function (){
		return mark__(this._value) + "null";
	};

	function True(){ return Bool.apply(this,arguments) };

	Imba.subclass(True,Bool);
	exports.True = True; // export class 
	True.prototype.raw = function (){
		return true;
	};

	True.prototype.isTruthy = function (){
		return true;
	};

	True.prototype.c = function (){
		return mark__(this._value) + "true";
	};

	function False(){ return Bool.apply(this,arguments) };

	Imba.subclass(False,Bool);
	exports.False = False; // export class 
	False.prototype.raw = function (){
		return false;
	};

	False.prototype.isTruthy = function (){
		return false;
	};

	False.prototype.c = function (){
		return mark__(this._value) + "false";
	};

	function Num(v){
		this._traversed = false;
		this._value = v;
	};

	Imba.subclass(Num,Literal);
	exports.Num = Num; // export class 
	Num.prototype.toString = function (){
		return String(this._value);
	};

	Num.prototype.isPrimitive = function (deep){
		return true;
	};

	Num.prototype.isTruthy = function (){
		return String(this._value) != "0";
	};

	Num.prototype.shouldParenthesize = function (par){
		if(par === undefined) par = this.up();
		return (par instanceof Access) && par.left() == this;
	};

	Num.prototype.js = function (o){
		var num = String(this._value);
		// console.log "compiled num to {num}"
		return num;
	};

	Num.prototype.c = function (o){
		if (this._cache) { return Num.__super__.c.call(this,o) };
		var js = String(this._value);
		var par = STACK.current();
		var paren = (par instanceof Access) && par.left() == this;
		// only if this is the right part of teh acces
		// console.log "should paren?? {shouldParenthesize}"
		return (paren) ? (("(" + mark__(this._value)) + js + ")") : ((mark__(this._value) + js));
		// @cache ? super(o) : String(@value)
	};

	Num.prototype.cache = function (o){
		if (!(o && (o.cache || o.pool))) { return this };
		return Num.__super__.cache.call(this,o);
	};

	Num.prototype.raw = function (){
		// really?
		return JSON.parse(String(this.value()));
	};

	Num.prototype.toJSON = function (){
		return {type: this.typeName(),value: this.raw()};
	};

	// should be quoted no?
	// what about strings in object-literals?
	// we want to be able to see if the values are allowed
	function Str(v){
		this._traversed = false;
		this._expression = true;
		this._cache = null;
		this._value = v;
		// should grab the actual value immediately?
	};

	Imba.subclass(Str,Literal);
	exports.Str = Str; // export class 
	Str.prototype.isString = function (){
		return true;
	};

	Str.prototype.isPrimitive = function (deep){
		return true;
	};

	Str.prototype.raw = function (){
		// JSON.parse requires double-quoted strings,
		// while eval also allows single quotes.
		// NEXT eval is not accessible like this
		// WARNING TODO be careful! - should clean up
		
		return this._raw || (this._raw = String(this.value()).slice(1,-1)); // incredibly stupid solution
	};

	Str.prototype.isValidIdentifier = function (){
		// there are also some values we cannot use
		return (this.raw().match(/^[a-zA-Z\$\_]+[\d\w\$\_]*$/)) ? (true) : (false);
	};

	Str.prototype.js = function (o){
		return String(this._value);
	};

	Str.prototype.c = function (o){
		return (this._cache) ? (Str.__super__.c.call(this,o)) : (String(this._value));
	};


	function Interpolation(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(Interpolation,ValueNode);
	exports.Interpolation = Interpolation; // export class 


	// Currently not used - it would be better to use this
	// for real interpolated strings though, than to break
	// them up into their parts before parsing
	function InterpolatedString(nodes,o){
		if(o === undefined) o = {};
		this._nodes = nodes;
		this._options = o;
		this;
	};

	Imba.subclass(InterpolatedString,Node);
	exports.InterpolatedString = InterpolatedString; // export class 
	InterpolatedString.prototype.add = function (part){
		if (part) { this._nodes.push(part) };
		return this;
	};

	InterpolatedString.prototype.visit = function (){
		for (var i = 0, ary = Imba.iterable(this._nodes), len = ary.length; i < len; i++) {
			ary[i].traverse();
		};
		return this;
	};

	InterpolatedString.prototype.escapeString = function (str){
		// var idx = 0
		// var len = str:length
		// var chr
		// while chr = str[idx++]
		return str = str.replace(/\n/g,'\\\n');
	};

	InterpolatedString.prototype.js = function (o){
		// creating the string
		var self = this;
		var parts = [];
		var str = '(';
		
		self._nodes.map(function(part,i) {
			if ((part instanceof Token) && part._type == 'NEOSTRING') {
				// esca
				return parts.push('"' + self.escapeString(part._value) + '"');
			} else if (part) {
				if (i == 0) {
					// force first part to be string
					parts.push('""');
				};
				part._parens = true;
				return parts.push(part.c({expression: true}));
			};
		});
		
		str += parts.join(" + ");
		str += ')';
		return str;
	};


	function Tuple(){ return ListNode.apply(this,arguments) };

	Imba.subclass(Tuple,ListNode);
	exports.Tuple = Tuple; // export class 
	Tuple.prototype.c = function (){
		// compiles as an array
		return new Arr(this.nodes()).c();
	};

	Tuple.prototype.hasSplat = function (){
		return this.filter(function(v) { return v instanceof Splat; })[0];
	};

	Tuple.prototype.consume = function (node){
		if (this.count() == 1) {
			return this.first().consume(node);
		} else {
			throw "multituple cannot consume";
		};
	};


	// Because we've dropped the Str-wrapper it is kinda difficult
	function Symbol(){ return Literal.apply(this,arguments) };

	Imba.subclass(Symbol,Literal);
	exports.Symbol = Symbol; // export class 
	Symbol.prototype.isValidIdentifier = function (){
		return (this.raw().match(/^[a-zA-Z\$\_]+[\d\w\$\_]*$/)) ? (true) : (false);
	};

	Symbol.prototype.isPrimitive = function (deep){
		return true;
	};

	Symbol.prototype.raw = function (){
		return this._raw || (this._raw = sym__(this.value().toString().replace(/^\:/,'')));
	};

	Symbol.prototype.js = function (o){
		return ("'" + sym__(this.raw()) + "'");
	};

	function RegExp(){ return Literal.apply(this,arguments) };

	Imba.subclass(RegExp,Literal);
	exports.RegExp = RegExp; // export class 
	RegExp.prototype.isPrimitive = function (){
		return true;
	};

	RegExp.prototype.js = function (){
		var m;
		var v = RegExp.__super__.js.apply(this,arguments);
		
		// special casing heregex
		if (m = constants.HEREGEX.exec(v)) {
			// console.log 'matxhed heregex',m
			var re = m[1].replace(constants.HEREGEX_OMIT,'').replace(/\//g,'\\/');
			return '/' + (re || '(?:)') + '/' + m[2];
		};
		
		return (v == '//') ? ('/(?:)/') : (v);
	};

	// Should inherit from ListNode - would simplify
	function Arr(){ return Literal.apply(this,arguments) };

	Imba.subclass(Arr,Literal);
	exports.Arr = Arr; // export class 
	Arr.prototype.load = function (value){
		return (value instanceof Array) ? (new ArgList(value)) : (value);
	};

	Arr.prototype.push = function (item){
		this.value().push(item);
		return this;
	};

	Arr.prototype.count = function (){
		return this.value().length;
	};

	Arr.prototype.nodes = function (){
		var val = this.value();
		return (val instanceof Array) ? (val) : (val.nodes());
	};

	Arr.prototype.splat = function (){
		return this.value().some(function(v) { return v instanceof Splat; });
	};

	Arr.prototype.visit = function (){
		if (this._value && this._value.traverse) { this._value.traverse() };
		return this;
	};

	Arr.prototype.isPrimitive = function (deep){
		return !this.value().some(function(v) { return !v.isPrimitive(true); });
	};

	Arr.prototype.js = function (o){
		
		var val = this._value;
		if (!val) { return "[]" };
		
		var splat = this.splat();
		var nodes = (val instanceof Array) ? (val) : (val.nodes());
		
		// for v in @value
		// 	break splat = yes if v isa Splat
		// var splat = value.some(|v| v isa Splat)
		
		if (splat) {
			// "SPLATTED ARRAY!"
			// if we know for certain that the splats are arrays we can drop the slice?
			var slices = [];
			var group = null;
			
			for (var i = 0, ary = Imba.iterable(nodes), len = ary.length, v; i < len; i++) {
				v = ary[i];
				if (v instanceof Splat) {
					slices.push(v);
					group = null;
				} else {
					if (!group) { slices.push(group = new Arr([])) };
					group.push(v);
				};
			};
			
			return ("[].concat(" + cary__(slices).join(", ") + ")");
		} else {
			// very temporary. need a more generic way to prettify code
			// should depend on the length of the inner items etc
			// if @indented or option(:indent) or value.@indented
			//	"[\n{value.c.join(",\n").indent}\n]"
			var out = (val instanceof Array) ? (cary__(val)) : (val.c());
			return ("[" + out + "]");
		};
	};

	Arr.prototype.hasSideEffects = function (){
		return this.value().some(function(v) { return v.hasSideEffects(); });
	};

	Arr.prototype.toString = function (){
		return "Arr";
	};

	Arr.prototype.indented = function (a,b){
		this._value.indented(a,b);
		return this;
	};

	Arr.wrap = function (val){
		return new Arr(val);
	};

	// should not be cklassified as a literal?
	function Obj(){ return Literal.apply(this,arguments) };

	Imba.subclass(Obj,Literal);
	exports.Obj = Obj; // export class 
	Obj.prototype.load = function (value){
		return (value instanceof Array) ? (new AssignList(value)) : (value);
	};

	Obj.prototype.visit = function (){
		if (this._value) { this._value.traverse() };
		// for v in value
		// 	v.traverse
		return this;
	};

	Obj.prototype.js = function (o){
		var dyn = this.value().filter(function(v) { return (v instanceof ObjAttr) && ((v.key() instanceof Op) || (v.key() instanceof InterpolatedString)); });
		
		if (dyn.length > 0) {
			var idx = this.value().indexOf(dyn[0]);
			// create a temp variable
			
			var tmp = this.scope__().temporary(this);
			// set the temporary object to the same
			var first = this.value().slice(0,idx);
			var obj = new Obj(first);
			var ast = [OP('=',tmp,obj)];
			
			this.value().slice(idx).forEach(function(atr) {
				return ast.push(OP('=',OP('.',tmp,atr.key()),atr.value()));
			});
			ast.push(tmp); // access the tmp at in the last part
			return new Parens(ast).c();
		};
		
		// for objects with expression-keys we need to think differently
		return '{' + this.value().c() + '}';
	};

	Obj.prototype.add = function (k,v){
		if ((typeof k=='string'||k instanceof String)) { k = new Identifier(k) };
		var kv = new ObjAttr(k,v);
		this.value().push(kv);
		return kv;
	};

	Obj.prototype.remove = function (key){
		for (var i = 0, ary = Imba.iterable(this.value()), len = ary.length, k; i < len; i++) {
			k = ary[i];
			if (k.key().symbol() == key) { this.value().remove(k) };
		};
		return this;
	};

	Obj.prototype.keys = function (){
		return Object.keys(this.hash());
	};

	Obj.prototype.hash = function (){
		var hash = {};
		for (var i = 0, ary = Imba.iterable(this.value()), len = ary.length, k; i < len; i++) {
			k = ary[i];
			if (k instanceof ObjAttr) { hash[k.key().symbol()] = k.value() };
		};
		return hash;
		// return k if k.key.symbol == key
	};

	// add method for finding properties etc?
	Obj.prototype.key = function (key){
		for (var i = 0, ary = Imba.iterable(this.value()), len = ary.length, k; i < len; i++) {
			k = ary[i];
			if ((k instanceof ObjAttr) && k.key().symbol() == key) { return k };
		};
		return null;
	};

	Obj.prototype.indented = function (a,b){
		this._value.indented(a,b);
		return this;
	};

	Obj.prototype.hasSideEffects = function (){
		return this.value().some(function(v) { return v.hasSideEffects(); });
	};

	// for converting a real object into an ast-representation
	Obj.wrap = function (obj){
		var attrs = [];
		for (var v, i = 0, keys = Object.keys(obj), l = keys.length; i < l; i++){
			v = obj[keys[i]];if (v instanceof Array) {
				v = Arr.wrap(v);
			} else if (v.constructor == Object) {
				v = Obj.wrap(v);
			};
			attrs.push(new ObjAttr(keys[i],v));
		};
		return new Obj(attrs);
	};

	Obj.prototype.toString = function (){
		return "Obj";
	};

	function ObjAttr(key,value){
		this._traversed = false;
		this._key = key;
		this._value = value;
		this._dynamic = (key instanceof Op);
		this;
	};

	Imba.subclass(ObjAttr,Node);
	exports.ObjAttr = ObjAttr; // export class 
	ObjAttr.prototype.key = function(v){ return this._key; }
	ObjAttr.prototype.setKey = function(v){ this._key = v; return this; };
	ObjAttr.prototype.value = function(v){ return this._value; }
	ObjAttr.prototype.setValue = function(v){ this._value = v; return this; };
	ObjAttr.prototype.options = function(v){ return this._options; }
	ObjAttr.prototype.setOptions = function(v){ this._options = v; return this; };

	ObjAttr.prototype.visit = function (){
		// should probably traverse key as well, unless it is a dead simple identifier
		this.key().traverse();
		return this.value().traverse();
	};

	ObjAttr.prototype.js = function (o){
		var k = (this.key().isReserved()) ? (("'" + (this.key().c()) + "'")) : (this.key().c());
		return ("" + k + ": " + (this.value().c()));
	};

	ObjAttr.prototype.hasSideEffects = function (){
		return true;
	};



	function ArgsReference(){ return Node.apply(this,arguments) };

	Imba.subclass(ArgsReference,Node);
	exports.ArgsReference = ArgsReference; // export class 
	ArgsReference.prototype.c = function (){
		return "arguments";
	};

	// should be a separate Context or something
	function Self(value){
		this._value = value;
	};

	Imba.subclass(Self,Literal);
	exports.Self = Self; // export class 
	Self.prototype.cache = function (){
		return this;
	};

	Self.prototype.reference = function (){
		return this;
	};

	Self.prototype.visit = function (){
		this.scope__().context();
		return this;
	};

	Self.prototype.c = function (){
		var s = this.scope__();
		return (s) ? (s.context().c()) : ("this");
	};

	function ImplicitSelf(){ return Self.apply(this,arguments) };

	Imba.subclass(ImplicitSelf,Self);
	exports.ImplicitSelf = ImplicitSelf; // export class 


	function This(){ return Self.apply(this,arguments) };

	Imba.subclass(This,Self);
	exports.This = This; // export class 
	This.prototype.cache = function (){
		return this;
	};

	This.prototype.reference = function (){
		return this;
	};

	This.prototype.visit = function (){
		return this;
	};

	This.prototype.c = function (){
		return "this";
	};




	// OPERATORS

	function Op(o,l,r){
		// set expression yes, no?
		this._expression = false;
		this._traversed = false;
		this._parens = false;
		this._cache = null;
		this._invert = false;
		this._opToken = o;
		this._op = o && o._value || o;
		
		if (this._op == 'and') {
			this._op = '&&';
		} else if (this._op == 'or') {
			this._op = '||';
		} else if (this._op == 'is') {
			this._op = '==';
		} else if (this._op == 'isnt') {
			this._op = '!=';
		};
		
		
		this._left = l;
		this._right = r;
		return this;
	};

	Imba.subclass(Op,Node);
	exports.Op = Op; // export class 
	Op.prototype.op = function(v){ return this._op; }
	Op.prototype.setOp = function(v){ this._op = v; return this; };
	Op.prototype.left = function(v){ return this._left; }
	Op.prototype.setLeft = function(v){ this._left = v; return this; };
	Op.prototype.right = function(v){ return this._right; }
	Op.prototype.setRight = function(v){ this._right = v; return this; };

	Op.prototype.visit = function (){
		if (this._right) { this._right.traverse() };
		if (this._left) { this._left.traverse() };
		return this;
	};

	Op.prototype.isExpressable = function (){
		// what if right is a string?!?
		return !(this.right()) || this.right().isExpressable();
	};

	Op.prototype.js = function (o){
		var out = null;
		var op = this._op;
		
		var l = this._left;
		var r = this._right;
		
		if (l instanceof Node) { l = l.c() };
		if (r instanceof Node) { r = r.c() };
		
		if (l && r) {
			out = ("" + l + " " + mark__(this._opToken) + op + " " + r);
		} else if (l) {
			out = ("" + mark__(this._opToken) + op + l);
		};
		// out = out.parenthesize if up isa Op # really?
		return out;
	};

	Op.prototype.shouldParenthesize = function (){
		return this._parens;
		// option(:parens)
	};

	Op.prototype.precedence = function (){
		return 10;
	};

	Op.prototype.consume = function (node){
		// if it is possible, convert into expression
		if (node instanceof TagTree) {
			if (this._left) { this._left.consume(node) };
			if (this._right) { this._right.consume(node) };
			// @body = @body.consume(node)
			// @alt = @alt.consume(node) if @alt
			return this;
		};
		if (this.isExpressable()) { return Op.__super__.consume.apply(this,arguments) };
		
		// TODO can rather use global caching?
		var tmpvar = this.scope__().declare('tmp',null,{system: true});
		var clone = OP(this.op(),this.left(),null);
		var ast = this.right().consume(clone);
		if (node) { ast.consume(node) };
		return ast;
	};

	function ComparisonOp(){ return Op.apply(this,arguments) };

	Imba.subclass(ComparisonOp,Op);
	exports.ComparisonOp = ComparisonOp; // export class 
	ComparisonOp.prototype.invert = function (){
		// are there other comparison ops?
		// what about a chain?
		var op = this._op;
		var pairs = ["==","!=","===","!==",">","<=","<",">="];
		var idx = pairs.indexOf(op);
		idx += ((idx % 2) ? (-1) : (1));
		this.setOp(pairs[idx]);
		this._invert = !this._invert;
		return this;
	};

	ComparisonOp.prototype.c = function (){
		if (this.left() instanceof ComparisonOp) {
			this.left().right().cache();
			return OP('&&',this.left(),OP(this.op(),this.left().right(),this.right())).c();
		} else {
			return ComparisonOp.__super__.c.apply(this,arguments);
		};
	};

	ComparisonOp.prototype.js = function (o){
		var op = this._op;
		var l = this._left;
		var r = this._right;
		
		if (l instanceof Node) { l = l.c() };
		if (r instanceof Node) { r = r.c() };
		return ("" + l + " " + mark__(this._opToken) + op + " " + r);
	};


	function MathOp(){ return Op.apply(this,arguments) };

	Imba.subclass(MathOp,Op);
	exports.MathOp = MathOp; // export class 
	MathOp.prototype.c = function (){
		if (this.op() == '∪') {
			return this.util().union(this.left(),this.right()).c();
		} else if (this.op() == '∩') {
			return this.util().intersect(this.left(),this.right()).c();
		};
	};


	function UnaryOp(){ return Op.apply(this,arguments) };

	Imba.subclass(UnaryOp,Op);
	exports.UnaryOp = UnaryOp; // export class 
	UnaryOp.prototype.invert = function (){
		if (this.op() == '!') {
			return this.left();
		} else {
			return UnaryOp.__super__.invert.apply(this,arguments); // regular invert
		};
	};

	UnaryOp.prototype.isTruthy = function (){
		var val = truthy__(this.left());
		return (val !== undefined) ? ((!val)) : ((undefined));
	};

	UnaryOp.prototype.js = function (o){
		var l = this._left;
		var r = this._right;
		var op = this.op();
		
		if (op == 'not') {
			op = '!';
		};
		
		if (op == '!') {
			// l.@parens = yes
			var str = l.c();
			var paren = l.shouldParenthesize(this);
			// FIXME this is a very hacky workaround. Need to handle all this
			// in the child instead, problems arise due to automatic caching
			if (!(str.match(/^\!?([\w\.]+)$/) || (l instanceof Parens) || paren || (l instanceof Access) || (l instanceof Call))) { str = '(' + str + ')' };
			// l.set(parens: yes) # sure?
			return ("" + op + str);
		} else if (op == '√') {
			return ("Math.sqrt(" + (l.c()) + ")");
		} else if (this.left()) {
			return ("" + (l.c()) + op);
		} else {
			return ("" + op + (r.c()));
		};
	};

	UnaryOp.prototype.normalize = function (){
		if (this.op() == '!' || this.op() == '√') { return this };
		var node = (this.left() || this.right()).node();
		// for property-accessors we need to rewrite the ast
		if (!((node instanceof PropertyAccess))) { return this };
		
		// ask to cache the path
		if ((node instanceof Access) && node.left()) { node.left().cache() };
		
		var num = new Num(1);
		var ast = OP('=',node,OP(this.op()[0],node,num));
		if (this.left()) { ast = OP((this.op()[0] == '-') ? ('+') : ('-'),ast,num) };
		
		return ast;
	};

	UnaryOp.prototype.consume = function (node){
		var norm = this.normalize();
		return (norm == this) ? (UnaryOp.__super__.consume.apply(this,arguments)) : (norm.consume(node));
	};

	UnaryOp.prototype.c = function (){
		var norm = this.normalize();
		return (norm == this) ? (UnaryOp.__super__.c.apply(this,arguments)) : (norm.c());
	};

	function InstanceOf(){ return Op.apply(this,arguments) };

	Imba.subclass(InstanceOf,Op);
	exports.InstanceOf = InstanceOf; // export class 
	InstanceOf.prototype.js = function (o){
		// fix checks for String and Number
		
		if (this.right() instanceof Const) {
			// WARN otherwise - what do we do? does not work with dynamic
			// classes etc? Should probably send to utility function isa$
			var name = c__(this.right().value());
			var obj = this.left().node();
			// TODO also check for primitive-constructor
			if (Imba.indexOf(name,['String','Number','Boolean']) >= 0) {
				if (!((obj instanceof LocalVarAccess))) {
					obj.cache();
				};
				// need a double check for these (cache left) - possibly
				return ("(typeof " + (obj.c()) + "=='" + (name.toLowerCase()) + "'||" + (obj.c()) + " instanceof " + name + ")");
				
				// convert
			};
		};
		var out = ("" + (this.left().c()) + " instanceof " + (this.right().c()));
		
		// should this not happen in #c?
		if (o.parent() instanceof Op) { out = helpers.parenthesize(out) };
		return out;
	};

	function TypeOf(){ return Op.apply(this,arguments) };

	Imba.subclass(TypeOf,Op);
	exports.TypeOf = TypeOf; // export class 
	TypeOf.prototype.js = function (o){
		return ("typeof " + (this.left().c()));
	};

	function Delete(){ return Op.apply(this,arguments) };

	Imba.subclass(Delete,Op);
	exports.Delete = Delete; // export class 
	Delete.prototype.js = function (o){
		// TODO this will execute calls several times if the path is not directly to an object
		// need to cache the receiver
		var l = this.left();
		var tmp = this.scope__().temporary(this,{pool: 'val'});
		var o = OP('=',tmp,l);
		// FIXME
		return ("(" + (o.c()) + ",delete " + (l.c()) + ", " + (tmp.c()) + ")"); // oh well
		// var ast = [OP('=',tmp,left),"delete {left.c}",tmp]
		// should parenthesize directly no?
		// ast.c
	};

	Delete.prototype.shouldParenthesize = function (){
		return true;
	};

	function In(){ return Op.apply(this,arguments) };

	Imba.subclass(In,Op);
	exports.In = In; // export class 
	In.prototype.invert = function (){
		this._invert = !this._invert;
		return this;
	};

	In.prototype.js = function (o){
		var cond = (this._invert) ? ("== -1") : (">= 0");
		var idx = Util.indexOf(this.left(),this.right());
		return ("" + (idx.c()) + " " + cond);
	};



	// ACCESS

	function Access(o,l,r){
		// set expression yes, no?
		this._expression = false;
		this._traversed = false;
		this._parens = false;
		this._cache = null;
		this._invert = false;
		this._op = o && o._value || o;
		this._left = l;
		this._right = r;
		return this;
	};

	Imba.subclass(Access,Op);
	exports.Access = Access; // export class 
	Access.prototype.clone = function (left,right){
		var ctor = this.constructor;
		return new ctor(this.op(),left,right);
	};

	Access.prototype.js = function (o){
		var r;
		var raw = null;
		var rgt = this.right();
		var ctx = (this.left() || this.scope__().context());
		var pre = "";
		var mark = '';
		
		// if safechain
		//	p "Access is safechained {rgt.c}"
		
		
		if (rgt instanceof Num) {
			return ctx.c() + "[" + rgt.c() + "]";
		};
		
		// is this right? Should not the index compile the brackets
		// or value is a symbol -- should be the same, no?
		if ((rgt instanceof Index) && ((rgt.value() instanceof Str) || (rgt.value() instanceof Symbol))) {
			rgt = rgt.value();
		};
		
		// TODO do the identifier-validation in a central place instead
		if ((rgt instanceof Str) && rgt.isValidIdentifier()) {
			raw = rgt.raw();
		} else if ((rgt instanceof Symbol) && rgt.isValidIdentifier()) {
			raw = rgt.raw();
		} else if ((rgt instanceof Identifier) && rgt.isValidIdentifier()) {
			mark = mark__(rgt._value);
			raw = rgt.c();
		};
		
		if (this.safechain() && ctx) {
			ctx.cache({force: true});
			pre = ctx.c() + " && ";
		};
		
		// really?
		// var ctx = (left || scope__.context)
		var out = (raw) ? (
			// see if it needs quoting
			// need to check to see if it is legal
			(ctx) ? (("" + (ctx.c()) + "." + mark + raw)) : (raw)
		) : (
			r = (rgt instanceof Node) ? (rgt.c({expression: true})) : (rgt),
			("" + (ctx.c()) + "[" + r + "]")
		);
		
		// if safechain and ctx
		// 	out = "{ctx.c} && {out}"
		
		return pre + out;
	};

	Access.prototype.visit = function (){
		if (this.left()) { this.left().traverse() };
		if (this.right()) { this.right().traverse() };
		return;
	};

	Access.prototype.isExpressable = function (){
		return true;
	};

	Access.prototype.alias = function (){
		return (this.right() instanceof Identifier) ? (this.right().alias()) : (Access.__super__.alias.call(this));
	};

	Access.prototype.safechain = function (){
		// right.safechain
		return String(this._op) == '?.' || String(this._op) == '?:';
	};

	Access.prototype.cache = function (o){
		return (((this.right() instanceof Ivar) && !(this.left()))) ? (this) : (Access.__super__.cache.call(this,o));
	};



	// Should change this to just refer directly to the variable? Or VarReference
	function LocalVarAccess(){ return Access.apply(this,arguments) };

	Imba.subclass(LocalVarAccess,Access);
	exports.LocalVarAccess = LocalVarAccess; // export class 
	LocalVarAccess.prototype.safechain = function(v){ return this._safechain; }
	LocalVarAccess.prototype.setSafechain = function(v){ this._safechain = v; return this; };

	LocalVarAccess.prototype.js = function (o){
		if ((this.right() instanceof Variable) && this.right().type() == 'meth') {
			if (!((this.up() instanceof Call))) { return ("" + (this.right().c()) + "()") };
		};
		
		return this.right().c();
	};

	LocalVarAccess.prototype.variable = function (){
		return this.right();
	};

	LocalVarAccess.prototype.cache = function (o){
		if(o === undefined) o = {};
		if (o.force) { LocalVarAccess.__super__.cache.call(this,o) };
		return this;
	};

	LocalVarAccess.prototype.alias = function (){
		return this.variable()._alias || LocalVarAccess.__super__.alias.call(this);
	};


	function GlobalVarAccess(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(GlobalVarAccess,ValueNode);
	exports.GlobalVarAccess = GlobalVarAccess; // export class 
	GlobalVarAccess.prototype.js = function (o){
		return this.value().c();
	};


	function ObjectAccess(){ return Access.apply(this,arguments) };

	Imba.subclass(ObjectAccess,Access);
	exports.ObjectAccess = ObjectAccess; // export class 



	function PropertyAccess(o,l,r){
		this._traversed = false;
		this._invert = false;
		this._parens = false;
		this._expression = false; // yes?
		this._cache = null;
		this._op = o;
		this._left = l;
		this._right = r;
		return this;
	};

	Imba.subclass(PropertyAccess,Access);
	exports.PropertyAccess = PropertyAccess; // export class 
	PropertyAccess.prototype.visit = function (){
		if (this._right) { this._right.traverse() };
		if (this._left) { this._left.traverse() };
		return this;
	};

	// right in c we should possibly override
	// to create a call and regular access instead

	PropertyAccess.prototype.js = function (o){
		
		var rec;
		if (rec = this.receiver()) {
			var ast = CALL(OP('.',this.left(),this.right()),[]); // convert to ArgList or null
			ast.setReceiver(rec);
			return ast.c();
		};
		
		var up = this.up();
		
		if (!((up instanceof Call))) {
			ast = CALL(new Access(this.op(),this.left(),this.right()),[]);
			return ast.c();
		};
		
		// really need to fix this - for sure
		// should be possible for the function to remove this this instead?
		var js = ("" + PropertyAccess.__super__.js.call(this,o));
		
		if (!((up instanceof Call) || (up instanceof Util.IsFunction))) {
			js += "()";
		};
		
		return js;
	};


	PropertyAccess.prototype.receiver = function (){
		if ((this.left() instanceof SuperAccess) || (this.left() instanceof Super)) {
			return SELF;
		} else {
			return null;
		};
	};


	function IvarAccess(){ return Access.apply(this,arguments) };

	Imba.subclass(IvarAccess,Access);
	exports.IvarAccess = IvarAccess; // export class 
	IvarAccess.prototype.visit = function (){
		if (this._right) { this._right.traverse() };
		(this._left) ? (this._left.traverse()) : (this.scope__().context());
		return this;
	};

	IvarAccess.prototype.cache = function (){
		// WARN hmm, this is not right... when accessing on another object it will need to be cached
		return this;
	};


	function ConstAccess(){ return Access.apply(this,arguments) };

	Imba.subclass(ConstAccess,Access);
	exports.ConstAccess = ConstAccess; // export class 



	function IndexAccess(){ return Access.apply(this,arguments) };

	Imba.subclass(IndexAccess,Access);
	exports.IndexAccess = IndexAccess; // export class 
	IndexAccess.prototype.cache = function (o){
		if(o === undefined) o = {};
		if (o.force) { return IndexAccess.__super__.cache.apply(this,arguments) };
		this.right().cache();
		return this;
	};


	function SuperAccess(){ return Access.apply(this,arguments) };

	Imba.subclass(SuperAccess,Access);
	exports.SuperAccess = SuperAccess; // export class 
	SuperAccess.prototype.js = function (o){
		var m = o.method();
		var up = o.parent();
		var deep = (o.parent() instanceof Access);
		
		var out = ("" + (this.left().c()) + ".__super__");
		
		if (!((up instanceof Access))) {
			out += ("." + (m.supername().c()));
			if (!((up instanceof Call))) { // autocall?
				out += (".apply(" + (m.scope().context().c()) + ",arguments)");
			};
		};
		
		return out;
	};

	SuperAccess.prototype.receiver = function (){
		return SELF;
	};


	function VarOrAccess(value){
		// should rather call up to valuenode?
		this._traversed = false;
		this._parens = false;
		this._value = value;
		this._identifier = value;
		this._token = value._value;
		this._variable = null;
		this;
	};

	// Shortcircuit traverse so that it is not added to the stack?!
	Imba.subclass(VarOrAccess,ValueNode);
	exports.VarOrAccess = VarOrAccess; // export class 
	VarOrAccess.prototype.visit = function (){
		// @identifier = value # this is not a real identifier?
		// console.log "VarOrAccess {@identifier}"
		
		
		var scope = this.scope__();
		
		var variable = scope.lookup(this.value());
		
		// does not really need to have a declarator already? -- tricky
		if (variable && variable.declarator()) {
			// var decl = variable.declarator
			
			// if the variable is not initialized just yet and we are
			// in the same scope - we should not treat this as a var-lookup
			// ie.  var x = x would resolve to var x = this.x() if x
			// was not previously defined
			
			// should do this even if we are not in the same scope?
			// we only need to be in the same closure(!)
			
			if (variable._initialized || (scope.closure() != variable.scope().closure())) {
				this._variable = variable;
				variable.addReference(this);
				this._value = variable; // variable.accessor(self)
				this._token._variable = variable;
				return this;
			};
			// FIX
			// @value.safechain = safechain
		};
		
		// TODO deprecate and remove
		if (this.value().symbol().indexOf('$') >= 0) {
			// big hack - should disable
			// major hack here, no?
			// console.log "GlobalVarAccess"
			this._value = new GlobalVarAccess(this.value());
			return this;
		};
		
		// really? what about just mimicking the two diffrent instead?
		// Should we not return a call directly instead?
		this._value = new PropertyAccess(".",scope.context(),this.value());
		// mark the scope / context -- so we can show correct implicit
		this._token._meta = {type: 'ACCESS'};
		// @value.traverse # nah
		return this;
	};

	VarOrAccess.prototype.c = function (){
		return mark__(this._token) + ((this._variable) ? (VarOrAccess.__super__.c.call(this)) : (this.value().c()));
	};

	VarOrAccess.prototype.js = function (o){
		
		var v;
		if (v = this._variable) {
			var out = v.c();
			if (v._type == 'meth' && !(o.up() instanceof Call)) { out += "()" };
			return out;
		};
		return "NONO";
	};

	VarOrAccess.prototype.node = function (){
		return (this._variable) ? (this) : (this.value());
	};

	VarOrAccess.prototype.symbol = function (){
		return this._identifier.symbol();
		// value and value.symbol
	};

	VarOrAccess.prototype.cache = function (o){
		if(o === undefined) o = {};
		return (this._variable) ? ((o.force && VarOrAccess.__super__.cache.call(this,o))) : (this.value().cache(o));
		// should we really cache this?
		// value.cache(o)
	};

	VarOrAccess.prototype.decache = function (){
		(this._variable) ? (VarOrAccess.__super__.decache.call(this)) : (this.value().decache());
		return this;
	};

	VarOrAccess.prototype.dom = function (){
		return this.value().dom();
	};

	VarOrAccess.prototype.safechain = function (){
		return this._identifier.safechain();
	};

	VarOrAccess.prototype.dump = function (){
		return {loc: this.loc()};
	};

	VarOrAccess.prototype.loc = function (){
		var loc = this._identifier.region();
		return loc || [0,0];
	};

	VarOrAccess.prototype.region = function (){
		return this._identifier.region();
	};

	VarOrAccess.prototype.toString = function (){
		return ("VarOrAccess(" + this.value() + ")");
	};

	VarOrAccess.prototype.toJSON = function (){
		return {type: this.typeName(),value: this._identifier.toString()};
	};

	//	def js
	//		if right isa Variable and right.type == 'meth'
	//			return "{right.c}()" unless up isa Call
	//
	//		right.c
	//
	//	def variable
	//		right
	//
	//	def cache o = {}
	//		super if o:force
	//		self
	//
	//	def alias
	//		variable.@alias or super # if resolved?
	//

	function VarReference(value,type){
		if (value instanceof VarOrAccess) {
			value = value.value();
		};
		// for now - this can happen
		VarReference.__super__.constructor.call(this,value);
		this._export = false;
		this._type = type && String(type);
		this._variable = null;
		this._declared = true; // just testing now
	};


	Imba.subclass(VarReference,ValueNode);
	exports.VarReference = VarReference; // export class 
	VarReference.prototype.variable = function(v){ return this._variable; }
	VarReference.prototype.setVariable = function(v){ this._variable = v; return this; };
	VarReference.prototype.declared = function(v){ return this._declared; }
	VarReference.prototype.setDeclared = function(v){ this._declared = v; return this; };
	VarReference.prototype.type = function(v){ return this._type; }
	VarReference.prototype.setType = function(v){ this._type = v; return this; };

	VarReference.prototype.loc = function (){
		return this._value.region();
	};

	VarReference.prototype.set = function (o){
		// hack - workaround for hidden classes perf
		if (o.export) { this._export = true };
		return this;
	};

	VarReference.prototype.js = function (o){
		// experimental fix
		
		// what about resolving?
		var ref = this._variable;
		var out = ("" + mark__(this._value) + (ref.c()));
		
		if (ref && !ref._declared) { // .option(:declared)
			if (o.up(VarBlock)) { // up varblock??
				ref._declared = true;
				
				// ref.set(declared: yes)
			} else if (o.isExpression() || this._export) { // why?
				ref.autodeclare();
			} else {
				out = ("var " + out);
				ref._declared = true;
				// ref.set(declared: yes)
			};
		};
		
		// need to think the export through -- like registering somehow
		// should register in scope - export on analysis++
		if (this._export) {
			out = ("module.exports." + (ref.c()) + " = " + (ref.c()));
		};
		
		return out;
	};

	VarReference.prototype.declare = function (){
		return this;
	};

	VarReference.prototype.consume = function (node){
		// really? the consumed node dissappear?
		this._variable && this._variable.autodeclare();
		return this;
	};

	VarReference.prototype.visit = function (){
		
		// console.log "value type for VarReference {@value} {@value.@loc} {@value:constructor}"
		
		// should be possible to have a VarReference without a name as well? for a system-variable
		// name should not set this way.
		var name = this.value().c();
		
		// what about looking up? - on register we want to mark
		var v = this._variable || (this._variable = this.scope__().register(name,this,{type: this._type}));
		// FIXME -- should not simply override the declarator here(!)
		
		if (!v.declarator()) {
			v.setDeclarator(this);
		};
		
		if (this._value) { v.addReference(this._value) }; // is this the first reference?
		
		// only needed when analyzing?
		this._value._value._variable = v;
		return this;
	};

	VarReference.prototype.refnr = function (){
		return this.variable().references().indexOf(this.value());
	};

	// convert this into a list of references
	VarReference.prototype.addExpression = function (expr){
		return new VarBlock([this]).addExpression(expr);
	};


	// ASSIGN

	function Assign(o,l,r){
		
		// workaround until we complete transition from lua-style assignments
		// to always use explicit tuples - then we can move assignments out etc
		// this will not be needed after we remove support for var a,b,c = 1,2,3
		if ((l instanceof VarReference) && (l.value() instanceof Arr)) {
			// converting all nodes to var-references ?
			// do we need to keep it in a varblock at all?
			var vars = l.value().nodes().map(function(v) {
				// what about inner tuples etc?
				// keep the splats -- clumsy but true
				var v_;
				if (v instanceof Splat) {
					if (!((v.value() instanceof VarReference))) { (v.setValue(v_ = new VarReference(v.value(),l.type())),v_) };
				} else if (v instanceof VarReference) {
					true;
				} else {
					// what about retaining location?
					// v = v.value if v isa VarOrAccess
					v = new VarReference(v,l.type());
				};
				
				return v;
				
				// v isa VarReference ? v : VarReference.new(v)
			});
			
			return new TupleAssign(o,new Tuple(vars),r);
		};
		
		if (l instanceof Arr) {
			return new TupleAssign(o,new Tuple(l.nodes()),r);
		};
		
		// set expression yes, no?
		this._expression = false;
		this._traversed = false;
		this._parens = false;
		this._cache = null;
		this._invert = false;
		this._opToken = o;
		this._op = o && o._value || o;
		this._left = l;
		this._right = r;
		return this;
	};

	Imba.subclass(Assign,Op);
	exports.Assign = Assign; // export class 
	Assign.prototype.isExpressable = function (){
		return !(this.right()) || this.right().isExpressable();
	};

	Assign.prototype.isUsed = function (){
		// really?
		// if up is a block in general this should not be used -- since it should already have received implicit self?
		if (this.up() instanceof Block) { // && up.last != self
			return false;
		};
		return true;
	};

	// FIXME optimize
	Assign.prototype.visit = function (){
		var l = this._left;
		var r = this._right;
		
		// WARNING - slightly undefined
		// MARK THE STACK
		if (l) { l.traverse() };
		
		var lvar = (l instanceof VarReference) && l.variable();
		
		// how does this work with constants that are really var references?
		// should work when things are not described as well - but this is for testing
		// but if it refers to something else
		if (!lvar && this._desc) {
			// entities should be able to extract the needed info instead
			ROOT.entities().add(l.namepath(),{namepath: l.namepath(),type: r.typeName(),desc: this._desc});
		};
		
		// this should probably be done in a different manner
		if (lvar && lvar.declarator() == l) {
			lvar._initialized = false;
			if (r) { r.traverse() };
			lvar._initialized = true;
		} else {
			if (r) { r.traverse() };
		};
		
		if ((l instanceof VarReference) || l._variable) {
			l._variable.assigned(r,this);
		};
		
		return this;
	};

	Assign.prototype.c = function (o){
		if (!this.right().isExpressable()) {
			return this.right().consume(this).c(o);
		};
		// testing this
		return Assign.__super__.c.call(this,o);
	};

	Assign.prototype.js = function (o){
		if (!this.right().isExpressable()) {
			this.p("Assign#js right is not expressable ");
			// here this should be go out of the stack(!)
			// it should already be consumed?
			return this.right().consume(this).c();
		};
		var l = this.left().node();
		var r = this.right();
		
		// We are setting self(!)
		// TODO document functionality
		if (l instanceof Self) {
			var ctx = this.scope__().context();
			l = ctx.reference();
		};
		
		
		if (l instanceof PropertyAccess) {
			var ast = CALL(OP('.',l.left(),l.right().setter()),[this.right()]);
			ast.setReceiver(l.receiver());
			
			if (this.isUsed()) {
				// dont cache it again if it is already cached(!)
				if (!this.right().cachevar()) { this.right().cache({pool: 'val',uses: 1}) }; //
				// this is only when used.. should be more clever about it
				ast = new Parens(blk__([ast,this.right()]));
			};
			
			// should check the up-value no?
			return ast.c({expression: true});
		};
		
		// if l isa VarReference
		// 	p "assign var-ref"
		// 	l.@variable.assigned(r)
		
		// FIXME -- does not always need to be an expression?
		var lc = l.c();
		
		if (this.option('export')) {
			var ename = (l instanceof VarReference) ? (l.variable().c()) : (lc);
			return ("" + lc + " " + mark__(this._opToken) + this.op() + " exports." + ename + " = " + this.right().c({expression: true}));
		} else {
			return ("" + lc + " " + mark__(this._opToken) + this.op() + " " + this.right().c({expression: true}));
		};
		// return out
	};

	// FIXME op is a token? _FIX_
	// this (and similar cases) is broken when called from
	// another position in the stack, since 'up' is dynamic
	// should maybe freeze up?
	Assign.prototype.shouldParenthesize = function (par){
		if(par === undefined) par = this.up();
		return this._parens || (par instanceof Op) && par.op() != '=';
	};

	Assign.prototype.consume = function (node){
		if (this.isExpressable()) {
			this.forceExpression();
			return Assign.__super__.consume.call(this,node);
		};
		
		var ast = this.right().consume(this);
		return ast.consume(node);
	};

	// more workaround during transition away from a,b,c = 1,2,3 style assign
	Assign.prototype.addExpression = function (expr){
		// p "addExpression {expr}"
		var typ = ExpressionBlock;
		if (this._left && (this._left instanceof VarReference)) {
			typ = VarBlock;
		};
		// might be better to nest this up after parsing is done?
		var node = new typ([this]);
		return node.addExpression(expr);
	};


	function PushAssign(){ return Assign.apply(this,arguments) };

	Imba.subclass(PushAssign,Assign);
	exports.PushAssign = PushAssign; // export class 
	PushAssign.prototype.js = function (o){
		return ("" + (this.left().c()) + ".push(" + (this.right().c()) + ")");
	};

	PushAssign.prototype.consume = function (node){
		return this;
	};

	function TagPushAssign(){ return PushAssign.apply(this,arguments) };

	Imba.subclass(TagPushAssign,PushAssign);
	exports.TagPushAssign = TagPushAssign; // export class 
	TagPushAssign.prototype.js = function (o){
		return ("" + (this.left().c()) + ".push(" + (this.right().c()) + ")");
	};

	TagPushAssign.prototype.consume = function (node){
		return this;
	};


	function ConditionalAssign(){ return Assign.apply(this,arguments) };

	Imba.subclass(ConditionalAssign,Assign);
	exports.ConditionalAssign = ConditionalAssign; // export class 
	ConditionalAssign.prototype.consume = function (node){
		return this.normalize().consume(node);
	};

	ConditionalAssign.prototype.normalize = function (){
		var l = this.left().node();
		var ls = l;
		
		if (l instanceof Access) {
			if (l.left()) {
				l.left().cache();
			};
			ls = l.clone(l.left(),l.right()); // this should still be cached?
			if (l instanceof PropertyAccess) { l.cache() }; // correct now, to a certain degree
			if (l instanceof IndexAccess) {
				l.right().cache();
			};
			
			// we should only cache the value itself if it is dynamic?
			// l.cache # cache the value as well -- we cannot use this in assigns them
		};
		
		// some ops are less messy
		// need op to support consume then?
		var expr = this.right().isExpressable();
		var ast = null;
		// here we should use ast = if ...
		if (expr && this.op() == '||=') {
			ast = OP('||',l,OP('=',ls,this.right()));
		} else if (expr && this.op() == '&&=') {
			ast = OP('&&',l,OP('=',ls,this.right()));
		} else {
			ast = IF(this.condition(),OP('=',ls,this.right()),l); // do we need a scope for these?
			ast.setScope(null);
			// drop the scope
			// touch scope -- should probably visit the whole thing?
			// ast.scope.visit
		};
		if (ast.isExpressable()) { ast.toExpression() };
		return ast;
	};


	ConditionalAssign.prototype.c = function (){
		// WARN what if we return the same?
		return this.normalize().c();
	};

	ConditionalAssign.prototype.condition = function (){
		
		// use switch instead to cache op access
		if (this.op() == '?=') {
			return OP('==',this.left(),NULL);
		} else if (this.op() == '||=') {
			return OP('!',this.left());
		} else if (this.op() == '&&=') {
			return this.left();
		} else if (this.op() == '!?=') {
			return OP('!=',this.left(),NULL);
		} else {
			return this.left();
		};
	};

	ConditionalAssign.prototype.js = function (o){
		var ast = IF(this.condition(),OP('=',this.left(),this.right()),this.left());
		ast.setScope(null); // not sure about this
		if (ast.isExpressable()) { ast.toExpression() }; // forced expression already
		return ast.c();
	};

	function CompoundAssign(){ return Assign.apply(this,arguments) };

	Imba.subclass(CompoundAssign,Assign);
	exports.CompoundAssign = CompoundAssign; // export class 
	CompoundAssign.prototype.consume = function (node){
		if (this.isExpressable()) { return CompoundAssign.__super__.consume.apply(this,arguments) };
		
		var ast = this.normalize();
		if (ast != this) { return ast.consume(node) };
		
		ast = this.right().consume(this);
		return ast.consume(node);
	};

	CompoundAssign.prototype.normalize = function (){
		var ln = this.left().node();
		// we dont need to change this at all
		if (!((ln instanceof PropertyAccess))) {
			return this;
		};
		
		if (ln instanceof Access) {
			// left might be zero?!?!
			if (ln.left()) { ln.left().cache() };
		};
		// TODO FIXME we want to cache the context of the assignment
		var ast = OP('=',this.left(),OP(this.op()[0],this.left(),this.right()));
		if (ast.isExpressable()) { ast.toExpression() };
		
		return ast;
	};

	CompoundAssign.prototype.c = function (){
		var ast = this.normalize();
		if (ast == this) { return CompoundAssign.__super__.c.apply(this,arguments) };
		
		// otherwise it is important that we actually replace this node in the outer block
		// whenever we normalize and override c it is important that we can pass on caching
		// etc -- otherwise there WILL be issues.
		var up = STACK.current();
		if (up instanceof Block) {
			// an alternative would be to just pass
			up.replace(this,ast);
		};
		return ast.c();
	};


	function AsyncAssign(){ return Assign.apply(this,arguments) };

	Imba.subclass(AsyncAssign,Assign);
	exports.AsyncAssign = AsyncAssign; // export class 



	function TupleAssign(a,b,c){
		this._traversed = false;
		this._op = a;
		this._left = b;
		this._right = c;
		this._temporary = [];
	};

	Imba.subclass(TupleAssign,Assign);
	exports.TupleAssign = TupleAssign; // export class 
	TupleAssign.prototype.op = function(v){ return this._op; }
	TupleAssign.prototype.setOp = function(v){ this._op = v; return this; };
	TupleAssign.prototype.left = function(v){ return this._left; }
	TupleAssign.prototype.setLeft = function(v){ this._left = v; return this; };
	TupleAssign.prototype.right = function(v){ return this._right; }
	TupleAssign.prototype.setRight = function(v){ this._right = v; return this; };
	TupleAssign.prototype.type = function(v){ return this._type; }
	TupleAssign.prototype.setType = function(v){ this._type = v; return this; };

	TupleAssign.prototype.isExpressable = function (){
		return this.right().isExpressable();
	};

	TupleAssign.prototype.addExpression = function (expr){
		if (this.right() instanceof Tuple) {
			this.right().push(expr);
		} else {
			this.setRight(new Tuple([this.right(),expr]));
		};
		
		return this;
	};

	TupleAssign.prototype.visit = function (){
		// if the first left-value is a var-reference, then
		// all the variables should be declared as variables.
		// but if we have complex items in the other list - it does become much harder
		
		// if the first is a var-reference, they should all be(!) .. or splats?
		// this is really a hacky wao to do it though
		if (this.left().first().node() instanceof VarReference) {
			this.setType('var');
			// should possibly allow real vars as well, no?
			this._vars = this.left().nodes().filter(function(n) { return n instanceof VarReference; });
			// collect the vars for tuple for easy access
			
			// NOTE can improve.. should rather make the whole left be a VarBlock or TupleVarBlock
		};
		
		this.right().traverse();
		this.left().traverse();
		return this;
	};

	TupleAssign.prototype.js = function (o){
		// only for actual inner expressions, otherwise cache the whole array, no?
		var self = this;
		if (!self.right().isExpressable()) {
			
			return self.right().consume(self).c();
		};
		
		/* a,b,c = arguments */
		
		// - direct. no matter if lvalues are variables or not. Make fake arguments up to the same count as tuple
		
		/* a,*b,b = arguments */
		
		// Need to convert arguments to an array. IF arguments is not referenced anywhere else in scope,
		// we can do the assignment directly while rolling through arguments
		
		/* a,b = b,a */
		
		// ideally we only need to cache the first value (or n - 1), assign directly when possible.
		
		/* a,b,c = (method | expression) */
		
		// convert res into array, assign from array. Can cache the variable when assigning first value
		
		// First we need to find out whether we are required to store the result in an array before assigning
		// If this needs to be an expression (returns?, we need to fall back to the CS-wa)
		
		var ast = new Block([]);
		var lft = self.left();
		var rgt = self.right();
		var typ = self.type();
		var via = null;
		
		var li = 0;
		var ri = lft.count();
		var llen = ri;
		
		
		// if @vars
		// 	p "tuple has {@vars:length} vars"
		
		// if we have a splat on the left it is much more likely that we need to store right
		// in a temporary array, but if the right side has a known length, it should still not be needed
		var lsplat = lft.filter(function(v) { return v instanceof Splat; })[0];
		
		// if right is an array without any splats (or inner tuples?), normalize it to tuple
		if ((rgt instanceof Arr) && !rgt.splat()) { rgt = new Tuple(rgt.nodes()) };
		var rlen = (rgt instanceof Tuple) ? (rgt.count()) : (null);
		
		// if any values are statements we need to handle this before continuing
		
		/* a,b,c = 10,20,ary */
		
		// ideally we only need to cache the first value (or n - 1), assign directly when possible.
		// only if the variables are not predefined or predeclared can be we certain that we can do it without caching
		// if rlen && typ == 'var' && !lsplat
		// 	# this can be dangerous in edgecases that are very hard to detect
		// 	# if it becomes an issue, fall back to simpler versions
		// 	# does not even matter if there is a splat?
		
		// special case for arguments(!)
		if (!lsplat && rgt == ARGUMENTS) {
			
			var pars = self.scope__().params();
			// forcing the arguments to be named
			lft.map(function(l,i) { return ast.push(OP('=',l.node(),pars.at(i,true).visit().variable())); }); // s.params.at(value - 1,yes)
		} else if (rlen) {
			// we have several items in the right part. what about splats here?
			
			// pre-evaluate rvalues that might be reference from other assignments
			// we need to check if the rightside values has no side-effects. Cause if
			// they dont, we really do not need temporary variables.
			
			// some of these optimizations are quite petty - makes things more complicated
			// in the compiler only to get around adding a few temp-variables here and there
			
			// var firstUnsafe = 0
			// lft.map do |v,i|
			// 	if v isa VarReference
			// 		p "left side {i} {v} {v.refnr}"
			
			// rgt.map do |v,i|
			// 	if v.hasSideEffects
			// 		# return if i == 0 or !v.hasSideEffects
			// 		# return if v isa Num || v isa Str || i == 0
			// 		# we could explicitly create a temporary variable and adding nodes for accessing etc
			// 		# but the builtin caching should really take care of this for us
			// 		# we need to really force the caching though -- since we need a copy of it even if it is a local
			// 		# we need to predeclare the variables at the top of scope if this does not take care of it
			//
			// 		# these are the declarations -- we need to add them somewhere smart
			// 		@temporary.push(v) # need a generalized way to do this type of thing
			// 		ast.push(v.cache(force: yes, type: 'swap', declared: typ == 'var'))
			// 		# they do need to be declared, no?
			
			// now we can free the cached variables
			// ast.map do |n| n.decache
			
			var pre = [];
			var rest = [];
			
			var pairs = lft.map(function(l,i) {
				var v = null;
				// determine if this needs to be precached?
				// if l isa VarReference
				// 	# this is the first time the variable is referenced
				// 	# should also count even if it is predeclared at the top
				// 	if l.refnr == 0
				
				if (l == lsplat) {
					v = new ArgList([]);
					var to = (rlen - (ri - i));
					while (li <= to){
						v.push(rgt.index(li++));
					};
					v = new Arr(v);
					// ast.push OP('=',l.node,Arr.new(v))
				} else {
					v = rgt.index(li++);
				};
				return [l.node(),v];
				
				// if l isa VarReference && l.refnr
			});
			var clean = true;
			
			pairs.map(function(v,i) {
				var l = v[0];
				var r = v[1];
				
				if (clean) {
					if ((l instanceof VarReference) && l.refnr() == 0) {
						// still clean
						clean = true;
					} else {
						clean = false;
						pairs.slice(i).map(function(part) {
							if (part[1].hasSideEffects()) {
								self._temporary.push(part[1]); // need a generalized way to do this type of thing
								return ast.push(part[1].cache({force: true,pool: 'swap',declared: typ == 'var'}));
							};
						});
					};
				};
				
				// if the previous value in ast is a reference to our value - the caching was not needed
				if (ast.last() == r) {
					r.decache();
					// simple assign
					return ast.replace(r,OP('=',l,r));
				} else {
					return ast.push(OP('=',l,r));
				};
			});
			
			// WARN FIXME Is there not an issue with VarBlock vs not here?
		} else {
			// this is where we need to cache the right side before assigning
			// if the right side is a for loop, we COULD try to be extra clever, but
			// for now it is not worth the added compiler complexity
			
			// iter.cache(force: yes, type: 'iter')
			var top = new VarBlock();
			var iter = self.util().iterable(rgt,true);
			// could set the vars inside -- most likely
			ast.push(top);
			top.push(iter);
			
			if (lsplat) {
				var len = self.util().len(iter,true);
				var idx = self.util().counter(0,true);
				// cache the length of the array
				top.push(len); // preassign the length
				// cache counter to loop through
				top.push(idx);
			};
			
			// only if the block is variable based, no?
			// ast.push(blk = VarBlock.new)
			// blk = null
			
			var blktype = (typ == 'var') ? (VarBlock) : (Block);
			var blk = new blktype([]);
			// blk = top if typ == 'var'
			ast.push(blk);
			
			// if the lvals are not variables - we need to preassign
			// can also use slice here for simplicity, but try with while now
			lft.map(function(l,i) {
				if (l == lsplat) {
					var lvar = l.node();
					var rem = llen - i - 1; // remaining after splat
					
					if (typ != 'var') {
						var arr = self.util().array(OP('-',len,num__(i + rem)),true);
						top.push(arr);
						lvar = arr.cachevar();
					} else {
						if (!blk) { ast.push(blk = new blktype()) };
						arr = self.util().array(OP('-',len,num__(i + rem)));
						blk.push(OP('=',lvar,arr));
					};
					
					// if !lvar:variable || !lvar.variable # lvar =
					// 	top.push()
					//	p "has variable - no need to create a temp"
					// blk.push(OP('=',lvar,Arr.new([]))) # dont precalculate size now
					// max = to = (rlen - (llen - i))
					
					
					var test = (rem) ? (OP('-',len,rem)) : (len);
					
					var set = OP('=',OP('.',lvar,OP('-',idx,num__(i))),
					OP('.',iter,OP('++',idx)));
					
					ast.push(WHILE(OP('<',idx,test),set));
					
					if (typ != 'var') {
						ast.push(blk = new Block());
						return blk.push(OP('=',l.node(),lvar));
					} else {
						return blk = null;
					};
					
					// not if splat was last?
					// ast.push(blk = VarBlock.new)
				} else if (lsplat) {
					if (!blk) { ast.push(blk = new blktype()) };
					// we could cache the raw code of this node for better performance
					return blk.push(OP('=',l,OP('.',iter,OP('++',idx))));
				} else {
					if (!blk) { ast.push(blk = new blktype()) };
					return blk.push(OP('=',l,OP('.',iter,num__(i))));
				};
			});
		};
		
		// if we are in an expression we really need to
		if (o.isExpression() && self._vars) {
			for (var i = 0, ary = Imba.iterable(self._vars), len_ = ary.length; i < len_; i++) {
				ary[i].variable().autodeclare();
			};
		} else if (self._vars) {
			for (var j = 0, items = Imba.iterable(self._vars), len__ = items.length; j < len__; j++) {
				items[j].variable().predeclared();
			};
		};
		
		// is there any reason to make it into an expression?
		if (ast.isExpressable()) { // NO!
			// if this is an expression
			var out = ast.c({expression: true});
			if (typ && !o.isExpression()) { out = ("" + typ + " " + out) }; // not in expression
			return out;
		} else {
			out = ast.c();
			// if this is a varblock
			return out;
		};
	};


	TupleAssign.prototype.c = function (o){
		var out = TupleAssign.__super__.c.call(this,o);
		// this is only used in tuple -- better to let the tuple hav a separate #c
		if (this._temporary && this._temporary.length) {
			this._temporary.map(function(temp) { return temp.decache(); });
		};
		return out;
	};



	// IDENTIFIERS

	// really need to clean this up
	// Drop the token?
	function Identifier(value){
		this._value = this.load(value);
		this._symbol = null;
		this._setter = null;
		
		if (("" + value).indexOf("?") >= 0) {
			this._safechain = true;
		};
		// @safechain = ("" + value).indexOf("?") >= 0
		this;
	};

	Imba.subclass(Identifier,Node);
	exports.Identifier = Identifier; // export class 
	Identifier.prototype.safechain = function(v){ return this._safechain; }
	Identifier.prototype.setSafechain = function(v){ this._safechain = v; return this; };
	Identifier.prototype.value = function(v){ return this._value; }
	Identifier.prototype.setValue = function(v){ this._value = v; return this; };

	Identifier.prototype.references = function (variable){
		if (this._value) { this._value._variable = variable };
		return this;
	};

	Identifier.prototype.sourceMapMarker = function (){
		return this._value.sourceMapMarker();
	};

	Identifier.prototype.load = function (v){
		return ((v instanceof Identifier) ? (v.value()) : (v));
	};

	Identifier.prototype.traverse = function (){
		// NODES.push(self)
		return this;
	};

	Identifier.prototype.visit = function (){
		
		if (this._value instanceof Node) {
			// console.log "IDENTIFIER VALUE IS NODE"
			this._value.traverse();
		};
		return this;
	};

	Identifier.prototype.region = function (){
		return [this._value._loc,this._value._loc + this._value._len];
	};

	Identifier.prototype.isValidIdentifier = function (){
		return true;
	};

	Identifier.prototype.isReserved = function (){
		return this._value.reserved || RESERVED_TEST.test(String(this._value));
	};

	Identifier.prototype.symbol = function (){
		// console.log "Identifier#symbol {value}"
		return this._symbol || (this._symbol = sym__(this.value()));
	};

	Identifier.prototype.setter = function (){
		// console.log "Identifier#setter"
		var tok;
		return this._setter || (this._setter = (
		tok = new Token('IDENTIFIER',sym__('set-' + this._value),this._value._loc || -1),
		new Identifier(tok)
		// Identifier.new("set-{symbol}")
		));
	};

	Identifier.prototype.toString = function (){
		return String(this._value);
	};

	Identifier.prototype.toJSON = function (){
		return this.toString();
	};

	Identifier.prototype.alias = function (){
		return sym__(this._value);
	};

	Identifier.prototype.js = function (o){
		return this.symbol();
	};

	Identifier.prototype.c = function (){
		return '' + this.symbol(); // mark__(@value) +
	};

	Identifier.prototype.dump = function (){
		return {loc: this.region()};
	};

	Identifier.prototype.namepath = function (){
		return this.toString();
	};

	function TagId(v){
		this._value = (v instanceof Identifier) ? (v.value()) : (v);
		this;
	};

	Imba.subclass(TagId,Identifier);
	exports.TagId = TagId; // export class 
	TagId.prototype.c = function (){
		return ("id$('" + this.value().c().substr(1) + "')");
	};


	// This is not an identifier - it is really a string
	// Is this not a literal?

	// FIXME Rename to IvarLiteral? or simply Literal with type Ivar
	function Ivar(v){
		this._value = (v instanceof Identifier) ? (v.value()) : (v);
		this;
	};

	Imba.subclass(Ivar,Identifier);
	exports.Ivar = Ivar; // export class 
	Ivar.prototype.name = function (){
		return helpers.dashToCamelCase(this._value).replace(/^@/,'');
		// value.c.camelCase.replace(/^@/,'')
	};

	Ivar.prototype.alias = function (){
		return '_' + this.name();
	};

	// the @ should possibly be gone from the start?
	Ivar.prototype.js = function (o){
		return '_' + this.name();
	};

	Ivar.prototype.c = function (){
		return '_' + helpers.dashToCamelCase(this._value).slice(1); // .replace(/^@/,'') # mark__(@value) +
	};



	// Ambiguous - We need to be consistent about Const vs ConstAccess
	// Becomes more important when we implement typeinference and code-analysis
	function Const(){ return Identifier.apply(this,arguments) };

	Imba.subclass(Const,Identifier);
	exports.Const = Const; // export class 
	Const.prototype.symbol = function (){
		// console.log "Identifier#symbol {value}"
		return this._symbol || (this._symbol = sym__(this.value()));
	};

	Const.prototype.js = function (o){
		return this.symbol();
	};

	Const.prototype.c = function (){
		if (this.option('export')) {
			return ("exports." + (this._value) + " = ") + mark__(this._value) + this.symbol();
		} else {
			return mark__(this._value) + this.symbol();
		};
	};


	function TagTypeIdentifier(value){
		this._value = this.load(value);
		this;
	};

	Imba.subclass(TagTypeIdentifier,Identifier);
	exports.TagTypeIdentifier = TagTypeIdentifier; // export class 
	TagTypeIdentifier.prototype.name = function(v){ return this._name; }
	TagTypeIdentifier.prototype.setName = function(v){ this._name = v; return this; };
	TagTypeIdentifier.prototype.ns = function(v){ return this._ns; }
	TagTypeIdentifier.prototype.setNs = function(v){ this._ns = v; return this; };

	TagTypeIdentifier.prototype.load = function (val){
		this._str = ("" + val);
		var parts = this._str.split(":");
		this._raw = val;
		this._name = parts.pop();
		this._ns = parts.shift(); // if any?
		return this._str;
	};

	TagTypeIdentifier.prototype.js = function (o){
		return ("Imba.TAGS." + this._str.replace(":","$"));
	};

	TagTypeIdentifier.prototype.c = function (){
		return this.js();
	};

	TagTypeIdentifier.prototype.func = function (){
		var name = this._name.replace(/-/g,'_').replace(/\#/,'');
		if (this._ns) { name += ("$" + (this._ns.toLowerCase())) };
		return name;
	};

	TagTypeIdentifier.prototype.isClass = function (){
		return this._name[0] == this._name[0].toUpperCase();
	};

	TagTypeIdentifier.prototype.spawner = function (){
		if (this._ns) {
			return ("_" + (this._ns.toUpperCase()) + "." + (this._name.replace(/-/g,'_').toUpperCase()));
		} else {
			return ("" + (this._name.replace(/-/g,'_').toUpperCase()));
		};
	};

	TagTypeIdentifier.prototype.id = function (){
		var m = this._str.match(/\#([\w\-\d\_]+)\b/);
		return (m) ? (m[1]) : (null);
	};


	TagTypeIdentifier.prototype.flag = function (){
		return "_" + this.name().replace(/--/g,'_').toLowerCase();
	};

	TagTypeIdentifier.prototype.sel = function (){
		return ("." + this.flag()); // + name.replace(/-/g,'_').toLowerCase
	};

	TagTypeIdentifier.prototype.string = function (){
		return this.value();
	};


	function Argvar(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(Argvar,ValueNode);
	exports.Argvar = Argvar; // export class 
	Argvar.prototype.c = function (){
		// NEXT -- global.parseInt or Number.parseInt (better)
		var v = parseInt(String(this.value()));
		// FIXME Not needed anymore? I think the lexer handles this
		if (v == 0) { return "arguments" };
		
		var s = this.scope__();
		// params need to go up to the closeste method-scope
		var par = s.params().at(v - 1,true);
		return ("" + c__(par.name())); // c
	};


	// CALL

	function Call(callee,args,opexists){
		this._traversed = false;
		this._expression = false;
		this._parens = false;
		this._cache = null;
		this._receiver = null;
		this._opexists = opexists;
		// some axioms that share the same syntax as calls will be redirected from here
		
		if (callee instanceof VarOrAccess) {
			var str = callee.value().symbol();
			if (str == 'extern') {
				callee.value().value()._type = 'EXTERN';
				return new ExternDeclaration(args);
			};
			if (str == 'tag') {
				// console.log "ERROR - access args by some method"
				return new TagWrapper((args && args.index) ? (args.index(0)) : (args[0]));
			};
			if (str == 'export') {
				return new Export(args);
			};
		};
		
		this._callee = callee;
		this._args = args || new ArgList([]);
		
		if (args instanceof Array) {
			this._args = new ArgList(args);
		};
		this;
	};

	Imba.subclass(Call,Node);
	exports.Call = Call; // export class 
	Call.prototype.callee = function(v){ return this._callee; }
	Call.prototype.setCallee = function(v){ this._callee = v; return this; };
	Call.prototype.receiver = function(v){ return this._receiver; }
	Call.prototype.setReceiver = function(v){ this._receiver = v; return this; };
	Call.prototype.args = function(v){ return this._args; }
	Call.prototype.setArgs = function(v){ this._args = v; return this; };
	Call.prototype.block = function(v){ return this._block; }
	Call.prototype.setBlock = function(v){ this._block = v; return this; };

	Call.prototype.visit = function (){
		this.args().traverse();
		this.callee().traverse();
		// if the callee is a PropertyAccess - better to immediately change it
		
		return this._block && this._block.traverse();
	};

	Call.prototype.addBlock = function (block){
		var pos = this._args.filter(function(n,i) { return n == '&'; })[0]; // WOULD BE TOKEN - CAREFUL
		(pos) ? (this.args().replace(pos,block)) : (this.args().push(block));
		return this;
	};

	Call.prototype.receiver = function (){
		return this._receiver || (this._receiver = ((this.callee() instanceof Access) && this.callee().left() || NULL));
	};

	// check if all arguments are expressions - otherwise we have an issue

	Call.prototype.safechain = function (){
		return this.callee().safechain(); // really?
	};

	Call.prototype.js = function (o){
		var opt = {expression: true};
		var rec = null;
		// var args = compact__(args) # really?
		var args = this.args();
		
		// drop this?
		
		var splat = args.some(function(v) { return v instanceof Splat; });
		
		var out = null;
		var lft = null;
		var rgt = null;
		var wrap = null;
		
		var callee = this._callee = this._callee.node(); // drop the var or access?
		
		// if callee isa Call && callee.safechain
		//	yes
		
		if (callee instanceof Access) {
			lft = callee.left();
			rgt = callee.right();
		};
		
		if ((callee instanceof Super) || (callee instanceof SuperAccess)) {
			this._receiver = this.scope__().context();
			// return "supercall"
		};
		
		// never call the property-access directly?
		if (callee instanceof PropertyAccess) { // && rec = callee.receiver
			this._receiver = callee.receiver();
			callee = this._callee = new Access(callee.op(),callee.left(),callee.right());
			// console.log "unwrapping the propertyAccess"
		};
		
		if ((rgt instanceof Identifier) && rgt.value() == 'len' && args.count() == 0) {
			return new Util.Len([lft || callee]).c();
			
			// rewrite a.len(..) to len$(a)
		};
		
		if (callee.safechain()) {
			// if lft isa Call
			// if lft isa Call # could be a property access as well - it is the same?
			// if it is a local var access we simply check if it is a function, then call
			// but it should be safechained outside as well?
			// lft.cache if lft
			// the outer safechain should not cache the whole call - only ask to cache
			// the result? -- chain onto
			var isfn = new Util.IsFunction([callee]);
			wrap = [("" + (isfn.c()) + "  &&  "),""];
			callee = OP('.',callee.left(),callee.right());
			// callee should already be cached now -
		};
		
		// should just force expression from the start, no?
		if (splat) {
			// important to wrap the single value in a value, to keep implicit call
			// this is due to the way we check for an outer Call without checking if
			// we are the receiver (in PropertyAccess). Should rather wrap in CallArguments
			var rec1 = this.receiver();
			var ary = ((args.count() == 1) ? (new ValueNode(args.first().value())) : (new Arr(args.list())));
			
			rec1.cache(); // need to cache the context as it will be referenced in apply
			out = ("" + callee.c({expression: true}) + ".apply(" + (rec1.c()) + "," + ary.c({expression: true}) + ")");
		} else if (this._receiver) {
			// quick workaround
			if (!((this._receiver instanceof ScopeContext))) { this._receiver.cache() };
			args.unshift(this.receiver());
			// should rather rewrite to a new call?
			out = ("" + callee.c({expression: true}) + ".call(" + args.c({expression: true}) + ")");
		} else {
			out = ("" + callee.c({expression: true}) + "(" + args.c({expression: true}) + ")");
		};
		
		if (wrap) {
			// we set the cachevar inside
			if (this._cache) {
				this._cache.manual = true;
				out = ("(" + (this.cachevar().c()) + "=" + out + ")");
			};
			
			out = [wrap[0],out,wrap[1]].join("");
		};
		
		return out;
	};




	function ImplicitCall(){ return Call.apply(this,arguments) };

	Imba.subclass(ImplicitCall,Call);
	exports.ImplicitCall = ImplicitCall; // export class 
	ImplicitCall.prototype.js = function (o){
		return ("" + (this.callee().c()) + "()");
	};

	function New(){ return Call.apply(this,arguments) };

	Imba.subclass(New,Call);
	exports.New = New; // export class 
	New.prototype.js = function (o){
		var target = this.callee();
		
		while (target instanceof Access){
			var left = target.left();
			
			if ((left instanceof PropertyAccess) || (left instanceof VarOrAccess)) {
				this.callee()._parens = true;
				break;
			};
			
			target = left;
		};
		
		var out = ("new " + (this.callee().c()));
		if (!((o.parent() instanceof Call))) { out += '()' };
		return out;
	};

	function SuperCall(){ return Call.apply(this,arguments) };

	Imba.subclass(SuperCall,Call);
	exports.SuperCall = SuperCall; // export class 
	SuperCall.prototype.js = function (o){
		var m = o.method();
		this.setReceiver(SELF);
		this.setCallee(("" + (m.target().c()) + ".super$.prototype." + (m.name().c())));
		return SuperCall.__super__.js.apply(this,arguments);
	};



	function ExternDeclaration(){ return ListNode.apply(this,arguments) };

	Imba.subclass(ExternDeclaration,ListNode);
	exports.ExternDeclaration = ExternDeclaration; // export class 
	ExternDeclaration.prototype.visit = function (){
		this.setNodes(this.map(function(item) { return item.node(); })); // drop var or access really
		// only in global scope?
		var root = this.scope__();
		for (var i = 0, ary = Imba.iterable(this.nodes()), len = ary.length, item; i < len; i++) {
			item = ary[i];
			var variable = root.register(item.symbol(),item,{type: 'global'});
			variable.addReference(item);
		};
		return this;
	};

	ExternDeclaration.prototype.c = function (){
		return "// externs";
	};


	// FLOW

	function ControlFlow(){ return Node.apply(this,arguments) };

	Imba.subclass(ControlFlow,Node);
	exports.ControlFlow = ControlFlow; // export class 
	ControlFlow.prototype.loc = function (){
		return (this._body) ? (this._body.loc()) : ([0,0]);
	};

	function ControlFlowStatement(){ return ControlFlow.apply(this,arguments) };

	Imba.subclass(ControlFlowStatement,ControlFlow);
	exports.ControlFlowStatement = ControlFlowStatement; // export class 
	ControlFlowStatement.prototype.isExpressable = function (){
		return false;
	};



	function If(cond,body,o){
		if(o === undefined) o = {};
		this.setup();
		this._test = cond; // (o:type == 'unless' ? UnaryOp.new('!',cond,null) : cond)
		this._body = body;
		this._alt = null;
		this._type = o.type;
		if (this._type == 'unless') this.invert();
		this._scope = new IfScope(this);
		this;
	};

	Imba.subclass(If,ControlFlow);
	exports.If = If; // export class 
	If.prototype.test = function(v){ return this._test; }
	If.prototype.setTest = function(v){ this._test = v; return this; };
	If.prototype.body = function(v){ return this._body; }
	If.prototype.setBody = function(v){ this._body = v; return this; };
	If.prototype.alt = function(v){ return this._alt; }
	If.prototype.setAlt = function(v){ this._alt = v; return this; };
	If.prototype.scope = function(v){ return this._scope; }
	If.prototype.setScope = function(v){ this._scope = v; return this; };
	If.prototype.prevIf = function(v){ return this._prevIf; }
	If.prototype.setPrevIf = function(v){ this._prevIf = v; return this; };

	If.ternary = function (cond,body,alt){
		// prefer to compile it this way as well
		var obj = new If(cond,new Block([body]),{type: '?'});
		obj.addElse(new Block([alt]));
		return obj;
	};

	If.prototype.addElse = function (add){
		if (this.alt() && (this.alt() instanceof If)) {
			this.alt().addElse(add);
		} else {
			this.setAlt(add);
			if (add instanceof If) {
				add.setPrevIf(this);
			};
		};
		return this;
	};

	If.prototype.loc = function (){
		return this._loc || (this._loc = [(this._type) ? (this._type._loc) : (0),this.body().loc()[1]]);
	};

	If.prototype.invert = function (){
		if (this._test instanceof ComparisonOp) {
			return this._test = this._test.invert();
		} else {
			return this._test = new UnaryOp('!',this._test,null);
		};
	};

	If.prototype.visit = function (){
		var alt = this.alt();
		
		if (this._scope) { this._scope.visit() };
		if (this.test()) { this.test().traverse() };
		
		if (!this.stack().isAnalyzing()) {
			this._pretest = truthy__(this.test());
			
			if (this._pretest === true) {
				alt = this._alt = null;
			} else if (this._pretest === false) {
				this.loc(); // cache location before removing body
				this.setBody(null);
			};
		};
		
		if (this.body()) { this.body().traverse() };
		
		// should skip the scope in alt.
		if (alt) {
			STACK.pop(this);
			alt._scope || (alt._scope = new BlockScope(alt));
			alt.traverse();
			STACK.push(this);
		};
		
		// force it as expression?
		if (this._type == '?' && this.isExpressable()) this.toExpression();
		return this;
	};


	If.prototype.js = function (o){
		var v_;
		var body = this.body();
		// would possibly want to look up / out
		var brace = {braces: true,indent: true};
		
		if (this._pretest === true) {
			// what if it is inside expression?
			var js = (body) ? (body.c({braces: !(!(this.prevIf()))})) : ('true');
			
			if (!(this.prevIf())) {
				js = helpers.normalizeIndentation(js);
			};
			
			if (o.isExpression()) {
				js = '(' + js + ')';
			};
			
			return js;
		} else if (this._pretest === false) {
			if (this.alt() instanceof If) { (this.alt().setPrevIf(v_ = this.prevIf()),v_) };
			var js1 = (this.alt()) ? (this.alt().c({braces: !(!(this.prevIf()))})) : ('');
			
			if (!(this.prevIf())) {
				js1 = helpers.normalizeIndentation(js1);
			};
			
			return js1;
		};
		
		var cond = this.test().c({expression: true}); // the condition is always an expression
		
		if (o.isExpression()) {
			var code = (body) ? (body.c()) : ('true'); // (braces: yes)
			code = '(' + code + ')'; // if code.indexOf(',') >= 0
			
			if (this.alt()) {
				return ("(" + cond + ") ? " + code + " : (" + (this.alt().c()) + ")");
			} else {
				// again - we need a better way to decide what needs parens
				// maybe better if we rewrite this to an OP('&&'), and put
				// the parens logic there
				// cond should possibly have parens - but where do we decide?
				if (this._tagtree) {
					return ("(" + cond + ") ? " + code + " : void(0)");
				} else {
					return ("(" + cond + ") && " + code);
				};
			};
		} else {
			// if there is only a single item - and it is an expression?
			code = null;
			// if body.count == 1 # dont indent by ourselves?
			
			if ((body instanceof Block) && body.count() == 1 && !(body.first() instanceof LoopFlowStatement)) {
				body = body.first();
			};
			
			// if body.count == 1
			//	p "one item only!"
			//	body = body.first
			
			code = (body) ? (body.c({braces: true})) : ('{}'); // (braces: yes)
			
			// don't wrap if it is only a single expression?
			var out = ("" + mark__(this._type) + "if (" + cond + ") ") + code; // ' {' + code + '}' # '{' + code + '}'
			if (this.alt()) { out += (" else " + this.alt().c((this.alt() instanceof If) ? ({}) : (brace))) };
			return out;
		};
	};

	If.prototype.sourceMapMarker = function (){
		return this;
	};

	If.prototype.shouldParenthesize = function (){
		return !!this._parens;
	};

	If.prototype.consume = function (node){
		// if it is possible, convert into expression
		if (node instanceof TagTree) {
			if (this._body) { this._body = this._body.consume(node) };
			if (this._alt) { this._alt = this._alt.consume(node) };
			this._tagtree = node;
			return this;
		};
		
		if (node instanceof TagPushAssign) {
			if (this._body) { this._body = this._body.consume(node) };
			if (this._alt) { this._alt = this._alt.consume(node) };
			return this;
		};
		
		// special case for If created from conditional assign as well?
		// @type == '?' and
		// ideally we dont really want to make any expression like this by default
		var isRet = (node instanceof Return);
		
		// might have been forced to expression already
		// if it was originally a ternary - why not
		if (this._expression || ((!isRet || this._type == '?') && this.isExpressable())) {
			this.toExpression(); // mark as expression(!) - is this needed?
			return If.__super__.consume.call(this,node);
		} else {
			if (this._body) { this._body = this._body.consume(node) };
			if (this._alt) { this._alt = this._alt.consume(node) };
		};
		return this;
	};


	If.prototype.isExpressable = function (){
		// process:stdout.write 'x'
		var exp = (!(this.body()) || this.body().isExpressable()) && (!(this.alt()) || this.alt().isExpressable());
		return exp;
	};



	function Loop(options){
		if(options === undefined) options = {};
		this._traversed = false;
		this._options = options;
		this._body = null;
		this;
	};

	Imba.subclass(Loop,Statement);
	exports.Loop = Loop; // export class 
	Loop.prototype.scope = function(v){ return this._scope; }
	Loop.prototype.setScope = function(v){ this._scope = v; return this; };
	Loop.prototype.options = function(v){ return this._options; }
	Loop.prototype.setOptions = function(v){ this._options = v; return this; };
	Loop.prototype.body = function(v){ return this._body; }
	Loop.prototype.setBody = function(v){ this._body = v; return this; };
	Loop.prototype.catcher = function(v){ return this._catcher; }
	Loop.prototype.setCatcher = function(v){ this._catcher = v; return this; };

	Loop.prototype.loc = function (){
		var a = this._options.keyword;
		var b = this._body;
		
		if (a && b) {
			// FIXME does not support POST_ variants yet
			return [a._loc,b.loc()[1]];
		} else {
			return [0,0];
		};
	};

	Loop.prototype.set = function (obj){
		this._options || (this._options = {});
		var keys = Object.keys(obj);
		for (var i = 0, ary = Imba.iterable(keys), len = ary.length, k; i < len; i++) {
			k = ary[i];
			this._options[k] = obj[k];
		};
		return this;
	};


	Loop.prototype.addBody = function (body){
		this.setBody(blk__(body));
		return this;
	};


	Loop.prototype.c = function (o){
		
		var s = this.stack();
		var curr = s.current();
		
		
		
		if (this.stack().isExpression() || this.isExpression()) {
			// what the inner one should not be an expression though?
			// this will resut in an infinite loop, no?!?
			this.scope().closeScope();
			var ast = CALL(FN([],[this]),[]);
			return ast.c(o);
		} else if ((this.stack().current() instanceof Block) || ((s.up() instanceof Block) && s.current()._consumer == this)) {
			return Loop.__super__.c.call(this,o);
		} else {
			this.scope().closeScope();
			ast = CALL(FN([],[this]),[]);
			// scope.context.reference
			return ast.c(o);
			// need to wrap in function
		};
	};



	function While(test,opts){
		this._traversed = false;
		this._test = test;
		this._options = opts || {};
		this._scope = new WhileScope(this);
		// set(opts) if opts
		if (this.option('invert')) {
			// "invert test for while {@test}"
			this._test = test.invert();
		};
		// invert the test
	};


	Imba.subclass(While,Loop);
	exports.While = While; // export class 
	While.prototype.test = function(v){ return this._test; }
	While.prototype.setTest = function(v){ this._test = v; return this; };

	While.prototype.visit = function (){
		this.scope().visit();
		if (this.test()) { this.test().traverse() };
		if (this.body()) { return this.body().traverse() };
	};

	While.prototype.loc = function (){
		var o = this._options;
		return helpers.unionOfLocations(o.keyword,this._body,o.guard,this._test);
	};

	// TODO BUG -- when we declare a var like: while var y = ...
	// the variable will be declared in the WhileScope which never
	// force-declares the inner variables in the scope

	While.prototype.consume = function (node){
		// This is never expressable, but at some point
		// we might want to wrap it in a function (like CS)
		if (this.isExpressable()) { return While.__super__.consume.apply(this,arguments) };
		
		if (node instanceof TagTree) {
			// WARN this is a hack to allow references coming through the wrapping scope
			// will result in unneeded self-declarations and other oddities
			this.scope().closeScope();
			return CALL(FN([],[this]),[]);
		};
		
		var reuse = false;
		// WARN Optimization - might have untended side-effects
		// if we are assigning directly to a local variable, we simply
		// use said variable for the inner res
		// if reuse
		// 	resvar = scope.declare(node.left.node.variable,Arr.new([]),proxy: yes)
		// 	node = null
		// 	p "consume variable declarator!?".cyan
		// else
		// declare the variable we will use to soak up results
		// TODO Use a special vartype for this?
		var resvar = this.scope().declare('res',new Arr([]),{system: true});
		// WHAT -- fix this --
		this._catcher = new PushAssign("push",resvar,null); // the value is not preset # what
		this.body().consume(this._catcher); // should still return the same body
		
		// scope vars must not be compiled before this -- this is important
		var ast = new Block([this,resvar.accessor()]); // should be varaccess instead?
		return ast.consume(node);
		// NOTE Here we can find a way to know wheter or not we even need to
		// return the resvar. Often it will not be needed
		// FIXME what happens if there is no node?!?
	};


	While.prototype.js = function (o){
		var out = ("while (" + this.test().c({expression: true}) + ")") + this.body().c({braces: true,indent: true}); // .wrap
		
		if (this.scope().vars().count() > 0) {
			return [this.scope().vars().c(),out];
		};
		return out;
	};



	// This should define an open scope
	// should rather
	function For(o){
		if(o === undefined) o = {};
		this._traversed = false;
		this._options = o;
		this._scope = new ForScope(this);
		this._catcher = null;
	};

	Imba.subclass(For,Loop);
	exports.For = For; // export class 
	For.prototype.loc = function (){
		var o = this._options;
		return helpers.unionOfLocations(o.keyword,this._body,o.guard,o.step,o.source);
	};

	For.prototype.visit = function (){
		this.scope().visit();
		
		this.options().source.traverse(); // what about awakening the vars here?
		this.declare();
		// should be able to toggle whether to keep the results here already(!)
		
		// add guard to body
		if (this.options().guard) {
			var op = IF(this.options().guard.invert(),Block.wrap([new ContinueStatement("continue")]));
			this.body().unshift(op,BR);
		};
		
		return this.body().traverse();
	};

	For.prototype.isBare = function (src){
		return src && src._variable && src._variable._isArray;
	};

	For.prototype.declare = function (){
		var o = this.options();
		var scope = this.scope();
		var src = o.source;
		var vars = o.vars = {};
		var oi = o.index;
		
		var bare = this.isBare(src);
		
		// what about a range where we also include an index?
		if (src instanceof Range) {
			
			var from = src.left();
			var to = src.right();
			var dynamic = !((from instanceof Num)) || !((to instanceof Num));
			
			if (to instanceof Num) {
				vars.len = to;
			} else {
				// vars:len = scope.vars.push(vars:index.assignment(src.left))
				// vars:len = to.cache(force: yes, pool: 'len').predeclare
				vars.len = scope.declare('len',to,{type: 'let'});
				// to.cache(force: yes, pool: 'len').predeclare
			};
			
			// scope.vars.push(vars:index.assignment(src.left))
			vars.value = scope.declare(o.name,from,{type: 'let'});
			if (o.name) { vars.value.addReference(o.name) };
			
			if (o.index) {
				vars.index = scope.declare(o.index,0,{type: 'let'});
				vars.index.addReference(o.index);
			};
			
			if (dynamic) {
				vars.diff = scope.declare('rd',OP('-',vars.len,vars.value),{type: 'let'});
			};
		} else {
			// we are using automatic caching far too much here
			var i = vars.index = (oi) ? (scope.declare(oi,0,{type: 'let'})) : (this.util().counter(0,true,scope).predeclare());
			
			vars.source = (bare) ? (src) : (this.util().iterable(src,true).predeclare());
			vars.len = this.util().len(vars.source,true).predeclare();
			
			vars.value = scope.declare(o.name,null,{type: 'let'});
			vars.value.addReference(o.name); // adding reference!
			if (oi) { i.addReference(oi) };
		};
		
		return this;
	};


	For.prototype.consume = function (node){
		
		var receiver;
		if (this.isExpressable()) {
			return For.__super__.consume.apply(this,arguments);
		};
		
		// other cases as well, no?
		if (node instanceof TagTree) {
			this.scope().closeScope();
			
			node._loop = this;
			this._tagtree = node;
			
			this.body().consume(node);
			
			node._loop = null;
			var fn = new Lambda([],[this]);
			fn.scope().wrap(this.scope());
			// TODO Scope of generated lambda should be added into stack for
			// variable naming / resolution
			return CALL(fn,[]);
		};
		
		
		if (this._resvar) {
			var ast = new Block([this,BR,this._resvar.accessor()]);
			ast.consume(node);
			return ast;
		};
		
		var resvar = null;
		var reuseable = false; // node isa Assign && node.left.node isa LocalVarAccess
		var assignee = null;
		// might only work for locals?
		if (node instanceof Assign) {
			if (receiver = node.left()) {
				if (assignee = receiver._variable) {
					// we can only pull the var reference into the scope
					// if we know that the variable is declared in this scope
					reuseable = (receiver instanceof VarReference);
				};
			};
		};
		
		// WARN Optimization - might have untended side-effects
		// if we are assigning directly to a local variable, we simply
		// use said variable for the inner res
		if (reuseable && assignee) {
			// instead of declaring it in the scope - why not declare it outside?
			// it might already exist in the outer scope no?
			// assignee.resolve
			// should probably instead alter the assign-node to set value to a blank array
			// resvar = scope.parent.declare(assignee,Arr.new([]),proxy: yes,pos: 0)
			
			// this variable should really not be redeclared inside here at all
			assignee.resolve();
			// resvar = @resvar = scope.declare(assignee,Arr.new([]),proxy: yes)
			
			// dont declare it - simply push an assign into the vardecl of scope
			this.scope().vars().unshift(OP('=',assignee,new Arr([])));
			resvar = this._resvar = assignee;
			
			
			node._consumer = this;
			node = null;
		} else {
			// declare the variable we will use to soak up results
			// what about a pool here?
			resvar = this._resvar || (this._resvar = this.scope().declare('res',new Arr([]),{system: true,type: 'let'}));
		};
		
		if (this._tagtree) {
			this._catcher = new TagPushAssign("push",resvar,null);
		} else {
			this._catcher = new PushAssign("push",resvar,null); // the value is not preset
		};
		
		this.body().consume(this._catcher); // should still return the same body
		
		if (node) {
			ast = new Block([this,BR,resvar.accessor().consume(node)]);
			return ast;
		};
		// var ast = Block.new([self,BR,resvar.accessor])
		// ast.consume(node) if node
		// return ast
		return this;
		
		// this is never an expression (for now -- but still)
		// return ast
	};


	For.prototype.js = function (o){
		var vars = this.options().vars;
		var idx = vars.index;
		var val = vars.value;
		var src = this.options().source;
		
		var cond;
		var final;
		
		
		if (src instanceof Range) {
			var a = src.left();
			var b = src.right();
			var inc = src.inclusive();
			
			cond = OP((inc) ? ('<=') : ('<'),val,vars.len);
			final = OP('++',val);
			
			if (vars.diff) {
				cond = If.ternary(OP('>',vars.diff,new Num(0)),cond,OP((inc) ? ('>=') : ('>'),val,vars.len));
				final = If.ternary(OP('>',vars.diff,new Num(0)),OP('++',val),OP('--',val));
			};
			
			if (idx) {
				final = new ExpressionBlock([final,OP('++',idx)]);
			};
		} else {
			cond = OP('<',idx,vars.len);
			
			if (val.refcount() < 3 && val.assignments().length == 0) {
				val.proxy(vars.source,idx);
			} else {
				this.body().unshift(OP('=',val,OP('.',vars.source,idx)),BR);
			};
			
			if (this.options().step) {
				final = OP('=',idx,OP('+',idx,this.options().step));
			} else {
				final = OP('++',idx);
			};
		};
		
		var head = ("" + mark__(this.options().keyword) + "for (" + (this.scope().vars().c()) + "; " + cond.c({expression: true}) + "; " + final.c({expression: true}) + ") ");
		return head + this.body().c({braces: true,indent: true});
	};



	function ForIn(){ return For.apply(this,arguments) };

	Imba.subclass(ForIn,For);
	exports.ForIn = ForIn; // export class 




	function ForOf(){ return For.apply(this,arguments) };

	Imba.subclass(ForOf,For);
	exports.ForOf = ForOf; // export class 
	ForOf.prototype.declare = function (){
		var o = this.options();
		var vars = o.vars = {};
		
		var src = vars.source = o.source._variable || this.scope().declare('o',o.source,{system: true,type: 'let'});
		if (o.index) { var v = vars.value = this.scope().declare(o.index,null,{let: true,type: 'let'}) };
		
		// possibly proxy the index-variable?
		
		if (o.own) {
			// var i = vars:index = scope.declare('i',0,system: true, type: 'let') # mark as a counter?
			var i = vars.index = this.util().counter(0,true,this.scope()).predeclare();
			// systemvariable -- should not really be added to the map
			var keys = vars.keys = this.scope().declare('keys',Util.keys(src.accessor()),{system: true,type: 'let'}); // the outer one should resolve first
			var l = vars.len = this.scope().declare('l',Util.len(keys.accessor()),{system: true,type: 'let'});
			var k = vars.key = this.scope().register(o.name,o.name,{type: 'let'}); // scope.declare(o:name,null,system: yes)
		} else {
			// we set the var -- why even declare it
			// no need to declare -- it will declare itself in the loop - no?
			k = vars.key = this.scope().register(o.name,o.name,{type: 'let'});
		};
		
		// TODO use util - why add references already? Ah -- this is for the highlighting
		if (v && o.index) { v.addReference(o.index) };
		if (k && o.name) { k.addReference(o.name) };
		
		return this;
	};

	ForOf.prototype.js = function (o){
		var vars = this.options().vars;
		
		var o = vars.source;
		var k = vars.key;
		var v = vars.value;
		var i = vars.index;
		
		
		if (v) {
			// set value as proxy of object[key]
			// possibly make it a ref? what is happening?
			(v.refcount() < 3) ? (v.proxy(o,k)) : (this.body().unshift(OP('=',v,OP('.',o,k))));
		};
		
		if (this.options().own) {
			
			if (k.refcount() < 3) { // should probably adjust these
				k.proxy(vars.keys,i);
			} else {
				this.body().unshift(OP('=',k,OP('.',vars.keys,i)));
			};
			
			var head = ("" + mark__(this.options().keyword) + "for (" + (this.scope().vars().c()) + "; " + (OP('<',i,vars.len).c()) + "; " + (OP('++',i).c()) + ")");
			return head + this.body().c({indent: true,braces: true}); // .wrap
		};
		
		var code = this.body().c({braces: true,indent: true});
		// it is really important that this is a treated as a statement
		return this.scope().vars().c() + (";\n" + mark__(this.options().keyword) + "for (var " + (k.c()) + " in " + (o.c()) + ")") + code;
	};

	ForOf.prototype.head = function (){
		var v = this.options().vars;
		
		return [
			OP('=',v.key,OP('.',v.keys,v.index)),
			(v.value) && (OP('=',v.value,OP('.',v.source,v.key)))
		];
	};

	// NO NEED?
	function Begin(body){
		this._nodes = blk__(body).nodes();
	};


	Imba.subclass(Begin,Block);
	exports.Begin = Begin; // export class 
	Begin.prototype.shouldParenthesize = function (){
		return this.isExpression();
	};



	function Switch(a,b,c){
		this._traversed = false;
		this._source = a;
		this._cases = b;
		this._fallback = c;
	};


	Imba.subclass(Switch,ControlFlowStatement);
	exports.Switch = Switch; // export class 
	Switch.prototype.source = function(v){ return this._source; }
	Switch.prototype.setSource = function(v){ this._source = v; return this; };
	Switch.prototype.cases = function(v){ return this._cases; }
	Switch.prototype.setCases = function(v){ this._cases = v; return this; };
	Switch.prototype.fallback = function(v){ return this._fallback; }
	Switch.prototype.setFallback = function(v){ this._fallback = v; return this; };


	Switch.prototype.visit = function (){
		for (var i = 0, ary = Imba.iterable(this.cases()), len = ary.length; i < len; i++) {
			ary[i].traverse();
		};
		if (this.fallback()) { this.fallback().visit() };
		if (this.source()) { this.source().visit() };
		return;
	};


	Switch.prototype.consume = function (node){
		// TODO work inside tags (like loops)
		this._cases = this._cases.map(function(item) { return item.consume(node); });
		if (this._fallback) { this._fallback = this._fallback.consume(node) };
		return this;
	};

	Switch.prototype.c = function (o){
		if (this.stack().isExpression() || this.isExpression()) {
			var ast = CALL(FN([],[this]),[]);
			return ast.c(o);
		};
		
		return Switch.__super__.c.call(this,o);
	};


	Switch.prototype.js = function (o){
		var body = [];
		
		for (var i = 0, ary = Imba.iterable(this.cases()), len = ary.length, part; i < len; i++) {
			part = ary[i];
			part.autobreak();
			body.push(part);
		};
		
		if (this.fallback()) {
			body.push("default:\n" + this.fallback().c({indent: true}));
		};
		
		return ("switch (" + (this.source().c()) + ") ") + helpers.bracketize(cary__(body).join("\n"),true);
	};



	function SwitchCase(test,body){
		this._traversed = false;
		this._test = test;
		this._body = blk__(body);
	};

	Imba.subclass(SwitchCase,ControlFlowStatement);
	exports.SwitchCase = SwitchCase; // export class 
	SwitchCase.prototype.test = function(v){ return this._test; }
	SwitchCase.prototype.setTest = function(v){ this._test = v; return this; };
	SwitchCase.prototype.body = function(v){ return this._body; }
	SwitchCase.prototype.setBody = function(v){ this._body = v; return this; };


	SwitchCase.prototype.visit = function (){
		return this.body().traverse();
	};


	SwitchCase.prototype.consume = function (node){
		this.body().consume(node);
		return this;
	};


	SwitchCase.prototype.autobreak = function (){
		if (!((this.body().last() instanceof BreakStatement))) { this.body().push(new BreakStatement()) };
		return this;
	};


	SwitchCase.prototype.js = function (o){
		if (!((this._test instanceof Array))) { this._test = [this._test] };
		var cases = this._test.map(function(item) { return ("case " + (item.c()) + ":"); });
		return cases.join("\n") + this.body().c({indent: true}); // .indent
	};



	function Try(body,c,f){
		this._traversed = false;
		this._body = blk__(body);
		this._catch = c;
		this._finally = f;
	};


	Imba.subclass(Try,ControlFlowStatement);
	exports.Try = Try; // export class 
	Try.prototype.body = function(v){ return this._body; }
	Try.prototype.setBody = function(v){ this._body = v; return this; };
	// prop ncatch
	// prop nfinally

	Try.prototype.consume = function (node){
		this._body = this._body.consume(node);
		if (this._catch) { this._catch = this._catch.consume(node) };
		if (this._finally) { this._finally = this._finally.consume(node) };
		return this;
	};


	Try.prototype.visit = function (){
		this._body.traverse();
		if (this._catch) { this._catch.traverse() };
		if (this._finally) { return this._finally.traverse() };
		// no blocks - add an empty catch
	};


	Try.prototype.js = function (o){
		var out = "try " + this.body().c({braces: true,indent: true});
		if (this._catch) { out += " " + this._catch.c() };
		if (this._finally) { out += " " + this._finally.c() };
		
		if (!(this._catch || this._finally)) {
			out += (" catch (e) \{ \}");
		};
		out += ";";
		return out;
	};



	function Catch(body,varname){
		this._traversed = false;
		this._body = blk__(body || []);
		this._scope = new CatchScope(this);
		this._varname = varname;
		this;
	};

	Imba.subclass(Catch,ControlFlowStatement);
	exports.Catch = Catch; // export class 
	Catch.prototype.body = function(v){ return this._body; }
	Catch.prototype.setBody = function(v){ this._body = v; return this; };

	Catch.prototype.consume = function (node){
		this._body = this._body.consume(node);
		return this;
	};


	Catch.prototype.visit = function (){
		this._scope.visit();
		this._variable = this._scope.register(this._varname,this,{pool: 'catchvar'});
		return this._body.traverse();
	};


	Catch.prototype.js = function (o){
		// only indent if indented by default?
		return ("catch (" + (this._variable.c()) + ") ") + this._body.c({braces: true,indent: true});
	};


	// repeating myself.. don't deal with it until we move to compact tuple-args
	// for all astnodes


	function Finally(body){
		this._traversed = false;
		this._body = blk__(body || []);
	};


	Imba.subclass(Finally,ControlFlowStatement);
	exports.Finally = Finally; // export class 
	Finally.prototype.visit = function (){
		return this._body.traverse();
	};


	Finally.prototype.consume = function (node){
		// swallow silently
		return this;
	};


	Finally.prototype.js = function (o){
		return "finally " + this._body.c({braces: true,indent: true});
	};


	// RANGE

	function Range(){ return Op.apply(this,arguments) };

	Imba.subclass(Range,Op);
	exports.Range = Range; // export class 
	Range.prototype.inclusive = function (){
		return this.op() == '..';
	};

	Range.prototype.c = function (){
		return "range";
	};


	function Splat(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(Splat,ValueNode);
	exports.Splat = Splat; // export class 
	Splat.prototype.js = function (o){
		var par = this.stack().parent();
		if ((par instanceof ArgList) || (par instanceof Arr)) {
			return ("[].slice.call(" + (this.value().c()) + ")");
		} else {
			this.p(("what is the parent? " + par));
			return "SPLAT";
		};
	};

	Splat.prototype.node = function (){
		return this.value();
	};





	// TAGS

	TAG_TYPES = {};
	TAG_ATTRS = {};

	TAG_TYPES.HTML = "a abbr address area article aside audio b base bdi bdo big blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hr html i iframe img input ins kbd keygen label legend li link main map mark menu menuitem meta meter nav noscript object ol optgroup option output p param pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td textarea tfoot th thead time title tr track u ul var video wbr".split(" ");

	TAG_TYPES.SVG = "circle defs ellipse g line linearGradient mask path pattern polygon polylineradialGradient rect stop svg text tspan".split(" ");

	TAG_ATTRS.HTML = "accept accessKey action allowFullScreen allowTransparency alt async autoComplete autoFocus autoPlay cellPadding cellSpacing charSet checked className cols colSpan content contentEditable contextMenu controls coords crossOrigin data dateTime defer dir disabled download draggable encType form formNoValidate frameBorder height hidden href hrefLang htmlFor httpEquiv icon id label lang list loop max maxLength mediaGroup method min multiple muted name noValidate pattern placeholder poster preload radioGroup readOnly rel required role rows rowSpan sandbox scope scrollLeft scrolling scrollTop seamless selected shape size span spellCheck src srcDoc srcSet start step style tabIndex target title type useMap value width wmode";

	TAG_ATTRS.SVG = "cx cy d dx dy fill fillOpacity fontFamily fontSize fx fy gradientTransform gradientUnits markerEnd markerMid markerStart offset opacity patternContentUnits patternUnits points preserveAspectRatio r rx ry spreadMethod stopColor stopOpacity stroke strokeDasharray strokeLinecap strokeOpacity strokeWidth textAnchor transform version viewBox x1 x2 x y1 y2 y";


	function TagDesc(){
		this.p('TagDesc!!!',arguments);
		this;
	};

	Imba.subclass(TagDesc,Node);
	exports.TagDesc = TagDesc; // export class 
	TagDesc.prototype.classes = function (){
		this.p('TagDescClasses',arguments);
		return this;
	};

	function Tag(o){
		if(o === undefined) o = {};
		this._traversed = false;
		this._parts = [];
		o.classes || (o.classes = []);
		o.attributes || (o.attributes = []);
		o.classes || (o.classes = []);
		this._options = o;
		this._reference = null;
		this._object = null;
		this._tree = null;
		this;
	};

	Imba.subclass(Tag,Node);
	exports.Tag = Tag; // export class 
	Tag.prototype.parts = function(v){ return this._parts; }
	Tag.prototype.setParts = function(v){ this._parts = v; return this; };
	Tag.prototype.object = function(v){ return this._object; }
	Tag.prototype.setObject = function(v){ this._object = v; return this; };
	Tag.prototype.reactive = function(v){ return this._reactive; }
	Tag.prototype.setReactive = function(v){ this._reactive = v; return this; };
	Tag.prototype.parent = function(v){ return this._parent; }
	Tag.prototype.setParent = function(v){ this._parent = v; return this; };
	Tag.prototype.tree = function(v){ return this._tree; }
	Tag.prototype.setTree = function(v){ this._tree = v; return this; };

	Tag.prototype.set = function (obj){
		for (var v, i = 0, keys = Object.keys(obj), l = keys.length; i < l; i++){
			k = keys[i];v = obj[k];if (k == 'attributes') {
				for (var j = 0, ary = Imba.iterable(v), len = ary.length; j < len; j++) {
					this.addAttribute(ary[j]);
				};
				continue;
			};
			
			this._options[k] = v;
		};
		return this;
	};

	Tag.prototype.addClass = function (node){
		if (!((node instanceof TagFlag))) {
			node = new TagFlag(node);
		};
		this._options.classes.push(node);
		this._parts.push(node);
		return this;
	};

	Tag.prototype.addIndex = function (node){
		this._parts.push(node);
		this._object = node;
		return this;
	};

	Tag.prototype.addSymbol = function (node){
		if (this._parts.length == 0) {
			this._parts.push(node);
			this._options.ns = node;
		};
		return this;
	};


	Tag.prototype.addAttribute = function (atr){
		this._parts.push(atr);
		this._options.attributes.push(atr);
		return this;
	};

	Tag.prototype.enclosing = function (){
		return this._options.close && this._options.close.value();
	};

	Tag.prototype.type = function (){
		return this._options.type || 'div';
	};

	Tag.prototype.consume = function (node){
		var o = this._options;
		
		
		if (node instanceof TagTree) {
			this.setParent(node.root());
			
			if (node._loop) {
				// alwatys make items in loop reactive
				this.setReactive(node.reactive() || this.option('key'));
				this.option('loop',node._loop);
				
				if (this.option('ivar')) {
					this.warn(("Tag inside loop can not have a static reference " + this.option('ivar')),{type: 'error',token: this.option('ivar').value()});
				};
			} else {
				this.setReactive(node.reactive() || !(!this.option('ivar')));
			};
			
			return this;
		};
		
		return Tag.__super__.consume.apply(this,arguments);
	};


	Tag.prototype.visit = function (){
		
		var o = this._options;
		
		if (o.ivar || o.key) {
			this.setReactive(true);
		};
		
		var typ = this.enclosing();
		
		if (typ == '->' || typ == '=>') {
			this._tree = new TagFragmentTree(this,o.body,{root: this,reactive: true});
			this._fragment = o.body = new TagFragmentFunc([],Block.wrap([this._tree]),null,null,{closed: typ == '->'});
		};
		
		if (o.key) { o.key.traverse() };
		if (o.body) { o.body.traverse() };
		if (o.id) { o.id.traverse() };
		
		for (var i = 0, ary = Imba.iterable(this._parts), len = ary.length; i < len; i++) {
			ary[i].traverse();
		};
		
		// remember scope
		this._tagScope = this.scope__();
		// if typ == '->' or typ == '=>'
		// 	@tagScope = o:body.scope
		
		return this;
	};

	Tag.prototype.reference = function (){
		return this._reference || (this._reference = this._tagScope.closure().temporary(this,{pool: 'tag'}).resolve());
	};

	Tag.prototype.closureCache = function (){
		return this._closureCache || (this._closureCache = this._tagScope.tagContextCache());
	};


	Tag.prototype.staticCache = function (){
		if (this._fragment) {
			return this._staticCache || (this._staticCache = this._fragment.scope().declare("__",OP('.',new This(),'__'))); // .tagContextCache
		} else if (this.type() instanceof Self) {
			return this._staticCache || (this._staticCache = this._tagScope.tagContextCache());
		} else if (this.explicitKey() || this.option('loop')) {
			return this._staticCache || (this._staticCache = OP('.',this.reference(),'__'));
		} else if (this._parent) {
			return this._staticCache || (this._staticCache = this._parent.staticCache());
		};
	};

	Tag.prototype.explicitKey = function (){
		return this.option('ivar') || this.option('key');
	};

	Tag.prototype.js = function (jso){
		var body, loop_;
		var o = this._options;
		var a = {};
		var enc = this.enclosing();
		
		var setup = [];
		var calls = [];
		var statics = [];
		
		var scope = this.scope__();
		var commit = "end";
		var content = o.body;
		
		var isSelf = (this.type() instanceof Self);
		var bodySetter = (isSelf) ? ("setChildren") : ("setContent");
		
		// if we are reactive - find the
		
		// should not cache statics if the node itself is not cached
		// that would only mangle the order in which we set the properties
		var cacheStatics = true;
		
		for (var i = 0, ary = Imba.iterable(o.attributes), len = ary.length, atr; i < len; i++) {
			atr = ary[i];
			a[atr.key()] = atr.value();
		};
		
		var quote = function(str) { return helpers.singlequote(str); };
		var id = (o.id instanceof Node) ? (o.id.c()) : ((o.id && quote(o.id.c())));
		var tree = this._tree || null;
		var parent = this.parent();
		var c_zone = scope.context().c();
		
		var out = (isSelf) ? (
			commit = "synced",
			this.setReactive(true),
			this._reference = scope.context(),
			scope.context().c()
		) : ((this.type().isClass()) ? (
			("" + mark__(o.open) + (this.type().name()) + ".build(" + c_zone + ")")
		) : (
			("" + mark__(o.open) + (scope.tagContextPath()) + "." + (this.type().spawner()) + "(" + c_zone + ")")
		));
		
		if (o.id) {
			statics.push((".setId(" + quote(o.id) + ")"));
		};
		
		// this is reactive if it has an ivar
		if (o.ivar) {
			this.setReactive(true);
			statics.push((".ref_(" + quote(o.ivar.name()) + "," + c_zone + ")"));
		};
		
		if (o.body instanceof Func) {
			bodySetter = "setTemplate";
		} else if (o.body) {
			if ((o.body instanceof ArgList) && o.body.count() == 1 && o.body.first().isString()) {
				bodySetter = "setText";
			} else {
				// would probably be better to convert to a tagtree during the initial visit
				tree = new TagTree(this,o.body,{root: this,reactive: this.reactive()});
				content = tree;
				this.setTree(tree);
			};
		};
		
		if (tree) {
			// this is the point where we traverse the inner nodes with our tree
			// should rather happen in visit - long before.
			tree.resolve();
		};
		
		var dynamicFlagIndex = (isSelf) ? (1) : (0);
		
		for (var j = 0, items = Imba.iterable(this._parts), len_ = items.length, part; j < len_; j++) {
			part = items[j];
			var pjs;
			var pcache = false;
			
			if (part instanceof TagAttr) {
				var akey = String(part.key());
				var aval = part.value();
				
				pcache = aval.isPrimitive();
				
				
				if (akey[0] == '.') {
					pcache = false;
					pjs = (".flag(" + quote(akey.substr(1)) + "," + (aval.c()) + ")");
				} else if (akey[0] == ':') {
					pjs = (".setHandler(" + quote(akey.substr(1)) + "," + (aval.c()) + "," + (scope.context().c()) + ")");
				} else if (akey.substr(0,5) == 'data-') {
					pjs = (".dataset('" + akey.slice(5) + "'," + (aval.c()) + ")");
				} else if (part.isNamespaced()) {
					var ns = akey.split(":")[0];
					var k = akey.split(":")[1];
					
					if (ns == 'css') {
						pjs = ("." + mark__(part.key()) + "css('" + k + "'," + (aval.c()) + ")");
					} else {
						pjs = ("." + mark__(part.key()) + "setNestedAttr('" + ns + "','" + k + "'," + (aval.c()) + ")");
					};
				} else {
					pjs = ("." + mark__(part.key()) + helpers.setterSym(akey) + "(" + (aval.c()) + ")");
				};
				
				if (aval instanceof Parens) {
					aval = aval.value();
				};
				
				// if the value is a function which does not refer to any outer
				// variables (besides self), we can make it static, so as to not
				// recreate the function on every render
				if ((aval instanceof Func) && !aval.nonlocals()) {
					pcache = true;
				};
			} else if (part instanceof TagFlag) {
				if (part.value() instanceof Node) {
					if (this.reactive()) {
						var idx = dynamicFlagIndex;
						pjs = (".setFlag(" + idx + "," + (part.value().c()) + ")");
						dynamicFlagIndex = idx + 2;
					} else {
						pjs = part.c();
					};
				} else {
					pjs = part.c();
					pcache = true;
				};
			};
			
			if (pjs) {
				(cacheStatics && pcache) ? (statics.push(pjs)) : (calls.push(pjs));
			};
		};
		
		if (this.object()) {
			calls.push((".setData(" + (this.object().c()) + ")"));
		};
		
		// we need to trigger our own reference before the body does
		// but we do not need a reference if we have no body
		if (this.reactive() && tree && (this.explicitKey() || o.loop)) {
			this.reference();
			// self
		};
		
		if (this.reactive() && parent && parent.tree() && !this.option('ivar')) {
			// not if it has a separate tag?
			o.treeRef = parent.tree().nextCacheKey(this);
			if (parent.option('treeRef') && !parent.explicitKey() && !parent.option('loop') && !(parent.tree() instanceof TagFragmentTree)) {
				o.treeRef = parent.option('treeRef') + o.treeRef;
			};
		};
		
		if (body = content && content.c({expression: true})) {
			var typ = 0;
			
			if (tree) {
				if (tree.static()) {
					typ = 2;
				} else if (this.reactive() || tree.reactive()) {
					if (!tree.single() || (tree.single() instanceof If)) {
						typ = 1;
					} else {
						typ = 3;
					};
				};
			};
			
			
			if (bodySetter == 'setChildren' || bodySetter == 'setContent') {
				calls.push(("." + bodySetter + "(" + body + "," + typ + ")"));
			} else if (bodySetter == 'setText') {
				statics.push(("." + bodySetter + "(" + body + ")"));
			} else {
				calls.push(("." + bodySetter + "(" + body + ")"));
			};
		};
		
		
		calls.push(("." + commit + "()"));
		
		var lineLen = out.length;
		
		if (statics.length) {
			// for item in statics
			// 	if lineLen > 40
			// 		out += "\n\t\t\t"
			// 		lineLen = 0
			// 	out += item
			// 	lineLen += item:length
			
			out = out + statics.join("");
		};
		
		if ((o.ivar || o.key || this.reactive()) && !(this.type() instanceof Self)) {
			// if this is an ivar, we should set the reference relative
			// to the outer reference, or possibly right on context?
			var partree = parent && parent.tree();
			var acc;
			
			var nr = STACK.incr('tagCacheKey');
			var key = o.treeRef || counterToShortRef(nr) + '__';
			var ctx;
			
			if (o.ivar) {
				ctx = scope.context();
				key = o.ivar;
			} else if (o.key && !o.treeRef) {
				// p "has dynamic key but not inside any node",o:key.c
				var method = STACK.method();
				var paths = OP('.',OP('.',new Self(),'__'),'_' + method.name());
				var setter = OP('=',paths,OP('||',paths,LIT('{}')));
				ctx = scope.closure().declare('__',new Parens(setter));
				key = o.key;
			} else if (o.key && !o.loop) {
				key = OP('+',("'" + key + "$$'"),o.key);
				key.cache();
				ctx = (parent) ? (parent.staticCache()) : (this.closureCache());
			} else if (o.loop || o.key) {
				if (parent) {
					ctx = parent.staticCache();
				} else {
					ctx = this.closureCache();
				};
				
				// ctx = parent and parent.reference
				var s = scope.closure();
				var path = OP('.',ctx,key);
				var kvar = ("$" + key);
				var cacheDefault = LIT('{}');
				
				if (o.key) {
					key = o.key;
				} else {
					kvar = '_$';
					if (o.loop) {
						(loop_ = o.loop)._tagCount || (loop_._tagCount = 0);
						
						if (o.loop._tagCount > 0) {
							kvar += o.loop._tagCount;
						};
						o.loop._tagCount++;
					};
					
					var idx1 = o.loop.option('vars').index;
					cacheDefault = LIT('[]');
					key = idx1;
				};
				
				var setter1 = OP('=',path,OP('||',path,cacheDefault));
				// dont redeclare?
				ctx = s.declare(kvar,new Parens(setter1));
			} else {
				// or the tree-cache no?
				ctx = (parent) ? (parent.staticCache()) : (this.closureCache());
			};
			
			// unless ctx
			// 	if parent
			// 		var tree = parent.tree
			// 		console.log 'no context!',tree
			// 		ctx = parent.tree.staticCache
			
			// need the context -- might be better to rewrite it for real?
			// parse the whole thing into calls etc
			acc || (acc = OP('.',ctx,key)); // .c
			
			if (o.ivar) {
				out = ("" + (acc.c()) + " || " + out);
			} else {
				out = ("" + (acc.c()) + " = " + (acc.c()) + " || " + out);
			};
			
			if (this._reference) {
				out = ("" + (this.reference().c()) + " = " + out);
			};
			
			out = ("(" + out + ")");
			
			//
			// 	out = "({reference.c} = {acc.c}={acc.c} || {out})"
			// else
			// 	out = "({acc.c} = {acc.c} || {out})"
		};
		
		return out + calls.join("");
	};

	// This is a helper-node
	// Should probably use the same type of listnode everywhere
	// and simply flag the type as TagTree instead
	function TagTree(owner,list,options){
		if(options === undefined) options = {};
		this._owner = owner;
		this._nodes = this.load(list);
		this._options = options;
		this._conditions = [];
		this._blocks = [this];
		this._counter = 0;
		this;
	};

	Imba.subclass(TagTree,ListNode);
	exports.TagTree = TagTree; // export class 
	TagTree.prototype.counter = function(v){ return this._counter; }
	TagTree.prototype.setCounter = function(v){ this._counter = v; return this; };
	TagTree.prototype.conditions = function(v){ return this._conditions; }
	TagTree.prototype.setConditions = function(v){ this._conditions = v; return this; };
	TagTree.prototype.blocks = function(v){ return this._blocks; }
	TagTree.prototype.setBlocks = function(v){ this._blocks = v; return this; };
	TagTree.prototype.cacher = function(v){ return this._cacher; }
	TagTree.prototype.setCacher = function(v){ this._cacher = v; return this; };

	TagTree.prototype.parent = function (){
		return this._parent || (this._parent = this._owner.parent());
	};

	TagTree.prototype.staticCache = function (){
		return this._owner.staticCache();
	};

	TagTree.prototype.nextCacheKey = function (){
		var num = this._counter++;
		var ref = counterToShortRef(num);
		
		if (ref.length > 1) {
			ref = ref + ref.length;
		};
		
		// if @owner.explicitKey or @owner.option(:loop)
		ref = this.cachePrefix() + ref;
		// ref = ref.toLowerCase unless @owner.type isa Self
		return ref;
	};

	TagTree.prototype.cachePrefix = function (){
		if (this._owner.explicitKey() || this._owner.option('loop')) {
			return '$';
		} else {
			return '';
		};
	};

	TagTree.prototype.load = function (list){
		if (list instanceof ListNode) {
			// we still want the indentation if we are not in a template
			// or, rather - we want the block to get the indentation - not the tree
			this._indentation || (this._indentation = list._indentation); // if list.count > 1
			return list.nodes();
		} else {
			return compact__((list instanceof Array) ? (list) : ([list]));
		};
	};

	TagTree.prototype.root = function (){
		return this.option('root');
	};

	TagTree.prototype.reactive = function (){
		return this.option('reactive');
	};

	TagTree.prototype.resolve = function (){
		var self = this;
		self.remap(function(c) { return c.consume(self); });
		return self;
	};

	TagTree.prototype.static = function (){
		// every real node
		return (this._static == null) ? (this._static = this.every(function(c) { return (c instanceof Tag) || (c instanceof Str) || (c instanceof Meta); })) : (this._static);
	};

	TagTree.prototype.single = function (){
		return (this._single == null) ? (this._single = ((this.realCount() == 1) ? (this.last()) : (false))) : (this._single);
	};

	TagTree.prototype.hasTags = function (){
		return this.some(function(c) { return c instanceof Tag; });
	};

	TagTree.prototype.c = function (o){
		// FIXME TEST what about comments???
		var single = this.single();
		
		// no indentation if this should return
		if (single && (STACK.current() instanceof Return)) {
			this._indentation = null;
		};
		
		var out = TagTree.__super__.c.call(this,o);
		
		if (!single || (single instanceof If)) {
			if (this.shouldMarkArray()) {
				return ("Imba.static([" + out + "],1)");
			} else {
				return ("[" + out + "]");
			};
		} else {
			return out;
		};
	};

	TagTree.prototype.shouldMarkArray = function (){
		return false;
	};

	function TagFragmentTree(){ return TagTree.apply(this,arguments) };

	Imba.subclass(TagFragmentTree,TagTree);
	exports.TagFragmentTree = TagFragmentTree; // export class 
	TagFragmentTree.prototype.cachePrefix = function (){
		return '$';
	};

	TagFragmentTree.prototype.visit = function (){
		TagFragmentTree.__super__.visit.apply(this,arguments);
		this._closure = this.scope__();
		return this;
	};

	TagFragmentTree.prototype.staticCache = function (){
		return this._owner.staticCache();
	};

	TagFragmentTree.prototype.shouldMarkArray = function (){
		return true;
	};

	function TagWrapper(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(TagWrapper,ValueNode);
	exports.TagWrapper = TagWrapper; // export class 
	TagWrapper.prototype.visit = function (){
		if (this.value() instanceof Array) {
			this.value().map(function(v) { return v.traverse(); });
		} else {
			this.value().traverse();
		};
		return this;
	};

	TagWrapper.prototype.c = function (){
		return ("tag$wrap(" + this.value().c({expression: true}) + ")");
	};


	function TagAttributes(){ return ListNode.apply(this,arguments) };

	Imba.subclass(TagAttributes,ListNode);
	exports.TagAttributes = TagAttributes; // export class 
	TagAttributes.prototype.get = function (name){
		for (var i = 0, ary = Imba.iterable(this.nodes()), len = ary.length, node, res = []; i < len; i++) {
			node = ary[i];
			if (node.key() == name) { return node };
		};
		return res;
	};


	function TagAttr(k,v){
		this._traversed = false;
		this._key = k;
		this._value = v;
	};

	Imba.subclass(TagAttr,Node);
	exports.TagAttr = TagAttr; // export class 
	TagAttr.prototype.key = function(v){ return this._key; }
	TagAttr.prototype.setKey = function(v){ this._key = v; return this; };
	TagAttr.prototype.value = function(v){ return this._value; }
	TagAttr.prototype.setValue = function(v){ this._value = v; return this; };

	TagAttr.prototype.visit = function (){
		if (this.value()) { this.value().traverse() };
		return this;
	};

	TagAttr.prototype.populate = function (obj){
		obj.add(this.key(),this.value());
		return this;
	};

	TagAttr.prototype.isNamespaced = function (){
		return String(this.key()).indexOf(':') > 0;
	};

	TagAttr.prototype.c = function (){
		return "attribute";
	};


	function TagFlag(value){
		this._traversed = false;
		this._value = value;
		this;
	};

	Imba.subclass(TagFlag,Node);
	exports.TagFlag = TagFlag; // export class 
	TagFlag.prototype.value = function(v){ return this._value; }
	TagFlag.prototype.setValue = function(v){ this._value = v; return this; };
	TagFlag.prototype.toggler = function(v){ return this._toggler; }
	TagFlag.prototype.setToggler = function(v){ this._toggler = v; return this; };

	TagFlag.prototype.visit = function (){
		if (!((typeof this._value=='string'||this._value instanceof String))) {
			this._value.traverse();
		};
		return this;
	};

	TagFlag.prototype.c = function (){
		if (this.value() instanceof Node) {
			return (".flag(" + (this.value().c()) + ")");
		} else {
			return (".flag(" + helpers.singlequote(this.value()) + ")");
		};
	};



	// SELECTORS


	function Selector(list,options){
		this._nodes = list || [];
		this._options = options;
	};

	Imba.subclass(Selector,ListNode);
	exports.Selector = Selector; // export class 
	Selector.prototype.add = function (part,typ){
		this.push(part);
		return this;
	};

	Selector.prototype.group = function (){
		// for now we simply add a comma
		// how would this work for dst?
		this._nodes.push(new SelectorGroup(","));
		return this;
	};

	Selector.prototype.query = function (){
		var str = "";
		var ary = [];
		
		for (var i = 0, items = Imba.iterable(this.nodes()), len = items.length; i < len; i++) {
			var val = items[i].c();
			if ((typeof val=='string'||val instanceof String)) {
				str = ("" + str + val);
			};
		};
		
		return ("'" + str + "'");
	};


	Selector.prototype.js = function (o){
		var typ = this.option('type');
		var q = c__(this.query());
		
		if (typ == '%') {
			return ("q$(" + q + "," + o.scope().context().c({explicit: true}) + ")"); // explicit context
		} else if (typ == '%%') {
			return ("q$$(" + q + "," + o.scope().context().c({explicit: true}) + ")");
		} else {
			return ("q" + typ + "(" + q + ")");
		};
		
		// return "{typ} {scoped} - {all}"
	};


	function SelectorPart(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(SelectorPart,ValueNode);
	exports.SelectorPart = SelectorPart; // export class 
	SelectorPart.prototype.c = function (){
		return c__(this._value);
	};

	function SelectorGroup(){ return SelectorPart.apply(this,arguments) };

	Imba.subclass(SelectorGroup,SelectorPart);
	exports.SelectorGroup = SelectorGroup; // export class 
	SelectorGroup.prototype.c = function (){
		return ",";
	};

	function SelectorType(){ return SelectorPart.apply(this,arguments) };

	Imba.subclass(SelectorType,SelectorPart);
	exports.SelectorType = SelectorType; // export class 
	SelectorType.prototype.c = function (){
		var name = this.value().name();
		
		// at least be very conservative about which tags we
		// can drop the tag for?
		// out in TAG_TYPES.HTML ?
		return (Imba.indexOf(name,TAG_TYPES.HTML) >= 0) ? (name) : (this.value().sel());
	};


	function SelectorUniversal(){ return SelectorPart.apply(this,arguments) };

	Imba.subclass(SelectorUniversal,SelectorPart);
	exports.SelectorUniversal = SelectorUniversal; // export class 


	function SelectorNamespace(){ return SelectorPart.apply(this,arguments) };

	Imba.subclass(SelectorNamespace,SelectorPart);
	exports.SelectorNamespace = SelectorNamespace; // export class 


	function SelectorClass(){ return SelectorPart.apply(this,arguments) };

	Imba.subclass(SelectorClass,SelectorPart);
	exports.SelectorClass = SelectorClass; // export class 
	SelectorClass.prototype.c = function (){
		if (this._value instanceof Node) {
			return (".'+" + (this._value.c()) + "+'");
		} else {
			return ("." + c__(this._value));
		};
	};

	function SelectorId(){ return SelectorPart.apply(this,arguments) };

	Imba.subclass(SelectorId,SelectorPart);
	exports.SelectorId = SelectorId; // export class 
	SelectorId.prototype.c = function (){
		if (this._value instanceof Node) {
			return ("#'+" + (this._value.c()) + "+'");
		} else {
			return ("#" + c__(this._value));
		};
	};

	function SelectorCombinator(){ return SelectorPart.apply(this,arguments) };

	Imba.subclass(SelectorCombinator,SelectorPart);
	exports.SelectorCombinator = SelectorCombinator; // export class 
	SelectorCombinator.prototype.c = function (){
		return ("" + c__(this._value));
	};

	function SelectorPseudoClass(){ return SelectorPart.apply(this,arguments) };

	Imba.subclass(SelectorPseudoClass,SelectorPart);
	exports.SelectorPseudoClass = SelectorPseudoClass; // export class 


	function SelectorAttribute(left,op,right){
		this._left = left;
		this._op = op;
		this._right = this._value = right;
	};

	Imba.subclass(SelectorAttribute,SelectorPart);
	exports.SelectorAttribute = SelectorAttribute; // export class 
	SelectorAttribute.prototype.c = function (){
		// TODO possibly support .toSel or sel$(v) for items inside query
		// could easily do it with a helper-function that is added to the top of the filescope
		if (this._right instanceof Str) {
			return ("[" + (this._left.c()) + (this._op) + (this._right.c()) + "]");
		} else if (this._right) {
			// this is not at all good
			return ("[" + (this._left.c()) + (this._op) + "\"'+" + c__(this._right) + "+'\"]");
		} else {
			return ("[" + (this._left.c()) + "]");
			
			// ...
		};
	};




	// DEFER

	function Await(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(Await,ValueNode);
	exports.Await = Await; // export class 
	Await.prototype.func = function(v){ return this._func; }
	Await.prototype.setFunc = function(v){ this._func = v; return this; };

	Await.prototype.js = function (o){
		// introduce a util here, no?
		return CALL(OP('.',new Util.Promisify([this.value()]),'then'),[this.func()]).c();
		// value.c
	};

	Await.prototype.visit = function (o){
		// things are now traversed in a somewhat chaotic order. Need to tighten
		// Create await function - push this value up to block, take the outer
		var self = this;
		self.value().traverse();
		
		var block = o.up(Block); // or up to the closest FUNCTION?
		var outer = o.relative(block,1);
		var par = o.relative(self,-1);
		
		self.setFunc(new AsyncFunc([],[]));
		// now we move this node up to the block
		self.func().body().setNodes(block.defers(outer,self));
		
		// if the outer is a var-assignment, we can simply set the params
		if (par instanceof Assign) {
			par.left().traverse();
			var lft = par.left().node();
			// Can be a tuple as well, no?
			if (lft instanceof VarReference) {
				// the param is already registered?
				// should not force the name already??
				// beware of bugs
				self.func().params().at(0,true,lft.variable().name());
			} else if (lft instanceof Tuple) {
				// if this an unfancy tuple, with only vars
				// we can just use arguments
				
				if (par.type() == 'var' && !lft.hasSplat()) {
					lft.map(function(el,i) {
						return self.func().params().at(i,true,el.value());
					});
				} else {
					// otherwise, do the whole tuple
					// make sure it is a var assignment?
					par.setRight(ARGUMENTS);
					self.func().body().unshift(par);
				};
			} else {
				// regular setters
				par.setRight(self.func().params().at(0,true));
				self.func().body().unshift(par);
			};
		};
		
		
		
		// If it is an advance tuple or something, it should be possible to
		// feed in the paramlist, and let the tuple handle it as if it was any
		// other value
		
		// CASE If this is a tuple / multiset with more than one async value
		// we need to think differently.
		
		// now we need to visit the function as well
		self.func().traverse();
		// pull the outer in
		return self;
	};

	function AsyncFunc(params,body,name,target,options){
		AsyncFunc.__super__.constructor.call(this,params,body,name,target,options);
	};

	Imba.subclass(AsyncFunc,Func);
	exports.AsyncFunc = AsyncFunc; // export class 
	AsyncFunc.prototype.scopetype = function (){
		return LambdaScope;
	};


	// IMPORTS

	function ImportStatement(imports,source,ns){
		this._traversed = false;
		this._imports = imports;
		this._source = source;
		this._ns = ns;
		this;
	};

	Imba.subclass(ImportStatement,Statement);
	exports.ImportStatement = ImportStatement; // export class 
	ImportStatement.prototype.ns = function(v){ return this._ns; }
	ImportStatement.prototype.setNs = function(v){ this._ns = v; return this; };
	ImportStatement.prototype.imports = function(v){ return this._imports; }
	ImportStatement.prototype.setImports = function(v){ this._imports = v; return this; };
	ImportStatement.prototype.source = function(v){ return this._source; }
	ImportStatement.prototype.setSource = function(v){ this._source = v; return this; };


	ImportStatement.prototype.visit = function (){
		if (this._ns) {
			this._nsvar || (this._nsvar = this.scope__().register(this._ns,this));
		} else {
			var src = this.source().c();
			var m = src.match(/(\w+)(\.js|imba)?[\"\']$/);
			this._alias = (m) ? (m[1] + '$') : ('mod$');
		};
		
		// should also register the imported items, no?
		if (this._imports) {
			var dec = this._declarations = new VariableDeclaration([]);
			
			if (this._imports.length == 1) {
				this._alias = this._imports[0];
				dec.add(this._alias,OP('.',new Require(this.source()),this._alias));
				dec.traverse();
				return this;
			};
			
			// @declarations = VariableDeclaration.new([])
			this._moduledecl = dec.add(this._alias,new Require(this.source()));
			this._moduledecl.traverse();
			
			
			if (this._imports.length > 1) {
				for (var i = 0, ary = Imba.iterable(this._imports), len = ary.length, imp; i < len; i++) {
					imp = ary[i];
					this._declarations.add(imp,OP('.',this._moduledecl.variable(),imp));
				};
			};
			
			dec.traverse();
		};
		return this;
	};


	ImportStatement.prototype.js = function (o){
		
		var fname;
		if (this._declarations) {
			return this._declarations.c();
		};
		
		var req = new Require(this.source());
		
		if (this._ns) {
			// must register ns as a real variable
			return ("var " + (this._nsvar.c()) + " = " + (req.c()));
		};
		
		if (this._imports) {
			
			var src = this.source().c();
			var alias = [];
			var vars = new VarBlock([]);
			
			if (fname = src.match(/(\w+)(\.js|imba)?[\"\']$/)) {
				alias.push(fname[1]);
			};
			
			// var alias = src.match(/(\w+)(\.js|imba)?[\"\']$/)
			// create a require for the source, with a temporary name?
			var out = [req.cache({names: alias}).c()];
			
			for (var i = 0, ary = Imba.iterable(this._imports), len = ary.length, imp; i < len; i++) {
				// we also need to register these imports as variables, no?
				imp = ary[i];
				var o = OP('=',imp,OP('.',req,imp));
				out.push(("var " + (o.c())));
			};
			
			return out;
		} else {
			return req.c();
		};
	};

	ImportStatement.prototype.consume = function (node){
		return this;
	};


	// EXPORT

	function ExportStatement(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(ExportStatement,ValueNode);
	exports.ExportStatement = ExportStatement; // export class 
	ExportStatement.prototype.js = function (o){
		var nodes = this._value.map(function(arg) { return ("module.exports." + (arg.c()) + " = " + (arg.c())); });
		
		if (nodes.length > 1 && (this.up() instanceof Return)) {
			return '[' + nodes.join(',') + ']';
		} else {
			return nodes.join(';\n') + ';';
		};
	};

	function Export(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(Export,ValueNode);
	exports.Export = Export; // export class 
	Export.prototype.addExpression = function (expr){
		this.setValue(this.value().addExpression(expr));
		return this;
	};

	Export.prototype.consume = function (node){
		if (node instanceof Return) {
			this.option('return',true);
			return this;
		};
		return Export.__super__.consume.apply(this,arguments);
	};

	Export.prototype.js = function (o){
		// p "Export {value}"
		var self = this;
		self.value().set({export: self,return: self.option('return'),'default': self.option('default')});
		
		if (self.value() instanceof VarOrAccess) {
			return ("exports." + (self.value().c()) + " = " + (self.value().c()) + ";");
		};
		
		if (self.value() instanceof ListNode) {
			self.value().map(function(item) { return item.set({export: self}); });
		};
		
		return self.value().c();
	};

	function Require(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(Require,ValueNode);
	exports.Require = Require; // export class 
	Require.prototype.js = function (o){
		var out = (this.value() instanceof Parens) ? (this.value().value().c()) : (this.value().c());
		return (out == 'require') ? ('require') : (("require(" + out + ")"));
	};

	function EnvFlag(){ return ValueNode.apply(this,arguments) };

	Imba.subclass(EnvFlag,ValueNode);
	exports.EnvFlag = EnvFlag; // export class 
	EnvFlag.prototype.raw = function (){
		return (this._raw == null) ? (this._raw = STACK.env("" + this._value)) : (this._raw);
	};

	EnvFlag.prototype.isTruthy = function (){
		var val = this.raw();
		if (val !== undefined) { return !!val };
		return undefined;
	};

	EnvFlag.prototype.loc = function (){
		return [0,0];
	};

	EnvFlag.prototype.c = function (){
		var val = this.raw();
		if (val !== undefined) {
			if ((typeof val=='string'||val instanceof String)) {
				if (val.match(/^\d+(\.\d+)?$/)) {
					return parseFloat(val);
				} else {
					return ("'" + val + "'");
				};
			} else {
				return ("" + val);
			};
		} else {
			return ("ENV_" + (this._value));
		};
	};


	// UTILS

	function Util(args){
		this._args = args;
	};

	// this is how we deal with it now
	Imba.subclass(Util,Node);
	exports.Util = Util; // export class 
	Util.prototype.args = function(v){ return this._args; }
	Util.prototype.setArgs = function(v){ this._args = v; return this; };

	Util.extend = function (a,b){
		return new Util.Extend([a,b]);
	};

	Util.callImba = function (meth,args){
		return CALL(OP('.',new Const("Imba"),new Identifier(meth)),args);
	};

	Util.repeat = function (str,times){
		var res = '';
		while (times > 0){
			if (times % 2 == 1) {
				res += str;
			};
			str += str;
			times >>= 1;
		};
		return res;
	};



	Util.keys = function (obj){
		var l = new Const("Object");
		var r = new Identifier("keys");
		return CALL(OP('.',l,r),[obj]);
	};

	Util.len = function (obj,cache){
		var r = new Identifier("length");
		var node = OP('.',obj,r);
		if (cache) { node.cache({force: true,pool: 'len'}) };
		return node;
	};

	Util.indexOf = function (lft,rgt){
		var node = new Util.IndexOf([lft,rgt]);
		// node.cache(force: yes, type: 'iter') if cache
		return node;
	};

	Util.slice = function (obj,a,b){
		var slice = new Identifier("slice");
		console.log(("slice " + a + " " + b));
		return CALL(OP('.',obj,slice),compact__([a,b]));
	};

	Util.iterable = function (obj,cache){
		var node = new Util.Iterable([obj]);
		if (cache) { node.cache({force: true,pool: 'iter'}) };
		return node;
	};



	Util.union = function (a,b){
		return new Util.Union([a,b]);
	};

	Util.intersect = function (a,b){
		return new Util.Intersect([a,b]);
	};

	Util.counter = function (start,cache){
		// should it not rather be a variable?!?
		var node = new Num(start); // make sure it really is a number
		if (cache) { node.cache({force: true,pool: 'counter'}) };
		return node;
	};

	Util.array = function (size,cache){
		var node = new Util.Array([size]);
		if (cache) { node.cache({force: true,pool: 'list'}) };
		return node;
	};

	Util.defineTag = function (type,ctor,supr){
		return CALL(TAGDEF,[type,ctor,supr]);
	};


	Util.defineClass = function (name,supr,initor){
		return CALL(CLASSDEF,[name || initor,this.sup()]);
	};

	Util.prototype.isStandalone = function (){
		return OPTS.standalone !== false;
	};

	Util.prototype.js = function (o){
		return "helper";
	};

	// TODO Deprecate and remove
	Util.Union = function Union(){ return Util.apply(this,arguments) };

	Imba.subclass(Util.Union,Util);
	Util.Union.prototype.helper = function (){
		return 'function union$(a,b){\n	if(a && a.__union) return a.__union(b);\n\n	var u = a.slice(0);\n	for(var i=0,l=b.length;i<l;i++) if(u.indexOf(b[i]) == -1) u.push(b[i]);\n	return u;\n};\n';
	};

	Util.Union.prototype.js = function (o){
		this.scope__().root().helper(this,this.helper());
		// When this is triggered, we need to add it to the top of file?
		return ("union$(" + this.args().map(function(v) { return v.c(); }).join(',') + ")");
	};

	// TODO Deprecate and remove
	Util.Intersect = function Intersect(){ return Util.apply(this,arguments) };

	Imba.subclass(Util.Intersect,Util);
	Util.Intersect.prototype.helper = function (){
		return 'function intersect$(a,b){\n	if(a && a.__intersect) return a.__intersect(b);\n	var res = [];\n	for(var i=0, l=a.length; i<l; i++) {\n		var v = a[i];\n		if(b.indexOf(v) != -1) res.push(v);\n	}\n	return res;\n};\n';
	};

	Util.Intersect.prototype.js = function (o){
		// When this is triggered, we need to add it to the top of file?
		this.scope__().root().helper(this,this.helper());
		return ("intersect$(" + this.args().map(function(v) { return v.c(); }).join(',') + ")");
	};

	Util.Extend = function Extend(){ return Util.apply(this,arguments) };

	Imba.subclass(Util.Extend,Util);
	Util.Extend.prototype.js = function (o){
		// When this is triggered, we need to add it to the top of file?
		return ("extend$(" + compact__(cary__(this.args())).join(',') + ")");
	};

	Util.IndexOf = function IndexOf(){ return Util.apply(this,arguments) };

	Imba.subclass(Util.IndexOf,Util);
	Util.IndexOf.prototype.helper = function (){
		return 'function idx$(a,b){\n	return (b && b.indexOf) ? b.indexOf(a) : [].indexOf.call(a,b);\n};\n';
	};

	Util.IndexOf.prototype.js = function (o){
		if (this.isStandalone()) {
			this.scope__().root().helper(this,this.helper());
			// When this is triggered, we need to add it to the top of file?
			return ("idx$(" + this.args().map(function(v) { return v.c(); }).join(',') + ")");
		} else {
			return ("Imba.indexOf(" + this.args().map(function(v) { return v.c(); }).join(',') + ")");
		};
	};

	Util.Len = function Len(){ return Util.apply(this,arguments) };

	Imba.subclass(Util.Len,Util);
	Util.Len.prototype.helper = function (){
		return 'function len$(a){\n	return a && (a.len instanceof Function ? a.len() : a.length) || 0;\n};\n';
	};

	Util.Len.prototype.js = function (o){
		if (this.isStandalone()) {
			this.scope__().root().helper(this,this.helper());
			// When this is triggered, we need to add it to the top of file?
			return ("len$(" + this.args().map(function(v) { return v.c(); }).join(',') + ")");
		} else {
			return ("Imba.len(" + this.args().map(function(v) { return v.c(); }).join(',') + ")");
		};
	};


	Util.Subclass = function Subclass(){ return Util.apply(this,arguments) };

	Imba.subclass(Util.Subclass,Util);
	Util.Subclass.prototype.helper = function (){
		// should also check if it is a real promise
		return '// helper for subclassing\nfunction subclass$(obj,sup) {\n	for (var k in sup) {\n		if (sup.hasOwnProperty(k)) obj[k] = sup[k];\n	};\n	// obj.__super__ = sup;\n	obj.prototype = Object.create(sup.prototype);\n	obj.__super__ = obj.prototype.__super__ = sup.prototype;\n	obj.prototype.initialize = obj.prototype.constructor = obj;\n};\n';
	};

	Util.Subclass.prototype.js = function (o){
		if (this.isStandalone()) {
			// When this is triggered, we need to add it to the top of file?
			this.scope__().root().helper(this,this.helper());
			return ("subclass$(" + this.args().map(function(v) { return v.c(); }).join(',') + ");\n");
		} else {
			return ("Imba.subclass(" + this.args().map(function(v) { return v.c(); }).join(',') + ");\n");
		};
	};

	Util.Promisify = function Promisify(){ return Util.apply(this,arguments) };

	Imba.subclass(Util.Promisify,Util);
	Util.Promisify.prototype.helper = function (){
		// should also check if it is a real promise
		return ("function promise$(a)\{ return a instanceof Array ? Promise.all(a) : (a && a.then ? a : Promise.resolve(a)); \}");
	};

	Util.Promisify.prototype.js = function (o){
		if (this.isStandalone()) {
			// When this is triggered, we need to add it to the top of file?
			this.scope__().root().helper(this,this.helper());
			return ("promise$(" + this.args().map(function(v) { return v.c(); }).join(',') + ")");
		} else {
			return ("Imba.await(" + this.args().map(function(v) { return v.c(); }).join(',') + ")");
		};
	};

	// TODO deprecated: can remove
	Util.Class = function Class(){ return Util.apply(this,arguments) };

	Imba.subclass(Util.Class,Util);
	Util.Class.prototype.js = function (o){
		// When this is triggered, we need to add it to the top of file?
		return ("class$(" + this.args().map(function(v) { return v.c(); }).join(',') + ")");
	};

	Util.Iterable = function Iterable(){ return Util.apply(this,arguments) };

	Imba.subclass(Util.Iterable,Util);
	Util.Iterable.prototype.helper = function (){
		// now we want to allow null values as well - just return as empty collection
		// should be the same for for own of I guess
		return ("function iter$(a)\{ return a ? (a.toArray ? a.toArray() : a) : []; \};");
	};

	Util.Iterable.prototype.js = function (o){
		if (this.args()[0] instanceof Arr) { return this.args()[0].c() }; // or if we know for sure that it is an array
		
		if (this.isStandalone()) {
			this.scope__().root().helper(this,this.helper());
			return ("iter$(" + (this.args()[0].c()) + ")");
		} else {
			return ("Imba.iterable(" + (this.args()[0].c()) + ")");
		};
	};

	Util.IsFunction = function IsFunction(){ return Util.apply(this,arguments) };

	Imba.subclass(Util.IsFunction,Util);
	Util.IsFunction.prototype.js = function (o){
		return ("" + (this.args()[0].c()));
	};

	Util.Array = function Array(){ return Util.apply(this,arguments) };

	Imba.subclass(Util.Array,Util);
	Util.Array.prototype.js = function (o){
		// When this is triggered, we need to add it to the top of file?
		return ("new Array(" + this.args().map(function(v) { return v.c(); }) + ")");
	};




	function Entities(root){
		this._root = root;
		this._map = {};
		return this;
	};

	Entities.prototype.add = function (path,object){
		this._map[path] = object;
		return this;
	};

	Entities.prototype.register = function (entity){
		var $1;
		var path = entity.namepath();
		this._map[($1 = path)] || (this._map[$1] = entity);
		return this;
	};

	Entities.prototype.plain = function (){
		return JSON.parse(JSON.stringify(this._map));
	};

	Entities.prototype.toJSON = function (){
		return this._map;
	};

	// SCOPES

	// handles local variables, self etc. Should create references to outer scopes
	// when needed etc.

	// add class for annotations / registering methods, etc?
	// class Interface

	// should move the whole context-thingie right into scope
	function Scope(node,parent){
		this._nr = STACK.incr('scopes');
		this._head = [];
		this._node = node;
		this._parent = parent;
		this._vars = new VariableDeclaration([]);
		this._meta = {};
		this._annotations = [];
		this._closure = this;
		this._virtual = false;
		this._counter = 0;
		this._varmap = {};
		this._varpool = [];
	};

	exports.Scope = Scope; // export class 
	Scope.prototype.level = function(v){ return this._level; }
	Scope.prototype.setLevel = function(v){ this._level = v; return this; };
	Scope.prototype.context = function(v){ return this._context; }
	Scope.prototype.setContext = function(v){ this._context = v; return this; };
	Scope.prototype.node = function(v){ return this._node; }
	Scope.prototype.setNode = function(v){ this._node = v; return this; };
	Scope.prototype.parent = function(v){ return this._parent; }
	Scope.prototype.setParent = function(v){ this._parent = v; return this; };
	Scope.prototype.varmap = function(v){ return this._varmap; }
	Scope.prototype.setVarmap = function(v){ this._varmap = v; return this; };
	Scope.prototype.varpool = function(v){ return this._varpool; }
	Scope.prototype.setVarpool = function(v){ this._varpool = v; return this; };
	Scope.prototype.params = function(v){ return this._params; }
	Scope.prototype.setParams = function(v){ this._params = v; return this; };
	Scope.prototype.head = function(v){ return this._head; }
	Scope.prototype.setHead = function(v){ this._head = v; return this; };
	Scope.prototype.vars = function(v){ return this._vars; }
	Scope.prototype.setVars = function(v){ this._vars = v; return this; };
	Scope.prototype.counter = function(v){ return this._counter; }
	Scope.prototype.setCounter = function(v){ this._counter = v; return this; };

	Scope.prototype.p = function (){
		if (STACK.loglevel() > 0) {
			console.log.apply(console,arguments);
		};
		return this;
	};

	Scope.prototype.stack = function (){
		return STACK;
	};

	Scope.prototype.meta = function (key,value){
		if (value != undefined) {
			this._meta[key] = value;
			return this;
		};
		return this._meta[key];
	};

	Scope.prototype.namepath = function (){
		return '?';
	};

	Scope.prototype.tagContextPath = function (){
		// bypassing for now
		return this._tagContextPath || (this._tagContextPath = "_T"); // parent.tagContextPath
	};

	Scope.prototype.tagContextCache = function (){
		return this._tagContextCache || (this._tagContextCache = this.closure().declare("__",OP('.',this.context().reference(),'__')));
	};

	Scope.prototype.context = function (){
		return this._context || (this._context = new ScopeContext(this));
	};

	Scope.prototype.traverse = function (){
		return this;
	};

	Scope.prototype.visit = function (){
		if (this._parent) { return this };
		this._parent = STACK.scope(1); // the parent scope
		this._level = STACK.scopes().length - 1;
		
		STACK.addScope(this);
		this.root().scopes().push(this);
		return this;
	};

	Scope.prototype.wrap = function (scope){
		this._parent = scope._parent;
		scope._parent = this;
		return this;
	};

	// called for scopes that are not real scopes in js
	// must ensure that the local variables inside of the scopes do not
	// collide with variables in outer scopes -- rename if needed
	Scope.prototype.virtualize = function (){
		return this;
	};

	Scope.prototype.root = function (){
		var scope = this;
		while (scope){
			if (scope instanceof RootScope) { return scope };
			scope = scope.parent();
		};
		return null;
	};

	Scope.prototype.register = function (name,decl,o){
		// FIXME re-registering a variable should really return the existing one
		// Again, here we should not really have to deal with system-generated vars
		// But again, it is important
		
		if(decl === undefined) decl = null;
		if(o === undefined) o = {};
		name = helpers.symbolize(name);
		
		// also look at outer scopes if this is not closed?
		var existing = this._varmap.hasOwnProperty(name) && this._varmap[name];
		if (existing) { return existing };
		
		var item = new Variable(this,name,decl,o);
		// need to check for duplicates, and handle this gracefully -
		// going to refactor later
		if (!o.system) { this._varmap[name] = item };
		return item;
	};

	Scope.prototype.annotate = function (obj){
		this._annotations.push(obj);
		return this;
	};

	// just like register, but we automatically
	Scope.prototype.declare = function (name,init,o){
		var declarator_;
		if(init === undefined) init = null;
		if(o === undefined) o = {};
		var variable = this.register(name,null,o);
		// TODO create the variabledeclaration here instead?
		// if this is a sysvar we need it to be renameable
		var dec = this._vars.add(variable,init);
		(declarator_ = variable.declarator()) || ((variable.setDeclarator(dec),dec));
		return variable;
	};

	// what are the differences here? omj
	// we only need a temporary thing with defaults -- that is all
	// change these values, no?
	Scope.prototype.temporary = function (refnode,o,name){
		
		if(o === undefined) o = {};
		if(name === undefined) name = null;
		if (o.pool) {
			for (var i = 0, ary = Imba.iterable(this._varpool), len = ary.length, v; i < len; i++) {
				v = ary[i];
				if (v.pool() == o.pool && v.declarator() == null) {
					return v.reuse(refnode);
				};
			};
		};
		
		var item = new SystemVariable(this,name,refnode,o);
		
		this._varpool.push(item); // It should not be in the pool unless explicitly put there?
		this._vars.push(item); // WARN variables should not go directly into a declaration-list
		return item;
	};

	Scope.prototype.lookup = function (name){
		this._lookups || (this._lookups = {});
		var ret = null;
		name = helpers.symbolize(name);
		if (this._varmap.hasOwnProperty(name)) {
			ret = this._varmap[name];
		} else {
			ret = this.parent() && this.parent().lookup(name);
			
			if (ret) {
				this._nonlocals || (this._nonlocals = {});
				this._nonlocals[name] = ret;
			};
		};
		return ret;
	};

	Scope.prototype.autodeclare = function (variable){
		return this.vars().push(variable); // only if it does not exist here!!!
	};

	Scope.prototype.free = function (variable){
		variable.free(); // :owner = null
		// @varpool.push(variable)
		return this;
	};

	Scope.prototype.isClosed = function (){
		return false;
	};

	Scope.prototype.closure = function (){
		return this._closure;
	};

	Scope.prototype.finalize = function (){
		return this;
	};

	Scope.prototype.klass = function (){
		var scope = this;
		while (scope){
			scope = scope.parent();
			if (scope instanceof ClassScope) { return scope };
		};
		return null;
	};

	Scope.prototype.head = function (){
		return [this._vars,this._params];
	};

	Scope.prototype.c = function (o){
		var body;
		if(o === undefined) o = {};
		o.expression = false;
		// need to fix this
		this.node().body().setHead(this.head());
		return body = this.node().body().c(o);
	};

	Scope.prototype.region = function (){
		return this.node().body().region();
	};

	Scope.prototype.loc = function (){
		return this.node().loc();
	};

	Scope.prototype.dump = function (){
		var self = this;
		var vars = Object.keys(self._varmap).map(function(k) {
			var v = self._varmap[k];
			// unless v.@declarator isa Scope
			// 	console.log v.name, v.@declarator:constructor:name
			// dump__(v)
			return (v.references().length) ? (dump__(v)) : (null);
		});
		
		var desc = {
			nr: self._nr,
			type: self.constructor.name,
			level: (self.level() || 0),
			vars: compact__(vars),
			loc: self.loc()
		};
		
		return desc;
	};

	Scope.prototype.toJSON = function (){
		return this.dump();
	};

	Scope.prototype.toString = function (){
		return ("" + (this.constructor.name));
	};

	Scope.prototype.closeScope = function (){
		return this;
	};


	// RootScope is wrong? Rather TopScope or ProgramScope
	function RootScope(){
		RootScope.__super__.constructor.apply(this,arguments);
		
		this.register('global',this,{type: 'global'});
		this.register('module',this,{type: 'global'});
		this.register('window',this,{type: 'global'});
		this.register('document',this,{type: 'global'});
		this.register('exports',this,{type: 'global'});
		this.register('console',this,{type: 'global'});
		this.register('process',this,{type: 'global'});
		this.register('parseInt',this,{type: 'global'});
		this.register('parseFloat',this,{type: 'global'});
		this.register('setTimeout',this,{type: 'global'});
		this.register('setInterval',this,{type: 'global'});
		this.register('setImmediate',this,{type: 'global'});
		this.register('clearTimeout',this,{type: 'global'});
		this.register('clearInterval',this,{type: 'global'});
		this.register('clearImmediate',this,{type: 'global'});
		this.register('__dirname',this,{type: 'global'});
		this.register('__filename',this,{type: 'global'});
		this.register('_',this,{type: 'global'});
		
		// preregister global special variables here
		this._warnings = [];
		this._scopes = [];
		this._helpers = [];
		this._entities = new Entities(this);
		this._head = [this._vars];
	};

	Imba.subclass(RootScope,Scope);
	exports.RootScope = RootScope; // export class 
	RootScope.prototype.warnings = function(v){ return this._warnings; }
	RootScope.prototype.setWarnings = function(v){ this._warnings = v; return this; };
	RootScope.prototype.scopes = function(v){ return this._scopes; }
	RootScope.prototype.setScopes = function(v){ this._scopes = v; return this; };
	RootScope.prototype.entities = function(v){ return this._entities; }
	RootScope.prototype.setEntities = function(v){ this._entities = v; return this; };

	RootScope.prototype.context = function (){
		return this._context || (this._context = new RootScopeContext(this));
	};

	RootScope.prototype.tagContextPath = function (){
		return this._tagContextPath || (this._tagContextPath = "_T");
	};

	RootScope.prototype.lookup = function (name){
		name = helpers.symbolize(name);
		if (this._varmap.hasOwnProperty(name)) { return this._varmap[name] };
	};

	RootScope.prototype.visit = function (){
		STACK.addScope(this);
		return this;
	};

	RootScope.prototype.helper = function (typ,value){
		// log "add helper",typ,value
		if (this._helpers.indexOf(value) == -1) {
			this._helpers.push(value);
			this._head.unshift(value);
		};
		
		return this;
	};

	RootScope.prototype.head = function (){
		return this._head;
	};

	RootScope.prototype.warn = function (data){
		// hacky
		data.node = null;
		this._warnings.push(data);
		return this;
	};

	RootScope.prototype.dump = function (){
		var obj = {warnings: dump__(this._warnings)};
		
		if (OPTS.analysis.scopes) {
			var scopes = this._scopes.map(function(s) { return s.dump(); });
			scopes.unshift(RootScope.__super__.dump.call(this));
			obj.scopes = scopes;
		};
		
		if (OPTS.analysis.entities) {
			obj.entities = this._entities;
		};
		
		return obj;
	};


	function ClassScope(){ return Scope.apply(this,arguments) };

	Imba.subclass(ClassScope,Scope);
	exports.ClassScope = ClassScope; // export class 
	ClassScope.prototype.namepath = function (){
		return this._node.namepath();
	};


	// called for scopes that are not real scopes in js
	// must ensure that the local variables inside of the scopes do not
	// collide with variables in outer scopes -- rename if needed
	ClassScope.prototype.virtualize = function (){
		// console.log "virtualizing ClassScope"
		var up = this.parent();
		for (var o = this._varmap, i = 0, keys = Object.keys(o), l = keys.length; i < l; i++){
			o[keys[i]].resolve(up,true); // force new resolve
		};
		return this;
	};

	ClassScope.prototype.isClosed = function (){
		return true;
	};

	function TagScope(){ return ClassScope.apply(this,arguments) };

	Imba.subclass(TagScope,ClassScope);
	exports.TagScope = TagScope; // export class 


	function ClosureScope(){ return Scope.apply(this,arguments) };

	Imba.subclass(ClosureScope,Scope);
	exports.ClosureScope = ClosureScope; // export class 


	function FunctionScope(){ return Scope.apply(this,arguments) };

	Imba.subclass(FunctionScope,Scope);
	exports.FunctionScope = FunctionScope; // export class 


	function MethodScope(){ return Scope.apply(this,arguments) };

	Imba.subclass(MethodScope,Scope);
	exports.MethodScope = MethodScope; // export class 
	MethodScope.prototype.isClosed = function (){
		return true;
	};

	MethodScope.prototype.tagContext = function (){
		return this._tagContext || (this._tagContext = this.declare("$",OP('.',new This(),'__')));
	};

	function LambdaScope(){ return Scope.apply(this,arguments) };

	Imba.subclass(LambdaScope,Scope);
	exports.LambdaScope = LambdaScope; // export class 
	LambdaScope.prototype.context = function (){
		// why do we need to make sure it is referenced?
		if (!this._context) {
			this._context = this.parent().context();
			this._context.reference(this);
		};
		return this._context;
	};


	function FlowScope(){ return Scope.apply(this,arguments) };

	Imba.subclass(FlowScope,Scope);
	exports.FlowScope = FlowScope; // export class 
	FlowScope.prototype.params = function (){
		if (this._parent) { return this._parent.params() };
	};

	FlowScope.prototype.register = function (name,decl,o){
		var found;
		if(decl === undefined) decl = null;
		if(o === undefined) o = {};
		if (o.type != 'let' && (this.closure() != this)) {
			if (found = this.lookup(name)) {
				if (found.type() == 'let') {
					this.p(("" + name + " already exists as a block-variable " + decl));
					// TODO should throw error instead
					if (decl) { decl.warn("Variable already exists in block") };
					// root.warn message: "Holy shit"
				};
			};
			return this.closure().register(name,decl,o);
		} else {
			return FlowScope.__super__.register.call(this,name,decl,o);
		};
	};

	// FIXME should override temporary as well

	FlowScope.prototype.autodeclare = function (variable){
		return this.parent().autodeclare(variable);
	};

	FlowScope.prototype.closure = function (){
		return this._parent.closure(); // this is important?
	};

	FlowScope.prototype.context = function (){
		return this._context || (this._context = this.parent().context());
	};

	FlowScope.prototype.closeScope = function (){
		if (this._context) { this._context.reference() };
		return this;
	};

	function CatchScope(){ return FlowScope.apply(this,arguments) };

	Imba.subclass(CatchScope,FlowScope);
	exports.CatchScope = CatchScope; // export class 


	function WhileScope(){ return FlowScope.apply(this,arguments) };

	Imba.subclass(WhileScope,FlowScope);
	exports.WhileScope = WhileScope; // export class 
	WhileScope.prototype.autodeclare = function (variable){
		return this.vars().push(variable);
	};

	function ForScope(){ return FlowScope.apply(this,arguments) };

	Imba.subclass(ForScope,FlowScope);
	exports.ForScope = ForScope; // export class 
	ForScope.prototype.autodeclare = function (variable){
		return this.vars().push(variable);
	};

	function IfScope(){ return FlowScope.apply(this,arguments) };

	Imba.subclass(IfScope,FlowScope);
	exports.IfScope = IfScope; // export class 
	IfScope.prototype.temporary = function (refnode,o,name){
		if(o === undefined) o = {};
		if(name === undefined) name = null;
		return this.parent().temporary(refnode,o,name);
	};

	function BlockScope(){ return FlowScope.apply(this,arguments) };

	Imba.subclass(BlockScope,FlowScope);
	exports.BlockScope = BlockScope; // export class 
	BlockScope.prototype.temporary = function (refnode,o,name){
		if(o === undefined) o = {};
		if(name === undefined) name = null;
		return this.parent().temporary(refnode,o,name);
	};

	BlockScope.prototype.region = function (){
		return this.node().region();
	};

	// lives in scope -- really a node???
	function Variable(scope,name,decl,o){
		this._ref = STACK._counter++;
		this._c = null;
		this._scope = scope;
		this._name = name;
		this._alias = null;
		this._initialized = true;
		this._declarator = decl;
		this._autodeclare = false;
		this._declared = o && o.declared || false;
		this._resolved = false;
		this._options = o || {};
		this._type = o && o.type || 'var'; // what about let here=
		this._export = false;
		this._references = []; // only needed when profiling
		this._assignments = [];
		this;
	};

	Imba.subclass(Variable,Node);
	exports.Variable = Variable; // export class 
	Variable.prototype.scope = function(v){ return this._scope; }
	Variable.prototype.setScope = function(v){ this._scope = v; return this; };
	Variable.prototype.name = function(v){ return this._name; }
	Variable.prototype.setName = function(v){ this._name = v; return this; };
	Variable.prototype.alias = function(v){ return this._alias; }
	Variable.prototype.setAlias = function(v){ this._alias = v; return this; };
	Variable.prototype.type = function(v){ return this._type; }
	Variable.prototype.setType = function(v){ this._type = v; return this; };
	Variable.prototype.options = function(v){ return this._options; }
	Variable.prototype.setOptions = function(v){ this._options = v; return this; };
	Variable.prototype.initialized = function(v){ return this._initialized; }
	Variable.prototype.setInitialized = function(v){ this._initialized = v; return this; };
	Variable.prototype.declared = function(v){ return this._declared; }
	Variable.prototype.setDeclared = function(v){ this._declared = v; return this; };
	Variable.prototype.declarator = function(v){ return this._declarator; }
	Variable.prototype.setDeclarator = function(v){ this._declarator = v; return this; };
	Variable.prototype.autodeclare = function(v){ return this._autodeclare; }
	Variable.prototype.setAutodeclare = function(v){ this._autodeclare = v; return this; };
	Variable.prototype.references = function(v){ return this._references; }
	Variable.prototype.setReferences = function(v){ this._references = v; return this; };
	Variable.prototype.export = function(v){ return this._export; }
	Variable.prototype.setExport = function(v){ this._export = v; return this; };

	Variable.prototype.pool = function (){
		return null;
	};

	Variable.prototype.closure = function (){
		return this._scope.closure();
	};

	Variable.prototype.assignments = function (){
		return this._assignments;
	};

	// Here we can collect lots of type-info about variables
	// and show warnings / give advice if variables are ambiguous etc
	Variable.prototype.assigned = function (val,source){
		this._assignments.push(val);
		if (val instanceof Arr) {
			// just for testing really
			this._isArray = true;
		} else {
			this._isArray = false;
		};
		return this;
	};

	Variable.prototype.resolve = function (scope,force){
		if(scope === undefined) scope = this.scope();
		if(force === undefined) force = false;
		if (this._resolved && !force) { return this };
		
		this._resolved = true;
		var closure = this._scope.closure();
		var item = scope.lookup(this._name);
		
		// if this is a let-definition inside a virtual scope we do need
		//
		if (this._scope != closure && this._type == 'let') { // or if it is a system-variable
			item = closure.lookup(this._name);
			
			// we now need to ensure that this variable is unique inside
			// the whole closure.
			scope = closure;
		};
		
		if (item == this) {
			scope.varmap()[this._name] = this;
			return this;
		} else if (item) {
			// possibly redefine this inside, use it only in this scope
			// if the item is defined in an outer scope - we reserve the
			if (item.scope() != scope && (this.options().let || this._type == 'let')) {
				scope.varmap()[this._name] = this;
			};
			
			// different rules for different variables?
			if (this._options.proxy) {
				true;
			} else {
				var i = 0;
				var orig = this._name;
				// it is the closure that we should use
				while (scope.lookup(this._name)){
					this._name = ("" + orig + (i += 1));
				};
			};
		};
		
		scope.varmap()[this._name] = this;
		closure.varmap()[this._name] = this;
		return this;
	};

	Variable.prototype.reference = function (){
		return this;
	};

	Variable.prototype.node = function (){
		return this;
	};

	Variable.prototype.traverse = function (){
		return this;
	};

	Variable.prototype.free = function (ref){
		this._declarator = null;
		return this;
	};

	Variable.prototype.reuse = function (ref){
		this._declarator = ref;
		return this;
	};

	Variable.prototype.proxy = function (par,index){
		this._proxy = [par,index];
		return this;
	};

	Variable.prototype.refcount = function (){
		return this._references.length;
	};

	Variable.prototype.c = function (){
		if (this._c) { return this._c };
		// options - proxy??
		if (this._proxy) {
			this._c = this._proxy[0].c() + '[' + this._proxy[1].c() + ']';
		} else {
			if (!this._resolved) this.resolve();
			var v = (this.alias() || this.name());
			this._c = (typeof v == 'string') ? (v) : (v.c());
			// allow certain reserved words
			// should warn on others though (!!!)
			// if @c == 'new'
			// 	@c = '_new'
			// 	# should happen at earlier stage to
			// 	# get around naming conventions
			if (RESERVED_REGEX.test(this._c)) { this._c = ("" + this.c() + "$") }; // @c.match(/^(default)$/)
		};
		return this._c;
	};

	// variables should probably inherit from node(!)
	Variable.prototype.consume = function (node){
		return this;
	};

	// this should only generate the accessors - not dael with references
	Variable.prototype.accessor = function (ref){
		var node = new LocalVarAccess(".",null,this);
		// this is just wrong .. should not be a regular accessor
		// @references.push([ref,el]) if ref # weird temp format
		return node;
	};

	Variable.prototype.assignment = function (val){
		return new Assign('=',this,val);
	};

	Variable.prototype.addReference = function (ref){
		if (ref instanceof Identifier) {
			ref.references(this);
		};
		
		if (ref.region && ref.region()) {
			this._references.push(ref);
		};
		
		return this;
	};

	Variable.prototype.autodeclare = function (){
		if (this._declared) { return this };
		this._autodeclare = true;
		this.scope().autodeclare(this);
		this._declared = true;
		return this;
	};

	Variable.prototype.predeclared = function (){
		this._declared = true;
		return this;
	};


	Variable.prototype.toString = function (){
		return String(this.name());
	};

	Variable.prototype.dump = function (typ){
		var name = this.name();
		if (name[0].match(/[A-Z]/)) { return null };
		
		return {
			type: this.type(),
			name: name,
			refs: dump__(this._references,typ)
		};
	};


	function SystemVariable(){ return Variable.apply(this,arguments) };

	Imba.subclass(SystemVariable,Variable);
	exports.SystemVariable = SystemVariable; // export class 
	SystemVariable.prototype.pool = function (){
		return this._options.pool;
	};

	// weird name for this
	SystemVariable.prototype.predeclared = function (){
		this.scope().vars().remove(this);
		return this;
	};

	SystemVariable.prototype.resolve = function (){
		var alias, v_;
		if (this._resolved || this._name) { return this };
		this._resolved = true;
		// unless @name
		// adds a very random initial name
		// the auto-magical goes last, or at least, possibly reuse other names
		// "${Math.floor(Math.random * 1000)}"
		
		var typ = this._options.pool;
		var names = [].concat(this._options.names);
		var alt = null;
		var node = null;
		
		var scope = this.scope();
		
		if (typ == 'tag') {
			var i = 0;
			while (!this._name){
				alt = ("t" + (i++));
				if (!scope.lookup(alt)) { this._name = alt };
			};
		} else if (typ == 'iter') {
			names = ['ary__','ary_','coll','array','items','ary'];
		} else if (typ == 'val') {
			names = ['v_'];
		} else if (typ == 'arguments') {
			names = ['$_','$0'];
		} else if (typ == 'keypars') {
			names = ['opts','options','pars'];
		} else if (typ == 'counter') {
			names = ['i__','i_','k','j','i'];
		} else if (typ == 'len') {
			names = ['len__','len_','len'];
		} else if (typ == 'list') {
			names = ['tmplist_','tmplist','tmp'];
		};
		// or if type placeholder / cacher (add 0)
		
		while (!this._name && (alt = names.pop())){
			if (!scope.lookup(alt)) { this._name = alt };
		};
		
		if (!this._name && this._declarator) {
			if (node = this.declarator().node()) {
				if (alias = node.alias()) { names.push(alias + "_") };
			};
		};
		
		while (!this._name && (alt = names.pop())){
			if (!scope.lookup(alt)) { this._name = alt };
		};
		
		this._name || (this._name = ("$" + (scope.setCounter(v_ = scope.counter() + 1),v_)));
		
		scope.varmap()[this._name] = this;
		this.closure().varmap()[this._name] = this;
		return this;
	};

	SystemVariable.prototype.name = function (){
		this.resolve();
		return this._name;
	};


	function ScopeContext(scope,value){
		this._scope = scope;
		this._value = value;
		this._reference = null;
		this;
	};

	Imba.subclass(ScopeContext,Node);
	exports.ScopeContext = ScopeContext; // export class 
	ScopeContext.prototype.scope = function(v){ return this._scope; }
	ScopeContext.prototype.setScope = function(v){ this._scope = v; return this; };
	ScopeContext.prototype.value = function(v){ return this._value; }
	ScopeContext.prototype.setValue = function(v){ this._value = v; return this; };
	ScopeContext.prototype.reference = function(v){ return this._reference; }
	ScopeContext.prototype.setReference = function(v){ this._reference = v; return this; };

	ScopeContext.prototype.namepath = function (){
		return this._scope.namepath();
	};

	// instead of all these references we should probably
	// just register when it is accessed / looked up from
	// a deeper function-scope, and when it is, we should
	// register the variable in scope, and then start to
	// use that for further references. Might clean things
	// up for the cases where we have yet to decide the
	// name of the variable etc?

	ScopeContext.prototype.reference = function (){
		return this._reference || (this._reference = this.scope().declare("self",new This()));
	};

	ScopeContext.prototype.c = function (){
		var val = this._value || this._reference;
		return (val) ? (val.c()) : ("this");
	};

	ScopeContext.prototype.cache = function (){
		return this;
	};

	function RootScopeContext(){ return ScopeContext.apply(this,arguments) };

	Imba.subclass(RootScopeContext,ScopeContext);
	exports.RootScopeContext = RootScopeContext; // export class 
	RootScopeContext.prototype.c = function (o){
		// return "" if o and o:explicit
		var val = this._value || this._reference;
		return ((val && val != this)) ? (val.c()) : ("this");
		// should be the other way around, no?
		// o and o:explicit ? super : ""
	};

	function Super(){ return Node.apply(this,arguments) };

	Imba.subclass(Super,Node);
	exports.Super = Super; // export class 
	Super.prototype.c = function (){
		// need to find the stuff here
		// this is really not that good8
		var m = STACK.method();
		var out = null;
		var up = STACK.current();
		var deep = (up instanceof Access);
		
		// TODO optimization for later - problematic if there is a different reference in the end
		if (false) {
			out = ("" + (m.target().c()) + ".superclass");
			if (!deep) { out += (".apply(" + (m.scope().context().c()) + ",arguments)") };
		} else {
			out = ("" + (m.target().c()) + ".__super__");
			if (!((up instanceof Access))) {
				out += ("." + c__(m.supername()));
				if (!((up instanceof Call))) { // autocall?
					out += (".apply(" + (m.scope().context().c()) + ",arguments)");
				};
			};
		};
		return out;
	};

	// constants

	var BR = exports.BR = new Newline('\n');
	var BR2 = exports.BR2 = new Newline('\n\n');
	var SELF = exports.SELF = new Self();
	var SUPER = exports.SUPER = new Super();

	var TRUE = exports.TRUE = new True('true');
	var FALSE = exports.FALSE = new False('false');
	var UNDEFINED = exports.UNDEFINED = new Undefined();
	var NIL = exports.NIL = new Nil();

	var ARGUMENTS = exports.ARGUMENTS = new ArgsReference('arguments');
	var EMPTY = exports.EMPTY = '';
	var NULL = exports.NULL = 'null';

	var RESERVED = exports.RESERVED = ['default','native','enum','with'];
	var RESERVED_REGEX = exports.RESERVED_REGEX = /^(default|native|enum|with|new|char)$/;

	var UNION = exports.UNION = new Const('union$');
	var INTERSECT = exports.INTERSECT = new Const('intersect$');
	var CLASSDEF = exports.CLASSDEF = new Const('imba$class');
	var TAGDEF = exports.TAGDEF = new Const('Imba.TAGS.define');
	var NEWTAG = exports.NEWTAG = new Identifier("_T");











	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(5)))

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	
	var path = __webpack_require__(13);
	var util = __webpack_require__(4);

	function SourceMap(source){
		this._source = source;
		this._maps = [];
		this._map = "";
		this._js = "";
	};

	exports.SourceMap = SourceMap; // export class 
	SourceMap.prototype.source = function (){
		return this._source;
	};

	SourceMap.prototype.options = function (){
		return this._source;
	};

	SourceMap.prototype.filename = function (){
		return this.options().options.filename;
	};

	SourceMap.prototype.sourceCode = function (){
		return this.options().options._source;
	};

	SourceMap.prototype.targetPath = function (){
		return this.options().options.targetPath;
	};

	SourceMap.prototype.sourcePath = function (){
		return this.options().options.sourcePath;
	};

	SourceMap.prototype.sourceName = function (){
		return path.basename(this.sourcePath());
	};

	SourceMap.prototype.targetName = function (){
		return path.basename(this.targetPath());
	};


	SourceMap.prototype.sourceFiles = function (){
		return [this.sourceName()];
	};

	SourceMap.prototype.parse = function (){
		var self = this;
		var matcher = /\%\$(\d*)\$\%/;
		var replacer = /^(.*?)\%\$(\d*)\$\%/;
		var lines = self.options().js.split(/\n/g); // what about js?
		// return self
		var locmap = util.locationToLineColMap(self.sourceCode());
		self._maps = [];
		
		var match;
		// split the code in lines. go through each line 
		// go through the code looking for LOC markers
		// remove markers along the way and keep track of
		// console.log source:js
		
		for (var i = 0, ary = Imba.iterable(lines), len = ary.length, line; i < len; i++) {
			// could split on these?
			line = ary[i];
			var col = 0;
			var caret = 0;
			
			self._maps[i] = [];
			while (line.match(matcher)){
				line = line.replace(replacer,function(m,pre,loc) {
					var lc = locmap[parseInt(loc)];
					caret = pre.length;
					var mapping = [[lc[0],lc[1]],[i,caret]]; // source and output
					self._maps[i].push(mapping);
					return pre;
				});
			};
			lines[i] = line;
		};
		
		
		self.source().js = lines.join('\n');
		return self;
	};

	SourceMap.prototype.generate = function (){
		this.parse();
		
		var lastColumn = 0;
		var lastSourceLine = 0;
		var lastSourceColumn = 0;
		var buffer = "";
		
		for (var lineNumber = 0, ary = Imba.iterable(this._maps), len = ary.length; lineNumber < len; lineNumber++) {
			lastColumn = 0;
			
			for (var nr = 0, items = Imba.iterable(ary[lineNumber]), len_ = items.length, map1; nr < len_; nr++) {
				map1 = items[nr];
				if (nr != 0) { buffer += ',' };
				var src = map1[0];
				var dest = map1[1];
				
				buffer += this.encodeVlq(dest[1] - lastColumn);
				lastColumn = dest[1];
				// add index
				buffer += this.encodeVlq(0);
				
				// The starting line in the original source, relative to the previous source line.
				buffer += this.encodeVlq(src[0] - lastSourceLine);
				lastSourceLine = src[0];
				// The starting column in the original source, relative to the previous column.
				buffer += this.encodeVlq(src[1] - lastSourceColumn);
				lastSourceColumn = src[1];
			};
			
			buffer += ";";
		};
		
		
		var rel = this.targetPath() && path.relative(path.dirname(this.targetPath()),this.sourcePath());
		
		var map = {
			version: 3,
			file: this.sourceName().replace(/\.imba/,'.js') || '',
			sourceRoot: this.options().sourceRoot || '',
			sources: [rel || this.sourcePath()],
			sourcesContent: [this.sourceCode()],
			names: [],
			mappings: buffer
		};
		
		// source:sourcemap = sourcemap
		// var base64 = Buffer.new(JSON.stringify(map)).toString("base64")
		// source:js += "\n//# sourceMappingURL=data:application/json;base64,{base64}"
		return map;
	};

	VLQ_SHIFT = 5;
	VLQ_CONTINUATION_BIT = 1 << VLQ_SHIFT;
	VLQ_VALUE_MASK = VLQ_CONTINUATION_BIT - 1;
	BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	// borrowed from CoffeeScript
	SourceMap.prototype.encodeVlq = function (value){
		var answer = '';
		// Least significant bit represents the sign.
		var signBit = (value < 0) ? (1) : (0);
		var nextChunk;
		// The next bits are the actual value.
		var valueToEncode = (Math.abs(value) << 1) + signBit;
		// Make sure we encode at least one character, even if valueToEncode is 0.
		while (valueToEncode || !answer){
			nextChunk = valueToEncode & VLQ_VALUE_MASK;
			valueToEncode = valueToEncode >> VLQ_SHIFT;
			if (valueToEncode) {
				nextChunk |= VLQ_CONTINUATION_BIT;
			};
			
			answer += this.encodeBase64(nextChunk);
		};
		
		return answer;
	};

	SourceMap.prototype.encodeBase64 = function (value){
		return BASE64_CHARS[value]; // or throw Error.new("Cannot Base64 encode value: {value}")
	};




/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// resolves . and .. elements in a path array with directory names there
	// must be no slashes, empty elements, or device names (c:\) in the array
	// (so also no leading and trailing slashes - it does not distinguish
	// relative and absolute paths)
	function normalizeArray(parts, allowAboveRoot) {
	  // if the path tries to go above the root, `up` ends up > 0
	  var up = 0;
	  for (var i = parts.length - 1; i >= 0; i--) {
	    var last = parts[i];
	    if (last === '.') {
	      parts.splice(i, 1);
	    } else if (last === '..') {
	      parts.splice(i, 1);
	      up++;
	    } else if (up) {
	      parts.splice(i, 1);
	      up--;
	    }
	  }

	  // if the path is allowed to go above the root, restore leading ..s
	  if (allowAboveRoot) {
	    for (; up--; up) {
	      parts.unshift('..');
	    }
	  }

	  return parts;
	}

	// Split a filename into [root, dir, basename, ext], unix version
	// 'root' is just a slash, or nothing.
	var splitPathRe =
	    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
	var splitPath = function(filename) {
	  return splitPathRe.exec(filename).slice(1);
	};

	// path.resolve([from ...], to)
	// posix version
	exports.resolve = function() {
	  var resolvedPath = '',
	      resolvedAbsolute = false;

	  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
	    var path = (i >= 0) ? arguments[i] : process.cwd();

	    // Skip empty and invalid entries
	    if (typeof path !== 'string') {
	      throw new TypeError('Arguments to path.resolve must be strings');
	    } else if (!path) {
	      continue;
	    }

	    resolvedPath = path + '/' + resolvedPath;
	    resolvedAbsolute = path.charAt(0) === '/';
	  }

	  // At this point the path should be resolved to a full absolute path, but
	  // handle relative paths to be safe (might happen when process.cwd() fails)

	  // Normalize the path
	  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
	    return !!p;
	  }), !resolvedAbsolute).join('/');

	  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
	};

	// path.normalize(path)
	// posix version
	exports.normalize = function(path) {
	  var isAbsolute = exports.isAbsolute(path),
	      trailingSlash = substr(path, -1) === '/';

	  // Normalize the path
	  path = normalizeArray(filter(path.split('/'), function(p) {
	    return !!p;
	  }), !isAbsolute).join('/');

	  if (!path && !isAbsolute) {
	    path = '.';
	  }
	  if (path && trailingSlash) {
	    path += '/';
	  }

	  return (isAbsolute ? '/' : '') + path;
	};

	// posix version
	exports.isAbsolute = function(path) {
	  return path.charAt(0) === '/';
	};

	// posix version
	exports.join = function() {
	  var paths = Array.prototype.slice.call(arguments, 0);
	  return exports.normalize(filter(paths, function(p, index) {
	    if (typeof p !== 'string') {
	      throw new TypeError('Arguments to path.join must be strings');
	    }
	    return p;
	  }).join('/'));
	};


	// path.relative(from, to)
	// posix version
	exports.relative = function(from, to) {
	  from = exports.resolve(from).substr(1);
	  to = exports.resolve(to).substr(1);

	  function trim(arr) {
	    var start = 0;
	    for (; start < arr.length; start++) {
	      if (arr[start] !== '') break;
	    }

	    var end = arr.length - 1;
	    for (; end >= 0; end--) {
	      if (arr[end] !== '') break;
	    }

	    if (start > end) return [];
	    return arr.slice(start, end - start + 1);
	  }

	  var fromParts = trim(from.split('/'));
	  var toParts = trim(to.split('/'));

	  var length = Math.min(fromParts.length, toParts.length);
	  var samePartsLength = length;
	  for (var i = 0; i < length; i++) {
	    if (fromParts[i] !== toParts[i]) {
	      samePartsLength = i;
	      break;
	    }
	  }

	  var outputParts = [];
	  for (var i = samePartsLength; i < fromParts.length; i++) {
	    outputParts.push('..');
	  }

	  outputParts = outputParts.concat(toParts.slice(samePartsLength));

	  return outputParts.join('/');
	};

	exports.sep = '/';
	exports.delimiter = ':';

	exports.dirname = function(path) {
	  var result = splitPath(path),
	      root = result[0],
	      dir = result[1];

	  if (!root && !dir) {
	    // No dirname whatsoever
	    return '.';
	  }

	  if (dir) {
	    // It has a dirname, strip trailing slash
	    dir = dir.substr(0, dir.length - 1);
	  }

	  return root + dir;
	};


	exports.basename = function(path, ext) {
	  var f = splitPath(path)[2];
	  // TODO: make this comparison case-insensitive on windows?
	  if (ext && f.substr(-1 * ext.length) === ext) {
	    f = f.substr(0, f.length - ext.length);
	  }
	  return f;
	};


	exports.extname = function(path) {
	  return splitPath(path)[3];
	};

	function filter (xs, f) {
	    if (xs.filter) return xs.filter(f);
	    var res = [];
	    for (var i = 0; i < xs.length; i++) {
	        if (f(xs[i], i, xs)) res.push(xs[i]);
	    }
	    return res;
	}

	// String.prototype.substr - negative index don't work in IE8
	var substr = 'ab'.substr(-1) === 'b'
	    ? function (str, start, len) { return str.substr(start, len) }
	    : function (str, start, len) {
	        if (start < 0) start = str.length + start;
	        return str.substr(start, len);
	    }
	;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(5)))

/***/ }
/******/ ]);