const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { sendMessage } = require("./protocol");
const { log } = require("./errorHandlers");
const HOME_DIR = require("os").homedir();
const TARGET_DIR = path.join(HOME_DIR, "github-projects");

// writes back to standard output
function writeBack(payload) {
  try {
    log(payload);
    sendMessage(payload);
  } catch (error) {
    log("unable to write to log");
  }
}

/**
 * Checks if the specified directory exists
 * @param {String} dir path of the directory to check
 * @returns {Boolean}
 */
function isDirExists(dir) {
  return fs.existsSync(dir);
}

/**
 * Creates a specified directory if doesnt exist
 * @param {String} dir path of the directory
 */
function createDirIfNotExist(dir) {
  if (!isDirExists(dir)) {
    fs.mkdirSync(dir);
  }
}

/**
 * Function to execute commands
 * @param {String} commad to execute
 */
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject();
      }
      return resolve({ stdout, stderr });
    });
  });
}

/**
 *
 * @param {String} cloneURL of the repository
 */
function cloneAndOpenRepo(cloneURL, tab_id) {
  const urlParts = cloneURL.split("/");
  const repositoryName = urlParts[urlParts.length - 1].slice(0, -4);

  // check for the target folder
  createDirIfNotExist(TARGET_DIR);

  writeBack({
    cloneURL,
    repositoryName,
    action: "OPEN",
    status: "start",
    status_code: 201,
    tab_id,
  });

  // open the project if already exists
  const localPath = path.join(TARGET_DIR, repositoryName);
  log(localPath);

  if (isDirExists(localPath)) {
    executeCommand(`code ${localPath}`)
      .then((result) => {
        writeBack({
          action: "OPEN",
          status: "completed",
          status_code: 200,
          tab_id,
          ...result,
        });
      })
      .catch((error) => {
        writeBack({
          action: "OPEN",
          status: "failed",
          status_code: 500,
          tab_id,
          error,
        });
      });
  } else {
    const command = `git clone ${cloneURL} ${localPath} && code ${localPath}`;
    executeCommand(command);
  }
}

/**
 * Function to check if the repository is already present in the local target dir
 * @param {String} cloneURL of the repository
 */
function checkIfCloned(cloneURL, tab_id) {
  const urlParts = cloneURL.split("/");
  const repositoryName = urlParts[urlParts.length - 1].slice(0, -4);
  const localPath = path.join(TARGET_DIR, repositoryName);
  if (isDirExists(localPath)) {
    writeBack({ action: "CHECK", status: "Exists", status_code: 200, tab_id });
  } else {
    writeBack({
      action: "CHECK",
      status: "Does not exist",
      status_code: 400,
      tab_id,
    });
  }
  return;
}

module.exports = {
  isDirExists,
  createDirIfNotExist,
  executeCommand,
  cloneAndOpenRepo,
  checkIfCloned,
};
