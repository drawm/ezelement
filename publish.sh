#!/bin/bash

version=$1

if [[ -z ${version} ]]; then
    echo 'No version given'
    exit 1
fi

jq ".version=\"${version}\"" package.json > tmp.json && \
mv tmp.json package.json && \
git add package.json && \
git commit -m "Publish version ${version}"

# Deploy to npm & yarn
./compile.sh && \
    yarn login && \
    yarn publish && \
git tag ${version} && git push --tags github # Deploy to deno.land

# Push latest change to gitub
git push github
