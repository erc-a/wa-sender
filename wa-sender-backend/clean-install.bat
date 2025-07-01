@echo off
echo Cleaning installation...
rd /s /q node_modules
del package-lock.json

echo Installing dependencies...
npm cache clean --force
npm install --no-optional --legacy-peer-deps

echo Installation complete!
