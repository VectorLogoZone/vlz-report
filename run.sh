#!/usr/bin/env bash
#
# run locally
#

set -o errexit
set -o pipefail
set -o nounset

if [ ! -d "node_modules" ]; then
	echo "INFO: installing dependencies"
	npm install
fi

if [ -f ".env" ]; then
	echo "INFO: loading .env file"
	export $(cat .env)
else
	echo "INFO: .env file not found"
fi

npm run dev
