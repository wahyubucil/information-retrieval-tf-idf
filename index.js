const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const natural = require("natural");
const sw = require("stopword");

const app = express();

// Setup natural package
const idTokenizer = new natural.AggressiveTokenizerId();
const enTokenizer = new natural.AggressiveTokenizer();
const TfIdf = natural.TfIdf;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(404).send({ message: "Not found" });
});

app.post("/search", (req, res) => {
  const keyword = req.body.keyword.toLowerCase();
  const data = req.body.data;

  // Processing keyword
  const keywordTokenize = idTokenizer.tokenize(keyword);
  const keywordNoStopwords = sw.removeStopwords(keywordTokenize, sw.id);
  const keywordStem = keywordNoStopwords.map((value) =>
    natural.StemmerId.stem(value)
  );

  const documents = data.map((item) => {
    // Indonesian data is title and authors
    const idData = [item.title, ...item.authors].join(" ").toLowerCase();

    // English data is abstract and keywords
    const enData = [item.abstract, ...item.keywords].join(" ").toLowerCase();

    // Tokenize data
    const idDataTokenize = idTokenizer.tokenize(idData);
    const enDataTokenize = enTokenizer.tokenize(enData);

    // Remove stopwords
    const idDataNoStopwords = sw.removeStopwords(idDataTokenize, sw.id);
    const enDataNoStopwords = sw.removeStopwords(enDataTokenize);

    // Stemming
    const idDataStem = idDataNoStopwords.map((value) =>
      natural.StemmerId.stem(value)
    );
    const enDataStem = enDataNoStopwords.map((value) =>
      natural.PorterStemmer.stem(value)
    );

    const combineText = idDataStem.join(" ") + " " + enDataStem.join(" ");

    return combineText;
  });

  const tfidf = new TfIdf();
  documents.forEach((doc) => tfidf.addDocument(doc));

  tfidf.tfidfs(keywordStem, (index, measure) => {
    data[index]["weight"] = measure;
  });

  // Sort data and remove data that has zero weight
  const resultsData = data
    .filter((item) => item.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  res.send(resultsData);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
