cheerio-template
==================

Express template engine, based on [cheerio](https://github.com/MatthewMueller/cheerio) inspired by
[express-notemplate](https://github.com/kapouer/express-notemplate).

Allows the use of jQuery syntax in views of your application.


## Installation
`npm install cheerio-template`

## Usage

### Demo

```shell
cd ./demo
npm install
node ./app.js
```

Enjoy in browser, http://localhost:3000

### Express 3 Setup
```js
'use strict';

var application_root = __dirname,
        express = require('express'),
        path = require('path'),
        CheerioTemplate = require('cheerio-template');

var app = express();

// Config
app.configure(function() {
    //Template
    app.use(express.static(path.join(application_root, '/public')));
    app.set('views', path.join(application_root, '/views'));
    app.engine('html', CheerioTemplate.engine);
    app.set('view engine', 'html');
});
```

### JQuery like selector
```html
<div class="my-div"> </div>
<script type="text/javascript" cheerio-template>
    $('.my-div').html('New content for div');
</script>
```

### Extends
#### layout.html
```html
<!DOCTYPE html>
<html>
    <head>
        <title>Layout</title>
    </head>
    <body>
        <script type="cheerio-template-block" block='content'></script>
        <script type="cheerio-template-block" block='xtras'></script>
    </body>
</html>
```

#### page.html
```html
<!-- Markup extends -->
<script type="cheerio-template-extends" extends='layout'></script>

<!-- Block Content -->
<div cheerio-template-block="content">
    <p>Content page</p>
</div>


<!-- Block xtras -->
<div cheerio-template-block="xtras">
    <p>Extra content page</p>
</div>
```


### Passing data to view
#### Route
```js
app.get('/route', function(req, res) {
    res.render('view', {
        title:'Other Page',
        author:{
            name : 'Alex Rodin'
        }
    });
});
```
#### view.html
```html
<div id="#title"></div>
<div id="#author-name"></div>
<script type="text/javascript" cheerio-template>
    $('#title').text(data.title);
    $('#author-name').text(data.author.name);
</script>
```



### Mixins
#### Define
```html
<div cheerio-template-mixin="formSelect">
    <div id="content"></div>
    <script type="text/javascript" mixin="formSelect">
        var formSelect = function(options, name, id, value, selectClass) {
            selectClass = selectClass ? selectClass : '';
            name = name ? name : '';
            id = id ? id : name;
            var select = $('<select />', {
                id: id,
                name: name,
                class: selectClass
            });
            $('#content').empty();
            select.append('<option value="">...</option>');

            for (var i in options) {
                var option = options[i];
                var selected = (value && value === option.value) ? 'selected' : undefined;
                var $option = $('<option />');
                $option.attr('value', option.value);
                $option.attr('class', option.class);
                $option.attr('selected', selected);
                $option.html(option.text);
                select.append($option);
            }
            $('#content').append(select);
            return $('#content').html();
        };
    </script>
</div>
```
#### Use - and Reuse
```html
<div id="my-select-container"></div>
<script type="text/javascript" cheerio-template>
    $('#my-select-container').html(mixin.formSelect([
        {
            value: 2013,
            text: 'Year 2013',
            class: 'class-for-option'
        },
        {
            value: 2014,
            text: 'cup of world 2014',
            class: 'class-cup-of-world'
        }
    ], 'name_for_form_select', 'select_id', 2013, 'select_class'));
</script>
```


### Include
```html
<script type="cheerio-template-include" include='include/header'></script>

<script type="cheerio-template-include" include='include/mixins'></script>

<script type="cheerio-template-include" include='include/footer'></script>
<script type="cheerio-template-include" include='include/copy'></script>
```


### Echo values
```html
<script type="text/javascript" cheerio-template>
    echo('<p>This text was inserted</p>');
</script>
```

