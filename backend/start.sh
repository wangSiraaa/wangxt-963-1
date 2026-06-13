#!/bin/bash
cd "$(dirname "$0")"
rm -f data/trial.db
node server.js
