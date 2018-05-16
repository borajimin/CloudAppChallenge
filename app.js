const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));
app.use(express.static(path.join(__dirname, "public")));

app.get('/', async (req, res) => {
  try {
    let scraped = {};

    let webpage = await axios.get(req.query.url);
    let $ = cheerio.load(webpage.data);

    let images = {};
    let videos = {};

    $('img').each((i, elem) => {
      let filename = elem.attribs.src.split('/');
      filename = (!filename[filename.length - 1].includes('?'))
              ? filename[filename.length - 1]
              : filename[filename.length - 1].split('?')[0];
      images[filename] = elem.attribs.src;
    });

    $('video').each((i, elem) => {
      let sources = [];
      if(!elem.attribs.src) {
        sources = elem.children.filter(c => c.name === 'source').map(s => s.attribs.src);
      } else {
        sources.push(elem.attribs.src);
      }
      videos[i] = sources;
    });

    scraped.url = req.query.url;
    scraped.images = images;
    scraped.videos = videos;

    res.send(scraped);
  } catch(e) {
    console.log(e);
  }
});

app.use((req, res, next) => {
  res.status(404).send("Page Not Found");
});

const port = parseInt(process.env.PORT, 10) || 3000;
app.set('port', port);
app.listen(port, () => {
  console.log("Server started, listening on port", port);
});
