'use strict';

var os = require('os');
var fs = require('fs');
var assert = require('assert');
var child_process = require('child_process');
var yaml = require('js-yaml');

// using low-level API because the high-level API doesn't work as of v1.0.11
var sodium = require('sodium').api;
var SERVER_KEY = new Buffer('FhMbJE+Cyla045d6y41lHVfEeFieOnLZQod52GXojUw=', 'base64');


if (process.argv.length !== 3) {
  console.error('No config file specified on command line. Outputting a new one...');
  console.log(yaml.dump(generateNewConfig()));
  process.exit(0);
}

var config = yaml.safeLoad(fs.readFileSync(process.argv[2], 'utf8'));
var nick = config.nick,
    cores = config.cores,
    pubkey = new Buffer(config.pubkey, 'base64'),
    secret = new Buffer(config.secret, 'base64');

function fromServer(m) {
  //var nonce = new Buffer(sodium.crypto_box_NONCEBYTES);
  assert(m && m.nonce && m.c);
  var nonce = new Buffer(m.nonce, 'base64');
  assert(nonce.length === sodium.crypto_box_NONCEBYTES);
  var cipherText = new Buffer(m.c, 'base64');
  var plainBuffer = sodium.crypto_box_open(cipherText, nonce, SERVER_KEY, secret);
  assert(plainBuffer);
  return JSON.parse(plainBuffer.toString('utf8'));
}

function toServer(o) {
  assert(o);
  var nonce = new Buffer(sodium.crypto_box_NONCEBYTES);
  sodium.randombytes_buf(nonce);
  var plainBuffer = new Buffer(JSON.stringify(o), 'utf8');
  var cipherMsg = sodium.crypto_box(plainBuffer, nonce, SERVER_KEY, secret);
  return {
    nonce: nonce.toString('base64'),
    c: cipherMsg.toString('base64')
  };
}

function generateNewConfig() {
  var nick = 'anon' + Math.round(Math.random()*10000);
  var cores = os.cpus().length;
  var keypair = new sodium.crypto_box_keypair();
  var pubkey = keypair.publicKey;
  var secret = keypair.secretKey;
  return {
    nick: nick,
    cores: cores,
    pubkey: pubkey.toString('base64'),
    secret: secret.toString('base64')
  };
}