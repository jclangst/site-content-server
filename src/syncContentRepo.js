const ng = require('nodegit');
const fs = require('fs').promises;

async function syncContentRepo(localPath, repoURL, branchName){
  
  // make the directory if it does not exist
  try {
    await fs.access(localPath);
    directoryExists = true;
  } catch(e){
    console.log("Making local directory...");
    await fs.mkdir(localPath, {recursive: true});
    console.log('Directory creatred!');
  }

  const fetchOpts = {
    callbacks: {
      credentials: (url, userName) => {
        return ng.Cred.sshKeyFromAgent(userName);
      }
    }
  }

  //check to see if repo exists
  let repo;
  try {
    repo = await ng.Repository.open(localPath);
  }catch(e){
    
    try {
      console.log("Cloning repo...");
      repo = await ng.Clone.clone(repoURL, localPath, {
        checkoutBranch: branchName,
        fetchOpts
      })
      console.log("Cloning complete!");
      return true;
    } catch (e){
      console.log("Cloning failed!");
      console.error(e);
      return false;
    }
  }

  // fetch the latest from origin
  try {
    console.log('Fetching latest...');
    await repo.fetch("origin", fetchOpts);
    console.log("Fetch complete!");
  }catch(e){
    console.log('Fetch failed!');
    console.log(e);
    return false;
  }

  //checkout branch
  try {
    await repo.checkoutBranch(branchName);
  }catch(e){
    console.log(`Invalid branch name: ${branchName}`);
    console.log(e);
    return false;
  }

  //merging the latest from origin
  try {
    console.log("Merging...");
    await repo.mergeBranches(branchName, `origin/${branchName}`);
    console.log("Merge complete!");
  } catch (e) {
    console.log("Merge failed!");
    console.log(e);
    return false;
  }

  return true;
}

module.exports.syncContentRepo = syncContentRepo;