/*
 *
 */
"use strict";

goog.provide("Entry.Parser");

goog.require("Entry.JSParser");
goog.require("Entry.BlockParser");

Entry.Parser = function(mode, syntax, cm) {
    this._mode = mode; // maze ai workspace
    this.syntax = {};
    this.codeMirror = cm;
    this._lang = syntax || "js";

    this.mappingSyntax(mode);
    switch (this._lang) {
        case "js":
            this._parser = new Entry.JSParser(this.syntax);

            var syntax = this.syntax;
            CodeMirror.commands.javascript_complete = function (cm) {
                CodeMirror.showHint(cm, null, {globalScope:syntax.Scope});
            }

            cm.on("keyup", function (cm, event) {
                if (!cm.state.completionActive &&  (event.keyCode >= 65 && event.keyCode <= 95))  {
                    CodeMirror.commands.autocomplete(cm, null, {completeSingle: false, globalScope:syntax.Scope});
                }
            });

            break;
        case "block":
            this._parser = new Entry.BlockParser(this.syntax);
            break;
    }
};

(function(p) {
    p.parse = function(code) {
        var result = null;

        switch (this._lang) {
            case "js":
                try {
                    var astTree = acorn.parse(code);
                    result = this._parser.Program(astTree);
                } catch(error) {
                    console.dir(error);
                    console.log(error instanceof SyntaxError);
                    if (this.codeMirror) {
                        var annotation;
                        if (error instanceof SyntaxError) {
                            annotation = {
                                from: {line: error.loc.line, ch: error.loc.column - 2},
                                to: {line: error.loc.line, ch: error.loc.column + 1}
                            }
                            error.message = "문법 오류입니다.";
                        } else {
                            annotation = this.getLineNumber(error.node.start,
                                                               error.node.end);
                        }
                        annotation.message = error.message;
                        annotation.severity = "error";
                        var a = this.codeMirror.markText(
                            annotation.from, annotation.to, {
                            className: "CodeMirror-lint-mark-error",
                            __annotation: annotation,
                            clearOnEnter: true
                        });

                        Entry.toast.alert('Error', error.message);
                    }
                    result = [];
                }
                break;
            case "block":
                result = this._parser.Code(code);
                break;
        }

        return result;
    };

    p.getLineNumber = function (start, end) {
        var value = this.codeMirror.getValue();
        var lines = {
            'from' : {},
            'to' : {}
        };

        var startline = value.substring(0, start).split(/\n/gi);
        lines.from.line = startline.length - 1;
        lines.from.ch = startline[startline.length - 1].length;

        var endline = value.substring(0, end).split(/\n/gi);
        lines.to.line = endline.length - 1;
        lines.to.ch = endline[endline.length - 1].length;

        return lines;
    };

    p.mappingSyntax = function(mode) {
        var types = Object.keys(Entry.block);

        for (var i = 0; i < types.length; i++) {
            var type = types[i];
            var block = Entry.block[type];
            if (block.mode === mode) {
                var syntaxArray = block.syntax;
                if (!syntaxArray)
                    continue;
                var syntax = this.syntax;
                for (var j = 0; j < syntaxArray.length; j++) {
                    var key = syntaxArray[j];
                    if (j === syntaxArray.length - 2 &&
                       typeof syntaxArray[j + 1] === "function") {
                        syntax[key] = syntaxArray[j + 1];
                        break;
                    }
                    if (!syntax[key]) {
                        syntax[key] = {};
                    }
                    if (j === syntaxArray.length - 1) {
                        syntax[key] = type;
                    } else {
                        syntax = syntax[key];
                    }
                }
            }
        }
    };
})(Entry.Parser.prototype);
