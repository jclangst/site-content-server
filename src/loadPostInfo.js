const fs = require('fs').promises;
const path = require('path');
const unified = require('unified');
const markdown = require('remark-parse');
const remark2rehype = require('remark-rehype');
const frontmatter = require('remark-frontmatter');
const YAML = require('yaml');
const Datastore = require('nedb');
const removePosition = require('unist-util-remove-position')

// removes the yaml frontmatter from the ast and returns the parse yaml object
function extractYAML(ast){
  const yamlAst = ast.children.shift();
  return YAML.parse(yamlAst.value);
}

// makes sure that all of the fields are present on the metadata
const MUST_HAVE = ['title', 'id', 'publishDate'];
function hasValidMetadata(ast){
  const {meta} = ast;
  for(field of MUST_HAVE){
    if(!meta.hasOwnProperty(field)){
      console.log(`Post ${meta.id} missing field ${field}`);
      return false;
    }
  }
  return true;
}

// creates full date stamps and adds timestamps
function convertDates(ast){
  const date = new Date(ast.meta.publishDate);
  ast.meta.publishDate = date;
  ast.meta.timestamp = date.getTime();
  return ast;
}

// returns an in-memory database with all of the posts in the given post directory
async function loadPostInfo(postDirectory){
  console.log('Loading posts...');
  const fileNames = await fs.readdir(postDirectory);
  const processor = unified()
    .use(markdown, {commonmark: true})
    .use(frontmatter, ['yaml', 'toml'])
    .use(remark2rehype);

  // parse the files and extract the yaml metadata as well as the asts
  const asts = await Promise.all(fileNames.map(name => {
    return fs.readFile(path.resolve(postDirectory, name))
      .then(file => file.toString('utf8'))
      .then(processor.parse)
      .then(ast => removePosition(ast, true))
      .then(ast => {
        const meta = extractYAML(ast);
        return {meta, ast};
      })
      .then(({meta, ast}) => {
        return new Promise((res, rej) => {
          processor.run(ast, (err, tree) => {
            if(err){
              rej(err);
              return;
            }
            res({
              ast: tree,
              meta
            })
          })
        });
      });
    }));

  //verify and add derive data to the asts
  const verifiedAsts = asts
    .filter(hasValidMetadata)
    .map(convertDates);
  
  // construct the new post database
  const db = new Datastore();
  return new Promise((res, rej) => {
    db.insert(verifiedAsts, (err)=> {
      if(err) rej(err);
      console.log("Posts loaded!");
      res(db);
    })
  })
}

module.exports.loadPostInfo = loadPostInfo;