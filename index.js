module.exports = (function() {
    var EventEmitter = require('events').EventEmitter;
    var fs = require('fs');
    var Step = require('step');
    var Contextify = require('contextify');
    var cheerio = require('cheerio');

    if (!String.prototype.trim) {
        String.prototype.trim = function() {
            return this.replace(/^\s*/, "").replace(/\s*$/, "");
        };
    }

    var CheerioTemplate = new EventEmitter();

    CheerioTemplate.engine = function(filename, options, callback) {
        /**
         * Carrega o arquivo
         */
        var loadView = function(path, callback) {
            var view = {
                path: path
            };
            fs.stat(path, function(err, result) {
                if (err) {
                    return callback(err);
                }
                fs.readFile(path, function(err, str) {
                    if (err) {
                        return callback(err, view);
                    }


                    view.$ = cheerio.load(str);
                    view.mtime = result.mtime;
                    view.blocks = {};
                    view.extend = null;
                    view.sandbox = {
                        mixin: {},
                        console: console,
                        data: options,
                        $: view.$
                    };
                    var window = Contextify(view.sandbox);
                    view.sandbox.window = window.getGlobal();
                    view.sandbox.window.$ = view.$;
                    return callback(null, view);
                });
            });
        };

        loadView(filename, function(err, view) {
            if (err) {
                return callback(err);
            }

            var stepParseExtends = function() {
                //Verifica se extend
                var group = this.group();

                view.$('script[type="cheerio-template-extends"]').each(function() {
                    var script = this;
                    var done = group();
                    if (script.attr('extends') === undefined) {
                        return done();
                    }
                    var parentName = script.attr('extends');
                    var layout = options.settings.views + '/' + parentName + '.html';
                    view.extend = layout;
                    script.remove();
                    return done();
                });
            };


            var stepParseBlocks = function() {
                //Inclusao de blocos filhos
                var group = this.group();

                view.$('script[type="cheerio-template-block"]').each(function() {
                    var script = this;
                    var done = group();
                    if (script.attr('block') === undefined) {
                        return done();
                    }
                    var blockName = script.attr('block');
                    if (options.__child) {
                        script.before(options.__child.$('[cheerio-template-block="' + blockName + '"]').html());
                    }
                    script.remove();
                    return done();
                });
            };

            var stepParseIncludes = function() {
                //Includes
                var group = this.group();

                //Ao extender, nao executa o script no filho, apenas no pai
                if (view.extend) {
                    return;
                }

                view.$('script[type="cheerio-template-include"]').each(function() {
                    var scriptInclude = this;
                    var done = group();
                    if (scriptInclude.attr('include') === undefined) {
                        return done();
                    }
                    var includeName = scriptInclude.attr('include');
                    var path = options.settings.views + '/' + includeName + '.html';
                    fs.stat(path, function(err, result) {
                        if (err) {
                            return callback(err);
                        }
                        fs.readFile(path, function(err, str) {
                            if (err) {
                                return callback(err);
                            }
                            scriptInclude.before(str + '');
                            scriptInclude.remove();
                            return done();
                        });
                    });
                });
            };

            var stepParseMixins = function() {
                //Mixins
                var group = this.group();

                //Ao extender, nao executa o script no filho, apenas no pai
                if (view.extend) {
                    return;
                }
                view.$('[cheerio-template-mixin]').each(function() {
                    var done = group();
                    var $ = cheerio.load(this.html());
                    var mixinName = this.attr('cheerio-template-mixin');

                    //
                    if (mixinName === undefined) {
                        return done();
                    }

                    mixinSandbox = {
                        console: console,
                        data: options,
                        $: $
                    };
                    var mixinWindow = Contextify(mixinSandbox);
                    mixinSandbox.window = mixinWindow.getGlobal();
                    mixinSandbox.window.$ = mixinSandbox.$;



                    var source = this.find('script[mixin="' + mixinName + '"]').html().trim();
                    if (source === '') {
                        return done();
                    }
                    mixinSandbox.run(source);
                    view.sandbox.mixin[mixinName] = function() {
                        return mixinSandbox[mixinName].apply(this, arguments);
                    };

                    this.remove();
                    return done();
                });
            };

            var stepRunScripts = function() {
                var group = this.group();
                //Ao extender, nao executa o script no filho, apenas no pai
                if (view.extend) {
                    return;
                }

                view.$('script').each(function() {
                    var script = this;
                    var done = group();

                    //
                    if (script.attr('cheerio-template') === undefined) {
                        return done();
                    }
                    script.removeAttr('cheerio-template');
                    var src = script.attr('src');

                    // htmls runs script content only when src is not set
                    if (!src && script.html().trim() !== '') {
                        view.sandbox.__actualScript = script;
                        view.sandbox.run(script.html());
                    }

                    script.remove();
                    return done();
                });
            };

            var stepRenderPage = function(err) {
                if (err) {
                    console.error(err); // errors are not fatal
                }

                //Renderiza a pagina
                if (view.extend) {
                    options.__child = view;
                    //Chama o template pai, que este extende
                    CheerioTemplate.engine(view.extend, options, function(err, html) {
                        view.sandbox.dispose();
                        callback(null, html);
                    });
                } else {
                    //Nao extende nada, renderiza
                    view.sandbox.dispose();
                    callback(null, view.$.html());
                }
            };

            Step(
                    stepParseExtends,
                    stepParseBlocks,
                    stepParseIncludes,
                    stepParseMixins,
                    stepRunScripts,
                    stepRenderPage
                    );
        });
    };

    return CheerioTemplate;
})();