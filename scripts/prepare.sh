#!/usr/bin/env bash

FILE=$NETWORK'.json'
DATA=config/$FILE

echo 'Generating files from config file: '$DATA
cat $DATA

mustache $DATA subgraph.template.yaml > subgraph.yaml
mustache $DATA src/constants.template.ts > src/constants.ts