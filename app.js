const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const handlebars = require('express-handlebars');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

app.engine('hbs', handlebars({
  defaultLayout: 'main',
  extname: '.hbs'
}));

app.set('view engine', 'hbs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));
app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
  res.render('assets');
});

app.post('/', async (req, res) => {
  try {
    let scraped = {};
    let url = (req.body.url[req.body.url.length - 1] === '/') ? req.body.url.slice(0, req.body.url.length - 1) : req.body.url;
    let webpage = await axios.get(url);
    let $ = cheerio.load(webpage.data);

    let images = [];
    let videos = [];

    $('img').each((i, elem) => {
      let filename = (!elem.attribs.src) ? elem.attribs.src : elem.attribs.src.split('/');
      if(filename) {
        let source;
        filename = (!filename[filename.length - 1].includes('?'))
        ? filename[filename.length - 1]
        : filename[filename.length - 1].split('?')[0];
        if(elem.attribs.src[0] === '/') {
          source = url + elem.attribs.src;
        }
        images.push({title: filename, source: (!source) ? elem.attribs.src : source});
      }
    });

    $('video').each((i, elem) => {
      let sources = [];
      if(!elem.attribs.src) {
        sources = elem.children.filter(c => c.name === 'source').map(s => {
          let source
          if(s.attribs.src[0] !== '/' && s.attribs.src.slice(0, 4) !== 'http') {
            source =  url + '/' + s.attribs.src;
          } else if(s.attribs.src[0] === '/'){
            source = url + s.attribs.src;
          } else {
            source = s.attribs.src;
          }
          return source;
        });
      } else {
        let source
        if(elem.attribs.src[0] !== '/' && elem.attribs.src.slice(0, 4) !== 'http') {
          source =  url + '/' + elem.attribs.src;
        } else if(elem.attribs.src[0] === '/'){
          source = url + elem.attribs.src;
        } else {
          source = elem.attribs.src;
        }
        sources.push(source);
      }
      videos[i] = {sources: sources};
    });

    scraped.url = req.body.url;
    scraped.images = images;
    scraped.videos = videos;

    res.render('assets', {url: scraped.url, images: images, videos: videos});
  } catch(e) {
    console.log(e);
  }
});

app.use((req, res, next) => {
  let err = new Error("Page Not Found.");
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  console.log('Error', err);
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error", err);
});

const port = parseInt(process.env.PORT, 10) || 3000;
app.set('port', port);
app.listen(port, () => {
  console.log("Server started, listening on port", port);
});
