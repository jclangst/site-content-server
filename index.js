const path = require('path');

const {createApp} = require('./src/app');

const contentDir = path.resolve(__dirname, "content");
const blogDir = path.resolve(contentDir, "blog");

createApp({
  remoteURL: "git@github.com:jclangst/site-content.git",
  branch: "master",
  contentDir,
  blogDir
}).then(app => {
  app.listen(3000, () => {
    console.log("Listening on port 3000...");
  })
})