'use strict';

var application_root = __dirname,
        express = require('express'),
        path = require('path'),
        routes = require(path.join(application_root, '/routes')),
        http = require('http'),
        CheerioTemplate = require('cheerio-template');

var app = express();

// Config
app.configure(function() {
    app.set('port', process.env.PORT || 3000);
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);

    //Template
    app.use(express.static(path.join(application_root, '/public')));
    app.set('views', path.join(application_root, '/views'));
    app.engine('html', CheerioTemplate.engine);
    app.set('view engine', 'html');
});

app.configure('development', function() {
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

//init routes
routes.set(app);

// Launch server
var server = http.createServer(app).listen(app.get('port'), function() {
    console.log("Server listening on port " + app.get('port') + "\n Control + C to stop");
});