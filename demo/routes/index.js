exports.set = function(app) {

    /**
     * Index
     */
    app.get('/', function(req, res) {
        res.render('page/index', {
        });
    });

    /**
     * other
     */
    app.get('/other', function(req, res) {
        res.render('page/other', {
            title: 'New title, defined on "routes/index.js - line 16"'
        });
    });
};
