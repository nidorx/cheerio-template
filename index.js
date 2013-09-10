module.exports = (function() {
    var fs = require('fs');
    var Step = require('step');
    var Contextify = require('contextify');
    var cheerio = require('cheerio');

    if (!String.prototype.trim) {
        String.prototype.trim = function() {
            return this.replace(/^\s*/, "").replace(/\s*$/, "");
        };
    }

    var CheerioTemplate = {
        engine: function(filename, options, callback) {
            /**
             * Loads view script
             * @param {string} path Path of view
             * @param {function} callback
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

            /**
             * Load and run script
             *
             * @param {mixed} err
             * @param {object} view
             * @returns {null}
             */
            loadView(filename, function(err, view) {
                if (err) {
                    return callback(err);
                }

                /**
                 * Parse extends, if exists
                 */
                var stepParseExtends = function() {
                    var group = this.group();
                    var count = 0;
                    view.$('script[type="cheerio-template-extends"]').eq(0).each(function() {
                        var done = group();
                        if (this.attr('extends') === undefined) {
                            this.remove();//Remove script tag
                            return done();
                        }

                        //parse only first extends tag, remove all others
                        if (count === 0) {
                            var parentName = this.attr('extends');
                            var parentLayout = options.settings.views + '/' + parentName + '.html';
                            view.extend = parentLayout;
                            count++;
                        }

                        this.remove();//Remove script tag
                        return done();
                    });
                };

                /**
                 * Parse all script blocks, if exists
                 */
                var stepParseBlocks = function() {
                    var group = this.group();

                    view.$('script[type="cheerio-template-block"]').each(function() {
                        var done = group();
                        if (this.attr('block') === undefined) {
                            return done();
                        }
                        var blockName = this.attr('block');

                        //If this script has child
                        if (options.__child) {
                            this.before(options.__child.$('[cheerio-template-block="' + blockName + '"]').html());
                        }
                        this.remove();
                        return done();
                    });
                };

                /**
                 * Parse includes, if exists
                 */
                var stepParseIncludes = function() {
                    var group = this.group();

                    //Skip, if it extends other
                    //childs content block was inserted in parent code after this step
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

                /**
                 * Parse all mixins
                 */
                var stepParseMixins = function() {
                    var group = this.group();

                    //Skip, if it extends other
                    //childs content block was inserted in parent code after this step
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

                /**
                 * Run all scripts tag
                 */
                var stepRunScripts = function() {
                    var group = this.group();

                    //Skip, if it extends other
                    //childs content block was inserted in parent code after this step
                    if (view.extend) {
                        return;
                    }

                    view.$('script').each(function() {
                        var done = group();

                        //
                        if (this.attr('cheerio-template') === undefined) {
                            return done();
                        }

                        var src = this.attr('src');
                        // htmls runs script content only when src is not set
                        if (!src && this.html().trim() !== '') {
                            view.sandbox.__actualScript = this;
                            view.sandbox.run(this.html());
                        }

                        this.remove();
                        return done();
                    });
                };

                /**
                 * Finaly, render html page
                 */
                var stepRenderPage = function() {
                    if (view.extend) {
                        options.__child = view;
                        //Call parent view
                        CheerioTemplate.engine(view.extend, options, function(err, html) {
                            view.sandbox.dispose();
                            callback(null, html);
                        });
                    } else {
                        //no parent's, render this script
                        view.sandbox.dispose();
                        callback(null, view.$.html());
                    }
                };

                //magic
                Step(
                        stepParseExtends,
                        stepParseBlocks,
                        stepParseIncludes,
                        stepParseMixins,
                        stepRunScripts,
                        stepRenderPage
                        );
            });
        }
    };

    return CheerioTemplate;
})();