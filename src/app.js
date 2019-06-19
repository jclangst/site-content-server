const express = require('express');

const {loadPostInfo} = require('./loadPostInfo');
const {syncContentRepo} = require('./syncContentRepo');

async function createApp({
  remoteURL,
  branch,
  contentDir,
  blogDir,
}){
  console.log("Initializing...")


  // function for refreshing in-memory data
  async function refreshDB(){
    await syncContentRepo(contentDir, remoteURL, branch)
    return await loadPostInfo(blogDir);
  };

  // initialize in-memory data
  let postDB = await refreshDB();

  // set up express
  const app = express();
  app.use(express.json());

  // just getting the metadata for each post
  app.get('/postMetadata', (req, res) => {
    getPosts(postDB, req, (error, docs) => {
      if(error){
        res.status(400).send(error.toString());
        return;
      }
      const info = Object.values(docs).map(post => post.meta);
      res.json(info);
    })
  });

  // getting all post data
  app.get('/post', (req, res) => {
    getPosts(postDB, req, (error, docs) => {
      if(error){
        res.status(400).send(error.toString());
        return;
      }
      res.json(docs);
    })
  });

  // trigger for reloading in-memory data
  app.post('/reload', async (req, res) => {
    postDB = await refreshDB();
    res.status(200).end();
  })

  console.log("Intialization complete!");
  return app;
}

module.exports.createApp = createApp;


/*******************
 * Utility Functions
 *******************/


function createFindOptions(obj){
  const filterOpts = obj.filter || {};
  Object.values(filterOpts)
    .forEach(opts => {
      const regex = opts["$regex"]
      if(regex){
        opts["$regex"] = new RegExp(regex);
      }
    })
  return filterOpts;
}

function createSortOptions(obj){
  return obj.sort || {};
}

function getPosts(db, req, cb){
  const body = req.body || {};
  return db
    .find(createFindOptions(body))
    .sort(createSortOptions(body))
    .exec(cb);
}