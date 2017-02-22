/* eslint-disable consistent-return */

const _debug = require('debug')
const exec = require('child_process').exec
const { TRAVIS_BRANCH, TRAVIS_PULL_REQUEST, FIREBASE_TOKEN } = process.env

const debug = _debug('app:build:deploy')
let projectName = 'int' // default project

const deployToFirebase = (cb) => {
  if (!!TRAVIS_PULL_REQUEST && TRAVIS_PULL_REQUEST !== 'false') {
    debug('Skipping Firebase Deploy - Build is a Pull Request')
    return
  }

  if (TRAVIS_BRANCH !== 'prod' && TRAVIS_BRANCH !== 'stage' && TRAVIS_BRANCH !== 'master') {
    debug('Skipping Firebase Deploy - Build is a not a Build Branch', TRAVIS_BRANCH)
    return
  }

  if (!FIREBASE_TOKEN) {
    debug('Error: FIREBASE_TOKEN env variable not found')
    cb('Error: FIREBASE_TOKEN env variable not found', null)
    return
  }

  debug('Deploying to Firebase...')

  if (TRAVIS_BRANCH === 'prod' || TRAVIS_BRANCH === 'stage') {
    projectName = TRAVIS_BRANCH
  }

  exec(`firebase deploy --token ${FIREBASE_TOKEN} --project ${projectName}`, (error, stdout) => {
    if (error !== null) {
      if (cb) {
        cb(error, null)
        return
      }
    }
    if (cb) {
      cb(null, stdout)
    }
  })
}

;(async function () {
  deployToFirebase(() => {
    debug('Successfully deployed to Firebase')
  })
})()
