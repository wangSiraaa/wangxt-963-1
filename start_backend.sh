#!/bin/bash
cd "$(dirname "$0")/backend"
rm -f data/trial.db
node server.js
